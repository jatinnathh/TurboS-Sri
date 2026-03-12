// app/api/consultation/[visitId]/complete/route.ts
// Marks a visit as COMPLETED — no request body needed

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  try {
    const { visitId } = await params

    if (!visitId) {
      return NextResponse.json({ error: "Missing visitId" }, { status: 400 })
    }

    const updated = await prisma.visit.update({
      where: { id: visitId },
      data: {
        status:      "COMPLETED",
        completedAt: new Date(),
      },
      include: { patient: true },
    })

    return NextResponse.json({
      success:     true,
      visitId:     updated.id,
      status:      updated.status,
      completedAt: updated.completedAt,
      patientName: updated.patient.name,
    })

  } catch (err) {
    console.error("[complete] error:", err)
    return NextResponse.json(
      { error: "Failed to complete visit", detail: String(err) },
      { status: 500 }
    )
  }
}