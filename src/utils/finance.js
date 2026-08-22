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
 *
 * `annualInterestRate` es opcional: si la meta está vinculada a una cuenta
 * con interés (savings_goals.account_id), la proyección simula mes a mes
 * (aporte + interés sobre el balance acumulado) en vez de dividir
 * linealmente — con interés, la meta se completa más rápido que solo
 * sumando aportes, y esta simulación lo refleja en monthsToComplete.
 */
export function projectGoalCompletion({ currentAmount, targetAmount, monthlyContribution, targetDate, annualInterestRate = 0 }) {
  if (!targetAmount || targetAmount <= 0) return null

  const remaining = targetAmount - currentAmount
  if (remaining <= 0) {
    return { monthsToComplete: 0, completionDate: new Date(), status: 'ahead', requiredMonthlyContribution: 0 }
  }

  if (!monthlyContribution || monthlyContribution <= 0) {
    return { monthsToComplete: null, completionDate: null, status: targetDate ? 'behind' : null, requiredMonthlyContribution: null }
  }

  const monthlyRate = Number(annualInterestRate) / 100 / 12
  let monthsToComplete
  if (monthlyRate > 0) {
    let balance = currentAmount
    monthsToComplete = 0
    // tope de 600 meses (50 años) para nunca quedar en loop infinito si el
    // interés+aporte configurados fueran absurdamente bajos
    while (balance < targetAmount && monthsToComplete < 600) {
      balance = balance * (1 + monthlyRate) + monthlyContribution
      monthsToComplete++
    }
  } else {
    monthsToComplete = Math.ceil(remaining / monthlyContribution)
  }
  const completionDate = addMonths(new Date(), monthsToComplete)

  let status = null
  let requiredMonthlyContribution = null
  if (targetDate) {
    const monthsUntilTarget = monthsBetween(new Date(), new Date(targetDate))
    if (monthsToComplete <= monthsUntilTarget) {
      status = monthsToComplete < monthsUntilTarget ? 'ahead' : 'on_time'
    } else {
      status = 'behind'
      if (monthsUntilTarget > 0) {
        if (monthlyRate > 0) {
          // cuánto crece el balance actual solo (sin aportes) hasta la fecha objetivo
          const futureValueOfCurrent = currentAmount * Math.pow(1 + monthlyRate, monthsUntilTarget)
          const stillNeeded = Math.max(0, targetAmount - futureValueOfCurrent)
          const annuityFactor = (Math.pow(1 + monthlyRate, monthsUntilTarget) - 1) / monthlyRate
          requiredMonthlyContribution = annuityFactor > 0 ? stillNeeded / annuityFactor : stillNeeded
        } else {
          requiredMonthlyContribution = remaining / monthsUntilTarget
        }
      } else {
        requiredMonthlyContribution = remaining
      }
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

// % del ingreso del período que efectivamente se destinó a metas de ahorro
// (no "lo que no se gastó" — eso puede quedar sin asignar en vez de ahorrarse)
export function savingsRate(income, savings) {
  if (!income) return 0
  return (savings / income) * 100
}

// Estándar usado para el fondo de emergencia: <3 meses de gasto cubierto =
// en riesgo, 3-6 = adecuado, >6 = sólido. Es un criterio común (no una ley),
// documentado aquí para poder ajustarlo si se quiere otro estándar.
export function emergencyFundStatus(months) {
  if (months == null) return null
  if (months < 3) return 'en_riesgo'
  if (months <= 6) return 'adecuado'
  return 'solido'
}

/**
 * Índice de Salud Financiera (0-100): promedio simple de las sub-métricas
 * que haya datos suficientes para calcular (si falta una, se excluye del
 * promedio en vez de penalizar por falta de info). Es un criterio propio de
 * esta app, no un estándar de la industria — por eso cada componente queda
 * expuesto en el resultado para mostrar transparentemente de qué se compone:
 * - Fondo de emergencia: min(100, mesesCubiertos / 6 * 100) — 6 meses de
 *   gasto cubierto = 100 puntos (el umbral "sólido" de emergencyFundStatus).
 * - Porcentaje de ahorro: el % tal cual, capado a 0-100.
 * - Adherencia al presupuesto: % de categorías con presupuesto asignado que
 *   NO lo excedieron este período.
 * - Uso de tarjetas: 100 − % de uso promedio del límite de crédito (menos
 *   uso = más saludable).
 */
export function computeFinancialHealthScore({ emergencyFundMonths, savingsRatePct, budgetAdherencePct, creditUtilizationPct }) {
  const components = []
  if (emergencyFundMonths != null) {
    components.push({ key: 'emergencyFund', label: 'Fondo de emergencia', score: Math.min(100, (emergencyFundMonths / 6) * 100) })
  }
  if (savingsRatePct != null) {
    components.push({ key: 'savingsRate', label: 'Porcentaje de ahorro', score: Math.max(0, Math.min(100, savingsRatePct)) })
  }
  if (budgetAdherencePct != null) {
    components.push({ key: 'budgetAdherence', label: 'Adherencia al presupuesto', score: budgetAdherencePct })
  }
  if (creditUtilizationPct != null) {
    components.push({ key: 'creditUsage', label: 'Uso de tarjetas de crédito', score: Math.max(0, 100 - creditUtilizationPct) })
  }
  if (components.length === 0) return null

  const score = components.reduce((s, c) => s + c.score, 0) / components.length
  let label
  if (score >= 80) label = 'Excelente'
  else if (score >= 60) label = 'Buena'
  else if (score >= 40) label = 'Regular'
  else label = 'En riesgo'

  return { score: Math.round(score), label, components }
}
