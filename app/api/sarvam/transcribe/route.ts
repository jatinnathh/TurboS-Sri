// app/api/sarvam/transcribe/route.ts
// Receives audio + speaker language
// Returns transcript in original language + Hindi + English + Kannada

import { NextRequest, NextResponse } from "next/server"

const KEY = process.env.SARVAM_API_KEY!

async function sttSarvam(audioBase64: string, languageCode: string): Promise<string> {
  const audioBuffer = Buffer.from(audioBase64, "base64")
  const audioBlob   = new Blob([audioBuffer], { type: "audio/wav" })
  const formData    = new FormData()
  formData.append("file", audioBlob, "audio.wav")
  formData.append("language_code", languageCode)
  formData.append("model", "saarika:v2.5")
  formData.append("with_timestamps", "false")

  const res = await fetch("https://api.sarvam.ai/speech-to-text", {
    method: "POST",
    headers: { "api-subscription-key": KEY },
    body: formData,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Sarvam STT failed: ${err}`)
  }
  const data = await res.json()
  return data.transcript ?? ""
}

async function translateSarvam(text: string, source: string, target: string): Promise<string> {
  if (source === target || !text.trim()) return text
  const res = await fetch("https://api.sarvam.ai/translate", {
    method: "POST",
    headers: { "api-subscription-key": KEY, "Content-Type": "application/json" },
    body: JSON.stringify({
      input: text,
      source_language_code: source,
      target_language_code: target,
      speaker_gender: "Male",
      mode: "formal",
      model: "mayura:v1",
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

    // Step 1: Transcribe in original language
    const originalText = await sttSarvam(audioBase64, languageCode)

    if (!originalText.trim()) {
      return NextResponse.json({ original: "", hindi: "", english: "", kannada: "", languageCode })
    }

    // Step 2: Translate to all 3 languages in parallel
    const [hindi, english, kannada] = await Promise.all([
      translateSarvam(originalText, languageCode, "hi-IN"),
      translateSarvam(originalText, languageCode, "en-IN"),
      translateSarvam(originalText, languageCode, "kn-IN"),
    ])

    return NextResponse.json({
      original:     originalText,
      hindi,
      english,
      kannada,
      languageCode,
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error"
    console.error("Transcribe route error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}