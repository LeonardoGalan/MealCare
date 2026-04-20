import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  CalendarDays,
  UtensilsCrossed,
  Ban,
  Settings,
} from "lucide-react";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/meal-plan", label: "Meal Plan", icon: CalendarDays },
  { to: "/log-meal", label: "Log Meal", icon: UtensilsCrossed },
  { to: "/meals-to-avoid", label: "Meals to Avoid", icon: Ban },
  { to: "/profile", label: "Profile Settings", icon: Settings },
];
// following figma diagram, none of these have routes as of now and quickly adding these for the purpose of demo.
// !!! create page components and routes for above 

type SidebarProps = {
  isMobileOpen?: boolean;
  onNavigate?: () => void;
};

export default function Sidebar({
  isMobileOpen = false,
  onNavigate,
}: SidebarProps) {
  const navContent = (
    <nav className="space-y-1 px-4 py-5">
      {navItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-lg px-4 py-3 transition ${
              isActive
                ? "bg-[#1e86c8] text-white font-semibold shadow-sm"
                : "text-slate-100 hover:bg-white/10"
            }`
          }
        >
          <Icon className="h-5 w-5" />
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );

  return (
    <>
      <aside className="hidden h-full w-60 shrink-0 bg-[#204f74] text-white shadow-xl lg:block">
        {navContent}
      </aside>

      <div
        className={`fixed inset-0 z-40 bg-slate-950/45 transition lg:hidden ${
          isMobileOpen
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        onClick={onNavigate}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[17rem] max-w-[82vw] bg-[#204f74] text-white shadow-2xl transition-transform duration-200 lg:hidden ${
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-white/10 px-4 py-4">
          <p className="text-lg font-semibold text-white">MealCare</p>
          <p className="mt-1 text-xs text-sky-100/80">Navigate your meal dashboard</p>
        </div>
        {navContent}
      </aside>
    </>
  );
}
