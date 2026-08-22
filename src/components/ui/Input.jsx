import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export function Field({ label, children, hint, error }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-ink-muted mb-1.5">{label}</span>
      {children}
      {error ? (
        <span className="block text-xs text-alert mt-1">{error}</span>
      ) : (
        hint && <span className="block text-xs text-ink-faint mt-1">{hint}</span>
      )}
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

export function PasswordInput({ className = '', ...props }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        type={visible ? 'text' : 'password'}
        className={`w-full rounded-lg border border-border bg-surface-sunken px-3.5 py-2.5 pr-10 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-shadow ${className}`}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink transition-colors"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
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
