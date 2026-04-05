import { useEffect, useState } from 'react';
import api from '../lib/api';
import { LogOut, User, Heart } from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fhirPatientId: string | null;
}

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await api.get('/me');
        setUser(response.data);
      } catch (err) {
        console.error('Failed to fetch user', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-lg">Loading your profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Heart className="w-8 h-8 text-emerald-600" />
            <h1 className="text-2xl font-bold text-gray-900">MealCare</h1>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </nav>

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
              <h3 className="font-medium text-gray-700 mb-2">Account Information</h3>
              <p><strong>Name:</strong> {user?.firstName} {user?.lastName}</p>
              <p><strong>Email:</strong> {user?.email}</p>
            </div>

            <div className="p-6 bg-gray-50 rounded-xl">
              <h3 className="font-medium text-gray-700 mb-2">FHIR Status</h3>
              <p className="text-lg">
                {user?.fhirPatientId 
                  ? `✅ Linked to Patient ID: ${user.fhirPatientId}` 
                  : '⚠️ No FHIR patient linked yet'}
              </p>
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-gray-500">
            Your authentication is working correctly with the backend.
          </div>
        </div>
      </div>
    </div>
  );
}