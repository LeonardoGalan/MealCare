import test from "node:test";
import assert from "node:assert/strict";
import { validateMealLogPayload } from "./meal-log-payload";

test("validateMealLogPayload normalizes a valid meal log request", () => {
  const payload = validateMealLogPayload({
    mealType: "BREAKFAST",
    notes: "  Morning meal  ",
    loggedAt: "2026-04-12T12:00:00",
    items: [
      {
        fdcId: 1234,
        name: "Greek Yogurt",
        brand: "Generic",
        calories: 120,
        protein: 15,
        carbs: 7,
        fat: 4,
        servingSize: 170,
        servingUnit: "g",
        servings: 1.5,
      },
    ],
  });

  assert.deepEqual(payload, {
    mealType: "BREAKFAST",
    notes: "Morning meal",
    loggedAt: "2026-04-12T12:00:00",
    items: [
      {
        fdcId: "1234",
        name: "Greek Yogurt",
        brand: "Generic",
        calories: 120,
        protein: 15,
        carbs: 7,
        fat: 4,
        servingSize: 170,
        servingUnit: "g",
        servings: 1.5,
      },
    ],
  });
});

test("validateMealLogPayload rejects invalid meal type", () => {
  assert.throws(
    () =>
      validateMealLogPayload({
        mealType: "BRUNCH",
        items: [
          {
            name: "Toast",
            calories: 80,
            protein: 3,
            carbs: 14,
            fat: 1,
            servingSize: 1,
            servingUnit: "slice",
            servings: 1,
          },
        ],
      }),
    /mealType must be one of/,
  );
});

test("validateMealLogPayload rejects missing items", () => {
  assert.throws(
    () =>
      validateMealLogPayload({
        mealType: "DINNER",
        items: [],
      }),
    /At least one meal item is required/,
  );
});

test("validateMealLogPayload rejects non-positive servings", () => {
  assert.throws(
    () =>
      validateMealLogPayload({
        mealType: "SNACK",
        items: [
          {
            name: "Apple",
            calories: 95,
            protein: 0.5,
            carbs: 25,
            fat: 0.3,
            servingSize: 182,
            servingUnit: "g",
            servings: 0,
          },
        ],
      }),
    /servings must be greater than 0/,
  );
});
