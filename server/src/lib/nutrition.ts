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

export type MealLogItemSummarySource = {
  servings: number;
  foodItem: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null;
};

export type MealLogSummarySource = {
  mealType: MealType;
  items: MealLogItemSummarySource[];
};

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

export function createEmptyDailyNutritionSummary(
  date: string,
): DailyNutritionSummary {
  return {
    date,
    totals: createEmptyNutritionTotals(),
    mealCount: 0,
    itemCount: 0,
    byMealType: createEmptyMealTypeSummaries(),
  };
}

export function createEmptyMealTypeSummaries(): Record<MealType, MealTypeSummary> {
  return {
    BREAKFAST: createEmptyMealTypeSummary(),
    LUNCH: createEmptyMealTypeSummary(),
    DINNER: createEmptyMealTypeSummary(),
    SNACK: createEmptyMealTypeSummary(),
  };
}

export function addNutritionTotals(
  totals: NutritionTotals,
  next: NutritionTotals,
): NutritionTotals {
  return {
    calories: totals.calories + next.calories,
    protein: totals.protein + next.protein,
    carbs: totals.carbs + next.carbs,
    fat: totals.fat + next.fat,
  };
}

export function summarizeMealLog(log: MealLogSummarySource): NutritionTotals {
  return log.items.reduce<NutritionTotals>((totals, item) => {
    const foodItem = item.foodItem;
    if (!foodItem) {
      return totals;
    }

    const servings = item.servings || 0;

    return addNutritionTotals(totals, {
      calories: foodItem.calories * servings,
      protein: foodItem.protein * servings,
      carbs: foodItem.carbs * servings,
      fat: foodItem.fat * servings,
    });
  }, createEmptyNutritionTotals());
}

export function buildDailyNutritionSummary(
  date: string,
  logs: MealLogSummarySource[],
): DailyNutritionSummary {
  const summary = createEmptyDailyNutritionSummary(date);

  for (const log of logs) {
    const mealSummary = summarizeMealLog(log);
    const bucket = summary.byMealType[log.mealType];
    const itemCount = log.items.length;

    summary.totals = addNutritionTotals(summary.totals, mealSummary);
    summary.mealCount += 1;
    summary.itemCount += itemCount;
    summary.byMealType[log.mealType] = {
      ...addNutritionTotals(bucket, mealSummary),
      mealCount: bucket.mealCount + 1,
      itemCount: bucket.itemCount + itemCount,
    };
  }

  return summary;
}

export function toLocalDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function resolveRequestedDate(
  value: string | undefined,
  now: Date = new Date(),
): string {
  if (!value) {
    return toLocalDateKey(now);
  }

  if (!DATE_KEY_PATTERN.test(value)) {
    throw new Error("Invalid date. Use YYYY-MM-DD.");
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    throw new Error("Invalid date. Use YYYY-MM-DD.");
  }

  return value;
}

export function getLocalDayBounds(date: string): { start: Date; end: Date } {
  const [year, month, day] = date.split("-").map(Number);

  return {
    start: new Date(year, month - 1, day, 0, 0, 0, 0),
    end: new Date(year, month - 1, day + 1, 0, 0, 0, 0),
  };
}

export function resolveLoggedAt(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid loggedAt value.");
  }

  return parsed;
}
