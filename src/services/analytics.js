import { supabase } from '../lib/supabaseClient'
import { monthShort } from '../utils/format'
import { savingsRate } from './../utils/finance'

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
    savingsRate: savingsRate(incomeMap[p.id] ?? 0, expenseMap[p.id] ?? 0),
  }))
}

export function lastNPeriods(periods, n) {
  return periods.slice(-n)
}
