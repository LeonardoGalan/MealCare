import { Hono } from "hono";
import { authMiddleware } from "./middleware";
import Groq from "groq-sdk";

const router = new Hono<{ Variables: { userId: string } }>();

router.post("/check", authMiddleware, async (c) => {
  const { medication } = await c.req.json();
  const apiKey = process.env.GROQ_API_KEY;

  if (!medication) {
    return c.json({ error: "Medication required" }, 400);
  }

  const med = medication.toLowerCase();

  let warnings: string[] = [];
  let foodsToAvoid: string[] = [];

  if (med.includes("statin")) {
    warnings.push("Statins can interact with grapefruit");
    foodsToAvoid.push("grapefruit");
  }

  if (med.includes("warfarin")) {
    warnings.push("Warfarin interacts with vitamin K rich foods");
    foodsToAvoid.push("spinach", "kale", "broccoli");
  }

  if (med.includes("ibuprofen")) {
    warnings.push("Ibuprofen may irritate the stomach");
    foodsToAvoid.push("alcohol");
  }

  if (med.includes("metformin")) {
    warnings.push("Metformin may interact with alcohol");
    foodsToAvoid.push("alcohol");
  }

  try {
    if (apiKey) {
      const groq = new Groq({ apiKey });

      const prompt = `
You are a medical safety assistant.

Given a medication, return:
1. warnings
2. foods to avoid

Respond ONLY in JSON format:

{
  "warnings": ["warning1"],
  "foodsToAvoid": ["food1"]
}

Medication: ${medication}
`;

      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
      });

      const text = response.choices[0]?.message?.content || "";
      const clean = text.replace(/```json|```/g, "").trim();

      const start = clean.indexOf("{");
      const end = clean.lastIndexOf("}");

      if (start !== -1 && end !== -1) {
        const parsed = JSON.parse(clean.slice(start, end + 1));

        warnings = [...warnings, ...(parsed.warnings || [])];
        foodsToAvoid = [...foodsToAvoid, ...(parsed.foodsToAvoid || [])];
      }
    }
  } catch (err) {
    console.log("AI fallback failed, using rule-based only");
  }

  warnings = Array.from(new Set(warnings));
  foodsToAvoid = Array.from(new Set(foodsToAvoid));

  if (warnings.length === 0) {
    warnings.push("No major interactions found");
  }

  return c.json({
    warnings,
    foodsToAvoid,
  });
});

export default router;