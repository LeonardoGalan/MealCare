import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });
const FHIR_BASE_URL = "http://localhost:8080/fhir";

async function fetchJson(path: string) {
  const res = await fetch(`${FHIR_BASE_URL}${path}`);
  if (!res.ok) throw new Error(`FHIR ${res.status}`);
  return res.json();
}

async function main() {
  const patientBundle = await fetchJson("/Patient?_count=50&_format=json");
  const patients = patientBundle.entry || [];

  console.log(`Found ${patients.length} patients`);

  for (const entry of patients) {
    const patient = entry.resource;
    const pid = patient.id;
    const name = patient.name?.[0];
    const firstName = name?.given?.join(" ") || "Unknown";
    const lastName = name?.family || "Unknown";
    const fhirId = `fhir-${pid}`;

    console.log(`\nProcessing: ${firstName} ${lastName} (${pid})`);

    // Fetch conditions
    const condBundle = await fetchJson(`/Condition?patient=${pid}&_format=json`);
    const conditions = (condBundle.entry || []).map((e: any) => {
      const r = e.resource;
      return {
        code: r?.code?.coding?.[0]?.code || "unknown",
        display: r?.code?.coding?.[0]?.display || r?.code?.text || "Unknown",
        fhirId: r?.id || "unknown",
      };
    });

    // Fetch allergies
    const allergyBundle = await fetchJson(`/AllergyIntolerance?patient=${pid}&_format=json`);
    const allergies = (allergyBundle.entry || []).map((e: any) => {
      const r = e.resource;
      return {
        substance: r?.code?.coding?.[0]?.display || r?.code?.text || "Unknown",
        fhirId: r?.id || "unknown",
      };
    });

    await prisma.fhirPatient.upsert({
      where: { fhirId },
      update: {
        firstName,
        lastName,
        birthDate: patient.birthDate || null,
        gender: patient.gender || null,
        conditions: JSON.stringify(conditions),
        allergies: JSON.stringify(allergies),
      },
      create: {
        fhirId,
        firstName,
        lastName,
        birthDate: patient.birthDate || null,
        gender: patient.gender || null,
        conditions: JSON.stringify(conditions),
        allergies: JSON.stringify(allergies),
      },
    });

    console.log(`  Conditions: ${conditions.length}, Allergies: ${allergies.length}`);
  }

  console.log("\nDone caching all FHIR data!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());