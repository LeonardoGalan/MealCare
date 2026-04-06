import { useEffect, useState } from "react";
import api from "../lib/api";
import { User } from "lucide-react";

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fhirPatientId: string | null;
}

export default function Dashboard() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get("/me");
        setUser(response.data);
      } catch (err) {
        console.error("Failed to fetch user", err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <div className="text-lg">Loading your profile...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="card">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center">
            <User className="w-10 h-10 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-3xl font-semibold text-gray-900">
              Welcome back, {user?.firstName}!
            </h2>
            <p className="text-gray-600 mt-1">{user?.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 bg-gray-50 rounded-xl">
            <h3 className="font-medium text-gray-700 mb-2">
              Account Information
            </h3>
            <p>
              <strong>Name:</strong> {user?.firstName} {user?.lastName}
            </p>
            <p>
              <strong>Email:</strong> {user?.email}
            </p>
          </div>

          <div className="p-6 bg-gray-50 rounded-xl">
            <h3 className="font-medium text-gray-700 mb-2">FHIR Status</h3>
            <p className="text-lg">
              {user?.fhirPatientId
                ? `✅ Linked to Patient ID: ${user.fhirPatientId}`
                : "⚠️ No FHIR patient linked yet"}
            </p>
          </div>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          Your authentication is working correctly with the backend.
        </div>
      </div>
    </div>
  );
}