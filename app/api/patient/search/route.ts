// app/api/patient/search/route.ts
// GET /api/patient/search?q=<query>
// Searches patients by name (case-insensitive) or phone number

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q")?.trim()

  if (!q || q.length < 2) {
    return NextResponse.json({ patients: [] })
  }

  const patients = await prisma.patient.findMany({
    where: {
      OR: [
        { name:  { contains: q, mode: "insensitive" } },
        { phone: { contains: q } },
      ],
    },
    select: {
      id:     true,
      name:   true,
      age:    true,
      gender: true,
      phone:  true,
    },
    orderBy: { name: "asc" },
    take: 10,
  })

  return NextResponse.json({ patients })
}