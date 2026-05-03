import { useEffect, useState } from "react";
import { AlertTriangle, ShieldAlert } from "lucide-react";
import api from "../lib/api";

type FoodToAvoid = {
  food: string;
  reason: string;
  condition: string;
};

type FoodsToAvoidResponse = {
  foods: FoodToAvoid[];
  conditions?: string[];
  allergies?: string[];
  message?: string;
};

export default function MealsToAvoid() {
  const [data, setData] = useState<FoodsToAvoidResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // medication interaction alerts
  const [alerts, setAlerts] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<FoodsToAvoidResponse>("/fhir/foods-to-avoid");

        // optional debug (remove later if want)
        console.log("FoodsToAvoid response:", res.data);

        setData(res.data);
      } catch {
        setError("Unable to load dietary restrictions.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // check medication interactions based on foods
  useEffect(() => {
    const checkInteractions = async () => {
      if (!data || !data.foods || data.foods.length === 0) return;

      try {
        const res = await api.post("/fhir/medication-alerts", {
          foods: data.foods.map((f) => f.food),
        });

        setAlerts(res.data.alerts || []);
      } catch {
        console.log("Failed to check medication interactions");
      }
    };

    checkInteractions();
  }, [data]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <p className="text-slate-500">Loading dietary restrictions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  // added safe guard (no removal)
  const foodsArray = data.foods || [];

  if (foodsArray.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold text-slate-800 mb-4">
          Meals to Avoid
        </h1>

        <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-slate-500">
          <ShieldAlert className="w-12 h-12 mx-auto mb-3 text-slate-300" />

          <p>No foods to avoid found for your current profile.</p>

          {data.conditions && data.conditions.length > 0 && (
            <p className="mt-2 text-sm">
              Conditions: {data.conditions.join(", ")}
            </p>
          )}

          {data.allergies && data.allergies.length > 0 && (
            <p className="mt-1 text-sm">
              Allergies: {data.allergies.join(", ")}
            </p>
          )}
        </div>
      </div>
    );
  }

  const grouped = foodsArray.reduce<Record<string, FoodToAvoid[]>>(
    (acc, item) => {
      if (!acc[item.condition]) acc[item.condition] = [];
      acc[item.condition].push(item);
      return acc;
    },
    {}
  );

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-3xl font-bold text-slate-800 mb-2">
        Meals to Avoid
      </h1>
      <p className="text-slate-500 mb-6">
        Based on your linked FHIR patient conditions, these foods may worsen
        your health.
      </p>

      {/* medication alerts UI */}
      {alerts.length > 0 && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm text-red-800 font-semibold">
            Medication Interaction Alerts
          </p>
          <ul className="list-disc ml-5 mt-2 text-sm text-red-700">
            {alerts.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {data.conditions && data.conditions.length > 0 && (
        <div className="mb-3 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3">
          <p className="text-sm text-sky-800">
            <span className="font-semibold">Active conditions:</span>{" "}
            {data.conditions.join(", ")}
          </p>
        </div>
      )}

      {data.allergies && data.allergies.length > 0 && (
        <div className="mb-6 rounded-xl border border-rose-100 bg-rose-50 px-4 py-3">
          <p className="text-sm text-rose-800">
            <span className="font-semibold">Known allergies:</span>{" "}
            {data.allergies.join(", ")}
          </p>
        </div>
      )}

      <div className="space-y-6">
        {Object.entries(grouped).map(([condition, foods]) => (
          <div
            key={condition}
            className="rounded-xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50 rounded-t-xl">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <h2 className="font-semibold text-slate-800">
                {condition}
              </h2>
            </div>

            <div className="divide-y divide-slate-100">
              {foods.map((item, index) => (
                <div key={item.food + index} className="px-5 py-3">
                  <p className="font-medium text-slate-800">
                    {item.food}
                  </p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {item.reason}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}