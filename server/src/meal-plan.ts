import { Hono } from "hono";
import Groq from "groq-sdk";
import prisma from "./lib/prisma";
import { authMiddleware } from "./middleware";
import { isDietRelevant } from "./lib/fhir-context";

const router = new Hono<{ Variables: { userId: string } }>();

router.post("/generate", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    return c.json({ error: "Meal plan generation is not configured" }, 500);
  }

  const [user, conditions, allergies] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { weightLbs: true, heightIn: true, fhirPatientId: true },
    }),
    prisma.userCondition.findMany({ where: { userId } }),
    prisma.userAllergy.findMany({ where: { userId } }),
  ]);

  // Try to get age and gender from cached FHIR patient
  let age: number | null = null;
    let gender: string | null = null;

  if (user?.fhirPatientId) {
    const fhirPatient = await prisma.fhirPatient.findUnique({
      where: { fhirId: user.fhirPatientId },
    });

    if (fhirPatient) {
      gender = fhirPatient.gender;
      if (fhirPatient.birthDate) {
        const birth = new Date(fhirPatient.birthDate);
        age = Math.floor((Date.now() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      }
    }
  }
      // Calculate calorie target using Mifflin-St Jeor
  let calorieTarget = 2000;

  if (user?.weightLbs && user?.heightIn && age && gender) {
    const weightKg = user.weightLbs * 0.453592;
    const heightCm = user.heightIn * 2.54;

    if (gender === "male") {
      calorieTarget = Math.round(((10 * weightKg) + (6.25 * heightCm) - (5 * age) + 5) * 1.375);
    } else {
      calorieTarget = Math.round(((10 * weightKg) + (6.25 * heightCm) - (5 * age) - 161) * 1.375);
    }
  }

  const conditionNames = conditions
    .map((c) => c.display)
    .filter(isDietRelevant);
  const allergyNames = allergies.map((a) => a.substance);

  const profileContext = [
    user?.weightLbs ? `Weight: ${user.weightLbs} lbs` : null,
    user?.heightIn ? `Height: ${user.heightIn} inches` : null,
    age ? `Age: ${age} years old` : null,
    gender ? `Sex: ${gender}` : null,
  ].filter(Boolean).join(", ");

  const conditionContext = conditionNames.length > 0
    ? `The patient has the following conditions: ${conditionNames.join(", ")}.`
    : "The patient has no specific medical conditions.";

  const allergyContext = allergyNames.length > 0
    ? `The patient has the following allergies: ${allergyNames.join(", ")}. These foods must be completely avoided.`
    : "The patient has no known allergies.";

const bkfast = Math.round(calorieTarget * 0.25);
  const lunch = Math.round(calorieTarget * 0.30);
  const dinner = Math.round(calorieTarget * 0.30);
    const snack = Math.round(calorieTarget * 0.15);
    const prompt = `You are a clinical dietitian. Generate a 7-day meal plan for a patient based on their health profile.



Patient profile: ${profileContext || "No biometric data available."}
${conditionContext}
${allergyContext}

Requirements:
- Vary the meals creatively. Do not repeat the same foods across different days. Each day should feel distinct.
- Create meals for each day (Monday through Sunday)
- Each day should have Breakfast, Lunch, Dinner, and Snack
- Each meal should include 1-3 food items with estimated calories
- Tailor the meals to help manage the patient's conditions
- Avoid any allergens completely
- The daily calorie target is ${calorieTarget} kcal. All days should total close to this number.

Respond ONLY with valid JSON in this exact format, no markdown, no explanation:
{
  "days": [
    {
      "day": "Monday",
      "meals": {
        "breakfast": {
          "items": [{"name": "food name", "calories": ${bkfast}}],
          "totalCalories": ${bkfast}
        },
        "lunch": {
          "items": [{"name": "food name", "calories": ${lunch}}],
          "totalCalories": ${lunch}
        },
        "dinner": {
          "items": [{"name": "food name", "calories": ${dinner}}],
          "totalCalories": ${dinner}
        },
        "snack": {
          "items": [{"name": "food name", "calories": ${snack}}],
          "totalCalories": ${snack}
        }
      },
      "totalCalories": ${calorieTarget}
    }
  ],
  "dailyCalorieTarget": ${calorieTarget},
  "summary": "Brief explanation of why this meal plan suits the patient's conditions"
}`;


  try {
    const groq = new Groq({ apiKey });

    let mealPlan = null;
    let attempts = 0;

    while (!mealPlan && attempts < 3) {
      attempts++;
      try {
        const response = await groq.chat.completions.create({
          model: "llama-3.3-70b-versatile",
          messages: [{ role: "user", content: prompt }],
          temperature: 1.0,
          max_tokens: 4000,
        });

        const text = response.choices[0]?.message?.content || "";
        const clean = text.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
        mealPlan = JSON.parse(clean);
      } catch {
        console.log(`Meal plan parse failed, attempt ${attempts}/3`);
      }
    }

    if (!mealPlan) {
      return c.json({ error: "Failed to generate meal plan after multiple attempts" }, 500);
    }

    return c.json({
      mealPlan,
      conditions: conditionNames,
      allergies: allergyNames,
    });
  } catch (err) {
    console.error("Meal plan generation failed:", err);
    return c.json({ error: "Failed to generate meal plan" }, 500);
  }
});

export default router;