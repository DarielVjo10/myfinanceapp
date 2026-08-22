import { useState } from 'react'
import { ChevronLeft, ChevronRight, Sun, Moon, LogOut } from 'lucide-react'
import { usePeriod } from '../../contexts/PeriodContext'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { monthLabel } from '../../utils/format'

export function Topbar() {
  const { currentPeriod, switchToPeriod } = usePeriod()
  const { theme, toggleTheme } = useTheme()
  const { signOut } = useAuth()
  const { t, language } = useLanguage()
  const [busy, setBusy] = useState(false)

  if (!currentPeriod) return null

  const shift = async (delta) => {
    setBusy(true)
    let { year, month } = currentPeriod
    month += delta
    if (month > 12) { month = 1; year += 1 }
    if (month < 1) { month = 12; year -= 1 }
    try {
      await switchToPeriod(year, month)
    } finally {
      setBusy(false)
    }
  }

  return (
    <header className="sticky top-0 z-20 bg-canvas/80 backdrop-blur-md border-b border-border px-4 md:px-8 py-3.5 flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <button
          onClick={() => shift(-1)}
          disabled={busy}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-muted hover:bg-surface-raised transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-display font-medium text-sm w-32 text-center">
          {monthLabel(currentPeriod.year, currentPeriod.month, language)}
        </span>
        <button
          onClick={() => shift(1)}
          disabled={busy}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-ink-muted hover:bg-surface-raised transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-ink-muted hover:bg-surface-raised transition-colors"
          aria-label={t('topbar.changeTheme')}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <button
          onClick={signOut}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-ink-muted hover:bg-alert/10 hover:text-alert transition-colors"
          aria-label={t('topbar.signOut')}
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  )
}
