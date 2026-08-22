import { motion } from 'framer-motion'

export function Card({ children, className = '', hover = false, ...props }) {
  const Component = hover ? motion.div : 'div'
  const hoverProps = hover
    ? { whileHover: { y: -2 }, transition: { duration: 0.15 } }
    : {}
  return (
    <Component
      className={`bg-surface border border-border rounded-xl2 shadow-soft p-5 ${className}`}
      {...hoverProps}
      {...props}
    >
      {children}
    </Component>
  )
}

export function CardHeader({ title, subtitle, action, icon: Icon }) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={16} className="text-ink-faint" />}
        <div>
          <h3 className="font-display font-semibold text-ink text-base">{title}</h3>
          {subtitle && <p className="text-ink-muted text-sm mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}
