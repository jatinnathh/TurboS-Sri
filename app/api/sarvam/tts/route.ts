// app/api/sarvam/tts/route.ts
// Receives text (ALREADY in targetLanguage) + targetLanguage code
// Calls Sarvam bulbul:v2 TTS
// Returns { audioBase64: string }
//
// IMPORTANT: The caller must pass text already in the target language.
// This route does NOT translate. Translation already happened in transcribe/route.ts.

import { NextRequest, NextResponse } from "next/server"

const KEY = process.env.SARVAM_API_KEY!

// Valid Sarvam bulbul:v2 speakers per language
// Ref: https://docs.sarvam.ai/api-reference-docs/text-to-speech
const SPEAKERS: Record<string, string> = {
  "hi-IN": "anushka",
  "kn-IN": "anushka",
  "en-IN": "anushka",
  "ta-IN": "anushka",
  "te-IN": "anushka"
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { text, targetLanguage } = body as { text: string; targetLanguage: string }

    if (!text?.trim()) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 })
    }
    if (!targetLanguage) {
      return NextResponse.json({ error: "Missing targetLanguage" }, { status: 400 })
    }

    const speaker = SPEAKERS[targetLanguage] ?? "anushka"

    // Log what we're sending for debugging
    console.log(`[TTS] lang=${targetLanguage} speaker=${speaker} text="${text.slice(0,60)}…"`)

    const ttsRes = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "api-subscription-key": KEY,
        "Content-Type":         "application/json",
      },
      body: JSON.stringify({
        inputs:               [text],
        target_language_code: targetLanguage,
        speaker:              speaker,
        pitch:                0,
        pace:                 1.0,
        loudness:             1.5,
        speech_sample_rate:   22050,
        enable_preprocessing: true,   // true handles punctuation / numbers better
        model:                "bulbul:v2",
      }),
    })

    if (!ttsRes.ok) {
      const errText = await ttsRes.text()
      console.error("[TTS] Sarvam error:", errText)
      return NextResponse.json(
        { error: "Sarvam TTS failed", details: errText },
        { status: ttsRes.status }
      )
    }

    const ttsData = await ttsRes.json()
    console.log("[TTS] Sarvam response keys:", Object.keys(ttsData))

    // Sarvam returns { audios: ["<base64>"] }
    // Some versions return { audio: "<base64>" } — handle both
    const audioBase64: string =
      ttsData.audios?.[0] ??
      ttsData.audio       ??
      ""

    if (!audioBase64) {
      console.error("[TTS] No audio in response:", JSON.stringify(ttsData).slice(0, 300))
      return NextResponse.json(
        { error: "Sarvam TTS returned empty audio", raw: ttsData },
        { status: 500 }
      )
    }

    return NextResponse.json({ audioBase64, targetLanguage })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error("[TTS] Route error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}