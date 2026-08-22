import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import { useEffect } from 'react'

export function Skeleton({ className = '' }) {
  return (
    <div className={`animate-pulse bg-surface-sunken rounded-lg ${className}`} />
  )
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-6">
      {Icon && (
        <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
          <Icon size={22} className="text-emerald-500" />
        </div>
      )}
      <h3 className="font-display font-semibold text-ink mb-1">{title}</h3>
      {description && <p className="text-ink-muted text-sm max-w-xs mb-4">{description}</p>}
      {action}
    </div>
  )
}

export function StatPill({ label, value, positive }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
        positive
          ? 'bg-emerald-500/10 text-emerald-500'
          : 'bg-alert/10 text-alert'
      }`}
    >
      {value} {label}
    </span>
  )
}

/** Semáforo de presupuesto: verde <70%, ámbar 70-99%, rojo >=100% */
export function BudgetBadge({ pct }) {
  const bg =
    pct >= 100
      ? 'bg-alert/10 text-alert'
      : pct >= 70
      ? 'bg-warn/10 text-warn'
      : 'bg-emerald-500/10 text-emerald-500'
  return (
    <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${bg}`}>
      {Math.round(pct)}% del presupuesto
    </span>
  )
}

/** Interpola el número mismo (no solo un fade) — cuenta hacia el nuevo valor en vez de saltar de golpe */
export function AnimatedNumber({ value, format = (n) => n, className = '' }) {
  const motionValue = useMotionValue(value)
  const spring = useSpring(motionValue, { duration: 0.6, bounce: 0 })
  const display = useTransform(spring, (v) => format(v))

  useEffect(() => {
    motionValue.set(value)
  }, [value, motionValue])

  return <motion.span className={`tabular ${className}`}>{display}</motion.span>
}
