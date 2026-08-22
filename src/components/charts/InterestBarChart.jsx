import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts'
import { formatCompact, formatMoney } from '../../utils/format'

export function InterestBarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" stroke="var(--ink-faint)" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="var(--ink-faint)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatCompact} />
        <Tooltip
          formatter={(value, _name, props) => [formatMoney(value), props.payload.isReal ? 'Interés real' : 'Interés estimado']}
          contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 12 }}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} animationDuration={500}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.isReal ? '#10B981' : '#6EE7B7'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
