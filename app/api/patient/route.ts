import { prisma } from "@/lib/prisma"

export async function POST(req: Request){

  const body = await req.json()

  const patient = await prisma.patient.create({
    data:{
      name: body.name,
      age: body.age,
      gender: body.gender,
      phone: body.phone,
    }
  })

  const visit = await prisma.visit.create({
    data:{
      patientId: patient.id,
      department: body.department
    }
  })

  return Response.json({patient,visit})
}