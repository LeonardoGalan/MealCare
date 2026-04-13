import api from "./api";

export const MEAL_TYPES = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as const;

export type MealType = (typeof MEAL_TYPES)[number];

export type NutritionTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type MealTypeSummary = NutritionTotals & {
  mealCount: number;
  itemCount: number;
};

export type DailyNutritionSummary = {
  date: string;
  totals: NutritionTotals;
  mealCount: number;
  itemCount: number;
  byMealType: Record<MealType, MealTypeSummary>;
};

export type NutritionProgressBucket = {
  date: string;
  totals: NutritionTotals;
  mealCount: number;
  itemCount: number;
};

export type NutritionProgressSummary = {
  date: string;
  days: 7 | 30;
  startDate: string;
  endDate: string;
  averages: NutritionTotals;
  buckets: NutritionProgressBucket[];
};

export type FoodSearchResult = {
  fdcId: number;
  name: string;
  brand: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
};

export type MealLogFoodItem = {
  id: string;
  name: string;
  brand: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type MealLogItem = {
  id: string;
  servings: number;
  foodItem: MealLogFoodItem | null;
};

export type MealLog = {
  id: string;
  mealType: MealType;
  loggedAt: string;
  notes: string | null;
  items: MealLogItem[];
};

export type CreateMealLogInput = {
  selectedDate: string;
  selectedFood: FoodSearchResult;
  mealType: MealType;
  servings: number;
};

export function createEmptyNutritionTotals(): NutritionTotals {
  return {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  };
}

function createEmptyMealTypeSummary(): MealTypeSummary {
  return {
    ...createEmptyNutritionTotals(),
    mealCount: 0,
    itemCount: 0,
  };
}

export function createEmptySummary(date: string): DailyNutritionSummary {
  return {
    date,
    totals: createEmptyNutritionTotals(),
    mealCount: 0,
    itemCount: 0,
    byMealType: {
      BREAKFAST: createEmptyMealTypeSummary(),
      LUNCH: createEmptyMealTypeSummary(),
      DINNER: createEmptyMealTypeSummary(),
      SNACK: createEmptyMealTypeSummary(),
    },
  };
}

export function toLocalDateKey(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDateLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatMealTypeLabel(mealType: MealType): string {
  return mealType.charAt(0) + mealType.slice(1).toLowerCase();
}

export function roundValue(value: number): string {
  return Math.round(value).toString();
}

export function buildMealDescription(logs: MealLog[]): string {
  const names = [
    ...new Set(
      logs.flatMap((log) =>
        log.items
          .map((item) => item.foodItem?.name)
          .filter((value): value is string => Boolean(value)),
      ),
    ),
  ];

  if (names.length === 0) {
    return "No meal logged yet";
  }

  if (names.length <= 3) {
    return names.join(", ");
  }

  return `${names.slice(0, 3).join(", ")} +${names.length - 3} more`;
}

export function calculateMacroPercentages(
  totals: NutritionTotals,
): Record<"protein" | "carbs" | "fat", number> {
  const proteinCalories = totals.protein * 4;
  const carbCalories = totals.carbs * 4;
  const fatCalories = totals.fat * 9;
  const totalMacroCalories = proteinCalories + carbCalories + fatCalories;

  if (totalMacroCalories === 0) {
    return {
      protein: 0,
      carbs: 0,
      fat: 0,
    };
  }

  return {
    protein: Math.round((proteinCalories / totalMacroCalories) * 100),
    carbs: Math.round((carbCalories / totalMacroCalories) * 100),
    fat: Math.round((fatCalories / totalMacroCalories) * 100),
  };
}

export function groupByMealType(logs: MealLog[]): Record<MealType, MealLog[]> {
  return logs.reduce<Record<MealType, MealLog[]>>(
    (acc, log) => {
      acc[log.mealType].push(log);
      return acc;
    },
    {
      BREAKFAST: [],
      LUNCH: [],
      DINNER: [],
      SNACK: [],
    },
  );
}

export async function fetchMealLogs(date: string): Promise<MealLog[]> {
  const response = await api.get<MealLog[]>("/meal-logs", {
    params: { date },
  });

  return response.data;
}

export async function fetchDailySummary(
  date: string,
): Promise<DailyNutritionSummary> {
  const response = await api.get<DailyNutritionSummary>("/meal-logs/summary", {
    params: { date },
  });

  return response.data;
}

export async function fetchNutritionProgress(
  date: string,
  days: 7 | 30,
): Promise<NutritionProgressSummary> {
  const response = await api.get<NutritionProgressSummary>("/meal-logs/progress", {
    params: { date, days },
  });

  return response.data;
}

export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  const response = await api.get<FoodSearchResult[]>("/meal-logs/search", {
    params: { q: query.trim() },
  });

  return response.data;
}

export async function createMealLog({
  selectedDate,
  selectedFood,
  mealType,
  servings,
}: CreateMealLogInput): Promise<void> {
  await api.post("/meal-logs", {
    mealType,
    notes: `${selectedFood.name} added`,
    loggedAt: `${selectedDate}T12:00:00`,
    items: [
      {
        fdcId: selectedFood.fdcId,
        name: selectedFood.name,
        brand: selectedFood.brand,
        calories: selectedFood.calories,
        protein: selectedFood.protein,
        carbs: selectedFood.carbs,
        fat: selectedFood.fat,
        servingSize: selectedFood.servingSize,
        servingUnit: selectedFood.servingUnit,
        servings,
      },
    ],
  });
}

export async function deleteMealLog(id: string): Promise<void> {
  await api.delete(`/meal-logs/${id}`);
}
