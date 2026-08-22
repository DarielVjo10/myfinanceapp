export const TSS_AFP_RATE_DEFAULT = 2.87
export const TSS_SFS_RATE_DEFAULT = 3.04

export const ISR_SOURCE_LABEL = 'Escala ISR DGII 2026 (Resolución DDG-AR1-2026-00001), vigente hasta el cambio por Ley 30-26 en 2027'

/**
 * Calcula el sueldo neto dominicano siguiendo la secuencia oficial DGII/TSS:
 * 1. TSS del empleado = AFP + SFS, se resta del bruto -> neto gravable mensual.
 * 2. Se anualiza (× 12) para ubicar el tramo de ISR correspondiente.
 * 3. ISR anual = monto fijo del tramo + tasa × (excedente sobre el mínimo del tramo).
 * 4. Se divide entre 12 -> retención mensual.
 * 5. Neto mensual = Bruto − AFP − SFS − ISR mensual.
 *
 * `brackets` son las filas de isr_brackets del año correspondiente
 * (min_annual, max_annual, rate, fixed_amount) — nunca hardcodeadas aquí.
 */
export function calculatePayrollNet({ grossSalary, afpRate = TSS_AFP_RATE_DEFAULT, sfsRate = TSS_SFS_RATE_DEFAULT, brackets = [] }) {
  const gross = Number(grossSalary) || 0
  const afp = gross * (Number(afpRate) / 100)
  const sfs = gross * (Number(sfsRate) / 100)
  const taxableMonthly = gross - afp - sfs
  const taxableAnnual = taxableMonthly * 12

  const bracket = [...brackets]
    .sort((a, b) => Number(a.min_annual) - Number(b.min_annual))
    .find((b) => {
      const min = Number(b.min_annual)
      const max = b.max_annual == null ? Infinity : Number(b.max_annual)
      return taxableAnnual > min ? taxableAnnual <= max : taxableAnnual === min
    }) ?? [...brackets].sort((a, b) => Number(a.min_annual) - Number(b.min_annual))[0] ?? null

  const isrAnnual = bracket
    ? Number(bracket.fixed_amount) + Number(bracket.rate) * Math.max(0, taxableAnnual - Number(bracket.min_annual))
    : 0
  const isrMonthly = isrAnnual / 12
  const netSalary = gross - afp - sfs - isrMonthly

  return {
    grossSalary: gross,
    afp,
    sfs,
    tss: afp + sfs,
    taxableMonthly,
    taxableAnnual,
    isrAnnual,
    isrMonthly,
    netSalary,
    bracket,
  }
}
