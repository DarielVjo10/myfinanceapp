const OPTIONS = [
  { value: 'day', label: 'Día' },
  { value: 'month', label: 'Mes' },
  { value: 'year', label: 'Año' },
]

export function GranularitySelector({ value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-border p-0.5 bg-surface-sunken">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
            value === o.value
              ? 'bg-surface text-emerald-500 shadow-soft'
              : 'text-ink-faint hover:text-ink'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
