// app/api/sarvam/transcribe/route.ts
// Transcribes audio then translates to all supported South Indian languages + Hindi + English

import { NextRequest, NextResponse } from "next/server"

const KEY = process.env.SARVAM_API_KEY!

// All languages MediLingua supports
export const SUPPORTED_LANGS = ["en-IN", "hi-IN", "kn-IN", "ta-IN", "te-IN", "ml-IN"] as const
export type LangCode = typeof SUPPORTED_LANGS[number]

async function sttSarvam(audioBase64: string, languageCode: string): Promise<string> {
  const audioBuffer = Buffer.from(audioBase64, "base64")
  const audioBlob   = new Blob([audioBuffer], { type: "audio/wav" })
  const formData    = new FormData()
  formData.append("file",             audioBlob, "audio.wav")
  formData.append("language_code",    languageCode)
  formData.append("model",            "saarika:v2.5")
  formData.append("with_timestamps",  "false")

  const res = await fetch("https://api.sarvam.ai/speech-to-text", {
    method:  "POST",
    headers: { "api-subscription-key": KEY },
    body:    formData,
  })
  if (!res.ok) throw new Error(`Sarvam STT failed: ${await res.text()}`)
  const data = await res.json()
  return data.transcript ?? ""
}

async function translateSarvam(text: string, source: string, target: string): Promise<string> {
  if (source === target || !text.trim()) return text
  const res = await fetch("https://api.sarvam.ai/translate", {
    method:  "POST",
    headers: { "api-subscription-key": KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      input:                text,
      source_language_code: source,
      target_language_code: target,
      speaker_gender:       "Male",
      mode:                 "formal",
      model:                "mayura:v1",
      enable_preprocessing: false,
    }),
  })
  if (!res.ok) return text
  const data = await res.json()
  return data.translated_text ?? text
}

export async function POST(req: NextRequest) {
  try {
    const { audioBase64, languageCode } = await req.json()

    if (!audioBase64 || !languageCode) {
      return NextResponse.json({ error: "Missing audioBase64 or languageCode" }, { status: 400 })
    }

    // Step 1 — Transcribe in speaker's language
    const originalText = await sttSarvam(audioBase64, languageCode)

    if (!originalText.trim()) {
      return NextResponse.json({
        original: "", english: "", hindi: "",
        kannada: "", tamil: "", telugu: "", malayalam: "",
        languageCode,
      })
    }

    // Step 2 — Translate to English first (pivot language)
    const english = languageCode === "en-IN"
      ? originalText
      : await translateSarvam(originalText, languageCode, "en-IN")

    // Step 3 — Translate from English to all other languages in parallel
    const [hindi, kannada, tamil, telugu, malayalam] = await Promise.all([
      languageCode === "hi-IN" ? originalText : translateSarvam(english, "en-IN", "hi-IN"),
      languageCode === "kn-IN" ? originalText : translateSarvam(english, "en-IN", "kn-IN"),
      languageCode === "ta-IN" ? originalText : translateSarvam(english, "en-IN", "ta-IN"),
      languageCode === "te-IN" ? originalText : translateSarvam(english, "en-IN", "te-IN"),
      languageCode === "ml-IN" ? originalText : translateSarvam(english, "en-IN", "ml-IN"),
    ])

    return NextResponse.json({
      original: originalText,
      english,
      hindi,
      kannada,
      tamil,
      telugu,
      malayalam,
      languageCode,
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("[transcribe] error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}