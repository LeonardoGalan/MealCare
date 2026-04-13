import { useState } from "react";
import { Trash2 } from "lucide-react";
import { formatMealTypeLabel, roundValue, type MealLog } from "../lib/meal-log";

type MealHistoryListProps = {
  mealLogs: MealLog[];
  emptyMessage?: string;
  onDelete?: (id: string) => Promise<void> | void;
  isLoading?: boolean;
};

export default function MealHistoryList({
  mealLogs,
  emptyMessage = "No meals logged for this date yet.",
  onDelete,
  isLoading = false,
}: MealHistoryListProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (id: string) => {
    if (!onDelete) {
      return;
    }

    setDeletingId(id);
    setError(null);

    try {
      await onDelete(id);
    } catch {
      setError("Unable to delete that meal right now.");
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
        Loading meals...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {mealLogs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-500">
          {emptyMessage}
        </div>
      ) : (
        mealLogs.map((log) => (
          <article
            key={log.id}
            className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  {formatMealTypeLabel(log.mealType)}
                </p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Logged at{" "}
                  {new Date(log.loggedAt).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                {log.notes && <p className="mt-1.5 text-sm text-slate-600">{log.notes}</p>}
              </div>

              {onDelete && (
                <button
                  onClick={() => void handleDelete(log.id)}
                  className="rounded-full p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-70"
                  disabled={deletingId === log.id}
                  type="button"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className="mt-3 space-y-2">
              {log.items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg bg-slate-50 px-3.5 py-2.5 text-sm text-slate-700"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {item.foodItem?.name || "Unknown item"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.foodItem?.brand || "Generic"} • {item.servings} serving
                        {item.servings === 1 ? "" : "s"}
                      </p>
                    </div>
                    <p className="text-xs font-medium text-emerald-600">
                      {roundValue((item.foodItem?.calories || 0) * item.servings)} kcal
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))
      )}
    </div>
  );
}
