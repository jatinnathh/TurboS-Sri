// app/api/sarvam/report/route.ts
//
// PIPELINE:
//   1. Build English transcript from messages
//   2. Send to HuggingFace d4data/biomedical-ner-all (medical NER)
//   3. Map NER entity labels → report fields
//   4. Fill any gaps with light rule-based patterns
//   5. Return structured MedicalReport JSON
//
// NER model: d4data/biomedical-ner-all
//   Trained on BC5CDR + NCBI + JNLPBA + i2b2 corpora
//   Entity types: Disease, Drug, Dosage, Symptom, Body_Part,
//                 Lab_value, Medical_procedure, Sign_symptom, etc.
//
// Env vars needed:
//   HUGGINGFACE_API_KEY — free tier works fine for inference

import { NextRequest, NextResponse } from "next/server"

const HF_KEY   = process.env.HUGGINGFACE_API_KEY!
const NER_URL  = "https://api-inference.huggingface.co/models/d4data/biomedical-ner-all"

/* ─── Types ─── */
interface Message {
  role:       "patient" | "doctor"
  text:       string
  english?:   string
  translated?: string
  timestamp:  string
}

interface NEREntity {
  entity_group: string   // e.g. "Disease_disorder", "Medication", "Sign_symptom"
  word:         string
  score:        number
  start:        number
  end:          number
}

interface MedicalReport {
  chiefComplaint:           string
  historyOfPresentIllness:  string
  symptoms:                 string[]
  examFindings:             string
  diagnosis:                string
  treatment:                string[]
  medications:              string[]
  investigations:           string[]
  followUp:                 string
  additionalNotes:          string
}

/* ─── NER entity label → report field mapping ─── */
// d4data/biomedical-ner-all label set:
const LABEL_MAP: Record<string, keyof MedicalReport | null> = {
  // Symptoms / complaints
  "Sign_symptom":         "symptoms",
  "Symptom":              "symptoms",
  "Sign":                 "symptoms",

  // Diagnosis / disease
  "Disease_disorder":     "diagnosis",
  "Disease":              "diagnosis",
  "Disorder":             "diagnosis",
  "Pathology":            "diagnosis",

  // Medications / drugs
  "Medication":           "medications",
  "Drug":                 "medications",
  "Medicine":             "medications",
  "Therapeutic_procedure":"treatment",

  // Investigations / labs
  "Lab_value":            "investigations",
  "Laboratory_procedure": "investigations",
  "Diagnostic_procedure": "investigations",
  "Diagnostic_imaging":   "investigations",

  // Anatomy — used for exam findings
  "Body_part":            "examFindings",
  "Anatomy":              "examFindings",

  // Dosage / frequency — appended to medications
  "Dosage":               null,   // handled separately
  "Frequency":            null,   // handled separately
  "Duration":             null,   // handled separately

  // Misc clinical
  "Clinical_event":       "additionalNotes",
  "Biological_structure": "examFindings",
}

/* ─── Deduplicate array, normalize casing ─── */
function dedup(arr: string[]): string[] {
  const seen = new Set<string>()
  return arr
    .map(s => s.trim().replace(/\s+/g, " "))
    .filter(s => s.length > 1)
    .filter(s => { const k = s.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true })
}

/* ─── Merge dosage/frequency tokens with adjacent medication tokens ─── */
function mergeMedications(entities: NEREntity[], fullText: string): string[] {
  const meds: string[] = []

  entities.forEach((ent, idx) => {
    const label = ent.entity_group
    if (!["Medication","Drug","Medicine"].includes(label)) return

    let medStr = ent.word
    // Look ahead up to 3 tokens for dosage / frequency
    for (let j = idx + 1; j <= idx + 3 && j < entities.length; j++) {
      const next = entities[j]
      if (["Dosage","Frequency","Duration"].includes(next.entity_group)) {
        // Only merge if tokens are close in source text (within 30 chars)
        if (Math.abs(next.start - ent.end) < 30) {
          medStr += ` ${next.word}`
        }
      }
    }
    meds.push(medStr)
  })

  return dedup(meds)
}

