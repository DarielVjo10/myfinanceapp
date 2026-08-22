import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { formatCompact, formatMoney } from '../../utils/format'

export function CompoundProjectionChart({ compoundTimeline, simpleTimeline }) {
  const merged = compoundTimeline.map((point, i) => ({
    month: point.month,
    compound: point.capital,
    simple: simpleTimeline[i]?.capital ?? 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={merged}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis
          dataKey="month"
          stroke="var(--ink-faint)"
          fontSize={12}
          tickLine={false}
          axisLine={false}
          tickFormatter={(m) => `M${m}`}
        />
        <YAxis stroke="var(--ink-faint)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatCompact} />
        <Tooltip
          formatter={(value, name) => [formatMoney(value), name === 'compound' ? 'Interés compuesto' : 'Ahorro simple']}
          labelFormatter={(m) => `Mes ${m}`}
          contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 12 }}
        />
        <Legend
          formatter={(v) => (v === 'compound' ? 'Interés compuesto' : 'Ahorro simple')}
          wrapperStyle={{ fontSize: 12 }}
        />
        <Line type="monotone" dataKey="simple" stroke="#8AA398" strokeWidth={2} dot={false} strokeDasharray="4 4" />
        <Line type="monotone" dataKey="compound" stroke="#10B981" strokeWidth={2.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
