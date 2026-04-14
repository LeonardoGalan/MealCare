import test from "node:test";
import assert from "node:assert/strict";
import {
  buildDailyNutritionSummary,
  getLocalDayBounds,
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

test("resolveLoggedAt accepts ISO values and rejects invalid ones", () => {
  const parsed = resolveLoggedAt("2026-04-12T12:00:00");
  assert.ok(parsed instanceof Date);
  assert.throws(() => resolveLoggedAt("not-a-date"));
});
