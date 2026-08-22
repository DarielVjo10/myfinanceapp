import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatCompact, formatMoney } from '../../utils/format'

export function SavingsAreaChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="savingsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" stroke="var(--ink-faint)" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="var(--ink-faint)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatCompact} />
        <Tooltip
          formatter={(value) => [formatMoney(value), 'Ahorro acumulado']}
          contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 12 }}
        />
        <Area
          type="monotone"
          dataKey="cumulative"
          stroke="#10B981"
          strokeWidth={2.5}
          fill="url(#savingsGradient)"
          animationDuration={600}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
