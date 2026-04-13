import { Hono } from "hono";
import prisma from "./lib/prisma";
import { authMiddleware } from "./middleware";
import {
  buildDailyNutritionSummary,
  buildNutritionProgress,
  getLocalDateRangeBounds,
  getLocalDayBounds,
  resolveProgressDays,
  resolveLoggedAt,
  resolveRequestedDate,
} from "./lib/nutrition";
import { validateMealLogPayload } from "./lib/meal-log-payload";

const router = new Hono<{ Variables: { userId: string } }>();

// ======================
// FOOD SEARCH (USDA FoodData Central)
// ======================
router.get("/search", async (c) => {
  const q = c.req.query("q") || "";
  if (!q || q.length < 2) {
    return c.json([]);
  }

  const apiKey = process.env.USDA_API_KEY;
  if (!apiKey) {
    console.error("USDA_API_KEY is missing in .env");
    return c.json([]);
  }

  try {
    const url =
      `https://api.nal.usda.gov/fdc/v1/foods/search?` +
      `api_key=${apiKey}` +
      `&query=${encodeURIComponent(q)}` +
      `&dataType=Foundation,SR%20Legacy,Branded` +
      `&pageSize=12` +
      `&pageNumber=1`;

    const res = await fetch(url);

    if (!res.ok) {
      console.error("USDA API error:", res.status);
      return c.json([]);
    }

    const data = await res.json();

    const foods =
      data.foods?.map((food: any) => {
        const nutrients = food.foodNutrients || [];
        return {
          fdcId: food.fdcId,
          name: food.description || food.brandName || "Unknown",
          brand: food.brandName || "Generic",
          calories:
            nutrients.find((n: any) => n.nutrientName === "Energy")?.value || 0,
          protein:
            nutrients.find((n: any) => n.nutrientName === "Protein")?.value || 0,
          carbs:
            nutrients.find(
              (n: any) => n.nutrientName === "Carbohydrate, by difference",
            )?.value || 0,
          fat:
            nutrients.find((n: any) => n.nutrientName === "Total lipid (fat)")
              ?.value || 0,
          servingSize: food.servingSize || 100,
          servingUnit: food.servingSizeUnit || "g",
        };
      }) || [];

    return c.json(foods);
  } catch (err) {
    console.error("USDA search failed:", err);
    return c.json([]);
  }
});

// ======================
// MEAL LOGGING ENDPOINTS
// ======================
router.post("/", authMiddleware, async (c) => {
  const userId = c.get("userId");
  let payload;

  try {
    payload = validateMealLogPayload(await c.req.json());
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400);
  }

  const { mealType, notes, items, loggedAt } = payload;

  let parsedLoggedAt: Date | undefined;

  try {
    parsedLoggedAt = resolveLoggedAt(loggedAt);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400);
  }

  const mealLog = await prisma.mealLog.create({
    data: {
      userId,
      mealType,
      notes,
      loggedAt: parsedLoggedAt,
      items: {
        create: items.map((item) => {
          const hasFdcId = item.fdcId !== undefined && item.fdcId !== null;

          return {
            foodItem: hasFdcId
              ? {
                  connectOrCreate: {
                    where: {
                      usdaFdcId: item.fdcId,
                    },
                    create: {
                      usdaFdcId: item.fdcId,
                      name: item.name,
                      brand: item.brand || null,
                      calories: item.calories,
                      protein: item.protein,
                      carbs: item.carbs,
                      fat: item.fat,
                      servingSize: item.servingSize,
                      servingUnit: item.servingUnit,
                    },
                  },
                }
              : {
                  create: {
                    name: item.name,
                    brand: item.brand || null,
                    calories: item.calories,
                    protein: item.protein,
                    carbs: item.carbs,
                    fat: item.fat,
                    servingSize: item.servingSize,
                    servingUnit: item.servingUnit,
                  },
                },
            servings: item.servings,
          };
        }),
      },
    },
    include: { items: { include: { foodItem: true } } },
  });

  return c.json(mealLog);
});

router.get("/summary", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const rawDate = c.req.query("date");

  let date: string;
  try {
    date = resolveRequestedDate(rawDate);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400);
  }

  const { start, end } = getLocalDayBounds(date);
  const logs = await prisma.mealLog.findMany({
    where: {
      userId,
      loggedAt: {
        gte: start,
        lt: end,
      },
    },
    include: { items: { include: { foodItem: true } } },
    orderBy: { loggedAt: "desc" },
  });

  return c.json(buildDailyNutritionSummary(date, logs));
});

router.get("/progress", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const rawDate = c.req.query("date");
  const rawDays = c.req.query("days");

  let date: string;
  let days: 7 | 30;

  try {
    date = resolveRequestedDate(rawDate);
    days = resolveProgressDays(rawDays);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400);
  }

  const { start, end } = getLocalDateRangeBounds(date, days);
  const logs = await prisma.mealLog.findMany({
    where: {
      userId,
      loggedAt: {
        gte: start,
        lt: end,
      },
    },
    include: { items: { include: { foodItem: true } } },
    orderBy: { loggedAt: "asc" },
  });

  return c.json(buildNutritionProgress(date, days, logs));
});

router.get("/", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const rawDate = c.req.query("date");
  let dateFilter:
    | {
        gte: Date;
        lt: Date;
      }
    | undefined;

  if (rawDate) {
    try {
      const date = resolveRequestedDate(rawDate);
      const bounds = getLocalDayBounds(date);
      dateFilter = {
        gte: bounds.start,
        lt: bounds.end,
      };
    } catch (error) {
      return c.json({ error: (error as Error).message }, 400);
    }
  }

  const logs = await prisma.mealLog.findMany({
    where: {
      userId,
      ...(dateFilter ? { loggedAt: dateFilter } : {}),
    },
    include: { items: { include: { foodItem: true } } },
    orderBy: { loggedAt: "desc" },
  });
  return c.json(logs);
});

router.delete("/:id", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const result = await prisma.mealLog.deleteMany({
    where: {
      id,
      userId,
    },
  });

  if (result.count === 0) {
    return c.json({ error: "Meal log not found" }, 404);
  }

  return c.json({ message: "Meal log deleted successfully" });
});

export default router;
