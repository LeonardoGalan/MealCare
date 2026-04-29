-- CreateTable
CREATE TABLE "fhir_patients" (
    "id" TEXT NOT NULL,
    "fhir_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "birth_date" TEXT,
    "gender" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fhir_patients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fhir_patients_fhir_id_key" ON "fhir_patients"("fhir_id");
