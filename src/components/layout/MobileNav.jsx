import { NavLink } from 'react-router-dom'
import { LayoutDashboard, TrendingDown, PiggyBank, History, Settings, Repeat } from 'lucide-react'

const links = [
  { to: '/', label: 'Panel', icon: LayoutDashboard, end: true },
  { to: '/expenses', label: 'Gastos', icon: TrendingDown },
  { to: '/recurring', label: 'Recurrentes', icon: Repeat },
  { to: '/savings', label: 'Ahorros', icon: PiggyBank },
  { to: '/history', label: 'Historial', icon: History },
  { to: '/settings', label: 'Ajustes', icon: Settings },
]

export function MobileNav() {
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-border flex items-center justify-around px-1 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      {links.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium ${
              isActive ? 'text-emerald-500' : 'text-ink-faint'
            }`
          }
        >
          <Icon size={20} />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
