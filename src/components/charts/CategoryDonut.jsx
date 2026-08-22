import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { formatMoney } from '../../utils/format'
import { EmptyState } from '../ui/Feedback'
import { PieChart as PieIcon } from 'lucide-react'

const PALETTE = ['#10B981', '#34D399', '#6EE7B7', '#059669', '#047857', '#A7F3D0', '#065F46']

export function CategoryDonut({ data }) {
  if (!data?.length) {
    return <EmptyState icon={PieIcon} title="Sin gastos aún" description="Registra tu primer gasto para ver el desglose por categoría." />
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="name"
          innerRadius={70}
          outerRadius={100}
          paddingAngle={3}
          animationDuration={600}
        >
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={entry.color || PALETTE[i % PALETTE.length]} stroke="none" />
          ))}
        </Pie>
        <Tooltip
          formatter={(value, name) => [formatMoney(value), name]}
          contentStyle={{ background: 'var(--surface-raised)', border: '1px solid var(--border)', borderRadius: 12 }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
