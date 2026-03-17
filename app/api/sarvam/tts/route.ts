// app/api/sarvam/tts/route.ts
// Text-to-Speech for all 6 supported languages via Sarvam bulbul:v2
// Caller MUST pass text already translated into targetLanguage — no translation here

import { NextRequest, NextResponse } from "next/server"

const KEY = process.env.SARVAM_API_KEY!

// bulbul:v2 speaker map — "anushka" works across all supported Indian languages
const SPEAKERS: Record<string, string> = {
  "en-IN": "anushka",
  "hi-IN": "anushka",
  "kn-IN": "anushka",
  "ta-IN": "anushka",
  "te-IN": "anushka",
  "ml-IN": "anushka",
}

export async function POST(req: NextRequest) {
  try {
    const { text, targetLanguage } = await req.json() as { text: string; targetLanguage: string }

    if (!text?.trim())      return NextResponse.json({ error: "Missing text" },           { status: 400 })
    if (!targetLanguage)    return NextResponse.json({ error: "Missing targetLanguage" }, { status: 400 })

    const speaker = SPEAKERS[targetLanguage] ?? "anushka"
    console.log(`[TTS] lang=${targetLanguage} speaker=${speaker} text="${text.slice(0, 60)}…"`)

    const ttsRes = await fetch("https://api.sarvam.ai/text-to-speech", {
      method:  "POST",
      headers: { "api-subscription-key": KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        inputs:               [text],
        target_language_code: targetLanguage,
        speaker,
        pitch:                0,
        pace:                 1.0,
        loudness:             1.5,
        speech_sample_rate:   22050,
        enable_preprocessing: true,
        model:                "bulbul:v2",
      }),
    })

    if (!ttsRes.ok) {
      const errText = await ttsRes.text()
      console.error("[TTS] Sarvam error:", errText)
      return NextResponse.json({ error: "Sarvam TTS failed", details: errText }, { status: ttsRes.status })
    }

    const ttsData  = await ttsRes.json()
    const audioBase64: string = ttsData.audios?.[0] ?? ttsData.audio ?? ""

    if (!audioBase64) {
      return NextResponse.json({ error: "Sarvam TTS returned empty audio", raw: ttsData }, { status: 500 })
    }

    return NextResponse.json({ audioBase64, targetLanguage })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[TTS] error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}