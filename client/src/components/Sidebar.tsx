import { NavLink } from 'react-router-dom';
import { LayoutDashboard, CalendarDays, UtensilsCrossed, Ban, Settings } from 'lucide-react';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/meal-plan', label: 'Meal Plan', icon: CalendarDays },
  { to: '/log-meal', label: 'Log Meal', icon: UtensilsCrossed },
  { to: '/meals-to-avoid', label: 'Meals to Avoid', icon: Ban },
  { to: '/profile', label: 'Profile Settings', icon: Settings },
];
// following figma diagram, none of these have routes as of now and quickly adding these for the purpose of demo.
// !!! create page components and routes for above 

export default function Sidebar() {
  return (
    <aside className="h-full w-60 shrink-0 bg-[#204f74] text-white shadow-xl">
      <nav className="space-y-1 px-4 py-5">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-4 py-3 transition ${
                isActive
                  ? 'bg-[#1e86c8] text-white font-semibold shadow-sm'
                  : 'text-slate-100 hover:bg-white/10'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
