import { supabase } from '../lib/supabaseClient'
import { monthShort, dayLabel } from '../utils/format'
import { savingsRate } from './../utils/finance'
import { getAccountBalanceHistory } from './accounts'
import { getNetWorthHistory } from './networth'

/**
 * Construye el resumen mes a mes (income/expenses/savings/netWorth/savingsRate)
 * para una lista de períodos. Usado por History y Analytics.
 */
export async function buildMonthlyOverview(userId, periods) {
  if (!periods.length) return []
  const periodIds = periods.map((p) => p.id)

  const [{ data: incomes }, { data: expenses }, { data: contributions }, { data: netWorths }] = await Promise.all([
    supabase.from('incomes').select('amount, period_id').eq('user_id', userId).in('period_id', periodIds),
    supabase.from('expenses').select('amount, period_id').eq('user_id', userId).in('period_id', periodIds),
    supabase.from('savings_contributions').select('amount, period_id').eq('user_id', userId).in('period_id', periodIds),
    supabase.from('net_worth_snapshots').select('net_worth, period_id').eq('user_id', userId).in('period_id', periodIds),
  ])

  const sumBy = (rows) => {
    const map = {}
    for (const p of periodIds) map[p] = 0
    for (const row of rows ?? []) map[row.period_id] += Number(row.amount)
    return map
  }

  const incomeMap = sumBy(incomes)
  const expenseMap = sumBy(expenses)
  const savingsMap = sumBy(contributions)
  const netWorthMap = Object.fromEntries((netWorths ?? []).map((n) => [n.period_id, Number(n.net_worth)]))

  return periods.map((p) => ({
    periodId: p.id,
    year: p.year,
    month: p.month,
    label: monthShort(p.year, p.month),
    income: incomeMap[p.id] ?? 0,
    expenses: expenseMap[p.id] ?? 0,
    savings: savingsMap[p.id] ?? 0,
    netWorth: netWorthMap[p.id] ?? 0,
    savingsRate: savingsRate(incomeMap[p.id] ?? 0, savingsMap[p.id] ?? 0),
  }))
}

export function lastNPeriods(periods, n) {
  return periods.slice(-n)
}

/**
 * Serie de balance (cuenta o patrimonio neto) agrupada por la granularidad
 * pedida. account_balances/net_worth_snapshots son un registro por
 * cuenta+período MENSUAL — no existe (todavía) más de un balance por mes,
 * así que "día" no inventa puntos que no existen: solo cambia la etiqueta
 * de cada punto mensual a su fecha real de registro, con una nota honesta
 * explicándolo. "año" usa el balance de CIERRE del último mes registrado
 * ese año (un balance es una foto, no un flujo — sumarlo entre meses daría
 * un número sin sentido financiero).
 */
export async function getBalanceSeriesGrouped(userId, { entityType, entityId, granularity, lang = 'es' }) {
  let rows
  if (entityType === 'account') {
    const history = await getAccountBalanceHistory(userId, entityId)
    rows = history
      .filter((r) => r.monthly_periods)
      .map((r) => ({ year: r.monthly_periods.year, month: r.monthly_periods.month, value: Number(r.balance), date: r.recorded_date }))
  } else {
    const history = await getNetWorthHistory(userId)
    rows = history.map((r) => ({
      year: r.monthly_periods.year,
      month: r.monthly_periods.month,
      value: Number(r.net_worth),
      date: r.calculated_at ? r.calculated_at.slice(0, 10) : null,
    }))
  }
  rows.sort((a, b) => (a.year - b.year) || (a.month - b.month))

  if (granularity === 'year') {
    const byYear = {}
    for (const r of rows) byYear[r.year] = r.value // meses en orden asc: el último pisa a los anteriores = cierre de año
    const years = Object.keys(byYear).sort()
    return {
      points: years.map((y) => ({ label: y, value: byYear[y] })),
      note: years.length > 0 ? 'Cada punto es el balance de cierre del último mes registrado ese año (un balance no se suma entre meses, es una foto).' : null,
    }
  }

  if (granularity === 'day') {
    return {
      points: rows.map((r) => ({ label: r.date ? dayLabel(r.date, lang) : monthShort(r.year, r.month, lang), value: r.value })),
      note: entityType === 'account'
        ? 'Cada cuenta guarda un solo balance por mes, así que "Día" muestra un punto por mes en su fecha real de registro. Registra el balance más seguido (más de una vez al mes) para ver detalle diario real.'
        : 'El patrimonio neto se recalcula una vez por mes; "Día" muestra la fecha del último recálculo de cada mes, no un histórico diario real.',
    }
  }

  // month (default)
  return {
    points: rows.map((r) => ({ label: monthShort(r.year, r.month, lang), value: r.value })),
    note: null,
  }
}
