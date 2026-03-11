import { PrismaClient, Department } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {

  console.log("Seeding patients and visits...")

  // PATIENTS

  const p1 = await prisma.patient.create({
    data: {
      name: "Rahul Sharma",
      age: 32,
      gender: "Male",
      phone: "9876543210"
    }
  })

  const p2 = await prisma.patient.create({
    data: {
      name: "Priya Verma",
      age: 28,
      gender: "Female",
      phone: "9876543211"
    }
  })

  const p3 = await prisma.patient.create({
    data: {
      name: "Amit Singh",
      age: 45,
      gender: "Male",
      phone: "9876543212"
    }
  })

  const p4 = await prisma.patient.create({
    data: {
      name: "Sneha Gupta",
      age: 22,
      gender: "Female",
      phone: "9876543213"
    }
  })

  const p5 = await prisma.patient.create({
    data: {
      name: "Ramesh Kumar",
      age: 50,
      gender: "Male",
      phone: "9876543214"
    }
  })

  // VISITS (Department queues)

  await prisma.visit.createMany({
    data: [
      {
        patientId: p1.id,
        department: Department.GENERAL_MEDICINE
      },
      {
        patientId: p2.id,
        department: Department.GENERAL_MEDICINE
      },
      {
        patientId: p3.id,
        department: Department.ENT
      },
      {
        patientId: p4.id,
        department: Department.ENT
      },
      {
        patientId: p5.id,
        department: Department.ORTHOPEDICS
      }
    ]
  })

  console.log("✅ Patients and visits seeded successfully")

}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })