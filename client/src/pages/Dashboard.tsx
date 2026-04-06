import { useEffect, useState } from "react";
import api from "../lib/api";
import { Search, Trash2 } from "lucide-react";

type UserData = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fhirPatientId: string | null;
};

type Patient = {
  id: string;
  name: { given?: string[]; family?: string }[];
  birthDate?: string;
  gender?: string;
};

const groupByDate = (logs: any[]) => {
  return logs.reduce((acc: any, log: any) => {
    const date = new Date(log.loggedAt).toLocaleDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(log);
    return acc;
  }, {});
};

const groupByMealType = (logs: any[]) => {
  return logs.reduce((acc: any, log: any) => {
    const type = log.mealType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(log);
    return acc;
  }, {});
};

const mealCalories = (log: any) => {
  return log.items?.reduce((sum: number, item: any) => {
    return sum + (item.foodItem?.calories || 0) * (item.servings || 1);
  }, 0);
};

const dailyCalories = (logs: any[]) => {
  return logs.reduce((sum, log) => sum + mealCalories(log), 0);
};

export default function Dashboard() {
  const [user, setUser] = useState<UserData | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [mealLogs, setMealLogs] = useState<any[]>([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [mealType, setMealType] = useState("BREAKFAST");
  const [servings, setServings] = useState(1);

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [patientResults, setPatientResults] = useState<any[]>([]);

  const loadMeals = async () => {
    const res = await api.get("/meal-logs");
    setMealLogs(res.data);
  };

  useEffect(() => {
    api.get("/me").then((r) => setUser(r.data));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMeals();
  }, []);

  useEffect(() => {
    if (user?.fhirPatientId) {
      api
        .get(`/fhir/patient/${user.fhirPatientId}`)
        .then((r) => setPatient(r.data))
        .catch(() => setPatient(null));
    }
  }, [user]);

  const handleSearchFoods = async () => {
    if (!searchTerm) return;
    const res = await api.get(`/meal-logs/search?q=${searchTerm}`);
    setSearchResults(res.data);
  };

  const handleSearchPatients = async (q: string) => {
    if (!q) return;
    const res = await api.get(`/fhir/search?q=${q}`);
    setPatientResults(res.data);
  };

  const linkPatient = async (id: string) => {
    await api.post("/fhir/link", { fhirPatientId: id });
    const me = await api.get("/me");
    setUser(me.data);
    setShowLinkModal(false);
    setPatientResults([]);
  };

  const addMeal = async () => {
    if (!selectedFood) return;

    await api.post("/meal-logs", {
      mealType,
      notes: `${selectedFood.name} added`,
      items: [
        {
          fdcId: selectedFood.fdcId,
          name: selectedFood.name,
          calories: selectedFood.calories,
          protein: selectedFood.protein,
          carbs: selectedFood.carbs,
          fat: selectedFood.fat,
          servings,
        },
      ],
    });

    setSelectedFood(null);
    setServings(1);
    loadMeals();
  };

  const deleteMeal = async (id: string) => {
    await api.delete(`/meal-logs/${id}`);
    loadMeals();
  };

  const grouped = groupByDate(mealLogs);

  const givenName =
    patient?.name?.[0]?.given?.join(" ") ||
    patient?.name?.[0]?.given?.[0] ||
    "";
  const familyName = patient?.name?.[0]?.family || "";

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-8 flex gap-8">
        {/* LEFT */}
        <div className="w-80 space-y-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border">
            <p className="text-lg font-semibold">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border">
            <h3 className="font-semibold mb-3">FHIR Patient</h3>

            {patient ? (
              <div>
                <p className="font-medium">
                  {givenName} {familyName}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  {patient.birthDate || "N/A"}
                  {patient.gender ? ` • ${patient.gender}` : ""}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-gray-400 text-sm mb-3">No patient linked</p>
                <button
                  onClick={() => setShowLinkModal(true)}
                  className="text-emerald-600 text-sm underline"
                >
                  Link FHIR Patient
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex-1 space-y-8">
          {/* SEARCH */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchFoods()}
                className="w-full pl-10 py-3 border rounded-xl"
                placeholder="Search food..."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {searchResults.map((food) => (
                <div
                  key={food.fdcId}
                  onClick={() => setSelectedFood(food)}
                  className="p-3 border rounded-xl hover:bg-gray-50 cursor-pointer"
                >
                  <p className="font-medium">{food.name}</p>
                  <p className="text-xs text-gray-500">{food.brand}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* MEALS GROUPED BY DATE + TYPE */}
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, logs]: any) => {
            const mealsByType = groupByMealType(logs);

            return (
              <div key={date}>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-semibold">{date}</h3>
                  <span className="text-emerald-600 font-medium">
                    {dailyCalories(logs)} kcal total
                  </span>
                </div>

                {Object.entries(mealsByType).map(
                  ([mealType, mealLogs]: any) => (
                    <div key={mealType} className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-semibold capitalize text-gray-700">
                          {mealType.toLowerCase()}
                        </h4>
                        <span className="text-sm text-emerald-600 font-medium">
                          {dailyCalories(mealLogs)} kcal
                        </span>
                      </div>

                      {mealLogs.map((log: any) => (
                        <div
                          key={log.id}
                          className="bg-white p-4 rounded-xl shadow-sm border mb-2"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-emerald-600 font-medium text-sm">
                              {log.mealType}
                            </span>

                            <div className="flex items-center gap-3">
                              <span className="text-sm text-gray-500">
                                {mealCalories(log)} kcal
                              </span>
                              <button onClick={() => deleteMeal(log.id)}>
                                <Trash2 className="w-4 h-4 text-gray-400 hover:text-red-500" />
                              </button>
                            </div>
                          </div>

                          {log.items?.map((item: any) => (
                            <div
                              key={item.id}
                              className="text-sm mt-2 text-gray-600"
                            >
                              {item.foodItem?.name} × {item.servings}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  ),
                )}
              </div>
            );
          })}
        </div>
      </div>
      {/* MODALS */}
      {selectedFood && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl w-96">
            <h3 className="text-xl mb-4">Add Meal</h3>

            <select
              value={mealType}
              onChange={(e) => setMealType(e.target.value)}
              className="w-full mb-3 border p-2 rounded"
            >
              <option>BREAKFAST</option>
              <option>LUNCH</option>
              <option>DINNER</option>
              <option>SNACK</option>
            </select>

            <input
              type="number"
              value={servings}
              onChange={(e) => setServings(Number(e.target.value))}
              className="w-full mb-3 border p-2 rounded"
            />

            <button
              onClick={addMeal}
              className="w-full bg-emerald-600 text-white py-2 rounded"
            >
              Add
            </button>
          </div>
        </div>
      )}

      {showLinkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-2xl w-96">
            <h3 className="text-xl mb-4">Link FHIR Patient</h3>

            <input
              placeholder="Search patient..."
              onChange={(e) => handleSearchPatients(e.target.value)}
              className="w-full border p-3 rounded-lg mb-4"
            />

            <div className="max-h-48 overflow-auto space-y-2">
              {patientResults.map((entry: any) => {
                const p = entry.resource;
                const name = p.name?.[0];
                return (
                  <div
                    key={p.id}
                    onClick={() => linkPatient(p.id)}
                    className="p-2 border rounded cursor-pointer hover:bg-gray-100"
                  >
                    {name?.given?.join(" ")} {name?.family}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setShowLinkModal(false)}
              className="mt-4 w-full text-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
