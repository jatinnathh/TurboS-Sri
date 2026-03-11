// app/api/sarvam/translate/route.ts
// Translates Kannada or Hindi text → English
// Uses Sarvam AI Translate API
// Returns { translatedText: string }

import { NextRequest, NextResponse } from "next/server"

const SARVAM_API_KEY    = process.env.SARVAM_API_KEY!
const SARVAM_TRANSLATE  = "https://api.sarvam.ai/translate"

export async function POST(req: NextRequest) {
  try {
    const { text, sourceLanguage } = await req.json()
    // sourceLanguage: "kn-IN" | "hi-IN" (English doesn't need translation)

    if (!text || !sourceLanguage) {
      return NextResponse.json({ error: "Missing text or sourceLanguage" }, { status: 400 })
    }

    // If already English, skip translation
    if (sourceLanguage === "en-IN") {
      return NextResponse.json({ translatedText: text })
    }

    const response = await fetch(SARVAM_TRANSLATE, {
      method: "POST",
      headers: {
        "api-subscription-key": SARVAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        input:            text,
        source_language_code: sourceLanguage,  // "kn-IN" | "hi-IN"
        target_language_code: "en-IN",
        speaker_gender:   "Male",
        mode:             "formal",
        model:            "mayura:v1",
        enable_preprocessing: false,
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      console.error("Sarvam translate error:", err)
      return NextResponse.json({ error: "Sarvam translate failed", details: err }, { status: 500 })
    }

    const data = await response.json()
    return NextResponse.json({ translatedText: data.translated_text ?? text })

  } catch (err) {
    console.error("Translate route error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}