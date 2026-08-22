import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, TrendingUp, TrendingDown, PiggyBank,
  Landmark, History, LineChart, Settings, Banknote, Coins, Repeat, CreditCard,
} from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'

const links = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/income', labelKey: 'nav.income', icon: TrendingUp },
  { to: '/expenses', labelKey: 'nav.expenses', icon: TrendingDown },
  { to: '/recurring', labelKey: 'nav.recurring', icon: Repeat },
  { to: '/savings', labelKey: 'nav.savings', icon: PiggyBank },
  { to: '/investments', labelKey: 'nav.investments', icon: Coins },
  { to: '/accounts', labelKey: 'nav.accounts', icon: Landmark },
  { to: '/credit-cards', labelKey: 'nav.creditCards', icon: CreditCard },
  { to: '/history', labelKey: 'nav.history', icon: History },
  { to: '/analytics', labelKey: 'nav.analytics', icon: LineChart },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
]

export function Sidebar() {
  const { t } = useLanguage()
  return (
    <aside className="hidden md:flex flex-col w-60 shrink-0 border-r border-border bg-surface h-screen sticky top-0 px-3 py-5">
      <div className="flex items-center gap-2 px-3 mb-8">
        <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
          <Banknote size={18} className="text-emerald-950" />
        </div>
        <span className="font-display font-semibold text-ink">MyBudget</span>
      </div>

      <nav className="flex-1 space-y-1">
        {links.map(({ to, labelKey, icon: Icon, end }) => (
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
            {t(labelKey)}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
