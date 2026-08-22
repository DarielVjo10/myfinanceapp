export function Field({ label, children, hint }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-ink-muted mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-xs text-ink-faint mt-1">{hint}</span>}
    </label>
  )
}

export function Input({ className = '', ...props }) {
  return (
    <input
      className={`w-full rounded-lg border border-border bg-surface-sunken px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-shadow ${className}`}
      {...props}
    />
  )
}

export function Select({ className = '', children, ...props }) {
  return (
    <select
      className={`w-full rounded-lg border border-border bg-surface-sunken px-3.5 py-2.5 text-sm text-ink outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-shadow ${className}`}
      {...props}
    >
      {children}
    </select>
  )
}
