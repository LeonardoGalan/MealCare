import { Hono } from "hono";
import prisma from "./lib/prisma";
import { authMiddleware } from "./middleware";
import {
  buildProviderSuggestions,
  extractAllergyNames,
  extractConditionNames,
} from "./lib/fhir-context";
import { buildPatientSearchPath } from "./lib/fhir-search";

const router = new Hono<{ Variables: { userId: string } }>();
const FHIR_BASE_URL = "http://localhost:8080/fhir";

async function fetchFhirJson<T>(path: string): Promise<T> {
  const response = await fetch(`${FHIR_BASE_URL}${path}`);

  if (!response.ok) {
    throw new Error(`FHIR request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// Search FHIR patients (by name)
router.get("/search", async (c) => {
  const query = c.req.query("q") || "";
  const path = buildPatientSearchPath(query);

  if (path.endsWith("_count=0")) {
    return c.json([]);
  }

  try {
    const data = await fetchFhirJson<{ entry?: unknown[] }>(path);
    return c.json(data.entry || []);
  } catch {
    return c.json({ error: "FHIR server unreachable" }, 500);
  }
});

// Link a FHIR patient to the logged-in user
router.post("/link", authMiddleware, async (c) => {
  const { fhirPatientId } = await c.req.json();
  const userId = c.get("userId");

  const user = await prisma.user.update({
    where: { id: userId },
    data: { fhirPatientId },
    select: { id: true, fhirPatientId: true },
  });

  return c.json({ message: "Patient linked successfully", user });
});

router.get("/context", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fhirPatientId: true },
  });

  if (!user?.fhirPatientId) {
    return c.json({
      patient: null,
      conditions: [],
      allergies: [],
      providerSuggestions: [
        "Link a FHIR patient to unlock condition-aware meal guidance and allergy reminders.",
      ],
    });
  }

  try {
    const [patient, conditionBundle, allergyBundle] = await Promise.all([
      fetchFhirJson(`/Patient/${user.fhirPatientId}`),
      fetchFhirJson<{ entry?: Array<{ resource?: { code?: { text?: string; coding?: Array<{ display?: string }> } } }> }>(
        `/Condition?patient=${user.fhirPatientId}&_format=json`,
      ),
      fetchFhirJson<{ entry?: Array<{ resource?: { code?: { text?: string; coding?: Array<{ display?: string }> } } }> }>(
        `/AllergyIntolerance?patient=${user.fhirPatientId}&_format=json`,
      ),
    ]);

    const conditions = extractConditionNames(conditionBundle);
    const allergies = extractAllergyNames(allergyBundle);

    return c.json({
      patient,
      conditions,
      allergies,
      providerSuggestions: buildProviderSuggestions(conditions, allergies),
    });
  } catch (error) {
    console.error(error);
    return c.json({ error: "FHIR context unavailable" }, 500);
  }
});

// Get full patient details (including name, gender, birthDate, etc.)
router.get("/patient/:id", async (c) => {
  const id = c.req.param("id");
  try {
    const patient = await fetchFhirJson(`/Patient/${id}`);
    return c.json(patient);
  } catch (error) {
    console.error(error);
    return c.json({ error: "Patient not found" }, 404);
  }
});

export default router;
