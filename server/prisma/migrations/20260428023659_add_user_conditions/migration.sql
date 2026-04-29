-- CreateTable
CREATE TABLE "user_conditions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "display" TEXT NOT NULL,
    "fhir_id" TEXT NOT NULL,

    CONSTRAINT "user_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_conditions_user_id_fhir_id_key" ON "user_conditions"("user_id", "fhir_id");

-- AddForeignKey
ALTER TABLE "user_conditions" ADD CONSTRAINT "user_conditions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
