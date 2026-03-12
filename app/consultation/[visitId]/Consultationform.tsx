// app/consultation/[visitId]/ConsultationForm.tsx
"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"

/* ── Types ── */
interface Message {
  id:          string
  role:        "patient" | "doctor"
  text:        string        // original transcribed text
  english:     string        // English version
  hindi:       string        // Hindi version
  kannada:     string        // Kannada version
  timestamp:   string
  language:    string        // original recording language
  hasTTS?:     boolean       // doctor messages can be played to patient
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

export interface HistoryReport {
  chiefComplaint?:  string
  diagnosis?:       string
  symptoms?:        string[]
  medications?:     string[]
  treatment?:       string[]
  followUp?:        string
  _savedAt?:        string
  _sessionIndex?:   number
  [key: string]:    unknown
}

export interface PastVisit {
  visitId:    string
  department: string
  date:       string
  language:   string
  reports:    HistoryReport[]
}

interface Props {
  visitId:        string
  department:     string
  patientName:    string
  patientAge:     number
  patientGender?: string
  patientId:      string
  patientHistory: PastVisit[]
}

const LANGUAGES = [
  { code: "kn-IN", label: "ಕನ್ನಡ (Kannada)" },
  { code: "hi-IN", label: "हिन्दी (Hindi)"   },
  { code: "en-IN", label: "English"           },
]

const LANG_LABELS: Record<string, string> = {
  "en-IN": "English",
  "hi-IN": "हिन्दी",
  "kn-IN": "ಕನ್ನಡ",
}

const REPORT_FIELDS: { key: keyof MedicalReport; label: string; icon: string; isArray: boolean }[] = [
  { key: "chiefComplaint",          label: "Chief Complaint",            icon: "🤒", isArray: false },
  { key: "historyOfPresentIllness", label: "History of Illness",         icon: "📋", isArray: false },
  { key: "symptoms",                label: "Symptoms",                   icon: "🔍", isArray: true  },
  { key: "examFindings",            label: "Examination Findings",       icon: "🩺", isArray: false },
  { key: "diagnosis",               label: "Diagnosis",                  icon: "🔬", isArray: false },
  { key: "treatment",               label: "Treatment Plan",             icon: "💊", isArray: true  },
  { key: "medications",             label: "Medications",                icon: "💉", isArray: true  },
  { key: "investigations",          label: "Investigations",             icon: "🧪", isArray: true  },
  { key: "followUp",                label: "Follow-up",                  icon: "📅", isArray: false },
  { key: "additionalNotes",         label: "Additional Notes",           icon: "📝", isArray: false },
]

function uid()    { return Math.random().toString(36).slice(2, 9) }
function nowTime(){ return new Date().toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" }) }

/* ══════════════════════════════════════════════ */
export function ConsultationForm({ visitId, department, patientName, patientAge, patientGender, patientId, patientHistory }: Props) {

  const [sessionActive,    setSessionActive]    = useState(false)
  const [sessionSeconds,   setSessionSeconds]   = useState(0)
  const [messages,         setMessages]         = useState<Message[]>([])
  const [patientLang,      setPatientLang]      = useState("kn-IN")
  const [doctorLang,       setDoctorLang]       = useState("en-IN")

  // Display language for transcript panel (what language to show bubbles in)
  const [transcriptLang,   setTranscriptLang]   = useState("en-IN")

  const [patientRec,       setPatientRec]       = useState(false)
  const [doctorRec,        setDoctorRec]        = useState(false)
  const [patientTyping,    setPatientTyping]    = useState("")
  const [doctorTyping,     setDoctorTyping]     = useState("")
  const [patientLoading,   setPatientLoading]   = useState(false)
  const [doctorLoading,    setDoctorLoading]    = useState(false)

  const [tab,              setTab]              = useState<"transcript"|"report">("transcript")
  const [report,           setReport]           = useState<MedicalReport | null>(null)
  const [reportLoading,    setReportLoading]    = useState(false)
  const [editingReport,    setEditingReport]    = useState(false)
  const [reportEdits,      setReportEdits]      = useState<Record<string, string>>({})
  const [saving,           setSaving]           = useState(false)
  const [saved,            setSaved]            = useState(false)

  // Completion state
  const [completed,      setCompleted]      = useState(false)
  const [completing,     setCompleting]     = useState(false)

  // History panel state
  const [historyOpen,    setHistoryOpen]    = useState(patientHistory.length > 0)
  const [expandedVisit,  setExpandedVisit]  = useState<string | null>(
    patientHistory.length > 0 ? patientHistory[0].visitId : null
  )
  const [expandedReport, setExpandedReport] = useState<number | null>(0)

  // TTS state
  const [playingMsgId,     setPlayingMsgId]     = useState<string | null>(null)
  const [ttsLoading,       setTtsLoading]       = useState<string | null>(null)
  // Inline transcript edit state
  const [editingMsgId,  setEditingMsgId]  = useState<string | null>(null)
  const [editDraft,     setEditDraft]     = useState("")   // draft for the original text field

  const audioRef = useRef<HTMLAudioElement | null>(null)

  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null)
  const patientMicRef  = useRef<MediaRecorder | null>(null)
  const doctorMicRef   = useRef<MediaRecorder | null>(null)
  const patientChunks  = useRef<Blob[]>([])
  const doctorChunks   = useRef<Blob[]>([])
  const bottomRef      = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }) }, [messages])

  useEffect(() => {
    if (sessionActive) {
      timerRef.current = setInterval(() => setSessionSeconds(s => s + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [sessionActive])

  const fmt = (s: number) =>
    `${Math.floor(s/60).toString().padStart(2,"0")}:${(s%60).toString().padStart(2,"0")}`

  /* ── Get display text for a message in chosen lang ── */
  const getMsgText = (msg: Message, lang: string) => {
    if (lang === "en-IN") return msg.english || msg.text
    if (lang === "hi-IN") return msg.hindi   || msg.text
    if (lang === "kn-IN") return msg.kannada || msg.text
    return msg.text
  }

  /* ── Edit a message's original text + re-translate ── */
  const startEdit = useCallback((msg: Message) => {
    setEditingMsgId(msg.id)
    setEditDraft(msg.text)
  }, [])

  const cancelEdit = useCallback(() => {
    setEditingMsgId(null)
    setEditDraft("")
  }, [])

  const saveEdit = useCallback(async (msg: Message) => {
    const newText = editDraft.trim()
    if (!newText) return
    setEditingMsgId(null)
    setEditDraft("")

    // Re-translate the corrected text to all 3 languages
    const lang = msg.language
    try {
      // Translate to English first
      const toEn = await fetch("/api/sarvam/translate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: newText, sourceLanguage: lang }),
      })
      const enData = await toEn.json() as { translatedText?: string }
      const english = lang === "en-IN" ? newText : (enData.translatedText ?? newText)

      // Translate EN → HI and EN → KN in parallel
      const [hiRes, knRes] = await Promise.all([
        fetch("/api/sarvam/translate", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: english, sourceLanguage: "en-IN", targetLanguage: "hi-IN" }),
        }),
        fetch("/api/sarvam/translate", {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: english, sourceLanguage: "en-IN", targetLanguage: "kn-IN" }),
        }),
      ])
      const hiData = await hiRes.json() as { translatedText?: string }
      const knData = await knRes.json() as { translatedText?: string }

      setMessages(prev => prev.map(m =>
        m.id === msg.id
          ? { ...m, text: newText, english, hindi: hiData.translatedText ?? english, kannada: knData.translatedText ?? english }
          : m
      ))
    } catch {
      // Even if re-translation fails, at least update the original text
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, text: newText } : m))
    }
  }, [editDraft])

  /* ── Transcribe + get all 3 translations ── */
  const transcribeAll = useCallback(async (blob: Blob, lang: string) => {
    const buf  = await blob.arrayBuffer()
    const b64  = btoa(new Uint8Array(buf).reduce((d,b) => d + String.fromCharCode(b), ""))
    const res  = await fetch("/api/sarvam/transcribe", {
      method: "POST", headers: { "Content-Type":"application/json" },
      body: JSON.stringify({ audioBase64: b64, languageCode: lang }),
    })
    const data = await res.json()
    return {
      original: (data.original ?? "") as string,
      english:  (data.english  ?? "") as string,
      hindi:    (data.hindi    ?? "") as string,
      kannada:  (data.kannada  ?? "") as string,
    }
  }, [])

  /* ── Translate typed text to all 3 langs ── */
  const translateAll = useCallback(async (text: string, sourceLang: string) => {
    const targets = ["en-IN", "hi-IN", "kn-IN"].filter(t => t !== sourceLang)
    const results: Record<string, string> = { [sourceLang]: text }

    await Promise.all(targets.map(async target => {
      const res = await fetch("/api/sarvam/translate", {
        method: "POST", headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ text, sourceLanguage: sourceLang }),
      })
      // The translate route translates to English; for other langs we chain
      // Simpler: call transcribe with typed text hack — instead call translate directly
      const data = await res.json()
      results["en-IN"] = data.translatedText ?? text
    }))

    // For Hindi and Kannada, translate from English
    if (sourceLang !== "hi-IN" && results["en-IN"]) {
      const r = await fetch("/api/sarvam/translate", {
        method: "POST", headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ text: results["en-IN"], sourceLanguage: "en-IN", targetLanguage: "hi-IN" }),
      })
      const d = await r.json(); results["hi-IN"] = d.translatedText ?? results["en-IN"]
    }
    if (sourceLang !== "kn-IN" && results["en-IN"]) {
      const r = await fetch("/api/sarvam/translate", {
        method: "POST", headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ text: results["en-IN"], sourceLanguage: "en-IN", targetLanguage: "kn-IN" }),
      })
      const d = await r.json(); results["kn-IN"] = d.translatedText ?? results["en-IN"]
    }
    if (!results["en-IN"]) results["en-IN"] = text
    if (!results["hi-IN"]) results["hi-IN"] = text
    if (!results["kn-IN"]) results["kn-IN"] = text

    return results
  }, [])

  const addMsg = useCallback((
    role: "patient"|"doctor",
    text: string, english: string, hindi: string, kannada: string, lang: string
  ) => {
    setMessages(prev => [...prev, {
      id: uid(), role, text, english, hindi, kannada,
      timestamp: nowTime(), language: lang, hasTTS: role === "doctor",
    }])
  }, [])

  /* ── Recording ── */
  const startRecording = useCallback(async (role: "patient"|"doctor") => {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true })
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" })
      const chunks: Blob[] = []
      recorder.ondataavailable = e => { if (e.data.size > 0) chunks.push(e.data) }
      if (role === "patient") { patientChunks.current = chunks; patientMicRef.current = recorder; setPatientRec(true) }
      else                    { doctorChunks.current  = chunks; doctorMicRef.current  = recorder; setDoctorRec(true)  }
      recorder.start()
    } catch { alert("Microphone access denied.") }
  }, [])

  const stopRecording = useCallback(async (role: "patient"|"doctor") => {
    const recorder = role === "patient" ? patientMicRef.current : doctorMicRef.current
    const lang     = role === "patient" ? patientLang : doctorLang
    const chunks   = role === "patient" ? patientChunks.current : doctorChunks.current
    const setRec   = role === "patient" ? setPatientRec  : setDoctorRec
    const setLoad  = role === "patient" ? setPatientLoading : setDoctorLoading
    if (!recorder) return
    setRec(false); setLoad(true)
    recorder.onstop = async () => {
      try {
        const blob   = new Blob(chunks, { type: "audio/webm" })
        const result = await transcribeAll(blob, lang)
        if (result.original.trim()) {
          addMsg(role, result.original, result.english, result.hindi, result.kannada, lang)
        }
      } finally { setLoad(false); recorder.stream.getTracks().forEach(t => t.stop()) }
    }
    recorder.stop()
  }, [patientLang, doctorLang, transcribeAll, addMsg])

  /* ── Typed send ── */
  const sendTyped = useCallback(async (role: "patient"|"doctor") => {
    const text  = (role === "patient" ? patientTyping : doctorTyping).trim()
    const lang  = role === "patient" ? patientLang : doctorLang
    if (!text) return
    role === "patient" ? setPatientTyping("") : setDoctorTyping("")
    const setLoad = role === "patient" ? setPatientLoading : setDoctorLoading
    setLoad(true)
    try {
      const result = await translateAll(text, lang)
      addMsg(role, text,
        result["en-IN"] ?? text,
        result["hi-IN"] ?? text,
        result["kn-IN"] ?? text,
        lang
      )
    } finally { setLoad(false) }
  }, [patientTyping, doctorTyping, patientLang, doctorLang, translateAll, addMsg])

  /* TTS: play doctor reply in chosen language (EN / HI / KN) */
  // ttsKey = `${msg.id}:${lang}` so each language button has independent state
  const playTTS = useCallback(async (msg: Message, lang: string) => {
    const key = `${msg.id}:${lang}`
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.src = "" }
    if (playingMsgId === key) { setPlayingMsgId(null); return }  // toggle off

    setTtsLoading(key)
    try {
      const textToSpeak = getMsgText(msg, lang)
      if (!textToSpeak?.trim()) throw new Error("No text available for this language")

      const res = await fetch("/api/sarvam/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: textToSpeak, targetLanguage: lang }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as Record<string, string>
        throw new Error(errData.details ?? errData.error ?? `HTTP ${res.status}`)
      }

      const data = await res.json() as { audioBase64?: string }
      if (!data.audioBase64) throw new Error("Sarvam returned no audio field")

      const binary = atob(data.audioBase64)
      const bytes  = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
      const blob   = new Blob([bytes], { type: "audio/wav" })
      const url    = URL.createObjectURL(blob)

      const audio  = new Audio(url)
      audioRef.current = audio
      setPlayingMsgId(key)
      audio.onended = () => { setPlayingMsgId(null); URL.revokeObjectURL(url) }
      audio.onerror = () => { setPlayingMsgId(null); URL.revokeObjectURL(url) }
      await audio.play()
    } catch (err) {
      console.error("[TTS] play error:", err)
      alert(`TTS failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setTtsLoading(null)
    }
  }, [ttsLoading, playingMsgId])

  const stopTTS = useCallback(() => {
    audioRef.current?.pause()
    setPlayingMsgId(null)
  }, [])


  /* ── Generate report ── */
  const generateReport = useCallback(async () => {
    if (!messages.length) return
    setReportLoading(true); setTab("report")
    try {
      const res  = await fetch("/api/sarvam/report", {
        method: "POST", headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ messages, patientName, patientAge, patientGender, department }),
      })
      const data = await res.json()
      const r    = data.report as MedicalReport
      setReport(r)
      // Pre-populate edit state
      const edits: Record<string, string> = {}
      REPORT_FIELDS.forEach(f => {
        const val = r[f.key]
        edits[f.key] = Array.isArray(val) ? val.join("\n") : String(val ?? "")
      })
      setReportEdits(edits)
    } finally { setReportLoading(false) }
  }, [messages, patientName, patientAge, patientGender, department])

  /* ── Download PDF ── */
  const downloadPDF = useCallback(() => {
    const finalReport = editingReport
      ? Object.fromEntries(REPORT_FIELDS.map(f => [
          f.key,
          f.isArray ? (reportEdits[f.key] ?? "").split("\n").filter(Boolean) : (reportEdits[f.key] ?? "")
        ]))
      : report

    if (!finalReport) return

    const now     = new Date().toLocaleString("en-IN")
    const deptLbl = department.replace(/_/g, " ")

    const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<title>Medical Report – ${patientName}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  * { box-sizing:border-box; margin:0; padding:0; }
  body { font-family: 'Inter', Arial, sans-serif; color: #1a1a2e; background: #fff; padding: 40px; font-size: 13px; }
  .header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; padding-bottom:20px; border-bottom:2px solid #0ea5e9; }
  .logo { font-size:20px; font-weight:700; color:#0ea5e9; }
  .logo span { color:#1a1a2e; }
  .report-title { font-size:22px; font-weight:700; color:#1a1a2e; margin-bottom:4px; }
  .meta { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; background:#f0f9ff; border:1px solid #bae6fd; border-radius:10px; padding:16px; margin-bottom:24px; }
  .meta-item label { font-size:10px; font-weight:600; text-transform:uppercase; color:#0284c7; letter-spacing:0.06em; display:block; margin-bottom:3px; }
  .meta-item span  { font-size:13px; font-weight:500; color:#1a1a2e; }
  .section { margin-bottom:18px; break-inside:avoid; }
  .section-header { display:flex; align-items:center; gap:8px; background:#0ea5e9; color:#fff; padding:8px 14px; border-radius:7px 7px 0 0; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:0.08em; }
  .section-body   { background:#f8fafc; border:1px solid #e2e8f0; border-top:none; border-radius:0 0 7px 7px; padding:12px 14px; }
  .section-body p { color:#334155; line-height:1.65; }
  .tag-list { display:flex; flex-wrap:wrap; gap:6px; margin-top:4px; }
  .tag { background:#dbeafe; color:#1d4ed8; border:1px solid #93c5fd; border-radius:100px; padding:3px 10px; font-size:12px; font-weight:500; }
  .tag.green  { background:#dcfce7; color:#166534; border-color:#86efac; }
  .tag.amber  { background:#fef9c3; color:#854d0e; border-color:#fde047; }
  .tag.purple { background:#f3e8ff; color:#7e22ce; border-color:#d8b4fe; }
  .footer { margin-top:32px; padding-top:16px; border-top:1px solid #e2e8f0; display:flex; justify-content:space-between; font-size:11px; color:#94a3b8; }
  .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
</style>
</head>
<body>
<div class="header">
  <div>
    <div class="logo">⚕ MediLingua <span>AI</span></div>
    <div style="font-size:11px;color:#64748b;margin-top:4px">AI-Powered Medical Documentation</div>
  </div>
  <div style="text-align:right">
    <div class="report-title">Consultation Report</div>
    <div style="font-size:12px;color:#64748b">${now}</div>
  </div>
</div>

<div class="meta">
  <div class="meta-item"><label>Patient Name</label><span>${patientName}</span></div>
  <div class="meta-item"><label>Age</label><span>${patientAge} years</span></div>
  <div class="meta-item"><label>Gender</label><span>${patientGender ?? "Not specified"}</span></div>
  <div class="meta-item"><label>Department</label><span>${deptLbl}</span></div>
  <div class="meta-item"><label>Visit ID</label><span style="font-size:11px">${visitId}</span></div>
  <div class="meta-item"><label>Messages</label><span>${messages.length} recorded</span></div>
</div>

<div class="section">
  <div class="section-header">🤒 Chief Complaint</div>
  <div class="section-body"><p>${finalReport.chiefComplaint || "Not documented"}</p></div>
</div>

<div class="section">
  <div class="section-header">📋 History of Present Illness</div>
  <div class="section-body"><p>${finalReport.historyOfPresentIllness || "Not documented"}</p></div>
</div>

<div class="grid2">
<div class="section">
  <div class="section-header">🔍 Symptoms</div>
  <div class="section-body">
    <div class="tag-list">
      ${(Array.isArray(finalReport.symptoms) ? finalReport.symptoms : [finalReport.symptoms]).filter(Boolean).map((s: string) => `<span class="tag">${s}</span>`).join("") || "<p>Not documented</p>"}
    </div>
  </div>
</div>
<div class="section">
  <div class="section-header">🩺 Examination Findings</div>
  <div class="section-body"><p>${finalReport.examFindings || "Not documented"}</p></div>
</div>
</div>

<div class="section">
  <div class="section-header">🔬 Diagnosis</div>
  <div class="section-body"><p style="font-weight:600;color:#0f172a">${finalReport.diagnosis || "Pending"}</p></div>
</div>

<div class="grid2">
<div class="section">
  <div class="section-header">💊 Treatment Plan</div>
  <div class="section-body">
    <div class="tag-list">
      ${(Array.isArray(finalReport.treatment) ? finalReport.treatment : [finalReport.treatment]).filter(Boolean).map((t: string) => `<span class="tag green">${t}</span>`).join("") || "<p>Not documented</p>"}
    </div>
  </div>
</div>
<div class="section">
  <div class="section-header">💉 Medications</div>
  <div class="section-body">
    <div class="tag-list">
      ${(Array.isArray(finalReport.medications) ? finalReport.medications : [finalReport.medications]).filter(Boolean).map((m: string) => `<span class="tag amber">${m}</span>`).join("") || "<p>None prescribed</p>"}
    </div>
  </div>
</div>
</div>

<div class="section">
  <div class="section-header">🧪 Investigations Ordered</div>
  <div class="section-body">
    <div class="tag-list">
      ${(Array.isArray(finalReport.investigations) ? finalReport.investigations : [finalReport.investigations]).filter(Boolean).map((i: string) => `<span class="tag purple">${i}</span>`).join("") || "<p>None ordered</p>"}
    </div>
  </div>
</div>

<div class="grid2">
<div class="section">
  <div class="section-header">📅 Follow-up Instructions</div>
  <div class="section-body"><p>${finalReport.followUp || "As needed"}</p></div>
</div>
<div class="section">
  <div class="section-header">📝 Additional Notes</div>
  <div class="section-body"><p>${finalReport.additionalNotes || "—"}</p></div>
</div>
</div>

<div class="footer">
  <span>Generated by MediLingua AI · ${now}</span>
  <span>CONFIDENTIAL — For clinical use only</span>
</div>
</body>
</html>`

    // Open in new tab and trigger print/save as PDF
    const win = window.open("", "_blank")
    if (win) {
      win.document.write(htmlContent)
      win.document.close()
      setTimeout(() => win.print(), 500)
    }
  }, [report, reportEdits, editingReport, patientName, patientAge, patientGender, department, visitId, messages.length])

  /* ── Save to DB ── */
  const handleSave = useCallback(async () => {
    setSaving(true)
    try {
      const finalReport = editingReport
        ? Object.fromEntries(REPORT_FIELDS.map(f => [
            f.key,
            f.isArray ? (reportEdits[f.key] ?? "").split("\n").filter(Boolean) : (reportEdits[f.key] ?? "")
          ]))
        : report
      await fetch(`/api/consultation/${visitId}/save`, {
        method: "POST", headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ messages, report: finalReport, language: patientLang }),
      })
      setSaved(true); setTimeout(() => setSaved(false), 3000)
    } finally { setSaving(false) }
  }, [messages, report, reportEdits, editingReport, visitId, patientLang])

  /* ── Complete consultation ── */
  const handleComplete = useCallback(async () => {
    if (!report) { alert("Please generate the report before completing."); return }
    setCompleting(true)
    try {
      // Save first if not already saved
      await fetch(`/api/consultation/${visitId}/save`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages, report, language: patientLang }),
      })
      // Then mark complete
      const res  = await fetch(`/api/consultation/${visitId}/complete`, { method: "POST" })
      const data = await res.json() as { success?: boolean }
      if (data.success) {
        setCompleted(true)
        setSessionActive(false)
      }
    } catch (err) {
      console.error("Complete error:", err)
    } finally {
      setCompleting(false)
    }
  }, [report, visitId, messages, patientLang])

  const endSession = useCallback(() => {
    setSessionActive(false)
    if (messages.length) generateReport()
  }, [messages.length, generateReport])

  /* ─────────────────── RENDER ─────────────────── */

  const renderPanel = (role: "patient"|"doctor") => {
    const isPat    = role === "patient"
    const lang     = isPat ? patientLang    : doctorLang
    const setLang  = isPat ? setPatientLang : setDoctorLang
    const rec      = isPat ? patientRec     : doctorRec
    const typing   = isPat ? patientTyping  : doctorTyping
    const setTyping= isPat ? setPatientTyping : setDoctorTyping
    const loading  = isPat ? patientLoading : doctorLoading
    const panelMsgs= messages.filter(m => m.role === role)

    return (
      <div style={{ flex:1, display:"flex", flexDirection:"column", borderRight: isPat ? "1px solid rgba(56,189,248,0.08)" : "none", background:"rgba(8,12,20,0.45)", minWidth:0 }}>

        {/* Header */}
        <div style={{ padding:"13px 18px", borderBottom:"1px solid rgba(56,189,248,0.08)", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, background:"rgba(8,12,20,0.6)" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:34, height:34, borderRadius:"50%", background: isPat?"rgba(56,189,248,0.1)":"linear-gradient(135deg,rgba(56,189,248,0.2),rgba(14,165,233,0.1))", border:"1px solid rgba(56,189,248,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>
              {isPat ? "👤" : "👨‍⚕️"}
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:"#e8edf5" }}>{isPat ? "Patient" : "Doctor"}</div>
              <div style={{ fontSize:11, color:"#4a5568" }}>{isPat ? patientName : "Consultation Notes"}</div>
            </div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:7 }}>
            <span style={{ fontSize:10, color:"#4a5568", textTransform:"uppercase", letterSpacing:"0.08em" }}>Speaking:</span>
            <select
              value={lang} onChange={e => setLang(e.target.value)}
              style={{ background:"rgba(8,12,20,0.9)", border:"1px solid rgba(56,189,248,0.15)", borderRadius:7, padding:"4px 9px", fontSize:12, color:"#8b9ab5", fontFamily:"'DM Sans',sans-serif", outline:"none", cursor:"pointer" }}
            >
              {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflowY:"auto", padding:"14px 18px", display:"flex", flexDirection:"column", gap:10 }}>
          {panelMsgs.length === 0 && (
            <div style={{ textAlign:"center", marginTop:32, color:"#4a5568", fontSize:13 }}>
              {sessionActive ? `${isPat?"Patient":"Doctor"} speech appears here…` : "Start session to begin"}
            </div>
          )}

          {panelMsgs.map(msg => (
            <div key={msg.id} style={{ alignSelf: isPat?"flex-start":"flex-end", maxWidth:"92%", animation:"slideUp 0.3s ease both" }}>
              <div style={{ background: isPat?"rgba(13,19,33,0.92)":"rgba(14,165,233,0.08)", border:`1px solid rgba(56,189,248,${isPat?0.15:0.22})`, borderRadius: isPat?"12px 12px 12px 4px":"12px 12px 4px 12px", padding:"11px 14px" }}>

                {/* Original text — with inline edit for doctor */}
                {editingMsgId === msg.id ? (
                  <div style={{ marginBottom:8 }}>
                    <div style={{ fontSize:10, color:"#38bdf8", fontWeight:600, letterSpacing:"0.08em", marginBottom:5, display:"flex", alignItems:"center", gap:6 }}>
                      ✏ EDITING TRANSCRIPTION
                      <span style={{ color:"#4a5568", fontWeight:400, fontSize:9 }}>Correct the transcribed text, then save to re-translate</span>
                    </div>
                    <textarea
                      value={editDraft}
                      onChange={e => setEditDraft(e.target.value)}
                      autoFocus
                      rows={3}
                      style={{
                        width:"100%", background:"rgba(56,189,248,0.05)",
                        border:"1.5px solid rgba(56,189,248,0.35)", borderRadius:8,
                        padding:"9px 11px", fontSize:14, color:"#e8edf5",
                        fontFamily:"'DM Sans',sans-serif", outline:"none",
                        resize:"vertical" as const, lineHeight:1.55,
                        caretColor:"#38bdf8",
                      }}
                    />
                    <div style={{ display:"flex", gap:7, marginTop:6 }}>
                      <button
                        onClick={() => saveEdit(msg)}
                        disabled={!editDraft.trim()}
                        style={{ flex:1, background:"linear-gradient(135deg,#38bdf8,#0ea5e9)", color:"#080c14", border:"none", borderRadius:7, padding:"6px 0", fontSize:12, fontWeight:700, fontFamily:"'DM Sans',sans-serif", cursor:"pointer" }}
                      >
                        ✓ Save & Re-translate
                      </button>
                      <button
                        onClick={cancelEdit}
                        style={{ background:"rgba(239,68,68,0.1)", color:"#ef4444", border:"1px solid rgba(239,68,68,0.25)", borderRadius:7, padding:"6px 14px", fontSize:12, fontWeight:600, fontFamily:"'DM Sans',sans-serif", cursor:"pointer" }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize:14, color:"#e8edf5", lineHeight:1.55, marginBottom:6 }}>{msg.text}</div>
                )}

                {/* All 3 translations */}
                <div style={{ borderTop:"1px solid rgba(56,189,248,0.08)", paddingTop:8, display:"flex", flexDirection:"column", gap:5 }}>
                  {[
                    { code:"en-IN", label:"EN", text: msg.english  },
                    { code:"hi-IN", label:"HI", text: msg.hindi    },
                    { code:"kn-IN", label:"KN", text: msg.kannada  },
                  ].filter(t => t.code !== msg.language && t.text && t.text !== msg.text).map(t => (
                    <div key={t.code} style={{ display:"flex", gap:7, alignItems:"flex-start" }}>
                      <span style={{ fontSize:9, fontWeight:700, color:"#38bdf8", background:"rgba(56,189,248,0.1)", border:"1px solid rgba(56,189,248,0.2)", borderRadius:4, padding:"1px 5px", flexShrink:0, marginTop:2 }}>{t.label}</span>
                      <span style={{ fontSize:12, color:"#8b9ab5", lineHeight:1.5 }}>{t.text}</span>
                    </div>
                  ))}
                </div>

                {/* Bottom row: timestamp + TTS button for doctor messages */}
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginTop:8 }}>
                  <div style={{ display:"flex", gap:7, alignItems:"center" }}>
                    <span style={{ fontSize:11, color:"#4a5568" }}>{msg.timestamp}</span>
                    <span style={{ fontSize:10, color:"#4a5568", background:"rgba(56,189,248,0.06)", borderRadius:4, padding:"1px 6px" }}>🎤 {LANG_LABELS[msg.language]}</span>
                    {/* Edit transcription button — always visible, hides while editing */}
                    {editingMsgId !== msg.id && (
                      <button
                        onClick={() => startEdit(msg)}
                        title="Edit transcription"
                        style={{
                          background:"transparent", border:"1px solid rgba(56,189,248,0.15)",
                          borderRadius:5, padding:"1px 7px", fontSize:10, color:"#4a5568",
                          cursor:"pointer", fontFamily:"'DM Sans',sans-serif",
                          display:"flex", alignItems:"center", gap:3, transition:"all 0.15s",
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color="#38bdf8"; (e.currentTarget as HTMLButtonElement).style.borderColor="rgba(56,189,248,0.4)" }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color="#4a5568"; (e.currentTarget as HTMLButtonElement).style.borderColor="rgba(56,189,248,0.15)" }}
                      >
                        ✏ Edit
                      </button>
                    )}
                  </div>

                  {/* TTS: 3 language play buttons for doctor messages */}
                  {!isPat && (
                    <div style={{ display:"flex", gap:5, alignItems:"center" }}>
                      <span style={{ fontSize:9, color:"#4a5568", textTransform:"uppercase" as const, letterSpacing:"0.07em" }}>Play:</span>
                      {([
                        { code:"en-IN", label:"EN" },
                        { code:"hi-IN", label:"HI" },
                        { code:"kn-IN", label:"KN" },
                      ] as const).map(({ code, label }) => {
                        const key       = `${msg.id}:${code}`
                        const isPlaying = playingMsgId === key
                        const isLoading = ttsLoading   === key
                        const otherBusy = !!ttsLoading && ttsLoading !== key
                        return (
                          <button
                            key={code}
                            onClick={() => isPlaying ? stopTTS() : playTTS(msg, code)}
                            disabled={otherBusy}
                            title={`Play in ${LANG_LABELS[code]}`}
                            style={{
                              display:"flex", alignItems:"center", gap:3,
                              background: isPlaying ? "rgba(52,211,153,0.15)" : "rgba(56,189,248,0.07)",
                              border: `1px solid ${isPlaying ? "rgba(52,211,153,0.4)" : "rgba(56,189,248,0.18)"}`,
                              borderRadius:6, padding:"3px 8px",
                              fontSize:10, fontWeight:700,
                              color: isPlaying ? "#34d399" : "#38bdf8",
                              cursor: otherBusy ? "not-allowed" : "pointer",
                              fontFamily:"'DM Sans',sans-serif", transition:"all 0.2s",
                              opacity: otherBusy ? 0.35 : 1, minWidth:36,
                            }}
                          >
                            {isLoading
                              ? <span style={{ width:9,height:9,border:"1.5px solid rgba(56,189,248,0.3)",borderTopColor:"#38bdf8",borderRadius:"50%",animation:"spin 0.7s linear infinite",display:"inline-block" }} />
                              : isPlaying ? "⏹" : "▶"
                            }
                            {" "}{label}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display:"flex", alignItems:"center", gap:7, color:"#4a5568", fontSize:13 }}>
              <span style={{ width:14,height:14,border:"2px solid rgba(56,189,248,0.2)",borderTopColor:"#38bdf8",borderRadius:"50%",animation:"spin 0.7s linear infinite",display:"inline-block" }} />
              Transcribing all languages…
            </div>
          )}

          {isPat && <div ref={bottomRef} />}
        </div>

        {/* Input bar */}
        <div style={{ padding:"12px 14px", borderTop:"1px solid rgba(56,189,248,0.08)", background:"rgba(8,12,20,0.85)", flexShrink:0 }}>
          {rec && (
            <div style={{ display:"flex", alignItems:"center", gap:5, marginBottom:8 }}>
              {[0,1,2,3,4,5].map(i => (
                <div key={i} style={{ width:3, borderRadius:2, background:"#ef4444", animation:`waveform 0.6s ${i*0.09}s ease-in-out infinite` }} />
              ))}
              <span style={{ fontSize:11, color:"#ef4444", fontWeight:500, marginLeft:4 }}>Recording… tap ⏹ to stop</span>
            </div>
          )}
          <div style={{ display:"flex", gap:9, alignItems:"flex-end" }}>
            <button
              onClick={() => sessionActive && (rec ? stopRecording(role) : startRecording(role))}
              disabled={!sessionActive}
              style={{ width:42,height:42,borderRadius:"50%",border:`1px solid rgba(${rec?"239,68,68":"56,189,248"},${rec?0.4:0.2})`, background:`rgba(${rec?"239,68,68":"56,189,248"},${rec?0.15:0.1})`,cursor:sessionActive?"pointer":"not-allowed",display:"flex",alignItems:"center",justifyContent:"center",fontSize:19,flexShrink:0,position:"relative",transition:"all 0.2s" }}
            >
              {rec ? "⏹" : "🎤"}
              {rec && <span style={{ position:"absolute",inset:-4,borderRadius:"50%",border:"2px solid rgba(239,68,68,0.5)",animation:"ripple 1.2s ease-out infinite" }} />}
            </button>
            <textarea
              rows={1}
              placeholder={isPat ? "Type your message…" : "Type your response…"}
              value={typing}
              onChange={e => setTyping(e.target.value)}
              onKeyDown={e => { if (e.key==="Enter"&&!e.shiftKey){ e.preventDefault(); sendTyped(role) } }}
              disabled={!sessionActive}
              style={{ flex:1,background:"rgba(8,12,20,0.8)",border:"1px solid rgba(56,189,248,0.12)",borderRadius:9,padding:"10px 13px",fontSize:14,color:"#e8edf5",fontFamily:"'DM Sans',sans-serif",outline:"none",resize:"none",caretColor:"#38bdf8",lineHeight:"1.5" }}
            />
            <button
              onClick={() => sendTyped(role)}
              disabled={!sessionActive || !typing.trim()}
              style={{ width:36,height:36,borderRadius:8,border:"none",cursor:sessionActive&&typing.trim()?"pointer":"not-allowed",background:"linear-gradient(135deg,#38bdf8,#0ea5e9)",color:"#080c14",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0,opacity:sessionActive&&typing.trim()?1:0.4,transition:"all 0.2s" }}
            >➤</button>
          </div>
        </div>
      </div>
    )
  }

  /* ─── MAIN RETURN ─── */
  return (
    <div style={{ minHeight:"100vh", background:"#080c14", color:"#e8edf5", fontFamily:"'DM Sans','Segoe UI',sans-serif", display:"flex", flexDirection:"column" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=Syne:wght@700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        body::after { content:''; position:fixed; inset:0; background:repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(0,0,0,0.03) 2px,rgba(0,0,0,0.03) 4px); pointer-events:none; z-index:9999; }
        @keyframes fadeIn  { from{opacity:0}to{opacity:1} }
        @keyframes slideUp { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)} }
        @keyframes pulse   { 0%,100%{opacity:1}50%{opacity:0.4} }
        @keyframes spin    { to{transform:rotate(360deg)} }
        @keyframes ripple  { 0%{transform:scale(1);opacity:0.7}100%{transform:scale(2.2);opacity:0} }
        @keyframes waveform{ 0%,100%{height:5px}50%{height:20px} }
        option { background:#0d1321; color:#e8edf5; }
      `}</style>

      {/* ── Navbar ── */}
      <nav style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"12px 22px", background:"rgba(8,12,20,0.96)", backdropFilter:"blur(20px)", borderBottom:"1px solid rgba(56,189,248,0.1)", flexShrink:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:9 }}>
          <div style={{ width:28,height:28,background:"linear-gradient(135deg,#38bdf8,#0ea5e9)",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,boxShadow:"0 0 12px rgba(56,189,248,0.35)" }}>⚕</div>
          <span style={{ fontFamily:"'Syne',sans-serif",fontSize:16,fontWeight:700,color:"#e8edf5",letterSpacing:"-0.02em" }}>
            MediLingua <span style={{ color:"#38bdf8" }}>AI</span>
          </span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          {sessionActive && (
            <>
              <div style={{ display:"flex",alignItems:"center",gap:6,background:"rgba(52,211,153,0.08)",border:"1px solid rgba(52,211,153,0.25)",borderRadius:100,padding:"4px 12px" }}>
                <span style={{ width:5,height:5,background:"#34d399",borderRadius:"50%",animation:"pulse 1.5s infinite" }} />
                <span style={{ fontSize:11,color:"#34d399",fontWeight:600 }}>Session Active</span>
              </div>
              <div style={{ background:"rgba(13,19,33,0.9)",border:"1px solid rgba(56,189,248,0.15)",borderRadius:100,padding:"4px 13px",fontSize:12,fontWeight:600,color:"#e8edf5",fontVariantNumeric:"tabular-nums" }}>
                ⏱ {fmt(sessionSeconds)}
              </div>
            </>
          )}
          {!sessionActive
            ? <button onClick={() => setSessionActive(true)} style={{ background:"linear-gradient(135deg,#38bdf8,#0ea5e9)",color:"#080c14",padding:"8px 18px",borderRadius:8,border:"none",fontSize:13,fontWeight:700,fontFamily:"'DM Sans',sans-serif",cursor:"pointer" }}>▶ Start</button>
            : <button onClick={endSession} style={{ background:"rgba(239,68,68,0.1)",color:"#ef4444",padding:"8px 18px",borderRadius:8,border:"1px solid rgba(239,68,68,0.3)",fontSize:13,fontWeight:700,fontFamily:"'DM Sans',sans-serif",cursor:"pointer" }}>✕ End Session</button>
          }
          <Link href="/doctor/dashboard" style={{ fontSize:12,color:"#8b9ab5",textDecoration:"none",padding:"6px 11px",borderRadius:7,border:"1px solid rgba(56,189,248,0.1)" }}>← Queue</Link>
        </div>
      </nav>

      {/* Patient strip */}
      <div style={{ background:"rgba(13,19,33,0.7)",borderBottom:"1px solid rgba(56,189,248,0.08)",padding:"8px 22px",display:"flex",gap:18,alignItems:"center",flexShrink:0 }}>
        <span style={{ fontSize:12,color:"#8b9ab5" }}>Patient: <b style={{ color:"#e8edf5" }}>{patientName}</b></span>
        <span style={{ fontSize:12,color:"#8b9ab5" }}>Age: <b style={{ color:"#e8edf5" }}>{patientAge}</b></span>
        <span style={{ fontSize:12,color:"#8b9ab5" }}>Dept: <b style={{ color:"#38bdf8" }}>{department.replace(/_/g," ")}</b></span>
        <span style={{ marginLeft:"auto",fontSize:11,color:sessionActive?"#34d399":"#4a5568" }}>
          {sessionActive ? `${messages.length} message${messages.length!==1?"s":""}` : "Session not started"}
        </span>
      </div>

      {/* ── History sidebar + dual panels ── */}
      <div style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0 }}>

        {/* ── Patient History Sidebar ── */}
        {patientHistory.length > 0 && (
          <div style={{
            width: historyOpen ? 280 : 36, flexShrink:0, transition:"width 0.25s ease",
            borderRight:"1px solid rgba(56,189,248,0.1)", background:"rgba(8,12,20,0.7)",
            display:"flex", flexDirection:"column", overflow:"hidden",
          }}>
            {/* Sidebar toggle header */}
            <div
              onClick={() => setHistoryOpen(o => !o)}
              style={{ padding:"10px 12px", borderBottom:"1px solid rgba(56,189,248,0.08)", display:"flex", alignItems:"center", gap:8, cursor:"pointer", flexShrink:0, background:"rgba(13,19,33,0.6)" }}
            >
              <span style={{ fontSize:14 }}>🕐</span>
              {historyOpen && (
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:12, fontWeight:700, color:"#e8edf5" }}>Patient History</div>
                  <div style={{ fontSize:10, color:"#4a5568" }}>{patientHistory.length} past visit{patientHistory.length!==1?"s":""}</div>
                </div>
              )}
              <span style={{ fontSize:11, color:"#38bdf8", marginLeft:"auto" }}>{historyOpen ? "◀" : "▶"}</span>
            </div>

            {/* History list */}
            {historyOpen && (
              <div style={{ flex:1, overflowY:"auto", padding:"8px" }}>
                {patientHistory.map((visit, vi) => {
                  const isExpanded = expandedVisit === visit.visitId
                  const date       = new Date(visit.date)
                  const dateStr    = date.toLocaleDateString("en-IN", { day:"numeric", month:"short", year:"numeric" })

                  return (
                    <div key={visit.visitId} style={{ marginBottom:8 }}>
                      {/* Visit header */}
                      <div
                        onClick={() => setExpandedVisit(isExpanded ? null : visit.visitId)}
                        style={{
                          background: isExpanded ? "rgba(56,189,248,0.1)" : "rgba(13,19,33,0.8)",
                          border:`1px solid rgba(56,189,248,${isExpanded?0.3:0.1})`,
                          borderRadius:8, padding:"9px 10px", cursor:"pointer",
                          display:"flex", flexDirection:"column", gap:3,
                        }}
                      >
                        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                          <span style={{ fontSize:11, fontWeight:700, color: isExpanded?"#38bdf8":"#e8edf5" }}>
                            {visit.department.replace(/_/g," ")}
                          </span>
                          <span style={{ fontSize:9, color:"#4a5568" }}>{isExpanded?"▲":"▼"}</span>
                        </div>
                        <span style={{ fontSize:10, color:"#4a5568" }}>{dateStr}</span>
                        <span style={{ fontSize:10, color:"#8b9ab5" }}>
                          {visit.reports.length} report{visit.reports.length!==1?"s":""}
                        </span>
                      </div>

                      {/* Reports for this visit */}
                      {isExpanded && visit.reports.map((rep, ri) => {
                        const isRepExpanded = expandedVisit === visit.visitId && expandedReport === ri
                        const savedAt = rep._savedAt ? new Date(rep._savedAt as string).toLocaleTimeString("en-IN", { hour:"2-digit", minute:"2-digit" }) : ""
                        return (
                          <div key={ri} style={{ marginTop:4, marginLeft:8, borderLeft:"2px solid rgba(56,189,248,0.15)", paddingLeft:8 }}>
                            {/* Report header */}
                            <div
                              onClick={() => setExpandedReport(isRepExpanded ? null : ri)}
                              style={{ padding:"7px 8px", background:"rgba(8,12,20,0.9)", borderRadius:6, cursor:"pointer", border:"1px solid rgba(56,189,248,0.08)" }}
                            >
                              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                                <span style={{ fontSize:10, fontWeight:600, color:"#38bdf8" }}>
                                  Report {typeof rep._sessionIndex === "number" ? rep._sessionIndex : ri + 1}
                                </span>
                                <span style={{ fontSize:9, color:"#4a5568" }}>{savedAt} {isRepExpanded?"▲":"▼"}</span>
                              </div>
                              {rep.diagnosis && (
                                <div style={{ fontSize:10, color:"#8b9ab5", marginTop:3, lineHeight:1.4 }}>
                                  Dx: {String(rep.diagnosis).slice(0,60)}{String(rep.diagnosis).length > 60 ? "…" : ""}
                                </div>
                              )}
                            </div>

                            {/* Expanded report detail */}
                            {isRepExpanded && (
                              <div style={{ background:"rgba(8,12,20,0.95)", border:"1px solid rgba(56,189,248,0.1)", borderRadius:"0 0 7px 7px", padding:"9px 10px", display:"flex", flexDirection:"column", gap:7 }}>
                                {[
                                  { label:"Chief Complaint", value: rep.chiefComplaint },
                                  { label:"Diagnosis",       value: rep.diagnosis       },
                                  { label:"Symptoms",        value: Array.isArray(rep.symptoms) ? (rep.symptoms as string[]).join(", ") : rep.symptoms },
                                  { label:"Medications",     value: Array.isArray(rep.medications) ? (rep.medications as string[]).join(", ") : rep.medications },
                                  { label:"Treatment",       value: Array.isArray(rep.treatment)  ? (rep.treatment  as string[]).join(", ") : rep.treatment  },
                                  { label:"Follow-up",       value: rep.followUp        },
                                ].filter(f => f.value).map(f => (
                                  <div key={f.label}>
                                    <div style={{ fontSize:9, fontWeight:700, color:"#38bdf8", textTransform:"uppercase" as const, letterSpacing:"0.07em", marginBottom:2 }}>{f.label}</div>
                                    <div style={{ fontSize:11, color:"#c8d6e8", lineHeight:1.5 }}>{String(f.value)}</div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Consultation panels ── */}
        <div style={{ flex:1, display:"flex", overflow:"hidden", minHeight:0 }}>
          {renderPanel("patient")}
          <div style={{ width:44,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,background:"rgba(8,12,20,0.25)" }}>
            <div style={{ width:28,height:28,borderRadius:"50%",background:"rgba(56,189,248,0.05)",border:"1px solid rgba(56,189,248,0.1)",display:"flex",alignItems:"center",justifyContent:"center",color:"#4a5568",fontSize:12 }}>⇄</div>
          </div>
          {renderPanel("doctor")}
        </div>
      </div>


      {/* ── Bottom panel ── */}
      <div style={{ height:310,flexShrink:0,borderTop:"1px solid rgba(56,189,248,0.12)",background:"rgba(10,15,26,0.97)",display:"flex",flexDirection:"column" }}>

        {/* Tab bar */}
        <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:"8px 18px",borderBottom:"1px solid rgba(56,189,248,0.08)",flexShrink:0 }}>
          <div style={{ display:"flex",gap:6,alignItems:"center" }}>
            {(["transcript","report"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ padding:"6px 16px",borderRadius:7,border:`1px solid ${tab===t?"rgba(56,189,248,0.3)":"transparent"}`,background:tab===t?"rgba(56,189,248,0.1)":"transparent",color:tab===t?"#38bdf8":"#8b9ab5",fontSize:12,fontWeight:500,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",display:"flex",alignItems:"center",gap:6 }}>
                {t==="transcript" ? "📝 Transcript" : "📋 Report"}
                {t==="report" && report && <span style={{ width:6,height:6,background:"#34d399",borderRadius:"50%",display:"inline-block" }} />}
              </button>
            ))}

            {/* Transcript language selector */}
            {tab === "transcript" && (
              <div style={{ display:"flex",alignItems:"center",gap:6,marginLeft:8 }}>
                <span style={{ fontSize:10,color:"#4a5568",textTransform:"uppercase",letterSpacing:"0.08em" }}>Show in:</span>
                <select
                  value={transcriptLang} onChange={e => setTranscriptLang(e.target.value)}
                  style={{ background:"rgba(8,12,20,0.9)",border:"1px solid rgba(56,189,248,0.15)",borderRadius:6,padding:"3px 8px",fontSize:11,color:"#8b9ab5",fontFamily:"'DM Sans',sans-serif",outline:"none",cursor:"pointer" }}
                >
                  {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
                </select>
              </div>
            )}
          </div>

          <div style={{ display:"flex",gap:8 }}>
            {tab==="report" && report && (
              <>
                <button onClick={() => setEditingReport(e => !e)} style={{ background:"transparent",border:"1px solid rgba(56,189,248,0.2)",borderRadius:7,padding:"5px 12px",fontSize:11,color:"#38bdf8",cursor:"pointer",fontFamily:"'DM Sans',sans-serif" }}>
                  {editingReport ? "✓ Done" : "✏ Edit"}
                </button>
                <button onClick={downloadPDF} style={{ background:"rgba(52,211,153,0.08)",border:"1px solid rgba(52,211,153,0.25)",borderRadius:7,padding:"5px 12px",fontSize:11,color:"#34d399",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",display:"flex",alignItems:"center",gap:5 }}>
                  ⬇ Download PDF
                </button>
              </>
            )}
            <button onClick={generateReport} disabled={!messages.length||reportLoading} style={{ background:"rgba(56,189,248,0.08)",border:"1px solid rgba(56,189,248,0.2)",borderRadius:7,padding:"5px 12px",fontSize:11,color:"#38bdf8",cursor:messages.length?"pointer":"not-allowed",fontFamily:"'DM Sans',sans-serif",opacity:messages.length?1:0.4,display:"flex",alignItems:"center",gap:5 }}>
              {reportLoading ? <><span style={{ width:11,height:11,border:"1.5px solid rgba(56,189,248,0.2)",borderTopColor:"#38bdf8",borderRadius:"50%",animation:"spin 0.7s linear infinite",display:"inline-block" }} /> Generating…</> : "⚡ Generate"}
            </button>
            <button onClick={handleSave} disabled={saving||!messages.length} style={{ background:"linear-gradient(135deg,#38bdf8,#0ea5e9)",color:"#080c14",padding:"5px 18px",borderRadius:7,border:"none",fontSize:12,fontWeight:700,fontFamily:"'DM Sans',sans-serif",cursor:messages.length?"pointer":"not-allowed",opacity:messages.length?1:0.5,display:"flex",alignItems:"center",gap:5 }}>
              {saving ? <><span style={{ width:11,height:11,border:"1.5px solid rgba(8,12,20,0.3)",borderTopColor:"#080c14",borderRadius:"50%",animation:"spin 0.7s linear infinite",display:"inline-block" }} /> Saving…</> : saved ? "✓ Saved!" : "💾 Save"}
            </button>
            {/* Complete Consultation button — shown only after report is generated */}
            {report && !completed && (
              <button
                onClick={handleComplete}
                disabled={completing}
                style={{
                  background: completing ? "rgba(52,211,153,0.1)" : "linear-gradient(135deg,#34d399,#10b981)",
                  color:"#080c14", padding:"5px 18px", borderRadius:7, border:"none",
                  fontSize:12, fontWeight:700, fontFamily:"'DM Sans',sans-serif",
                  cursor: completing ? "not-allowed" : "pointer",
                  display:"flex", alignItems:"center", gap:5,
                }}
              >
                {completing
                  ? <><span style={{ width:11,height:11,border:"1.5px solid rgba(8,12,20,0.3)",borderTopColor:"#080c14",borderRadius:"50%",animation:"spin 0.7s linear infinite",display:"inline-block" }} /> Completing...</>
                  : "✅ Complete"
                }
              </button>
            )}
            {completed && (
              <div style={{ display:"flex",alignItems:"center",gap:6,background:"rgba(52,211,153,0.1)",border:"1px solid rgba(52,211,153,0.3)",borderRadius:7,padding:"5px 14px",fontSize:12,fontWeight:600,color:"#34d399",flexShrink:0 }}>
                ✓ Completed
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div style={{ flex:1,overflowY:"auto",padding:"12px 18px" }}>

          {/* ── Transcript tab ── */}
          {tab==="transcript" && (
            <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
              {messages.length===0 && <div style={{ textAlign:"center",color:"#4a5568",fontSize:12,marginTop:14 }}>Conversation transcript will appear here. Select a language above to change the display language.</div>}
              {messages.map(msg => (
                <div key={msg.id} style={{ display:"flex",gap:9,alignItems:"flex-start",animation:"fadeIn 0.3s ease" }}>
                  <span style={{ fontSize:10,color:"#4a5568",minWidth:34,marginTop:2,fontVariantNumeric:"tabular-nums" }}>{msg.timestamp}</span>
                  <span style={{ fontSize:11,fontWeight:700,minWidth:50,color:msg.role==="patient"?"#38bdf8":"#34d399" }}>{msg.role==="patient"?"Patient":"Doctor"}</span>
                  <span style={{ fontSize:13,color:"#e8edf5",lineHeight:1.55,flex:1 }}>
                    {getMsgText(msg, transcriptLang)}
                  </span>
                  <span style={{ fontSize:9,color:"#4a5568",background:"rgba(56,189,248,0.06)",borderRadius:4,padding:"1px 5px",flexShrink:0,marginTop:2 }}>
                    {LANG_LABELS[msg.language]}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ── Report tab ── */}
          {tab==="report" && (
            <div>
              {reportLoading && <div style={{ display:"flex",alignItems:"center",gap:9,color:"#8b9ab5",fontSize:13,justifyContent:"center",marginTop:20 }}><span style={{ width:16,height:16,border:"2px solid rgba(56,189,248,0.2)",borderTopColor:"#38bdf8",borderRadius:"50%",animation:"spin 0.7s linear infinite",display:"inline-block" }} /> Generating structured report with AI…</div>}
              {!reportLoading&&!report && <div style={{ textAlign:"center",color:"#4a5568",fontSize:12,marginTop:14 }}>Click "⚡ Generate" after the consultation to build a structured medical report.</div>}
              {!reportLoading&&report && (
                <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:8 }}>
                  {REPORT_FIELDS.map(f => {
                    const val = report[f.key]
                    const isEmpty = Array.isArray(val) ? val.length===0 : !val
                    return (
                      <div key={f.key} style={{ background:"rgba(13,19,33,0.75)",border:`1px solid rgba(56,189,248,${isEmpty?0.06:0.14})`,borderRadius:10,padding:"10px 12px" }}>
                        <div style={{ fontSize:9,fontWeight:600,letterSpacing:"0.1em",textTransform:"uppercase" as const,color: isEmpty?"#4a5568":"#38bdf8",marginBottom:7,display:"flex",gap:5,alignItems:"center" }}>
                          <span>{f.icon}</span>{f.label}
                        </div>
                        {editingReport ? (
                          <textarea
                            value={reportEdits[f.key]??""}
                            onChange={e => setReportEdits(r=>({...r,[f.key]:e.target.value}))}
                            rows={f.isArray?3:2}
                            placeholder={f.isArray?"One item per line…":""}
                            style={{ width:"100%",background:"rgba(8,12,20,0.7)",border:"1px solid rgba(56,189,248,0.12)",borderRadius:6,padding:"7px 9px",fontSize:12,color:"#e8edf5",fontFamily:"'DM Sans',sans-serif",outline:"none",resize:"vertical" as const }}
                          />
                        ) : f.isArray ? (
                          <div style={{ display:"flex",flexWrap:"wrap" as const,gap:4 }}>
                            {(Array.isArray(val) ? val as string[] : [String(val)]).filter(Boolean).length === 0
                              ? <span style={{ fontSize:12,color:"#4a5568" }}>—</span>
                              : (Array.isArray(val) ? val as string[] : [String(val)]).filter(Boolean).map((item,i) => (
                                  <span key={i} style={{ background:"rgba(56,189,248,0.08)",border:"1px solid rgba(56,189,248,0.15)",borderRadius:100,padding:"2px 9px",fontSize:11,color:"#7dd3fc" }}>{item}</span>
                                ))
                            }
                          </div>
                        ) : (
                          <div style={{ fontSize:12,color: isEmpty?"#4a5568":"#e8edf5",lineHeight:1.6 }}>
                            {String(val || "—")}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}