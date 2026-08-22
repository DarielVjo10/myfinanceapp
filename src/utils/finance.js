// ---------------------------------------------------------------------
// Interés simple de un mes dado un balance y una tasa anual — se usa tanto
// para tarjetas de crédito (interés que cobra si no se paga completo) como
// para cuentas con interés (interés que la cuenta le paga al usuario).
// ---------------------------------------------------------------------
export function estimateMonthlyInterest(balance, annualInterestRate) {
  return Number(balance) * (Number(annualInterestRate) / 100 / 12)
}

export function estimateMinimumPayment(balance, minimumPaymentPct) {
  return Number(balance) * (Number(minimumPaymentPct) / 100)
}

// ---------------------------------------------------------------------
// Proyección de metas: dado el ritmo actual de aportes, ¿cuándo se alcanza
// el objetivo? Genérica a propósito — sirve para savings_goals hoy y para
// cualquier otra meta con monto objetivo + aporte mensual (ej. inversiones,
// si más adelante les agregas esos campos) sin duplicar el cálculo.
// ---------------------------------------------------------------------
function monthsBetween(from, to) {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
}

function addMonths(date, n) {
  const d = new Date(date)
  d.setMonth(d.getMonth() + n)
  return d
}

/**
 * status: 'ahead' | 'on_time' | 'behind' | null (null si no hay target_date
 * o no hay aporte mensual planificado con qué proyectar).
 */
export function projectGoalCompletion({ currentAmount, targetAmount, monthlyContribution, targetDate }) {
  if (!targetAmount || targetAmount <= 0) return null

  const remaining = targetAmount - currentAmount
  if (remaining <= 0) {
    return { monthsToComplete: 0, completionDate: new Date(), status: 'ahead', requiredMonthlyContribution: 0 }
  }

  if (!monthlyContribution || monthlyContribution <= 0) {
    return { monthsToComplete: null, completionDate: null, status: targetDate ? 'behind' : null, requiredMonthlyContribution: null }
  }

  const monthsToComplete = Math.ceil(remaining / monthlyContribution)
  const completionDate = addMonths(new Date(), monthsToComplete)

  let status = null
  let requiredMonthlyContribution = null
  if (targetDate) {
    const monthsUntilTarget = monthsBetween(new Date(), new Date(targetDate))
    if (monthsToComplete <= monthsUntilTarget) {
      status = monthsToComplete < monthsUntilTarget ? 'ahead' : 'on_time'
    } else {
      status = 'behind'
      requiredMonthlyContribution = monthsUntilTarget > 0 ? remaining / monthsUntilTarget : remaining
    }
  }

  return { monthsToComplete, completionDate, status, requiredMonthlyContribution }
}

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
// Multi-moneda: conversión a DOP usando la tasa más reciente disponible
// ---------------------------------------------------------------------
/** null = no hay tasa disponible para esa moneda, no se puede convertir */
export function convertToDOP(amount, currency, ratesToDOP) {
  const amt = Number(amount)
  if (!currency || currency === 'DOP') return amt
  const rate = ratesToDOP?.[currency]
  return rate ? amt * rate : null
}

// ---------------------------------------------------------------------
// Deudas: proyección de meses para pagar con un pago mensual fijo
// ---------------------------------------------------------------------
/**
 * Si el pago mensual no alcanza a cubrir el interés generado, la deuda
 * nunca se termina de pagar (meses/interés vienen null).
 */
export function projectDebtPayoff({ balance, annualRate = 0, monthlyPayment }) {
  if (balance <= 0) return { months: 0, totalInterest: 0 }
  if (!monthlyPayment || monthlyPayment <= 0) return { months: null, totalInterest: null }

  const r = annualRate / 100 / 12
  if (r === 0) {
    const months = Math.ceil(balance / monthlyPayment)
    return { months, totalInterest: 0 }
  }

  const monthlyInterest = balance * r
  if (monthlyPayment <= monthlyInterest) return { months: null, totalInterest: null }

  const months = Math.ceil(-Math.log(1 - (balance * r) / monthlyPayment) / Math.log(1 + r))
  const totalInterest = months * monthlyPayment - balance
  return { months, totalInterest }
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
