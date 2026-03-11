// app/api/consultation/[visitId]/save/route.ts
// Saves the full conversation + generated report to the Visit record

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  try {
    const { visitId } = await params
    const { messages, report, language } = await req.json()

    if (!visitId) {
      return NextResponse.json({ error: "Missing visitId" }, { status: 400 })
    }

    // Build plain text transcript from messages
    const transcript = (messages ?? [])
      .map((m: { role: string; text: string; translated?: string; timestamp: string }) => {
        const speaker = m.role === "patient" ? "Patient" : "Doctor"
        const text    = m.translated ?? m.text
        return `[${m.timestamp}] ${speaker}: ${text}`
      })
      .join("\n")

    const updated = await prisma.visit.update({
      where: { id: visitId },
      data: {
        transcript,
        report,
        language,
        messages,  // store full structured messages array
      },
    })

    return NextResponse.json({ success: true, visitId: updated.id })

  } catch (err) {
    console.error("Save consultation error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}