import { Hono } from "hono";
import prisma from "./lib/prisma";
import { authMiddleware } from "./middleware";
import {
  buildProviderSuggestions,
  extractAllergyNames,
  extractConditionNames,
  buildFoodsToAvoid,
  isDietRelevant,
} from "./lib/fhir-context";

type ConditionBundle = {
  entry?: Array<{
    resource?: {
      id?: string;
      code?: {
        text?: string;
        coding?: Array<{ display?: string; code?: string }>;
      };
    };
  }>;
};

type AllergyBundle = {
  entry?: Array<{
    resource?: {
      id?: string;
      code?: { text?: string; coding?: Array<{ display?: string }> };
    };
  }>;
};

const mockFHIRData = {
  "demo-patient-1": {
    conditions: [
      { fhirId: "c1", display: "Diabetes", code: "diabetes" },
      { fhirId: "c2", display: "Hypertension", code: "hypertension" },
    ],
    allergies: [
      { fhirId: "a1", substance: "Peanuts" },
      { fhirId: "a2", substance: "Shellfish" },
    ],
    medications: ["statin", "warfarin"]
  }
};

const router = new Hono<{ Variables: { userId: string } }>();
const FHIR_BASE_URL = "http://localhost:8080/fhir";

async function fetchFhirJson<T>(path: string): Promise<T> {
  const response = await fetch(`${FHIR_BASE_URL}${path}`);
  if (!response.ok) throw new Error(`FHIR request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

/* ------------------ FOODS TO AVOID ------------------ */

router.get("/foods-to-avoid", authMiddleware, async (c) => {
  const userId = c.get("userId");

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fhirPatientId: true },
    });

    if (!user?.fhirPatientId) {
      return c.json({
        foods: [],
        conditions: [],
        allergies: [],
        message: "No FHIR patient linked"
      });
    }

    /* ---------- USE MOCK FIRST (prevents FHIR spam) ---------- */

    if (mockFHIRData[user.fhirPatientId]) {
      const mock = mockFHIRData[user.fhirPatientId];

      const conditionNames = mock.conditions.map(c => c.display);
      const allergyNames = mock.allergies.map(a => a.substance);

      const foods: {
        food: string;
        reason: string;
        condition: string;
      }[] = [];

      conditionNames.forEach((condition) => {
        const c = condition.toLowerCase();

        if (c.includes("diabetes")) {
          foods.push({
            food: "Sugary drinks",
            reason: "Can spike blood sugar",
            condition
          });
        }

        if (c.includes("hypertension")) {
          foods.push({
            food: "Salty processed foods",
            reason: "Can increase blood pressure",
            condition
          });
        }
      });

      allergyNames.forEach((allergy) => {
        const a = allergy.toLowerCase();

        if (a.includes("peanut")) {
          foods.push({
            food: "Peanuts",
            reason: "Triggers peanut allergy",
            condition: "Allergy"
          });

          foods.push({
            food: "Peanut butter",
            reason: "Triggers peanut allergy",
            condition: "Allergy"
          });

          foods.push({
            food: "Almonds",
            reason: "Possible cross-nut allergy risk",
            condition: "Allergy"
          });
        }

        if (a.includes("shellfish")) {
          foods.push({
            food: "Shrimp",
            reason: "Triggers shellfish allergy",
            condition: "Allergy"
          });
        }
      });

      return c.json({
        foods,
        conditions: conditionNames,
        allergies: allergyNames
      });
    }

    /* ---------- FALLBACK TO REAL FHIR (if not mock) ---------- */

    let conditionNames: string[] = [];
    let allergyNames: string[] = [];

    try {
      const conditionBundle = await fetchFhirJson<ConditionBundle>(
        `/Condition?patient=${user.fhirPatientId}&_format=json`
      );

      conditionNames =
        conditionBundle.entry?.map((entry) => {
          return (
            entry.resource?.code?.coding?.[0]?.display ||
            entry.resource?.code?.text ||
            ""
          );
        }).filter(Boolean) || [];
    } catch {}

    try {
      const allergyBundle = await fetchFhirJson<AllergyBundle>(
        `/AllergyIntolerance?patient=${user.fhirPatientId}&_format=json`
      );

      allergyNames =
        allergyBundle.entry?.map((entry) => {
          return (
            entry.resource?.code?.coding?.[0]?.display ||
            entry.resource?.code?.text ||
            ""
          );
        }).filter(Boolean) || [];
    } catch {}

    return c.json({
      foods: [],
      conditions: conditionNames,
      allergies: allergyNames
    });

  } catch (err) {
    console.error("foods-to-avoid error:", err);

    return c.json({
      foods: [],
      conditions: [],
      allergies: [],
      message: "Unable to load dietary restrictions"
    });
  }
});

/* ------------------ MEDICATION ALERTS ------------------ */

router.post("/medication-alerts", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json();

  const foods: string[] = (body.foods || []).map((f: string) =>
    f.toLowerCase()
  );

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fhirPatientId: true },
  });

  if (!user?.fhirPatientId) {
    return c.json({ alerts: [] });
  }

  let medications: string[] = [];

  /* ---------- USE MOCK FIRST ---------- */

  if (mockFHIRData[user.fhirPatientId]) {
    medications = mockFHIRData[user.fhirPatientId].medications.map((m) =>
      m.toLowerCase()
    );
  } else {
    try {
      const medBundle = await fetchFhirJson<any>(
        `/MedicationRequest?patient=${user.fhirPatientId}&_format=json`
      );

      medications =
        medBundle.entry?.map((entry: any) => {
          const med =
            entry.resource?.medicationCodeableConcept?.coding?.[0]?.display ||
            entry.resource?.medicationCodeableConcept?.text ||
            "";
          return med.toLowerCase();
        }) || [];
    } catch {}
  }

  const interactionMap: Record<string, string[]> = {
    grapefruit: ["statin"],
    spinach: ["warfarin"],
    alcohol: ["metformin"],
  };

  const alerts: string[] = [];

  foods.forEach((food) => {
    Object.entries(interactionMap).forEach(([badFood, meds]) => {
      if (food.includes(badFood)) {
        meds.forEach((med) => {
          const match = medications.find((m) => m.includes(med));
          if (match) {
            alerts.push(`${food} may interact with ${match}`);
          }
        });
      }
    });
  });

  return c.json({ alerts });
});

router.get("/context", authMiddleware, async (c) => {
  const userId = c.get("userId");

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { fhirPatientId: true },
  });

  if (!user?.fhirPatientId) {
    return c.json({
      conditions: [],
      allergies: [],
      medications: [],
    });
  }

  // use mock 
  if (mockFHIRData[user.fhirPatientId]) {
    const mock = mockFHIRData[user.fhirPatientId];

    return c.json({
      conditions: mock.conditions.map(c => c.display),
      allergies: mock.allergies.map(a => a.substance),
      medications: mock.medications
    });
  }

  // fallback empty
  return c.json({
    conditions: [],
    allergies: [],
    medications: [],
  });
});

export default router;