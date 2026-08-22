import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts'
import { formatCompact, formatMoney } from '../../utils/format'

export function MonthlyBarChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} barGap={4}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" stroke="var(--ink-faint)" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="var(--ink-faint)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatCompact} />
        <Tooltip
          formatter={(value, name) => [formatMoney(value), name]}
          contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 12 }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="income" name="Ingresos" fill="#34D399" radius={[6, 6, 0, 0]} animationDuration={500} />
        <Bar dataKey="expenses" name="Gastos" fill="#F87171" radius={[6, 6, 0, 0]} animationDuration={500} />
        <Bar dataKey="savings" name="Ahorros" fill="#059669" radius={[6, 6, 0, 0]} animationDuration={500} />
      </BarChart>
    </ResponsiveContainer>
  )
}
