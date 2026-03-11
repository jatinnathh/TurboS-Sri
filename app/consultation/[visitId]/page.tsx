// app/consultation/[visitId]/page.tsx
// ✅ Server Component — NO "use client" here

import { prisma } from "@/lib/prisma"
import { ConsultationForm } from "./Consultationform"

export default async function Consultation({
  params,
}: {
  params: Promise<{ visitId: string }>
}) {
  const { visitId } = await params
  const visit = await prisma.visit.findUnique({
    where: { id: visitId },
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

  return (
    <ConsultationForm
      visitId={visit.id}
      department={visit.department}
      patientName={visit.patient.name}
      patientAge={visit.patient.age}
    />
  )
}