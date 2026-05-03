-- CreateTable
CREATE TABLE "medications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "fhir_id" TEXT,
    "name" TEXT NOT NULL,
    "dosage" TEXT,
    "frequency" TEXT,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,

    CONSTRAINT "medications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "medications_user_id_status_idx" ON "medications"("user_id", "status");

-- AddForeignKey
ALTER TABLE "medications" ADD CONSTRAINT "medications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
