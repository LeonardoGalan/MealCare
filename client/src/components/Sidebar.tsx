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
    <aside className="w-64 bg-white border-r border-gray-200 min-h-screen">
      <nav className="px-4 py-6 space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}