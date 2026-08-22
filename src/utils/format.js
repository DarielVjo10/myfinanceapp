export function formatMoney(amount, currency = 'DOP') {
  const value = Number(amount ?? 0)
  return new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatCompact(amount) {
  const value = Number(amount ?? 0)
  return new Intl.NumberFormat('es-DO', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value)
}

export function formatPercent(value, digits = 1) {
  return `${Number(value ?? 0).toFixed(digits)}%`
}

const MONTHS_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

export function monthLabel(year, month, lang = 'es') {
  const months = lang === 'en' ? MONTHS_EN : MONTHS_ES
  return `${months[month - 1]} ${year}`
}

export function monthShort(year, month, lang = 'es') {
  const months = lang === 'en' ? MONTHS_EN : MONTHS_ES
  return `${months[month - 1].slice(0, 3)} '${String(year).slice(2)}`
}

export function currentYearMonth() {
  const now = new Date()
  return { year: now.getFullYear(), month: now.getMonth() + 1 }
}

export function periodBounds(year, month) {
  const start = new Date(Date.UTC(year, month - 1, 1))
  const end = new Date(Date.UTC(year, month, 0))
  const toISODate = (d) => d.toISOString().slice(0, 10)
  return { start_date: toISODate(start), end_date: toISODate(end) }
}
