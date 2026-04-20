import { useState } from "react";
import { CheckCircle2, Search, X } from "lucide-react";
import {
  createMealLog,
  type FoodSearchResult,
  formatDateLabel,
  formatMealTypeLabel,
  MEAL_TYPES,
  roundValue,
  searchFoods,
  type MealType,
} from "../lib/meal-log";

type MealLogComposerProps = {
  selectedDate: string;
  onMealCreated?: () => Promise<void> | void;
  onAfterSave?: () => void;
  compact?: boolean;
};

export default function MealLogComposer({
  selectedDate,
  onMealCreated,
  onAfterSave,
  compact = false,
}: MealLogComposerProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<FoodSearchResult[]>([]);
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null);
  const [mealType, setMealType] = useState<MealType>("BREAKFAST");
  const [servings, setServings] = useState(1);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearchFoods = async () => {
    const trimmed = searchTerm.trim();
    setFeedback(null);
    setError(null);

    if (!trimmed) {
      setHasSearched(false);
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const results = await searchFoods(trimmed);
      setSearchResults(results);
      if (results.length === 0) {
        setFeedback("No USDA foods matched your search. Try a broader term.");
      }
    } catch {
      setSearchResults([]);
      setError("Food search is currently unavailable.");
    } finally {
      setIsSearching(false);
    }
  };

  const resetComposer = () => {
    setSearchTerm("");
    setSearchResults([]);
    setSelectedFood(null);
    setMealType("BREAKFAST");
    setServings(1);
    setHasSearched(false);
  };

  const handleSave = async () => {
    setFeedback(null);
    setError(null);

    if (!selectedFood) {
      setError("Choose a food result before logging a meal.");
      return;
    }

    if (!Number.isFinite(servings) || servings <= 0) {
      setError("Servings must be greater than 0.");
      return;
    }

    setIsSaving(true);

    try {
      await createMealLog({
        selectedDate,
        selectedFood,
        mealType,
        servings,
      });
      await onMealCreated?.();
      setFeedback(`Logged ${selectedFood.name} for ${formatDateLabel(selectedDate)}.`);
      resetComposer();
      onAfterSave?.();
    } catch {
      setError("Unable to log this meal right now.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={compact ? "space-y-3.5" : "space-y-4"}>
      {(feedback || error) && (
        <div
          className={`rounded-xl px-4 py-2.5 text-sm ${
            error
              ? "border border-red-200 bg-red-50 text-red-700"
              : "border border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {error || feedback}
        </div>
      )}

      <div className="rounded-2xl border border-sky-100 bg-white p-3.5 shadow-sm">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-base font-semibold text-slate-900">Search USDA Foods</h4>
            <p className="mt-0.5 text-sm text-slate-500">
              Log to {formatDateLabel(selectedDate)} from here or keep using Quick Log.
            </p>
          </div>
          <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-medium text-[#205278]">
            Selected date: {selectedDate}
          </span>
        </div>

        <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-400" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void handleSearchFoods();
                }
              }}
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-4 text-sm text-slate-700"
              placeholder="Search food name, brand, or meal item"
            />
          </div>
          <button
            onClick={() => void handleSearchFoods()}
            className="inline-flex items-center justify-center rounded-xl bg-[#1e86c8] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#166896] disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSearching}
            type="button"
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </div>

        <div className="mt-3 space-y-2.5">
          {searchResults.map((food) => (
            <button
              key={food.fdcId}
              onClick={() => {
                setSelectedFood(food);
                setFeedback(null);
                setError(null);
              }}
              className={`w-full rounded-xl border p-3 text-left transition ${
                selectedFood?.fdcId === food.fdcId
                  ? "border-sky-300 bg-sky-50 shadow-sm"
                  : "border-slate-200 bg-white hover:bg-slate-50"
              }`}
              type="button"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">{food.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{food.brand}</p>
                </div>
                {selectedFood?.fdcId === food.fdcId && (
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-500" />
                )}
              </div>
              <p className="mt-1.5 text-xs text-slate-600">
                {roundValue(food.calories)} kcal • {roundValue(food.protein)} g protein •{" "}
                {roundValue(food.carbs)} g carbs • {roundValue(food.fat)} g fat
              </p>
            </button>
          ))}

          {hasSearched && !isSearching && searchResults.length === 0 && !error && (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3.5 text-sm text-slate-500">
              No food results yet. Search by name and choose one result to continue.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50 p-3.5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-semibold text-slate-900">Meal Details</h4>
            <p className="mt-0.5 text-sm text-slate-500">
              Choose a meal type and serving count before saving.
            </p>
          </div>
          {selectedFood && (
            <button
              onClick={() => setSelectedFood(null)}
              className="rounded-full p-2 text-slate-400 transition hover:bg-white hover:text-slate-700"
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {selectedFood ? (
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-white/70 bg-white/90 p-3 text-sm text-slate-700 shadow-sm">
              <p className="font-semibold text-slate-900">{selectedFood.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">{selectedFood.brand}</p>
              <p className="mt-2">
                {roundValue(selectedFood.calories)} kcal • Protein{" "}
                {roundValue(selectedFood.protein)} g • Carbs{" "}
                {roundValue(selectedFood.carbs)} g • Fat {roundValue(selectedFood.fat)} g
              </p>
            </div>

            <div className="grid gap-2.5 md:grid-cols-[1fr,150px]">
              <label className="text-sm text-slate-600">
                Meal type
                <select
                  value={mealType}
                  onChange={(event) => setMealType(event.target.value as MealType)}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-700"
                >
                  {MEAL_TYPES.map((currentMealType) => (
                    <option key={currentMealType} value={currentMealType}>
                      {formatMealTypeLabel(currentMealType)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm text-slate-600">
                Servings
                <input
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={servings}
                  onChange={(event) => setServings(Number(event.target.value))}
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-700"
                />
              </label>
            </div>

            <button
              onClick={() => void handleSave()}
              className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-70"
              disabled={isSaving}
              type="button"
            >
              {isSaving ? "Saving..." : `Log ${formatMealTypeLabel(mealType)}`}
            </button>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed border-emerald-200 bg-white/80 px-4 py-4 text-sm text-slate-500">
            Pick a food result first. Once selected, you can choose the meal type and servings.
          </div>
        )}
      </div>
    </div>
  );
}
