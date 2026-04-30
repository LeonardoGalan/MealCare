import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import MealHistoryList from "../components/MealHistoryList";
import MealLogComposer from "../components/MealLogComposer";
import {
  calculateMacroPercentages,
  createEmptySummary,
  deleteMealLog,
  fetchDailySummary,
  fetchMealLogs,
  formatDateLabel,
  roundValue,
  toLocalDateKey,
  type DailyNutritionSummary,
  type MealLog,
} from "../lib/meal-log";
import api from "../lib/api";

type UserData = {
  calorieGoal: number;
};

export default function LogMeal() {
    const [user, setUser] = useState<UserData | null>(null);
    const [selectedDate, setSelectedDate] = useState(() =>
      toLocalDateKey(new Date()),
    );
  const [mealLogs, setMealLogs] = useState<MealLog[]>([]);
  const [dailySummary, setDailySummary] = useState<DailyNutritionSummary>(() =>
    createEmptySummary(toLocalDateKey(new Date())),
  );
  const [isLoading, setIsLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);
  useEffect(() => {
    api.get<UserData>("/me").then((r) => setUser(r.data));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadPage = async () => {
      setIsLoading(true);
      setPageError(null);

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
          setPageError("Unable to load meal logging data right now.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadPage();

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const reloadSelectedDate = async () => {
    const [logs, summary] = await Promise.all([
      fetchMealLogs(selectedDate),
      fetchDailySummary(selectedDate),
    ]);

    setMealLogs(logs);
    setDailySummary(summary);
  };

  const calorieGoal = user?.calorieGoal || 2000;
  const calorieProgress = Math.min(
    100,
    Math.round((dailySummary.totals.calories / calorieGoal) * 100),
  );

  const macroPercentages = calculateMacroPercentages(dailySummary.totals);

  return (
    <div className="h-full bg-[radial-gradient(circle_at_top,#f9fcff_0%,#eef5fb_55%,#e7eff8_100%)]">
      <div className="mx-auto max-w-[1480px] px-3 py-3 sm:px-4 xl:px-5">
        {pageError && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {pageError}
          </div>
        )}

        <div className="mb-2.5 flex flex-col gap-2.5 xl:flex-row xl:items-center xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-white px-3 py-2 text-xs font-medium text-[#205278] transition hover:bg-sky-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Dashboard
              </Link>
            </div>
            <h1 className="mt-2.5 text-[1.5rem] font-bold leading-tight text-slate-900 sm:text-[1.8rem]">
              Log Meal
            </h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Search foods, choose servings, and keep the dashboard Quick Log
              for fast entry.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="text-sm font-medium text-slate-600">
              {formatDateLabel(selectedDate)}
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
            />
          </div>
        </div>

        <div className="grid gap-2.5 xl:grid-cols-[1.2fr,0.8fr]">
          <MealLogComposer
            selectedDate={selectedDate}
            onMealCreated={reloadSelectedDate}
          />

          <div className="space-y-2.5">
            <section className="rounded-2xl border border-cyan-100 bg-gradient-to-br from-white via-[#faffff] to-cyan-50 p-3.5 shadow-sm shadow-cyan-100/70">
              <h2 className="text-[1.2rem] font-bold leading-tight text-slate-800 sm:text-[1.4rem]">
                Selected Day Summary
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {isLoading
                  ? "Refreshing nutrition data..."
                  : `${dailySummary.mealCount} meals logged across ${dailySummary.itemCount} food items.`}
              </p>

              <div className="mt-3">
                <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
                  <span>Calories</span>
                  <span>
                    {roundValue(dailySummary.totals.calories)} / {calorieGoal}{" "}
                    kcal
                  </span>
                </div>
                <div className="mt-2 h-2.5 rounded-full bg-sky-100">
                  <div
                    className="h-2.5 rounded-full bg-gradient-to-r from-emerald-400 to-[#1fba8c] transition-all"
                    style={{ width: `${calorieProgress}%` }}
                  />
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:grid-cols-3">
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
                    className="rounded-lg border border-white/60 bg-white/80 px-3 py-2 shadow-sm"
                  >
                    <p className="text-xs text-slate-500">{item.label}</p>
                    <p
                      className={`mt-0.5 text-base font-semibold ${item.accent}`}
                    >
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-sky-100 bg-white p-3.5 shadow-sm shadow-sky-100/60">
              <h2 className="text-[1.2rem] font-bold leading-tight text-slate-800 sm:text-[1.4rem]">
                Macro Balance
              </h2>

              <div className="mt-3 space-y-3">
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
                    className="grid items-center gap-2.5 sm:grid-cols-[72px,1fr,44px]"
                  >
                    <p className="text-sm font-semibold text-slate-800">
                      {macro.label}
                    </p>
                    <div className="h-3.5 rounded-md bg-sky-100">
                      <div
                        className={`h-3.5 rounded-md ${macro.color} transition-all`}
                        style={{ width: `${macro.value}%` }}
                      />
                    </div>
                    <p className="text-right text-sm font-semibold text-slate-800">
                      {macro.value}%
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>

        <section className="mt-2.5 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-[1.2rem] font-bold leading-tight text-slate-900 sm:text-[1.4rem]">
                Logged Meals
              </h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Review and remove logged meals for the selected date.
              </p>
            </div>
          </div>

          <div className="mt-3 max-h-[18rem] overflow-y-auto pr-1 sm:max-h-[24rem]">
            <MealHistoryList
              mealLogs={mealLogs}
              isLoading={isLoading}
              onDelete={async (id) => {
                await deleteMealLog(id);
                await reloadSelectedDate();
              }}
            />
          </div>
        </section>
      </div>
    </div>
  );
}
