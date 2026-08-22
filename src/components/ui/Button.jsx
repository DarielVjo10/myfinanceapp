import { motion } from 'framer-motion'

const variants = {
  primary: 'bg-emerald-500 text-emerald-950 hover:bg-emerald-400 shadow-glow',
  secondary: 'bg-surface-raised text-ink border border-border hover:border-emerald-500/40',
  ghost: 'text-ink-muted hover:text-ink hover:bg-surface-raised',
  danger: 'bg-alert/10 text-alert border border-alert/30 hover:bg-alert/20',
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  loading = false,
  disabled,
  ...props
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </motion.button>
  )
}
