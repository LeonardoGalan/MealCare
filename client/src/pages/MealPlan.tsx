import { useState, useEffect } from "react";
import {
  Utensils,
  RefreshCw,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import api from "../lib/api";
import jsPDF from "jspdf";

type FoodItem = {
  name: string;
  calories: number;
};

type Meal = {
  name?: string;
  ingredients?: string[];
  items?: FoodItem[];
  totalCalories: number;
  protein?: number;
  carbs?: number;
  fat?: number;
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
    summary: string;
  };
};

const MEAL_LABELS = ["breakfast", "lunch", "dinner", "snack"] as const;

function formatMealLabel(label: string) {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export default function MealPlan() {
  const [data, setData] = useState<MealPlanResponse | null>(() => {
    const saved = localStorage.getItem("mealPlan");
    return saved ? JSON.parse(saved) : null;
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState<string | null>(null);

  // 🔥 ADDED: medication alerts
  const [alerts, setAlerts] = useState<string[]>([]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  const generatePlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.post<MealPlanResponse>("/meal-plan/generate");
      setData(res.data);
      localStorage.setItem("mealPlan", JSON.stringify(res.data));
    } catch {
      setError("Failed to generate meal plan.");
    } finally {
      setLoading(false);
    }
  };

  function toggleCheck(item: string) {
    setCheckedItems((prev) => ({
      ...prev,
      [item]: !prev[item],
    }));
  }

  function toggleMeal(meal: string) {
    setExpandedMeals((prev) => ({
      ...prev,
      [meal]: !prev[meal],
    }));
  }

  function generateGroceryList() {
    if (!data) return {};

    const grouped: Record<string, { meal: string; items: string[] }[]> = {};

    data.mealPlan.days.forEach((day) => {
      Object.entries(day.meals).forEach(([mealType, meal]) => {
        const mealName = meal.name || formatMealLabel(mealType);

        const ingredients =
          meal.ingredients ||
          meal.items?.map((i) => i.name) ||
          [];

        if (!grouped[mealType]) grouped[mealType] = [];

        const exists = grouped[mealType].some((m) => m.meal === mealName);

        if (!exists) {
          grouped[mealType].push({
            meal: mealName,
            items: Array.from(new Set(ingredients.map((i) => i.toLowerCase()))),
          });
        }
      });
    });

    return grouped;
  }

  const groceryList = generateGroceryList();

  // check medication interactions for grocery list
  useEffect(() => {
    const check = async () => {
      if (!groceryList) return;

      const allFoods: string[] = [];

      Object.values(groceryList).forEach((meals) => {
        meals.forEach((m) => {
          m.items.forEach((i) => {
            allFoods.push(i);
          });
        });
      });

      if (allFoods.length === 0) return;

      try {
        const res = await api.post("/fhir/medication-alerts", {
          foods: allFoods,
        });

        setAlerts(res.data.alerts || []);
      } catch {
        console.log("interaction check failed");
      }
    };

    check();
  }, [data]);

  function copyList() {
    let text = "";

    Object.entries(groceryList).forEach(([mealType, meals]) => {
      text += `${formatMealLabel(mealType)}\n`;
      meals.forEach((m) => {
        text += `${m.meal}\n`;
        m.items.forEach((i) => (text += `• ${i}\n`));
        text += "\n";
      });
    });

    navigator.clipboard.writeText(text);
    showToast("Copied to clipboard");
  }

  function exportToPDF() {
    const doc = new jsPDF();
    let y = 20;

    doc.text("MealCare Grocery List", 10, 10);

    Object.entries(groceryList).forEach(([mealType, meals]) => {
      doc.text(formatMealLabel(mealType), 10, y);
      y += 6;

      meals.forEach((m) => {
        doc.text(m.meal, 12, y);
        y += 6;

        m.items.forEach((item) => {
          doc.text(`• ${item}`, 15, y);
          y += 6;
        });

        y += 4;
      });
    });

    doc.save("grocery-list.pdf");
    showToast("PDF downloaded");
  }

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">

      {/* TOAST */}
      {toast && (
        <div className="fixed top-5 right-5 bg-black text-white px-4 py-2 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}

      {/* HEADER */}
      <div className="flex justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold">Meal Plan</h1>
          <p className="text-slate-500">AI-generated weekly meals</p>
        </div>

        <button
          onClick={generatePlan}
          className="bg-emerald-600 text-white px-5 py-2 rounded-lg flex gap-2 items-center"
        >
          {loading ? <RefreshCw className="animate-spin" /> : <Utensils />}
          Generate
        </button>
      </div>

      {/* medication alerts UI */}
      {alerts.length > 0 && (
        <div className="mb-4 bg-red-50 border p-3 rounded text-sm text-red-700">
          <strong>⚠ Medication Warnings:</strong>
          <ul className="list-disc ml-5">
            {alerts.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {/* GROCERY LIST */}
      {data && (
        <div className="mb-6 bg-green-50 border p-4 rounded-xl">
          <div className="flex justify-between mb-2">
            <h2 className="font-semibold text-green-800">Grocery List</h2>
            <div className="flex gap-3 text-sm">
              <button onClick={copyList}>Copy</button>
              <button onClick={exportToPDF}>PDF</button>
            </div>
          </div>

          {Object.entries(groceryList).map(([mealType, meals]) => (
            <div key={mealType} className="mb-4">
              <p className="font-semibold">{formatMealLabel(mealType)}</p>

              {meals.map((m, i) => {
                const expanded = expandedMeals[m.meal];

                return (
                  <div key={i} className="ml-2 mt-1">
                    <div
                      className="flex items-center gap-2 cursor-pointer"
                      onClick={() => toggleMeal(m.meal)}
                    >
                      {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                      <span className="font-medium">{m.meal}</span>
                    </div>

                    {expanded && (
                      <div className="ml-5 mt-1">
                        {m.items.map((item, j) => (
                          <label key={j} className="flex gap-2 items-center">
                            <input
                              type="checkbox"
                              checked={checkedItems[item] || false}
                              onChange={() => toggleCheck(item)}
                            />
                            <span className={checkedItems[item] ? "line-through text-gray-400" : ""}>
                              {item}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* ERROR */}
      {error && <p className="text-red-500">{error}</p>}

      {/* MEALS UI */}
      {data && (
        <div className="space-y-6">
          {data.mealPlan.days.map((day) => (
            <div key={day.day} className="rounded-xl border bg-white">
              <div className="flex justify-between px-5 py-3 bg-slate-50">
                <h2>{day.day}</h2>

                <span className="text-right">
                  <div>{day.totalCalories} kcal</div>
                  <div className="text-xs text-gray-400">
                    P: {Object.values(day.meals).reduce((s, m) => s + (m.protein || 0), 0)}g |
                    C: {Object.values(day.meals).reduce((s, m) => s + (m.carbs || 0), 0)}g |
                    F: {Object.values(day.meals).reduce((s, m) => s + (m.fat || 0), 0)}g
                  </div>
                </span>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4">
                {MEAL_LABELS.map((mealKey) => {
                  const meal = day.meals[mealKey];

                  const list =
                    meal.ingredients ||
                    meal.items?.map((i) => i.name) ||
                    [];

                  return (
                    <div key={mealKey} className="p-4 border-t">
                      <p className="font-semibold text-sm text-gray-500">
                        {formatMealLabel(mealKey)}
                      </p>

                      <p className="font-medium">
                        {meal.name || "Meal"}
                      </p>

                      {list.map((item, i) => (
                        <div key={i} className="text-sm text-gray-500">
                          • {item}
                        </div>
                      ))}

                      <p className="text-xs text-gray-400 mt-1">
                        {meal.totalCalories} kcal
                      </p>
                      <p className="text-xs text-gray-400">
                        P: {meal.protein || 0}g | C: {meal.carbs || 0}g | F: {meal.fat || 0}g
                      </p>
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