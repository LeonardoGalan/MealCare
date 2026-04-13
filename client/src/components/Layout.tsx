import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Heart, LogOut, Menu, X } from "lucide-react";
import Sidebar from "./Sidebar";

interface LayoutProps {
  onLogout: () => void;
}

export default function Layout({ onLogout }: LayoutProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#eff5fb]">
      <nav className="border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsSidebarOpen((value) => !value)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-100 lg:hidden"
              type="button"
              aria-label={isSidebarOpen ? "Close navigation menu" : "Open navigation menu"}
            >
              {isSidebarOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>
            <Heart className="h-6 w-6 text-[#1fba8c]" />
            <h1 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
              MealCare
            </h1>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100 sm:px-3"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </nav>

      <div className="flex min-h-0 flex-1">
        <Sidebar
          isMobileOpen={isSidebarOpen}
          onNavigate={() => setIsSidebarOpen(false)}
        />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
