// app/api/visit/route.ts
// POST /api/visit
// Creates a new visit (appointment) for an existing patient

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { patientId, department } = body

  if (!patientId || !department) {
    return NextResponse.json(
      { error: "patientId and department are required" },
      { status: 400 }
    )
  }

  // Verify patient exists
  const patient = await prisma.patient.findUnique({ where: { id: patientId } })
  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 })
  }

  const visit = await prisma.visit.create({
    data: {
      patientId,
      department,
      status: "WAITING",
    },
  })

  return NextResponse.json({ visit }, { status: 201 })
}