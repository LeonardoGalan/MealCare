import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDailyNutritionSummary,
  buildNutritionProgress,
  getDateRangeKeys,
  getLocalDateRangeBounds,
  getLocalDayBounds,
  resolveProgressDays,
  resolveLoggedAt,
  resolveRequestedDate,
  summarizeMealLog,
} from "./nutrition";

test("summarizeMealLog totals calories and macros by servings", () => {
  const summary = summarizeMealLog({
    mealType: "BREAKFAST",
    items: [
      {
        servings: 1.5,
        foodItem: {
          calories: 200,
          protein: 10,
          carbs: 15,
          fat: 5,
        },
      },
      {
        servings: 2,
        foodItem: {
          calories: 50,
          protein: 3,
          carbs: 8,
          fat: 1,
        },
      },
    ],
  });

  assert.deepEqual(summary, {
    calories: 400,
    protein: 21,
    carbs: 38.5,
    fat: 9.5,
  });
});

test("buildDailyNutritionSummary aggregates totals by meal type", () => {
  const summary = buildDailyNutritionSummary("2026-04-12", [
    {
      mealType: "BREAKFAST",
      items: [
        {
          servings: 1,
          foodItem: {
            calories: 300,
            protein: 15,
            carbs: 30,
            fat: 10,
          },
        },
      ],
    },
    {
      mealType: "DINNER",
      items: [
        {
          servings: 2,
          foodItem: {
            calories: 250,
            protein: 20,
            carbs: 12,
            fat: 8,
          },
        },
      ],
    },
  ]);

  assert.equal(summary.date, "2026-04-12");
  assert.equal(summary.mealCount, 2);
  assert.equal(summary.itemCount, 2);
  assert.deepEqual(summary.totals, {
    calories: 800,
    protein: 55,
    carbs: 54,
    fat: 26,
  });
  assert.deepEqual(summary.byMealType.BREAKFAST, {
    calories: 300,
    protein: 15,
    carbs: 30,
    fat: 10,
    mealCount: 1,
    itemCount: 1,
  });
  assert.deepEqual(summary.byMealType.DINNER, {
    calories: 500,
    protein: 40,
    carbs: 24,
    fat: 16,
    mealCount: 1,
    itemCount: 1,
  });
  assert.equal(summary.byMealType.SNACK.mealCount, 0);
});

test("buildNutritionProgress fills missing days and averages totals across range", () => {
  const progress = buildNutritionProgress("2026-04-12", 7, [
    {
      mealType: "BREAKFAST",
      loggedAt: new Date(2026, 3, 8, 8, 30, 0, 0),
      items: [
        {
          servings: 1,
          foodItem: {
            calories: 300,
            protein: 18,
            carbs: 35,
            fat: 9,
          },
        },
      ],
    },
    {
      mealType: "DINNER",
      loggedAt: new Date(2026, 3, 12, 19, 0, 0, 0),
      items: [
        {
          servings: 2,
          foodItem: {
            calories: 250,
            protein: 20,
            carbs: 12,
            fat: 8,
          },
        },
      ],
    },
  ]);

  assert.equal(progress.days, 7);
  assert.equal(progress.startDate, "2026-04-06");
  assert.equal(progress.endDate, "2026-04-12");
  assert.equal(progress.buckets.length, 7);
  assert.deepEqual(progress.buckets[0], {
    date: "2026-04-06",
    totals: {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    },
    mealCount: 0,
    itemCount: 0,
  });
  assert.deepEqual(progress.buckets[2], {
    date: "2026-04-08",
    totals: {
      calories: 300,
      protein: 18,
      carbs: 35,
      fat: 9,
    },
    mealCount: 1,
    itemCount: 1,
  });
  assert.deepEqual(progress.buckets[6], {
    date: "2026-04-12",
    totals: {
      calories: 500,
      protein: 40,
      carbs: 24,
      fat: 16,
    },
    mealCount: 1,
    itemCount: 1,
  });
  assert.deepEqual(progress.averages, {
    calories: 800 / 7,
    protein: 58 / 7,
    carbs: 59 / 7,
    fat: 25 / 7,
  });
});

test("resolveRequestedDate defaults to the current local day", () => {
  assert.equal(
    resolveRequestedDate(undefined, new Date(2026, 3, 12, 9, 30, 0, 0)),
    "2026-04-12",
  );
});

test("resolveRequestedDate rejects malformed values", () => {
  assert.throws(() => resolveRequestedDate("2026/04/12"));
  assert.throws(() => resolveRequestedDate("2026-02-31"));
});

test("getLocalDayBounds returns an inclusive-exclusive local day range", () => {
  const { start, end } = getLocalDayBounds("2026-04-12");

  assert.equal(start.getFullYear(), 2026);
  assert.equal(start.getMonth(), 3);
  assert.equal(start.getDate(), 12);
  assert.equal(start.getHours(), 0);

  assert.equal(end.getFullYear(), 2026);
  assert.equal(end.getMonth(), 3);
  assert.equal(end.getDate(), 13);
  assert.equal(end.getHours(), 0);
});

test("getDateRangeKeys returns contiguous local date keys ending on the selected date", () => {
  assert.deepEqual(getDateRangeKeys("2026-04-12", 3), [
    "2026-04-10",
    "2026-04-11",
    "2026-04-12",
  ]);
});

test("getLocalDateRangeBounds returns inclusive-exclusive range for progress queries", () => {
  const { start, end, dates } = getLocalDateRangeBounds("2026-04-12", 7);

  assert.equal(start.getDate(), 6);
  assert.equal(end.getDate(), 13);
  assert.equal(dates.length, 7);
  assert.equal(dates[0], "2026-04-06");
  assert.equal(dates[6], "2026-04-12");
});

test("resolveProgressDays defaults to 7 and rejects unsupported values", () => {
  assert.equal(resolveProgressDays(undefined), 7);
  assert.equal(resolveProgressDays("30"), 30);
  assert.throws(() => resolveProgressDays("14"));
  assert.throws(() => resolveProgressDays("abc"));
});

test("resolveLoggedAt accepts ISO values and rejects invalid ones", () => {
  const parsed = resolveLoggedAt("2026-04-12T12:00:00");
  assert.ok(parsed instanceof Date);
  assert.throws(() => resolveLoggedAt("not-a-date"));
});
