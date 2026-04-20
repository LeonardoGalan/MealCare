import { useEffect, useState } from "react";
import { ClipboardList, Link2, Plus, X } from "lucide-react";
import MealHistoryList from "../components/MealHistoryList";
import MealLogComposer from "../components/MealLogComposer";
import {
  CaloriesTrendPanel,
  MacroTrendPanel,
} from "../components/NutritionTrendPanels";
import api from "../lib/api";
import {
  buildMealDescription,
  calculateMacroPercentages,
  createEmptySummary,
  deleteMealLog,
  fetchDailySummary,
  fetchMealLogs,
  fetchNutritionProgress,
  formatDateLabel,
  formatMealTypeLabel,
  groupByMealType,
  MEAL_TYPES,
  roundValue,
  toLocalDateKey,
  type DailyNutritionSummary,
  type MealLog,
  type NutritionProgressSummary,
} from "../lib/meal-log";

type UtilityTab = "log" | "history";
type SummaryView = "today" | "trends";

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
const CALORIE_GOAL = 2000;

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

export default function Dashboard() {
  const [user, setUser] = useState<UserData | null>(null);
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [dailySummary, setDailySummary] = useState<DailyNutritionSummary>(() =>
    createEmptySummary(toLocalDateKey(new Date())),
  );
  const [fhirContext, setFhirContext] = useState<FhirContext>(() =>
    createEmptyFhirContext(),
  );

  const [selectedDate, setSelectedDate] = useState(() => toLocalDateKey(new Date()));
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [patientResults, setPatientResults] = useState<PatientSearchEntry[]>([]);
  const [dashboardError, setDashboardError] = useState<string | null>(null);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [summaryView, setSummaryView] = useState<SummaryView>("today");
  const [trendDays, setTrendDays] = useState<7 | 30>(7);
  const [progressSummary, setProgressSummary] = useState<NutritionProgressSummary | null>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
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
        const [logs, summary] = await Promise.all([
          fetchMealLogs(selectedDate),
          fetchDailySummary(selectedDate),
        ]);

        if (!cancelled) {
          setMealLogs(logs);
          setDailySummary(summary);
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

  useEffect(() => {
    let cancelled = false;

    if (summaryView !== "trends") {
      return () => {
        cancelled = true;
      };
    }

    const loadProgress = async () => {
      setIsLoadingProgress(true);
      setProgressError(null);

      try {
        const progress = await fetchNutritionProgress(selectedDate, trendDays);

        if (!cancelled) {
          setProgressSummary(progress);
        }
      } catch {
        if (!cancelled) {
          setProgressSummary(null);
          setProgressError("Unable to load nutrition trends right now.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProgress(false);
        }
      }
    };

    void loadProgress();

    return () => {
      cancelled = true;
    };
  }, [selectedDate, summaryView, trendDays]);

  const reloadSelectedDate = async () => {
    const [logs, summary] = await Promise.all([
      fetchMealLogs(selectedDate),
      fetchDailySummary(selectedDate),
    ]);

    setMealLogs(logs);
    setDailySummary(summary);
  };

  const reloadFhirContext = async () => {
    const response = await api.get<FhirContext>("/fhir/context");
    setFhirContext(response.data);
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

  const deleteMeal = async (id: string) => {
    await deleteMealLog(id);
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
  const trendBuckets = progressSummary?.buckets ?? [];

  return (
    <div className="h-full bg-[radial-gradient(circle_at_top,#f9fcff_0%,#eef5fb_55%,#e7eff8_100%)]">
      <div className="mx-auto max-w-[1500px] px-3 py-3 sm:px-4 sm:py-4 xl:px-5">
        {dashboardError && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
            {dashboardError}
          </div>
        )}

        <div className="grid gap-3 xl:grid-cols-[0.82fr,1.38fr]">
          <section className="rounded-xl border border-sky-100 bg-gradient-to-br from-white via-[#fbfdff] to-sky-50 p-4 shadow-sm shadow-sky-100/60">
            <h2 className="text-[1.45rem] font-bold leading-tight text-slate-800 sm:text-[1.8rem]">
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
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[1.45rem] font-bold leading-tight text-slate-800 sm:text-[1.8rem]">
                    Today&apos;s Summary
                  </h2>
                  <div className="inline-flex rounded-full bg-sky-100 p-1 text-xs font-medium text-slate-600">
                    {[
                      { id: "today", label: "Today" },
                      { id: "trends", label: "Trends" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setSummaryView(item.id as SummaryView)}
                        className={`rounded-full px-3 py-1 transition ${
                          summaryView === item.id
                            ? "bg-white text-[#205278] shadow-sm"
                            : "text-slate-500"
                        }`}
                        type="button"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <p className="text-sm text-slate-500">{formatDateLabel(selectedDate)}</p>
                  {summaryView === "trends" && (
                    <div className="inline-flex rounded-full bg-white/80 p-1 text-[11px] font-medium text-slate-600 shadow-sm">
                      {[7, 30].map((days) => (
                        <button
                          key={days}
                          onClick={() => setTrendDays(days as 7 | 30)}
                          className={`rounded-full px-2.5 py-1 transition ${
                            trendDays === days
                              ? "bg-[#1e86c8] text-white"
                              : "text-slate-500"
                          }`}
                          type="button"
                        >
                          {days}D
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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

            {summaryView === "today" ? (
              <>
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
                      <p className={`mt-1 text-lg font-semibold ${item.accent}`}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  {isLoadingDashboard
                    ? "Refreshing nutrition data..."
                    : `${dailySummary.mealCount} meals logged across ${dailySummary.itemCount} food items.`}
                </div>
              </>
            ) : (
              <>
                {progressError && (
                  <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {progressError}
                  </div>
                )}
                {isLoadingProgress ? (
                  <div className="mt-4 rounded-xl border border-white/70 bg-white/80 px-4 py-8 text-sm text-slate-500 shadow-sm">
                    Loading nutrition trends...
                  </div>
                ) : trendBuckets.length === 0 ? (
                  <div className="mt-4 rounded-xl border border-white/70 bg-white/80 px-4 py-8 text-sm text-slate-500 shadow-sm">
                    Trend data is unavailable for this view.
                  </div>
                ) : (
                  <CaloriesTrendPanel buckets={trendBuckets} days={trendDays} />
                )}
              </>
            )}
          </section>
        </div>

        <section className="mt-3 rounded-xl border border-sky-100 bg-white p-4 shadow-sm shadow-sky-100/60">
          <h2 className="text-[1.45rem] font-bold leading-tight text-slate-800 sm:text-[1.8rem]">
            Today&apos;s Meal Plan
          </h2>
          <div className="mt-4 space-y-2.5 md:hidden">
            {MEAL_TYPES.map((currentMealType) => (
              <div
                key={currentMealType}
                className="rounded-lg border border-sky-100 bg-gradient-to-r from-white to-sky-50/40 px-3.5 py-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#204f74]">
                      {formatMealTypeLabel(currentMealType)}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">
                      {buildMealDescription(groupedMeals[currentMealType])}
                    </p>
                  </div>
                  <p className="whitespace-nowrap text-sm font-semibold text-emerald-500">
                    {roundValue(dailySummary.byMealType[currentMealType].calories)} kcal
                  </p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 hidden overflow-x-auto rounded-lg border border-sky-100 md:block">
            <table className="w-full min-w-[38rem] border-collapse text-left text-sm">
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
            <h2 className="text-[1.45rem] font-bold leading-tight text-slate-800 sm:text-[1.8rem]">
              {summaryView === "today"
                ? "Macronutrient Breakdown of Today's Meal"
                : "Macronutrient Trends"}
            </h2>

            {summaryView === "today" ? (
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
            ) : isLoadingProgress ? (
              <div className="mt-4 rounded-xl border border-white/70 bg-white/80 px-4 py-8 text-sm text-slate-500 shadow-sm">
                Loading macro trends...
              </div>
            ) : trendBuckets.length === 0 ? (
              <div className="mt-4 rounded-xl border border-white/70 bg-white/80 px-4 py-8 text-sm text-slate-500 shadow-sm">
                Trend data is unavailable for this view.
              </div>
            ) : (
              <MacroTrendPanel buckets={trendBuckets} />
            )}
          </section>

          <section className="rounded-xl border border-amber-200 bg-gradient-to-br from-[#fffdf8] to-[#fff4df] p-4 shadow-sm shadow-amber-100/70">
            <h2 className="text-[1.45rem] font-bold leading-tight text-slate-800 sm:text-[1.8rem]">
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
                <MealLogComposer
                  compact
                  selectedDate={selectedDate}
                  onMealCreated={reloadSelectedDate}
                  onAfterSave={() => setUtilityTab("history")}
                />
              ) : (
                <MealHistoryList mealLogs={mealLogs} onDelete={deleteMeal} />
              )}
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
