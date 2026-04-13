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
  days: number;
  startDate: string;
  endDate: string;
  averages: NutritionTotals;
  buckets: NutritionProgressBucket[];
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

export type MealLogProgressSource = MealLogSummarySource & {
  loggedAt: Date;
};

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const SUPPORTED_PROGRESS_DAYS = [7, 30] as const;

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

function createEmptyProgressBucket(date: string): NutritionProgressBucket {
  return {
    date,
    totals: createEmptyNutritionTotals(),
    mealCount: 0,
    itemCount: 0,
  };
}

export function getDateRangeKeys(endDate: string, days: number): string[] {
  const [year, month, day] = endDate.split("-").map(Number);
  const end = new Date(year, month - 1, day, 0, 0, 0, 0);
  const keys: string[] = [];

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const current = new Date(end);
    current.setDate(end.getDate() - offset);
    keys.push(toLocalDateKey(current));
  }

  return keys;
}

export function getLocalDateRangeBounds(
  endDate: string,
  days: number,
): { start: Date; end: Date; dates: string[] } {
  const dates = getDateRangeKeys(endDate, days);
  const [startYear, startMonth, startDay] = dates[0].split("-").map(Number);
  const [endYear, endMonth, endDay] = endDate.split("-").map(Number);

  return {
    start: new Date(startYear, startMonth - 1, startDay, 0, 0, 0, 0),
    end: new Date(endYear, endMonth - 1, endDay + 1, 0, 0, 0, 0),
    dates,
  };
}

export function resolveProgressDays(value: string | undefined): 7 | 30 {
  if (!value) {
    return 7;
  }

  const parsed = Number(value);
  if (
    !Number.isInteger(parsed) ||
    !SUPPORTED_PROGRESS_DAYS.includes(parsed as 7 | 30)
  ) {
    throw new Error("days must be 7 or 30.");
  }

  return parsed as 7 | 30;
}

export function buildNutritionProgress(
  endDate: string,
  days: 7 | 30,
  logs: MealLogProgressSource[],
): NutritionProgressSummary {
  const dates = getDateRangeKeys(endDate, days);
  const bucketMap = new Map<string, NutritionProgressBucket>(
    dates.map((date) => [date, createEmptyProgressBucket(date)]),
  );

  for (const log of logs) {
    const date = toLocalDateKey(log.loggedAt);
    const bucket = bucketMap.get(date);

    if (!bucket) {
      continue;
    }

    const mealSummary = summarizeMealLog(log);
    bucket.totals = addNutritionTotals(bucket.totals, mealSummary);
    bucket.mealCount += 1;
    bucket.itemCount += log.items.length;
  }

  const buckets = dates.map((date) => bucketMap.get(date) ?? createEmptyProgressBucket(date));
  const total = buckets.reduce(
    (acc, bucket) => addNutritionTotals(acc, bucket.totals),
    createEmptyNutritionTotals(),
  );

  return {
    date: endDate,
    days,
    startDate: dates[0],
    endDate,
    averages: {
      calories: total.calories / days,
      protein: total.protein / days,
      carbs: total.carbs / days,
      fat: total.fat / days,
    },
    buckets,
  };
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
