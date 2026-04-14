import { Outlet } from 'react-router-dom';
import { Heart, LogOut } from 'lucide-react';
import Sidebar from './Sidebar';

interface LayoutProps {
  onLogout: () => void;
}

export default function Layout({ onLogout }: LayoutProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-[#eff5fb]">
      <nav className="border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="flex items-center justify-between px-5 py-2.5">
          <div className="flex items-center gap-2.5">
            <Heart className="h-6 w-6 text-[#1fba8c]" />
            <h1 className="text-xl font-bold tracking-tight text-slate-900">MealCare</h1>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-slate-700 transition hover:bg-slate-100"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </nav>

      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
