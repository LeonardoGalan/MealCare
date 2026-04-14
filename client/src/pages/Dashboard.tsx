import { useEffect, useState } from "react";
import {
  ClipboardList,
  Link2,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import api from "../lib/api";

type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";
type UtilityTab = "log" | "history";

type NutritionTotals = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type MealTypeSummary = NutritionTotals & {
  mealCount: number;
  itemCount: number;
};

type DailyNutritionSummary = {
  date: string;
  totals: NutritionTotals;
  mealCount: number;
  itemCount: number;
  byMealType: Record<MealType, MealTypeSummary>;
};

type UserData = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fhirPatientId: string | null;
};

type HumanName = {
  given?: string[];
  family?: string;
};

type Patient = {
  id: string;
  name?: HumanName[];
  birthDate?: string;
  gender?: string;
};

type FhirContext = {
  patient: Patient | null;
  conditions: string[];
  allergies: string[];
  providerSuggestions: string[];
};

type PatientSearchEntry = {
  resource: {
    id: string;
    name?: HumanName[];
  };
};

type FoodSearchResult = {
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

type MealLogFoodItem = {
  id: string;
  name: string;
  brand: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type MealLogItem = {
  id: string;
  servings: number;
  foodItem: MealLogFoodItem | null;
};

type MealLog = {
  id: string;
  mealType: MealType;
  loggedAt: string;
  notes: string | null;
  items: MealLogItem[];
};

const MEAL_TYPES: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];
const CALORIE_GOAL = 2000;

function createEmptyNutritionTotals(): NutritionTotals {
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

function createEmptySummary(date: string): DailyNutritionSummary {
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

function createEmptyFhirContext(): FhirContext {
  return {
    patient: null,
    conditions: [],
    allergies: [],
    providerSuggestions: [
      "Link a FHIR patient to unlock condition-aware meal guidance and allergy reminders.",
    ],
  };
}

function toLocalDateKey(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatMealTypeLabel(mealType: MealType): string {
  return mealType.charAt(0) + mealType.slice(1).toLowerCase();
}

function roundValue(value: number): string {
  return Math.round(value).toString();
}

function formatPatientName(
  patient: Patient | null,
  user: UserData | null,
): string {
  const name = patient?.name?.[0];
  const givenName = name?.given?.join(" ") || name?.given?.[0] || "";
  const familyName = name?.family || "";
  const combined = `${givenName} ${familyName}`.trim();

  if (combined) {
    return combined;
  }

  if (user) {
    return `${user.firstName} ${user.lastName}`.trim();
  }

  return "No linked patient";
}

function formatValueList(values: string[], emptyValue: string): string {
  return values.length > 0 ? values.join(", ") : emptyValue;
}

function buildMealDescription(logs: MealLog[]): string {
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

function calculateMacroPercentages(totals: NutritionTotals): Record<"protein" | "carbs" | "fat", number> {
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

function groupByMealType(logs: MealLog[]): Record<MealType, MealLog[]> {
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

export default function Dashboard() {
  const [user, setUser] = useState<UserData | null>(null);
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [dailySummary, setDailySummary] = useState<DailyNutritionSummary>(() =>
    createEmptySummary(toLocalDateKey(new Date())),
  );
  const [fhirContext, setFhirContext] = useState<FhirContext>(() =>
    createEmptyFhirContext(),
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null);
  const [mealType, setMealType] = useState<MealType>("BREAKFAST");
  const [servings, setServings] = useState(1);

  const [selectedDate, setSelectedDate] = useState(() => toLocalDateKey(new Date()));
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [patientResults, setPatientResults] = useState<PatientSearchEntry[]>([]);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [isUtilityPanelOpen, setIsUtilityPanelOpen] = useState(false);
  const [utilityTab, setUtilityTab] = useState<UtilityTab>("log");

  useEffect(() => {
    let cancelled = false;

    const loadInitialContext = async () => {
      try {
        const [userResponse, contextResponse] = await Promise.all([
          api.get<UserData>("/me"),
          api.get<FhirContext>("/fhir/context"),
        ]);

        if (!cancelled) {
          setUser(userResponse.data);
          setFhirContext(contextResponse.data);
        }
      } catch {
        if (!cancelled) {
          setDashboardError("Unable to load your profile.");
        }
      }
    };

    void loadInitialContext();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadDashboard = async () => {
      setIsLoadingDashboard(true);
      setDashboardError(null);

      try {
        const [mealResponse, summaryResponse] = await Promise.all([
          api.get<MealLog[]>("/meal-logs", {
            params: { date: selectedDate },
          }),
          api.get<DailyNutritionSummary>("/meal-logs/summary", {
            params: { date: selectedDate },
          }),
        ]);

        if (!cancelled) {
          setMealLogs(mealResponse.data);
          setDailySummary(summaryResponse.data);
        }
      } catch {
        if (!cancelled) {
          setMealLogs([]);
          setDailySummary(createEmptySummary(selectedDate));
          setDashboardError("Unable to load nutrition data right now.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingDashboard(false);
        }
      }
    };

    void loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const reloadSelectedDate = async () => {
    const [mealResponse, summaryResponse] = await Promise.all([
      api.get<MealLog[]>("/meal-logs", {
        params: { date: selectedDate },
      }),
      api.get<DailyNutritionSummary>("/meal-logs/summary", {
        params: { date: selectedDate },
      }),
    ]);

    setMealLogs(mealResponse.data);
    setDailySummary(summaryResponse.data);
  };

  const reloadFhirContext = async () => {
    const response = await api.get<FhirContext>("/fhir/context");
    setFhirContext(response.data);
  };

  const handleSearchFoods = async () => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await api.get<FoodSearchResult[]>(
        `/meal-logs/search?q=${encodeURIComponent(searchTerm.trim())}`,
      );
      setSearchResults(response.data);
    } catch {
      setSearchResults([]);
      setDashboardError("Food search is currently unavailable.");
    }
  };

  const handleSearchPatients = async (query: string) => {
    if (!query.trim()) {
      setPatientResults([]);
      return;
    }

    try {
      const response = await api.get<PatientSearchEntry[]>(
        `/fhir/search?q=${encodeURIComponent(query.trim())}`,
      );
      setPatientResults(response.data);
    } catch {
      setPatientResults([]);
    }
  };

  const linkPatient = async (id: string) => {
    await api.post("/fhir/link", { fhirPatientId: id });
    await reloadFhirContext();
    setShowLinkModal(false);
    setPatientResults([]);
  };

  const addMeal = async () => {
    if (!selectedFood || servings <= 0) {
      return;
    }

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

    setSelectedFood(null);
    setServings(1);
    setSearchResults([]);
    setSearchTerm("");
    setUtilityTab("history");
    await reloadSelectedDate();
  };

  const deleteMeal = async (id: string) => {
    await api.delete(`/meal-logs/${id}`);
    await reloadSelectedDate();
  };

  const openUtilityPanel = (tab: UtilityTab) => {
    setUtilityTab(tab);
    setIsUtilityPanelOpen(true);
  };

  const groupedMeals = groupByMealType(mealLogs);
  const macroPercentages = calculateMacroPercentages(dailySummary.totals);
  const calorieProgress = Math.min(
    100,
    Math.round((dailySummary.totals.calories / CALORIE_GOAL) * 100),
  );
  const patientName = formatPatientName(fhirContext.patient, user);

  return (
    <div className="h-full bg-[radial-gradient(circle_at_top,#f9fcff_0%,#eef5fb_55%,#e7eff8_100%)]">
      <div className="mx-auto max-w-[1500px] px-4 py-4 xl:px-5">
        {dashboardError && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {dashboardError}
          </div>
        )}

        <div className="grid gap-3 xl:grid-cols-[0.82fr,1.38fr]">
          <section className="rounded-xl border border-sky-100 bg-gradient-to-br from-white via-[#fbfdff] to-sky-50 p-4 shadow-sm shadow-sky-100/60">
            <h2 className="text-[1.8rem] font-bold leading-tight text-slate-800">
              Your Information
            </h2>
            <div className="mt-4 space-y-2.5 text-sm text-slate-700">
              <p>
                <span className="font-semibold text-slate-800">Name:</span> {patientName}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Email:</span>{" "}
                {user?.email || "Unavailable"}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Conditions:</span>{" "}
                {formatValueList(fhirContext.conditions, "No linked conditions found")}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Allergies:</span>{" "}
                <span className="text-rose-500">
                  {formatValueList(fhirContext.allergies, "No known allergies found")}
                </span>
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                onClick={() => setShowLinkModal(true)}
                className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-medium text-[#205278] transition hover:bg-sky-50"
                type="button"
              >
                <Link2 className="h-4 w-4" />
                {fhirContext.patient ? "Relink Patient" : "Link FHIR Patient"}
              </button>

              {fhirContext.patient?.birthDate && (
                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-[#205278]">
                  DOB {fhirContext.patient.birthDate}
                </span>
              )}

              {fhirContext.patient?.gender && (
                <span className="rounded-full bg-teal-100 px-3 py-1 text-xs font-medium capitalize text-teal-700">
                  {fhirContext.patient.gender}
                </span>
              )}
            </div>
          </section>

          <section className="rounded-xl border border-cyan-100 bg-gradient-to-br from-white via-[#faffff] to-cyan-50 p-4 shadow-sm shadow-cyan-100/70">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h2 className="text-[1.8rem] font-bold leading-tight text-slate-800">
                  Today&apos;s Summary
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">{formatDateLabel(selectedDate)}</p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center xl:flex-nowrap">
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(event) => setSelectedDate(event.target.value)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
                />
                <button
                  onClick={() => openUtilityPanel("log")}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-[#1e86c8] px-3 py-2 text-xs font-medium text-white transition hover:bg-[#166896]"
                  type="button"
                >
                  <Plus className="h-4 w-4" />
                  Quick Log
                </button>
                <button
                  onClick={() => openUtilityPanel("history")}
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-medium text-[#205278] transition hover:bg-sky-50"
                  type="button"
                >
                  <ClipboardList className="h-4 w-4" />
                  View History
                </button>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
                <span>Calories</span>
                <span>
                  {roundValue(dailySummary.totals.calories)} / {CALORIE_GOAL} kcal
                </span>
              </div>
              <div className="mt-2.5 h-3 rounded-full bg-sky-100">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-emerald-400 to-[#1fba8c] transition-all"
                  style={{ width: `${calorieProgress}%` }}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
              {[
                {
                  label: "Protein",
                  value: `${roundValue(dailySummary.totals.protein)} g`,
                  accent: "text-emerald-600",
                },
                {
                  label: "Carbs",
                  value: `${roundValue(dailySummary.totals.carbs)} g`,
                  accent: "text-[#1e7cb6]",
                },
                {
                  label: "Fat",
                  value: `${roundValue(dailySummary.totals.fat)} g`,
                  accent: "text-amber-500",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-lg border border-white/60 bg-white/80 px-3 py-2.5 shadow-sm"
                >
                  <p className="text-xs text-slate-500">{item.label}</p>
                  <p className={`mt-1 text-lg font-semibold ${item.accent}`}>{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-3 text-xs text-slate-500">
              {isLoadingDashboard
                ? "Refreshing nutrition data..."
                : `${dailySummary.mealCount} meals logged across ${dailySummary.itemCount} food items.`}
            </div>
          </section>
        </div>

        <section className="mt-3 rounded-xl border border-sky-100 bg-white p-4 shadow-sm shadow-sky-100/60">
          <h2 className="text-[1.8rem] font-bold leading-tight text-slate-800">
            Today&apos;s Meal Plan
          </h2>
          <div className="mt-4 overflow-hidden rounded-lg border border-sky-100">
            <table className="min-w-full border-collapse text-left text-sm">
              <thead className="bg-gradient-to-r from-sky-50 to-cyan-50 text-slate-700">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Meals</th>
                  <th className="px-4 py-2.5 font-semibold">Description</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Calories</th>
                </tr>
              </thead>
              <tbody>
                {MEAL_TYPES.map((currentMealType) => (
                  <tr
                    key={currentMealType}
                    className="border-t border-sky-50 odd:bg-white even:bg-sky-50/30"
                  >
                    <td className="px-4 py-3 font-semibold text-[#204f74]">
                      {formatMealTypeLabel(currentMealType)}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {buildMealDescription(groupedMeals[currentMealType])}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-emerald-500">
                      {roundValue(dailySummary.byMealType[currentMealType].calories)} kcal
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-3 grid gap-3 xl:grid-cols-[1fr,0.95fr]">
          <section className="rounded-xl border border-sky-100 bg-gradient-to-br from-white via-[#fafdff] to-sky-50 p-4 shadow-sm shadow-sky-100/60">
            <h2 className="text-[1.8rem] font-bold leading-tight text-slate-800">
              Macronutrient Breakdown of Today&apos;s Meal
            </h2>

            <div className="mt-5 space-y-4">
              {[
                {
                  label: "Protein",
                  value: macroPercentages.protein,
                  color: "bg-emerald-500",
                },
                {
                  label: "Carbs",
                  value: macroPercentages.carbs,
                  color: "bg-[#1e7cb6]",
                },
                {
                  label: "Fat",
                  value: macroPercentages.fat,
                  color: "bg-amber-400",
                },
              ].map((macro) => (
                <div
                  key={macro.label}
                  className="grid items-center gap-3 sm:grid-cols-[78px,1fr,48px]"
                >
                  <p className="text-lg font-semibold text-slate-800">{macro.label}</p>
                  <div className="h-4 rounded-md bg-sky-100">
                    <div
                      className={`h-4 rounded-md ${macro.color} transition-all`}
                      style={{ width: `${macro.value}%` }}
                    />
                  </div>
                  <p className="text-right text-lg font-semibold text-slate-800">
                    {macro.value}%
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-amber-200 bg-gradient-to-br from-[#fffdf8] to-[#fff4df] p-4 shadow-sm shadow-amber-100/70">
            <h2 className="text-[1.8rem] font-bold leading-tight text-slate-800">
              Suggestion From Your Provider
            </h2>

            <div className="mt-4 space-y-3 text-sm leading-6 text-slate-700">
              {fhirContext.providerSuggestions.map((suggestion) => (
                <p key={suggestion}>{suggestion}</p>
              ))}
            </div>
          </section>
        </div>
      </div>

      {isUtilityPanelOpen && (
        <div className="fixed inset-0 z-40 bg-slate-950/35">
          <div className="absolute inset-y-0 right-0 flex w-full max-w-xl flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <h3 className="text-xl font-semibold text-slate-900">
                  {utilityTab === "log" ? "Quick Log Meal" : "Meal History"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">{formatDateLabel(selectedDate)}</p>
              </div>
              <button
                onClick={() => setIsUtilityPanelOpen(false)}
                className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex gap-2 border-b border-slate-200 px-6 py-3">
              <button
                onClick={() => setUtilityTab("log")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  utilityTab === "log"
                    ? "bg-[#1e86c8] text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
                type="button"
              >
                Quick Log
              </button>
              <button
                onClick={() => setUtilityTab("history")}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  utilityTab === "history"
                    ? "bg-[#1e86c8] text-white"
                    : "bg-slate-100 text-slate-600"
                }`}
                type="button"
              >
                History
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {utilityTab === "log" ? (
                <div>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          void handleSearchFoods();
                        }
                      }}
                      className="w-full rounded-xl border border-slate-200 py-3 pl-10 pr-4"
                      placeholder="Search food to log on the selected date..."
                    />
                  </div>

                  <button
                    onClick={() => void handleSearchFoods()}
                    className="mt-3 rounded-lg bg-[#1e86c8] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#166896]"
                    type="button"
                  >
                    Search USDA Foods
                  </button>

                  {searchResults.length === 0 ? (
                    <p className="mt-5 text-sm text-slate-500">
                      Search by food name and press Enter to load nutrition results.
                    </p>
                  ) : (
                    <div className="mt-5 space-y-3">
                      {searchResults.map((food) => (
                        <button
                          key={food.fdcId}
                          onClick={() => setSelectedFood(food)}
                          className="w-full rounded-xl border border-slate-200 p-4 text-left transition hover:bg-slate-50"
                          type="button"
                        >
                          <p className="font-medium text-slate-900">{food.name}</p>
                          <p className="mt-1 text-xs text-slate-500">{food.brand}</p>
                          <p className="mt-2 text-sm text-slate-600">
                            {roundValue(food.calories)} kcal • {roundValue(food.protein)} g
                            protein
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {mealLogs.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                      No meals logged for this date yet.
                    </div>
                  ) : (
                    mealLogs.map((log) => (
                      <article
                        key={log.id}
                        className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-slate-900">
                              {formatMealTypeLabel(log.mealType)}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Logged at{" "}
                              {new Date(log.loggedAt).toLocaleTimeString([], {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                            {log.notes && (
                              <p className="mt-2 text-sm text-slate-600">{log.notes}</p>
                            )}
                          </div>

                          <button
                            onClick={() => void deleteMeal(log.id)}
                            className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500"
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="mt-4 space-y-2">
                          {log.items.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700"
                            >
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                  <p className="font-medium text-slate-900">
                                    {item.foodItem?.name || "Unknown item"}
                                  </p>
                                  <p className="text-xs text-slate-500">
                                    {item.foodItem?.brand || "Generic"} • {item.servings} serving
                                    {item.servings === 1 ? "" : "s"}
                                  </p>
                                </div>
                                <p className="text-xs font-medium text-emerald-600">
                                  {roundValue(
                                    (item.foodItem?.calories || 0) * item.servings,
                                  )}{" "}
                                  kcal
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </article>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedFood && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h3 className="text-xl font-semibold text-slate-900">Add Meal</h3>
            <p className="mt-2 text-sm text-slate-500">
              {selectedFood.name} will be logged to {formatDateLabel(selectedDate)}.
            </p>

            <div className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              <p>{roundValue(selectedFood.calories)} kcal</p>
              <p className="mt-1">
                Protein {roundValue(selectedFood.protein)} g • Carbs{" "}
                {roundValue(selectedFood.carbs)} g • Fat {roundValue(selectedFood.fat)} g
              </p>
            </div>

            <select
              value={mealType}
              onChange={(event) => setMealType(event.target.value as MealType)}
              className="mt-4 w-full rounded-xl border border-slate-200 p-3"
            >
              {MEAL_TYPES.map((currentMealType) => (
                <option key={currentMealType} value={currentMealType}>
                  {formatMealTypeLabel(currentMealType)}
                </option>
              ))}
            </select>

            <input
              type="number"
              min="0.25"
              step="0.25"
              value={servings}
              onChange={(event) => setServings(Number(event.target.value))}
              className="mt-3 w-full rounded-xl border border-slate-200 p-3"
            />

            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setSelectedFood(null)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-3 text-slate-600"
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={() => void addMeal()}
                className="flex-1 rounded-xl bg-emerald-600 px-4 py-3 font-medium text-white"
                type="button"
              >
                Add Meal
              </button>
            </div>
          </div>
        </div>
      )}

      {showLinkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6">
            <h3 className="text-xl font-semibold text-slate-900">Link FHIR Patient</h3>

            <input
              placeholder="Search patient..."
              onChange={(event) => {
                void handleSearchPatients(event.target.value);
              }}
              className="mt-4 w-full rounded-lg border border-slate-200 p-3"
            />

            <div className="mt-4 max-h-48 space-y-2 overflow-auto">
              {patientResults.map((entry) => {
                const name = entry.resource.name?.[0];
                return (
                  <button
                    key={entry.resource.id}
                    onClick={() => void linkPatient(entry.resource.id)}
                    className="w-full rounded-lg border border-slate-200 p-3 text-left transition hover:bg-slate-50"
                    type="button"
                  >
                    {name?.given?.join(" ")} {name?.family}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setShowLinkModal(false)}
              className="mt-4 w-full text-slate-500"
              type="button"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
