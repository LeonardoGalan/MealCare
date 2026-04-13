import { MEAL_TYPES, type MealType } from "./nutrition";

type MealLogRequestItem = {
  fdcId?: string;
  name: string;
  brand: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: number;
  servingUnit: string;
  servings: number;
};

export type MealLogRequestPayload = {
  mealType: MealType;
  notes: string | null;
  loggedAt?: string;
  items: MealLogRequestItem[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function validateRequiredText(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required.`);
  }

  return value.trim();
}

function validateOptionalText(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("notes must be a string.");
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function validateNonNegativeNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be a non-negative number.`);
  }

  return value;
}

function validatePositiveNumber(value: unknown, field: string): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be greater than 0.`);
  }

  return value;
}

function validateMealType(value: unknown): MealType {
  if (typeof value !== "string" || !MEAL_TYPES.includes(value as MealType)) {
    throw new Error("mealType must be one of BREAKFAST, LUNCH, DINNER, or SNACK.");
  }

  return value as MealType;
}

function validateRequestItem(value: unknown): MealLogRequestItem {
  if (!isRecord(value)) {
    throw new Error("Each meal item must be an object.");
  }

  const fdcId =
    value.fdcId === undefined || value.fdcId === null
      ? undefined
      : String(value.fdcId);

  const brand =
    value.brand === undefined || value.brand === null
      ? null
      : validateRequiredText(value.brand, "brand");

  return {
    fdcId,
    name: validateRequiredText(value.name, "name"),
    brand,
    calories: validateNonNegativeNumber(value.calories, "calories"),
    protein: validateNonNegativeNumber(value.protein, "protein"),
    carbs: validateNonNegativeNumber(value.carbs, "carbs"),
    fat: validateNonNegativeNumber(value.fat, "fat"),
    servingSize: validatePositiveNumber(value.servingSize, "servingSize"),
    servingUnit: validateRequiredText(value.servingUnit, "servingUnit"),
    servings: validatePositiveNumber(value.servings, "servings"),
  };
}

export function validateMealLogPayload(body: unknown): MealLogRequestPayload {
  if (!isRecord(body)) {
    throw new Error("Request body must be an object.");
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    throw new Error("At least one meal item is required.");
  }

  return {
    mealType: validateMealType(body.mealType),
    notes: validateOptionalText(body.notes),
    loggedAt:
      body.loggedAt === undefined
        ? undefined
        : validateRequiredText(body.loggedAt, "loggedAt"),
    items: body.items.map(validateRequestItem),
  };
}
