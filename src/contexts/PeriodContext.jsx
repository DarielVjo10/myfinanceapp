import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useAuth } from './AuthContext'
import { getOrCreatePeriod, listPeriods } from '../services/periods'
import { currentYearMonth } from '../utils/format'

const PeriodContext = createContext(null)

export function PeriodProvider({ children }) {
  const { user } = useAuth()
  const [currentPeriod, setCurrentPeriod] = useState(null)
  const [allPeriods, setAllPeriods] = useState([])
  const [loading, setLoading] = useState(true)

  const refreshPeriods = useCallback(async () => {
    if (!user) return
    const periods = await listPeriods(user.id)
    setAllPeriods(periods)
    return periods
  }, [user])

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    ;(async () => {
      try {
        const { year, month } = currentYearMonth()
        const period = await getOrCreatePeriod(user.id, year, month)
        if (!active) return
        setCurrentPeriod(period)
        await refreshPeriods()
      } finally {
        if (active) setLoading(false)
      }
    })()
    return () => {
      active = false
    }
  }, [user, refreshPeriods])

  const switchToPeriod = useCallback(
    async (year, month) => {
      if (!user) return
      const period = await getOrCreatePeriod(user.id, year, month)
      setCurrentPeriod(period)
      await refreshPeriods()
      return period
    },
    [user, refreshPeriods]
  )

  const value = { currentPeriod, allPeriods, loading, switchToPeriod, refreshPeriods }

  return <PeriodContext.Provider value={value}>{children}</PeriodContext.Provider>
}

export function usePeriod() {
  const ctx = useContext(PeriodContext)
  if (!ctx) throw new Error('usePeriod debe usarse dentro de <PeriodProvider>')
  return ctx
}