/* ─── Call HuggingFace NER inference ─── */
async function runNER(text: string): Promise<NEREntity[]> {
  // Chunk text if > 512 tokens (model limit) — ~400 words per chunk
  const words  = text.split(" ")
  const chunks: string[] = []
  for (let i = 0; i < words.length; i += 380) {
    chunks.push(words.slice(i, i + 380).join(" "))
  }

  const allEntities: NEREntity[] = []
  let   offset = 0

  for (const chunk of chunks) {
    const res = await fetch(NER_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${HF_KEY}`,
        "Content-Type":  "application/json",
      },
      body: JSON.stringify({
        inputs: chunk,
        parameters: { aggregation_strategy: "simple" },
        options:    { wait_for_model: true },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.warn(`NER chunk failed (offset ${offset}):`, err)
      // Continue with other chunks
    } else {
      const entities: NEREntity[] = await res.json()
      // Adjust char offsets for chunking
      entities.forEach(e => {
        e.start += offset
        e.end   += offset
      })
      allEntities.push(...entities)
    }

    offset += chunk.length + 1
  }

  return allEntities
}

/* ─── Rule-based patterns for fields NER misses ─── */
function extractFollowUp(doctorLines: string[]): string {
  const patterns = [
    /come\s+back\s+in\s+[\w\s]+/i,
    /follow[\s-]?up\s+in\s+[\w\s]+/i,
    /review\s+after\s+[\w\s]+/i,
    /return\s+if\s+.+/i,
    /visit\s+again\s+.+/i,
  ]
  for (const line of doctorLines) {
    for (const pat of patterns) {
      const m = line.match(pat)
      if (m) return m[0]
    }
  }
  // Fallback: any doctor line mentioning follow/return/review
  return doctorLines.find(l =>
    /follow|return|review|appointment|revisit/i.test(l)
  ) ?? "As needed"
}

function extractChiefComplaint(patientLines: string[]): string {
  // First patient message is almost always the presenting complaint
  const first = patientLines[0] ?? ""
  // Try to trim to first sentence
  const sentence = first.match(/[^.!?]+[.!?]?/)?.[0] ?? first
  return sentence.trim().slice(0, 200) || "Not documented"
}

function extractExamFindings(doctorLines: string[], bodyParts: string[]): string {
  // Combine body part NER hits with doctor lines mentioning examination
  const examLines = doctorLines.filter(l =>
    /exam|finding|tender|swollen|normal|clear|auscult|palpat|inspect|vital|bp|pulse|temp|spo2/i.test(l)
  )
  const parts = bodyParts.length ? `Involved areas: ${dedup(bodyParts).join(", ")}. ` : ""
  return parts + (examLines[0] ?? "Not documented")
}

/* ══════════ MAIN HANDLER ══════════ */
export async function POST(req: NextRequest) {
  try {
    const { messages, patientName, patientAge, patientGender, department } = await req.json()

    if (!messages?.length) {
      return NextResponse.json({ error: "No messages provided" }, { status: 400 })
    }

    /* Step 1 — Build English transcript */
    const patientLines: string[] = []
    const doctorLines:  string[] = []

    ;(messages as Message[]).forEach(m => {
      const text = m.english ?? m.translated ?? m.text
      if (m.role === "patient") patientLines.push(text)
      else                      doctorLines.push(text)
    })

    const fullTranscript = (messages as Message[])
      .map(m => {
        const speaker = m.role === "patient" ? "Patient" : "Doctor"
        const text    = m.english ?? m.translated ?? m.text
        return `${speaker}: ${text}`
      })
      .join("\n")

    /* Step 2 — Run NER */
    let entities: NEREntity[] = []
    try {
      entities = await runNER(fullTranscript)
    } catch (nerErr) {
      console.error("NER failed, using rule-based fallback:", nerErr)
    }

    /* Step 3 — Bucket entities by report field */
    const buckets: Record<string, string[]> = {
      symptoms:       [],
      diagnosis:      [],
      medications:    [],
      investigations: [],
      examFindings:   [],
      treatment:      [],
      additionalNotes:[],
      bodyParts:      [],  // internal — merged into examFindings
      dosage:         [],  // internal — merged with medications
    }

    entities.forEach(ent => {
      if (ent.score < 0.50) return   // low-confidence filter

      const label  = ent.entity_group
      const word   = ent.word.replace(/^##/, "").trim()
      const field  = LABEL_MAP[label]

      if (label === "Body_part" || label === "Anatomy" || label === "Biological_structure") {
        buckets.bodyParts.push(word)
        return
      }
      if (field && buckets[field]) {
        buckets[field].push(word)
      }
    })

    /* Step 4 — Merge medications with dosage/frequency */
    const mergedMeds = mergeMedications(entities, fullTranscript)
    if (mergedMeds.length) buckets.medications = mergedMeds

    /* Step 5 — Fill fields NER struggles with using rules */
    const chiefComplaint   = extractChiefComplaint(patientLines)
    const followUp         = extractFollowUp(doctorLines)
    const examFindings     = extractExamFindings(doctorLines, buckets.bodyParts)

    // History = all patient lines joined, trimmed
    const history = patientLines.join(" ").trim().slice(0, 600) || "Not documented"

    /* Step 6 — Assemble report */
    const report: MedicalReport = {
      chiefComplaint,
      historyOfPresentIllness: history,
      symptoms:       dedup(buckets.symptoms).length
                        ? dedup(buckets.symptoms)
                        : fallbackSymptoms(fullTranscript),
      examFindings,
      diagnosis:      dedup(buckets.diagnosis).join("; ") || fallbackDiagnosis(doctorLines),
      treatment:      dedup(buckets.treatment).length
                        ? dedup(buckets.treatment)
                        : fallbackTreatment(doctorLines),
      medications:    dedup(buckets.medications).length
                        ? dedup(buckets.medications)
                        : fallbackMedications(doctorLines),
      investigations: dedup(buckets.investigations).length
                        ? dedup(buckets.investigations)
                        : fallbackInvestigations(fullTranscript),
      followUp,
      additionalNotes: dedup(buckets.additionalNotes).join(". ")
                         || `${department?.replace(/_/g," ")} consultation — ${patientName}, ${patientAge}y${patientGender ? `, ${patientGender}` : ""}`,
    }

    return NextResponse.json({
      report,
      source: entities.length ? "ner" : "rule-based",
      entityCount: entities.length,
    })

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error"
    console.error("Report route error:", msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

/* ─── Keyword fallbacks for when NER finds nothing ─── */
function fallbackSymptoms(text: string): string[] {
  const keywords = [
    "pain","fever","cough","cold","vomiting","nausea","headache","dizziness",
    "fatigue","weakness","swelling","rash","itching","breathlessness",
    "chest pain","stomach ache","back pain","sore throat","runny nose",
    "loose stools","diarrhoea","constipation","loss of appetite","insomnia",
  ]
  return keywords.filter(k => text.toLowerCase().includes(k))
}

function fallbackDiagnosis(doctorLines: string[]): string {
  const line = doctorLines.find(l =>
    /diagnos|condition|impression|suffer|you have|it is|this is|presents with/i.test(l)
  )
  return line?.slice(0, 150) ?? "Pending evaluation"
}

function fallbackTreatment(doctorLines: string[]): string[] {
  return doctorLines
    .filter(l => /take|rest|avoid|drink|eat|apply|use|stop|start|continue|increase|decrease/i.test(l))
    .slice(0, 4)
}

function fallbackMedications(doctorLines: string[]): string[] {
  return doctorLines
    .filter(l => /tablet|syrup|capsule|mg|ml|injection|drops|cream|ointment|paracetamol|amoxicillin|ibuprofen|cetirizine|omeprazole|azithromycin|metformin/i.test(l))
    .slice(0, 5)
}

function fallbackInvestigations(text: string): string[] {
  const tests = [
    "blood test","cbc","complete blood count","urine test","urine culture",
    "x-ray","xray","mri","ct scan","ultrasound","ecg","echo",
    "biopsy","culture","hba1c","thyroid","lipid profile","liver function",
    "kidney function","rbs","fbs","ppbs",
  ]
  return tests.filter(t => text.toLowerCase().includes(t))
}