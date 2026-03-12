// app/api/patient/[patientId]/history/route.ts
// Returns all past COMPLETED visits for a patient, with their reports
// Used to show doctor the patient's full medical history

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ patientId: string }> }
) {
  try {
    const { patientId } = await params

    if (!patientId) {
      return NextResponse.json({ error: "Missing patientId" }, { status: 400 })
    }

    const visits = await prisma.visit.findMany({
      where: {
        patientId,
        status: "COMPLETED",
      },
      orderBy: { createdAt: "desc" },
      select: {
        id:          true,
        department:  true,
        createdAt:   true,
        completedAt: true,
        transcript:  true,
        report:      true,   // latest single report (legacy)
        reports:     true,   // all reports array
        language:    true,
      },
    })

    // Shape the response — normalize reports field
    const history = visits.map(v => ({
      visitId:     v.id,
      department:  v.department,
      date:        v.createdAt,
      completedAt: v.completedAt,
      language:    v.language,
      // Use reports array if available, else wrap single report
      reports: (() => {
        if (v.reports && Array.isArray(v.reports) && v.reports.length > 0) {
          return v.reports
        }
        if (v.report) return [{ ...v.report as object, _savedAt: v.completedAt }]
        return []
      })(),
      // Short summary for history card
      summary: (() => {
        const r = (Array.isArray(v.reports) && v.reports.length > 0)
          ? v.reports[v.reports.length - 1] as Record<string, unknown>
          : v.report as Record<string, unknown> | null
        if (!r) return null
        return {
          chiefComplaint: r.chiefComplaint ?? "",
          diagnosis:      r.diagnosis      ?? "",
          medications:    r.medications    ?? [],
          followUp:       r.followUp       ?? "",
        }
      })(),
    }))

    return NextResponse.json({ patientId, history })

  } catch (err) {
    console.error("Patient history error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}