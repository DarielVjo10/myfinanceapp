import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatCompact, formatMoney } from '../../utils/format'

export function TrendBarChart({ data, dataKey = 'total', color = '#10B981', label = 'Total' }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" stroke="var(--ink-faint)" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="var(--ink-faint)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatCompact} />
        <Tooltip
          formatter={(value) => [formatMoney(value), label]}
          contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 12 }}
        />
        <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} animationDuration={500} />
      </BarChart>
    </ResponsiveContainer>
  )
}
