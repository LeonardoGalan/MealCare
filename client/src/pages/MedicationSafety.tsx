import { useState } from "react";
import api from "../lib/api";

export default function MedicationSafety() {
  const [medication, setMedication] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [foodsToAvoid, setFoodsToAvoid] = useState<string[]>([]); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // FHIR-based alerts
  const [alerts, setAlerts] = useState<string[]>([]);

  const checkMedication = async () => {
    if (!medication.trim()) {
      setError("Please enter a medication");
      return;
    }

    setLoading(true);
    setError(null);
    setWarnings([]);
    setFoodsToAvoid([]); 
    setAlerts([]);

    try {
      const res = await api.post("/medication/check", {
        medication,
      });

      setWarnings(res.data.warnings || []);
      setFoodsToAvoid(res.data.foodsToAvoid || []);

      // check medication vs foods using FHIR system
      if (res.data.foodsToAvoid && res.data.foodsToAvoid.length > 0) {
        try {
          const alertRes = await api.post("/fhir/medication-alerts", {
            foods: res.data.foodsToAvoid,
          });

          setAlerts(alertRes.data.alerts || []);
        } catch {
          console.log("Failed to fetch FHIR medication alerts");
        }
      }

    } catch (err: any) {
      setError(
        err?.response?.data?.error || "Failed to check medication"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold mb-4">Medication Safety</h1>

      {/* INPUT */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={medication}
          onChange={(e) => setMedication(e.target.value)}
          placeholder="Enter medication (e.g. ibuprofen)"
          className="flex-1 border rounded px-3 py-2"
        />

        <button
          onClick={checkMedication}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {loading ? "Checking..." : "Check"}
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <p className="text-red-500 mb-4">{error}</p>
      )}

      {/* WARNINGS */}
      {warnings.length > 0 && (
        <div className="bg-yellow-50 border p-4 rounded">
          <h2 className="font-semibold mb-2">Warnings</h2>

          <ul className="list-disc ml-5">
            {warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {/* FOODS TO AVOID (NEW) */}
      {foodsToAvoid.length > 0 && (
        <div className="bg-red-50 border p-4 rounded mt-4">
          <h2 className="font-semibold mb-2 text-red-700">
            Foods to Avoid
          </h2>

          <ul className="list-disc ml-5">
            {foodsToAvoid.map((food, i) => (
              <li key={i}>{food}</li>
            ))}
          </ul>
        </div>
      )}

      {/* FHIR MEDICATION ALERTS */}
      {alerts.length > 0 && (
        <div className="bg-red-100 border p-4 rounded mt-4">
          <h2 className="font-semibold mb-2 text-red-800">
            Medication Interaction Alerts
          </h2>

          <ul className="list-disc ml-5 text-red-700">
            {alerts.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      {/* SAFE CASE */}
      {warnings.length === 1 &&
        warnings[0] === "No major interactions found" && (
          <p className="text-green-600 mt-4">
            No major safety concerns.
          </p>
        )}
    </div>
  );
}