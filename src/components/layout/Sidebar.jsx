import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, TrendingDown, PiggyBank,
  Landmark, History, LineChart, Settings, Sprout,
} from 'lucide-react'

const links = [
  { to: '/', label: 'Panel', icon: LayoutDashboard, end: true },
  { to: '/income', label: 'Ingresos', icon: TrendingUp },
  { to: '/expenses', label: 'Gastos', icon: TrendingDown },
  { to: '/savings', label: 'Ahorros', icon: PiggyBank },
  { to: '/accounts', label: 'Cuentas', icon: Landmark },
  { to: '/history', label: 'Historial', icon: History },
  { to: '/analytics', label: 'Analítica', icon: LineChart },
  { to: '/settings', label: 'Ajustes', icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-border bg-surface h-screen sticky top-0 px-3 py-5">
      <div className="flex items-center gap-2 px-3 mb-8">
        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
          <Sprout size={18} className="text-emerald-950" />
        </div>
        <span className="font-display font-semibold text-ink">Brote</span>
      </div>

      <nav className="flex-1 space-y-1">
        {links.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'text-ink-muted hover:text-ink hover:bg-surface-raised'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
