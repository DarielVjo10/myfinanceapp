import { motion } from 'framer-motion'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatMoney, formatPercent } from '../../utils/format'
import { AnimatedNumber } from '../ui/Feedback'
import { InfoTooltip } from '../ui/InfoTooltip'

export function FinancialHero({ netWorth, growthPct, income, expenses, savings, available }) {
  const isPositive = growthPct >= 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl2 bg-gradient-to-br from-emerald-900 to-emerald-950 dark:from-emerald-950 dark:to-[#03110C] text-white p-6 md:p-8 shadow-glow relative overflow-hidden"
    >
      <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="relative">
        <div className="text-emerald-200/70 text-sm font-medium mb-1 flex items-center gap-1.5">
          Patrimonio Neto
          <InfoTooltip text="Activos − Pasivos: todo lo que tienes (cuentas, inversiones) menos todo lo que debes (tarjetas de crédito). No es solo cuánto has ahorrado." />
        </div>
        <div className="flex items-baseline gap-3 flex-wrap">
          <AnimatedNumber
            value={netWorth}
            format={formatMoney}
            className="text-3xl md:text-4xl font-display font-semibold tabular-display"
          />
          <span
            className={`inline-flex items-center gap-1 text-sm font-medium px-2 py-0.5 rounded-full ${
              isPositive ? 'bg-emerald-400/20 text-emerald-300' : 'bg-alert/20 text-red-300'
            }`}
          >
            {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {formatPercent(Math.abs(growthPct))}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
          <HeroStat label="Ingresos" value={income} tooltip="Total de ingresos registrados este período." />
          <HeroStat label="Gastos" value={expenses} negative tooltip="Total de gastos registrados este período." />
          <HeroStat label="Ahorros" value={savings} tooltip="Total aportado a tus metas de ahorro este período." />
          <HeroStat
            label="Balance en Cuentas"
            value={available}
            tooltip="Suma de los balances actuales de tus cuentas bancarias y efectivo, convertidos a DOP. Es dinero real en tus cuentas, no descuenta lo que ya piensas usar para metas o pagos próximos."
          />
        </div>
      </div>
    </motion.div>
  )
}

function HeroStat({ label, value, negative, tooltip }) {
  return (
    <div>
      <div className="text-emerald-200/60 text-xs mb-1 flex items-center gap-1">
        {label}
        {tooltip && <InfoTooltip text={tooltip} className="text-emerald-200/60 hover:text-white" />}
      </div>
      <p className={`tabular font-medium text-sm md:text-base ${negative ? 'text-red-300' : 'text-white'}`}>
        {formatMoney(value)}
      </p>
    </div>
  )
}
