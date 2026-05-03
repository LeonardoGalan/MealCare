import { Hono } from "hono";
import Groq from "groq-sdk";
import prisma from "./lib/prisma";
import { authMiddleware } from "./middleware";
import { isDietRelevant } from "./lib/fhir-context";

const router = new Hono<{ Variables: { userId: string } }>();

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

router.post("/generate", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const apiKey = process.env.GROQ_API_KEY;

  const [conditions, allergies] = await Promise.all([
    prisma.userCondition.findMany({ where: { userId } }),
    prisma.userAllergy.findMany({ where: { userId } }),
  ]);

  const conditionNames = conditions.map((c) => c.display).filter(isDietRelevant);
  const allergyNames = allergies.map((a) => a.substance);

  let mealPlan: any = null;

  try {
    if (apiKey) {
      const groq = new Groq({ apiKey });

      const prompt = `
You are a professional dietitian.

Generate a COMPLETE 7-day meal plan.

STRICT RULES:
- Return ONLY valid JSON
- Include ALL 7 days (Monday → Sunday)
- Each day MUST include breakfast, lunch, dinner, snack
- Typical meals should have 4–8 ingredients

VARIETY RULES (VERY IMPORTANT):
- EVERY meal across the week MUST be completely different
- Use DIFFERENT cooking styles (grilled, baked, stir-fry, roasted, etc.)
- DO NOT repeat similar meals (no "chicken salad" variations)
- DO NOT reuse same main ingredient back-to-back days


Each meal MUST include:
- name
- ingredients (array of ALL main ingredients required to make the dish)
IMPORTANT:
- Include ALL essential ingredients
- Do NOT omit obvious components (e.g. bread in a sandwich, tortilla in tacos, pasta in pasta dishes)
- Include base + protein + sides + sauces where applicable
- totalCalories
- protein
- carbs
- fat

User:
Conditions: ${conditionNames.join(", ")}
Allergies: ${allergyNames.join(", ")}

Return JSON format:
{
  "days": [
    {
      "day": "Monday",
      "meals": {
        "breakfast": { "name": "...", "ingredients": ["..."], "totalCalories": 400, "protein": 20, "carbs": 50, "fat": 10 },
        "lunch": { ... },
        "dinner": { ... },
        "snack": { ... }
      },
      "totalCalories": 2000
    }
  ]
}
`;

      const response = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 1.0 // max variation
      });

      const text = response.choices[0]?.message?.content || "";

      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        mealPlan = JSON.parse(match[0]);
      }
    }
  } catch (err) {
    console.log("Groq failed — using fallback");
  }

  // fallback 
  if (!mealPlan || !mealPlan.days || mealPlan.days.length < 7) {
    mealPlan = {
      days: [
        {
          day: "Monday",
          meals: {
            breakfast: { name: "Oatmeal with Berries and Almond Butter", ingredients: ["oats","berries","almond butter"], totalCalories: 400, protein: 20, carbs: 50, fat: 15 },
            lunch: { name: "Grilled Chicken Caesar Salad", ingredients: ["chicken","lettuce","parmesan"], totalCalories: 600, protein: 40, carbs: 40, fat: 20 },
            dinner: { name: "Salmon with Quinoa and Broccoli", ingredients: ["salmon","quinoa","broccoli"], totalCalories: 700, protein: 45, carbs: 50, fat: 25 },
            snack: { name: "Greek Yogurt with Honey and Granola", ingredients: ["yogurt","honey","granola"], totalCalories: 300, protein: 15, carbs: 30, fat: 10 }
          },
          totalCalories: 2000
        },
        {
          day: "Tuesday",
          meals: {
            breakfast: { name: "Avocado Toast with Eggs", ingredients: ["bread","avocado","eggs"], totalCalories: 400, protein: 20, carbs: 40, fat: 15 },
            lunch: { name: "Turkey Wrap with Spinach and Tomato", ingredients: ["turkey","spinach","wrap"], totalCalories: 600, protein: 35, carbs: 45, fat: 15 },
            dinner: { name: "Beef Stir Fry with Rice", ingredients: ["beef","rice","vegetables"], totalCalories: 700, protein: 45, carbs: 60, fat: 20 },
            snack: { name: "Apple Slices with Peanut Butter", ingredients: ["apple","peanut butter"], totalCalories: 300, protein: 10, carbs: 30, fat: 10 }
          },
          totalCalories: 2000
        },
        {
          day: "Wednesday",
          meals: {
            breakfast: { name: "Smoothie Bowl with Granola", ingredients: ["banana","berries","granola"], totalCalories: 400, protein: 15, carbs: 60, fat: 10 },
            lunch: { name: "Chicken Quesadilla with Salsa", ingredients: ["chicken","cheese","tortilla"], totalCalories: 600, protein: 35, carbs: 50, fat: 20 },
            dinner: { name: "Shrimp Tacos with Slaw", ingredients: ["shrimp","tortilla","cabbage"], totalCalories: 700, protein: 40, carbs: 55, fat: 20 },
            snack: { name: "Cottage Cheese with Fruit", ingredients: ["cottage cheese","peaches","honey"], totalCalories: 300, protein: 20, carbs: 25, fat: 8 }
          },
          totalCalories: 2000
        },
        {
          day: "Thursday",
          meals: {
            breakfast: { name: "Pancakes with Maple Syrup", ingredients: ["flour","milk","maple syrup"], totalCalories: 400, protein: 10, carbs: 60, fat: 15 },
            lunch: { name: "Mediterranean Chickpea Salad", ingredients: ["chickpeas","cucumber","feta"], totalCalories: 600, protein: 20, carbs: 50, fat: 25 },
            dinner: { name: "Chicken Alfredo Pasta", ingredients: ["chicken","pasta","cream"], totalCalories: 700, protein: 45, carbs: 65, fat: 25 },
            snack: { name: "Trail Mix", ingredients: ["nuts","raisins","chocolate"], totalCalories: 300, protein: 10, carbs: 30, fat: 15 }
          },
          totalCalories: 2000
        },
        {
          day: "Friday",
          meals: {
            breakfast: { name: "Breakfast Burrito", ingredients: ["eggs","tortilla","cheese"], totalCalories: 400, protein: 20, carbs: 40, fat: 15 },
            lunch: { name: "Tuna Salad Sandwich", ingredients: ["tuna","bread","mayo"], totalCalories: 600, protein: 35, carbs: 45, fat: 20 },
            dinner: { name: "BBQ Chicken with Sweet Potatoes", ingredients: ["chicken","bbq sauce","sweet potatoes"], totalCalories: 700, protein: 45, carbs: 55, fat: 20 },
            snack: { name: "Protein Bar", ingredients: ["protein","nuts","chocolate"], totalCalories: 300, protein: 20, carbs: 25, fat: 10 }
          },
          totalCalories: 2000
        },
        {
          day: "Saturday",
          meals: {
            breakfast: { name: "French Toast with Berries", ingredients: ["bread","eggs","berries"], totalCalories: 400, protein: 15, carbs: 55, fat: 15 },
            lunch: { name: "Chicken Caesar Wrap", ingredients: ["chicken","lettuce","wrap"], totalCalories: 600, protein: 40, carbs: 45, fat: 20 },
            dinner: { name: "Steak with Mashed Potatoes", ingredients: ["steak","potatoes","butter"], totalCalories: 700, protein: 50, carbs: 50, fat: 25 },
            snack: { name: "Yogurt Parfait", ingredients: ["yogurt","granola","fruit"], totalCalories: 300, protein: 15, carbs: 30, fat: 10 }
          },
          totalCalories: 2000
        },
        {
          day: "Sunday",
          meals: {
            breakfast: { name: "Bagel with Cream Cheese", ingredients: ["bagel","cream cheese"], totalCalories: 400, protein: 10, carbs: 55, fat: 15 },
            lunch: { name: "BLT Sandwich", ingredients: ["bacon","lettuce","tomato"], totalCalories: 600, protein: 25, carbs: 45, fat: 25 },
            dinner: { name: "Roasted Chicken with Vegetables", ingredients: ["chicken","carrots","potatoes"], totalCalories: 700, protein: 45, carbs: 50, fat: 20 },
            snack: { name: "Fruit Salad", ingredients: ["apple","banana","orange"], totalCalories: 300, protein: 5, carbs: 35, fat: 5 }
          },
          totalCalories: 2000
        }
      ]
    };
  }

  return c.json({
    mealPlan,
    conditions: conditionNames,
    allergies: allergyNames,
  });
});

export default router;