-- AlterTable
ALTER TABLE "fhir_patients" ADD COLUMN     "allergies" TEXT DEFAULT '[]',
ADD COLUMN     "conditions" TEXT DEFAULT '[]';
