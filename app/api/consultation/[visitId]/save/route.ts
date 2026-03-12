// app/api/consultation/[visitId]/save/route.ts
// Saves conversation + APPENDS report to reports[] — never replaces existing reports

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  try {
    const { visitId } = await params

    if (!visitId) {
      return NextResponse.json({ error: "Missing visitId" }, { status: 400 })
    }

    const body = await req.json()
    const { messages, report, language } = body

    // ── Build plain-text transcript ──
    const transcript = ((messages ?? []) as Array<{
      role: string; text: string; english?: string; timestamp: string
    }>)
      .map(m => `[${m.timestamp}] ${m.role === "patient" ? "Patient" : "Doctor"}: ${m.english ?? m.text}`)
      .join("\n")

    // ── Fetch existing reports array from DB ──
    const existing = await prisma.visit.findUnique({
      where:  { id: visitId },
      select: { reports: true },
    })

    // Safely normalise to array — Prisma returns JsonValue (could be null, object, or array)
    let reportsArray: Record<string, unknown>[] = []
    if (existing?.reports != null) {
      if (Array.isArray(existing.reports)) {
        reportsArray = existing.reports as Record<string, unknown>[]
      } else if (typeof existing.reports === "object") {
        // was previously stored as a single object — wrap it
        reportsArray = [existing.reports as Record<string, unknown>]
      }
    }

    // ── Append new report only if one was provided ──
    if (report && typeof report === "object") {
      reportsArray.push({
        ...(report as Record<string, unknown>),
        _savedAt:      new Date().toISOString(),
        _sessionIndex: reportsArray.length + 1,
      })
    }

    // ── Persist ──
    const updated = await prisma.visit.update({
      where: { id: visitId },
      data: {
        transcript,
        language:  language ?? null,
        messages:  messages  ?? [],
        report,                          // latest single report (legacy field)
        reports:   reportsArray as never, // full history array
        status:    "IN_PROGRESS",
      },
    })

    return NextResponse.json({
      success:     true,
      visitId:     updated.id,
      reportCount: reportsArray.length,
    })

  } catch (err) {
    console.error("[save] error:", err)
    return NextResponse.json(
      { error: "Failed to save consultation", detail: String(err) },
      { status: 500 }
    )
  }
}