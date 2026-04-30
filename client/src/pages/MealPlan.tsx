import { useState } from "react";
import { Utensils, RefreshCw, AlertTriangle } from "lucide-react";
import api from "../lib/api";

type FoodItem = {
  name: string;
  calories: number;
};

type Meal = {
  items: FoodItem[];
  totalCalories: number;
};

type DayPlan = {
  day: string;
  meals: {
    breakfast: Meal;
    lunch: Meal;
    dinner: Meal;
    snack: Meal;
  };
  totalCalories: number;
};

type MealPlanResponse = {
  mealPlan: {
    days: DayPlan[];
    dailyCalorieTarget?: number;
    summary: string;
  };
  conditions: string[];
  allergies: string[];
};

const MEAL_LABELS = ["breakfast", "lunch", "dinner", "snack"] as const;

function formatMealLabel(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function MealPlan() {
const [data, setData] = useState<MealPlanResponse | null>(() => {
  const saved = localStorage.getItem("mealPlan");
  return saved ? JSON.parse(saved) : null;
});
    const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = async () => {
  setLoading(true);
  setError(null);

  try {
    const res = await api.post<MealPlanResponse>("/meal-plan/generate");
    setData(res.data);
    localStorage.setItem("mealPlan", JSON.stringify(res.data));
  } catch {
    setError("Failed to generate meal plan. Make sure you have a FHIR patient linked.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Meal Plan</h1>
          <p className="text-slate-500 mt-1">
            AI-generated weekly meal plan based on your health profile
          </p>
        </div>
        <button
          onClick={generatePlan}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Utensils className="w-4 h-4" />
              Generate Meal Plan
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {!data && !loading && !error && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <Utensils className="w-12 h-12 mx-auto mb-3 text-slate-300" />
          <p className="text-slate-500">
            Click "Generate Meal Plan" to create a personalized weekly meal plan based on your linked FHIR patient data.
          </p>
        </div>
      )}

      {loading && (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <RefreshCw className="w-12 h-12 mx-auto mb-3 text-emerald-400 animate-spin" />
          <p className="text-slate-500">
            Analyzing your health profile and generating a personalized meal plan...
          </p>
        </div>
      )}

      {data && (
        <div className="space-y-6">
         {/* Summary */}
<div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
  <p className="text-sm font-semibold text-emerald-800 mb-1">
    Personalized meal plan generated based on your FHIR health profile
  </p>
  {data.mealPlan.dailyCalorieTarget && (
    <p className="text-sm text-emerald-700">
      Daily calorie target: {data.mealPlan.dailyCalorieTarget} kcal
    </p>
  )}
</div>

          {/* Conditions & Allergies */}
          <div className="flex flex-wrap gap-3">
            {data.conditions.length > 0 && (
              <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2">
                <p className="text-xs text-sky-800">
                  <span className="font-semibold">Conditions:</span>{" "}
                  {data.conditions.join(", ")}
                </p>
              </div>
            )}
            {data.allergies.length > 0 && (
              <div className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2">
                <p className="text-xs text-rose-800">
                  <span className="font-semibold">Allergies:</span>{" "}
                  {data.allergies.join(", ")}
                </p>
              </div>
            )}
          </div>

          {/* Weekly Plan */}
          {data.mealPlan.days.map((day) => (
            <div
              key={day.day}
              className="rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 bg-slate-50 rounded-t-xl">
                <h2 className="font-semibold text-slate-800">{day.day}</h2>
                <span className="text-sm font-medium text-emerald-600">
                  {day.totalCalories} kcal
                </span>
              </div>

              <div className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-4">
                {MEAL_LABELS.map((mealKey) => {
                  const meal = day.meals[mealKey];
                  return (
                    <div key={mealKey} className="bg-white p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-semibold text-slate-700">
                          {formatMealLabel(mealKey)}
                        </p>
                        <span className="text-xs text-emerald-600 font-medium">
                          {meal.totalCalories} kcal
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {meal.items.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-slate-600">{item.name}</span>
                            <span className="text-xs text-slate-400">
                              {item.calories} kcal
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}