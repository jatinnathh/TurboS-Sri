// app/consultation/[visitId]/page.tsx
// Server Component — fetches visit + full patient history

import { prisma } from "@/lib/prisma"
import { ConsultationForm, type HistoryReport, type PastVisit } from "./Consultationform"

export default async function Consultation({
  params,
}: {
  params: Promise<{ visitId: string }>
}) {
  const { visitId } = await params

  const visit = await prisma.visit.findUnique({
    where:   { id: visitId },
    include: { patient: true },
  })

  if (!visit) {
    return (
      <div style={{
        minHeight: "100vh", background: "#080c14",
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "sans-serif",
      }}>
        <div style={{ color: "#f87171", fontSize: 18 }}>Visit not found.</div>
      </div>
    )
  }

  // Fetch all previous completed visits for this patient (excluding current visit).
  const pastVisits = await prisma.visit.findMany({
    where: {
      patientId: visit.patientId,
      id:        { not: visitId },
      status:    "COMPLETED", // enum can never be null — @default(WAITING) ensures a value always exists
    },
    orderBy: { createdAt: "desc" },
    select: {
      id:         true,
      department: true,
      createdAt:  true,
      report:     true,
      reports:    true,
      language:   true,
    },
  })

  // Normalize — cast Prisma JsonArray → HistoryReport[] explicitly
  const patientHistory: PastVisit[] = pastVisits.map(v => {
    let reports: HistoryReport[] = []

    if (Array.isArray(v.reports) && v.reports.length > 0) {
      reports = v.reports as unknown as HistoryReport[]
    } else if (v.report != null) {
      reports = [v.report as unknown as HistoryReport]
    }

    return {
      visitId:    v.id,
      department: v.department,
      date:       v.createdAt.toISOString(),
      language:   v.language ?? "en-IN",
      reports,
    }
  })

  return (
    <ConsultationForm
      visitId={visit.id}
      department={visit.department}
      patientName={visit.patient.name}
      patientAge={visit.patient.age}
      patientId={visit.patientId}
      patientHistory={patientHistory}
    />
  )
}