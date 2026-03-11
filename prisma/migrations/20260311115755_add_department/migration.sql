/*
  Warnings:

  - Added the required column `department` to the `Visit` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Department" AS ENUM ('GENERAL_MEDICINE', 'PEDIATRICS', 'GYNECOLOGY', 'ORTHOPEDICS', 'ENT');

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "department" "Department" NOT NULL;
