import { useEffect, useState } from "react";
import { User, Lock, Link2, Trash2, Save } from "lucide-react";
import api from "../lib/api";

type UserData = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fhirPatientId: string | null;
};

export default function ProfileSettings() {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get<UserData>("/me");
        setUser(res.data);
        setFirstName(res.data.firstName);
        setLastName(res.data.lastName);
        setEmail(res.data.email);
      } catch {
        setProfileError("Failed to load profile.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleUpdateProfile = async () => {
    setProfileMsg(null);
    setProfileError(null);

    try {
      const res = await api.put<UserData>("/auth/profile", {
        firstName,
        lastName,
        email,
      });
      setUser(res.data);
      setProfileMsg("Profile updated successfully.");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null;
      setProfileError(message || "Failed to update profile.");
    }
  };

  const handleChangePassword = async () => {
    setPasswordMsg(null);
    setPasswordError(null);

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }

    try {
      await api.put("/auth/password", { currentPassword, newPassword });
      setPasswordMsg("Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      const message =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: { error?: string } } }).response?.data?.error
          : null;
      setPasswordError(message || "Failed to change password.");
    }
  };

  const handleDeleteAccount = async () => {
    try {
      await api.delete("/auth/account");
      localStorage.removeItem("token");
      window.location.href = "/login";
    } catch {
      setProfileError("Failed to delete account.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full py-20">
        <p className="text-slate-500">Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">
      <h1 className="text-3xl font-bold text-slate-800">Profile Settings</h1>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50 rounded-t-xl">
          <User className="w-4 h-4 text-sky-600" />
          <h2 className="font-semibold text-slate-800">Profile Information</h2>
        </div>
        <div className="p-5 space-y-4">
          {profileMsg && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
              {profileMsg}
            </div>
          )}
          {profileError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {profileError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-slate-600">
              First Name
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
              />
            </label>
            <label className="text-sm text-slate-600">
              Last Name
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
              />
            </label>
          </div>

          <label className="text-sm text-slate-600">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
            />
          </label>

          <button
            onClick={handleUpdateProfile}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 transition"
          >
            <Save className="w-4 h-4" />
            Save Changes
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50 rounded-t-xl">
          <Link2 className="w-4 h-4 text-emerald-600" />
          <h2 className="font-semibold text-slate-800">FHIR Patient</h2>
        </div>
        <div className="p-5">
          {user?.fhirPatientId ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-700">
                  Linked to Patient ID: <span className="font-semibold">{user.fhirPatientId}</span>
                </p>
              </div>
              <button
                onClick={async () => {
                  await api.post("/fhir/link", { fhirPatientId: null });
                  const res = await api.get<UserData>("/me");
                  setUser(res.data);
                }}
                className="text-sm text-red-500 hover:text-red-700 transition"
              >
                Unlink Patient
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              No FHIR patient linked. You can link one from the Dashboard.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50 rounded-t-xl">
          <Lock className="w-4 h-4 text-amber-600" />
          <h2 className="font-semibold text-slate-800">Change Password</h2>
        </div>
        <div className="p-5 space-y-4">
          {passwordMsg && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">
              {passwordMsg}
            </div>
          )}
          {passwordError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {passwordError}
            </div>
          )}

          <label className="text-sm text-slate-600">
            Current Password
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
            />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm text-slate-600">
              New Password
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
              />
            </label>
            <label className="text-sm text-slate-600">
              Confirm New Password
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
              />
            </label>
          </div>

          <button
            onClick={handleChangePassword}
            className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 transition"
          >
            <Lock className="w-4 h-4" />
            Change Password
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-red-200 bg-white shadow-sm">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-red-100 bg-red-50 rounded-t-xl">
          <Trash2 className="w-4 h-4 text-red-600" />
          <h2 className="font-semibold text-red-800">Danger Zone</h2>
        </div>
        <div className="p-5">
          {!showDeleteConfirm ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-700 font-medium">Delete your account</p>
                <p className="text-sm text-slate-500 mt-0.5">
                  This will permanently delete your account and all associated data.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-sm text-red-600 hover:text-red-800 font-medium transition"
              >
                Delete Account
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-red-700 font-medium">
                Are you sure? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleDeleteAccount}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition"
                >
                  Yes, Delete My Account
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}