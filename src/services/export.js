import Papa from 'papaparse'
import jsPDF from 'jspdf'
import { supabase } from '../lib/supabaseClient'
import { formatMoney } from '../utils/format'

async function fetchAll(table, userId, selectStr) {
  const { data, error } = await supabase.from(table).select(selectStr).eq('user_id', userId)
  if (error) throw error
  return data ?? []
}

/** Aplana objetos anidados (joins) para que cada columna sea una celda de CSV */
function flattenRow(row) {
  const flat = {}
  for (const [k, v] of Object.entries(row)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const [k2, v2] of Object.entries(v)) flat[`${k}_${k2}`] = v2
    } else {
      flat[k] = v
    }
  }
  return flat
}

function downloadCSV(filename, rows) {
  const csv = Papa.unparse(rows.map(flattenRow))
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

/** Exporta TODO el histórico del usuario (no solo el mes actual), un CSV por entidad */
export async function exportFullHistory(userId) {
  const [incomes, expenses, contributions, balances] = await Promise.all([
    fetchAll('incomes', userId, 'income_date, type, source, amount, description, accounts(name), monthly_periods(year,month)'),
    fetchAll('expenses', userId, 'expense_date, amount, description, expense_categories(name), accounts(name), monthly_periods(year,month)'),
    fetchAll('savings_contributions', userId, 'contribution_date, amount, note, savings_goals(name), accounts(name), monthly_periods(year,month)'),
    fetchAll('account_balances', userId, 'balance, accounts(name), monthly_periods(year,month)'),
  ])

  downloadCSV('incomes.csv', incomes)
  await wait(300)
  downloadCSV('expenses.csv', expenses)
  await wait(300)
  downloadCSV('savings_contributions.csv', contributions)
  await wait(300)
  downloadCSV('account_balances.csv', balances)
}

/** Reporte anual: patrimonio final, ahorro total, gasto por categoría, para un año dado */
export async function exportAnnualReportPDF(userId, year) {
  const { data: periods, error: pErr } = await supabase
    .from('monthly_periods')
    .select('id, year, month')
    .eq('user_id', userId)
    .eq('year', year)
    .order('month', { ascending: true })
  if (pErr) throw pErr
  const periodIds = periods.map((p) => p.id)

  const [{ data: incomes }, { data: expenses }, { data: contributions }, { data: netWorths }] = await Promise.all([
    supabase.from('incomes').select('amount').eq('user_id', userId).in('period_id', periodIds),
    supabase.from('expenses').select('amount, expense_categories(name)').eq('user_id', userId).in('period_id', periodIds),
    supabase.from('savings_contributions').select('amount').eq('user_id', userId).in('period_id', periodIds),
    supabase.from('net_worth_snapshots').select('net_worth, period_id').eq('user_id', userId).in('period_id', periodIds),
  ])

  const totalIncome = (incomes ?? []).reduce((s, r) => s + Number(r.amount), 0)
  const totalExpenses = (expenses ?? []).reduce((s, r) => s + Number(r.amount), 0)
  const totalSavings = (contributions ?? []).reduce((s, r) => s + Number(r.amount), 0)

  const byCategory = {}
  for (const e of expenses ?? []) {
    const name = e.expense_categories?.name || 'Sin categoría'
    byCategory[name] = (byCategory[name] ?? 0) + Number(e.amount)
  }

  const lastPeriodId = periods.at(-1)?.id
  const finalNetWorth = (netWorths ?? []).find((n) => n.period_id === lastPeriodId)?.net_worth ?? 0

  const doc = new jsPDF()
  doc.setFontSize(18)
  doc.text(`Reporte Anual ${year}`, 14, 20)

  doc.setFontSize(11)
  doc.text(`Patrimonio neto (fin de año): ${formatMoney(finalNetWorth)}`, 14, 34)
  doc.text(`Ingresos del año: ${formatMoney(totalIncome)}`, 14, 42)
  doc.text(`Gastos del año: ${formatMoney(totalExpenses)}`, 14, 50)
  doc.text(`Ahorro del año: ${formatMoney(totalSavings)}`, 14, 58)

  doc.setFontSize(13)
  doc.text('Gasto por categoría', 14, 72)
  doc.setFontSize(11)
  let y = 80
  const sortedCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1])
  for (const [name, total] of sortedCategories) {
    if (y > 280) { doc.addPage(); y = 20 }
    doc.text(`${name}: ${formatMoney(total)}`, 18, y)
    y += 7
  }

  doc.save(`reporte-anual-${year}.pdf`)
}
