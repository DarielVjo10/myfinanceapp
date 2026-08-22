import { motion } from 'framer-motion'
import { formatMoney, formatPercent } from '../../utils/format'

/**
 * Elemento de firma visual: un anillo de progreso que "crece" con animación,
 * usado consistentemente para metas de ahorro y KPIs de progreso.
 * Refuerza el concepto central del brief: crecimiento + ahorro + progreso.
 */
export function GoalRing({ label, current, target, size = 96, strokeWidth = 8 }) {
  const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="var(--border)"
            strokeWidth={strokeWidth}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#10B981"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ type: 'spring', bounce: 0, duration: 0.7 }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center flex-col">
          <span className="font-display font-semibold text-ink text-sm tabular">
            {formatPercent(pct, 0)}
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="text-xs text-ink-faint tabular">
          {formatMoney(current)} / {formatMoney(target)}
        </p>
      </div>
    </div>
  )
}
