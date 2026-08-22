import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, TrendingUp, TrendingDown, PiggyBank,
  Landmark, History, LineChart, Settings, Coins, Repeat, Menu, X, CreditCard,
} from 'lucide-react'
import { useLanguage } from '../../contexts/LanguageContext'

const primaryLinks = [
  { to: '/', labelKey: 'nav.dashboard', icon: LayoutDashboard, end: true },
  { to: '/income', labelKey: 'nav.income', icon: TrendingUp },
  { to: '/expenses', labelKey: 'nav.expenses', icon: TrendingDown },
  { to: '/savings', labelKey: 'nav.savings', icon: PiggyBank },
]

const moreLinks = [
  { to: '/recurring', labelKey: 'nav.recurring', icon: Repeat },
  { to: '/investments', labelKey: 'nav.investments', icon: Coins },
  { to: '/accounts', labelKey: 'nav.accounts', icon: Landmark },
  { to: '/credit-cards', labelKey: 'nav.creditCards', icon: CreditCard },
  { to: '/history', labelKey: 'nav.history', icon: History },
  { to: '/analytics', labelKey: 'nav.analytics', icon: LineChart },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
]

const tabClass = ({ isActive }) =>
  `flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium ${
    isActive ? 'text-emerald-500' : 'text-ink-faint'
  }`

export function MobileNav() {
  const { t } = useLanguage()
  const [moreOpen, setMoreOpen] = useState(false)
  const location = useLocation()
  const isMoreActive = moreLinks.some((l) => l.to === location.pathname)

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-border flex items-center justify-around px-1 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {primaryLinks.map(({ to, labelKey, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end} className={tabClass}>
            <Icon size={20} />
            {t(labelKey)}
          </NavLink>
        ))}
        <button
          onClick={() => setMoreOpen(true)}
          className={`flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg text-[10px] font-medium ${
            isMoreActive ? 'text-emerald-500' : 'text-ink-faint'
          }`}
        >
          <Menu size={20} />
          {t('nav.more')}
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
                <h2 className="font-display font-semibold text-ink">{t('nav.more')}</h2>
                <button onClick={() => setMoreOpen(false)} className="text-ink-faint hover:text-ink transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {moreLinks.map(({ to, labelKey, icon: Icon }) => (
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
                    {t(labelKey)}
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
