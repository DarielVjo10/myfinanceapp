import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, TrendingUp, TrendingDown, PiggyBank,
  Landmark, History, LineChart, Settings, Coins, Repeat, Menu, X,
} from 'lucide-react'

const primaryLinks = [
  { to: '/', label: 'Panel', icon: LayoutDashboard, end: true },
  { to: '/income', label: 'Ingresos', icon: TrendingUp },
  { to: '/expenses', label: 'Gastos', icon: TrendingDown },
  { to: '/savings', label: 'Ahorros', icon: PiggyBank },
]

const moreLinks = [
  { to: '/recurring', label: 'Recurrentes', icon: Repeat },
  { to: '/investments', label: 'Inversiones', icon: Coins },
  { to: '/accounts', label: 'Cuentas', icon: Landmark },
  { to: '/history', label: 'Historial', icon: History },
  { to: '/analytics', label: 'Analítica', icon: LineChart },
  { to: '/settings', label: 'Ajustes', icon: Settings },
]

const tabClass = ({ isActive }) =>
  `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium ${
    isActive ? 'text-emerald-500' : 'text-ink-faint'
  }`

export function MobileNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()
  const isMoreActive = moreLinks.some((l) => l.to === location.pathname)

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-border flex items-center justify-around px-1 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {primaryLinks.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={tabClass}>
            <Icon size={20} />
            {label}
          </NavLink>
        ))}
        <button
          onClick={() => setMoreOpen(true)}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium ${
            isMoreActive ? 'text-emerald-500' : 'text-ink-faint'
          }`}
        >
          <Menu size={20} />
          Más
        </button>
      </nav>

      <AnimatePresence>
        {moreOpen && (
          <motion.div
            className="md:hidden fixed inset-0 z-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setMoreOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
              className="absolute bottom-0 inset-x-0 bg-surface border-t border-border rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-display font-semibold text-ink">Más</h2>
                <button onClick={() => setMoreOpen(false)} className="text-ink-faint hover:text-ink transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {moreLinks.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      `flex flex-col items-center gap-1.5 py-4 rounded-xl text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-500'
                          : 'text-ink-muted bg-surface-sunken hover:text-ink'
                      }`
                    }
                  >
                    <Icon size={20} />
                    {label}
                  </NavLink>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
