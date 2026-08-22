import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { formatCompact, formatMoney } from '../../utils/format'

export function NetWorthLineChart({ data, dataKey = 'netWorth', tooltipLabel = 'Patrimonio Neto' }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="label" stroke="var(--ink-faint)" fontSize={12} tickLine={false} axisLine={false} />
        <YAxis stroke="var(--ink-faint)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={formatCompact} />
        <Tooltip
          formatter={(value) => [formatMoney(value), tooltipLabel]}
          contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 12 }}
        />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke="#10B981"
          strokeWidth={2.5}
          dot={{ r: 3, fill: '#10B981' }}
          activeDot={{ r: 5 }}
          animationDuration={600}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
