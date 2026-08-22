// ---------------------------------------------------------------------
// Interés compuesto
// ---------------------------------------------------------------------
// frequency: 'monthly' | 'quarterly' | 'annually' | 'daily'
const PERIODS_PER_YEAR = { monthly: 12, quarterly: 4, annually: 1, daily: 365 }

/**
 * Proyecta el capital acumulado con aportes periódicos e interés compuesto.
 * Devuelve un arreglo mes a mes para graficar, más los totales finales.
 */
export function projectCompoundInterest({
  initialCapital = 0,
  monthlyContribution = 0,
  annualRate = 0,
  compoundingFrequency = 'monthly',
  years = 1,
}) {
  const n = PERIODS_PER_YEAR[compoundingFrequency] ?? 12
  const ratePerPeriod = annualRate / 100 / n
  const totalMonths = years * 12
  // convertimos el aporte mensual a un aporte equivalente por período de capitalización
  const contributionPerPeriod = monthlyContribution * (12 / n)

  let capital = initialCapital
  let totalContributed = initialCapital
  const timeline = []

  for (let month = 1; month <= totalMonths; month++) {
    const isCompoundingMonth = month % (12 / n) === 0
    capital += monthlyContribution
    totalContributed += monthlyContribution
    if (isCompoundingMonth) {
      capital = capital * (1 + ratePerPeriod)
    }
    timeline.push({
      month,
      capital: Math.round(capital * 100) / 100,
      contributed: Math.round(totalContributed * 100) / 100,
      interestEarned: Math.round((capital - totalContributed) * 100) / 100,
    })
  }

  return {
    timeline,
    finalCapital: timeline.at(-1)?.capital ?? initialCapital,
    totalContributed,
    totalInterest: (timeline.at(-1)?.capital ?? initialCapital) - totalContributed,
  }
}

/** Ahorro simple (sin interés) para comparar contra el interés compuesto */
export function projectSimpleSavings({ initialCapital = 0, monthlyContribution = 0, years = 1 }) {
  const totalMonths = years * 12
  const timeline = []
  let capital = initialCapital
  for (let month = 1; month <= totalMonths; month++) {
    capital += monthlyContribution
    timeline.push({ month, capital: Math.round(capital * 100) / 100 })
  }
  return { timeline, finalCapital: timeline.at(-1)?.capital ?? initialCapital }
}

// ---------------------------------------------------------------------
// 50/30/20
// ---------------------------------------------------------------------
export function calculate503020({ needsSpent, wantsSpent, savingsAmount, income }) {
  const safeIncome = income || 1
  return {
    needsPct: (needsSpent / safeIncome) * 100,
    wantsPct: (wantsSpent / safeIncome) * 100,
    savingsPct: (savingsAmount / safeIncome) * 100,
  }
}

// ---------------------------------------------------------------------
// Comparaciones entre períodos
// ---------------------------------------------------------------------
export function percentChange(current, previous) {
  if (!previous) return current > 0 ? 100 : 0
  return ((current - previous) / Math.abs(previous)) * 100
}

export function absoluteChange(current, previous) {
  return current - previous
}

export function savingsRate(income, expenses) {
  if (!income) return 0
  return ((income - expenses) / income) * 100
}
