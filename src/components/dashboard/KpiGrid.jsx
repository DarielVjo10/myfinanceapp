import { motion } from 'framer-motion'
import { Card } from '../ui/Card'
import { formatMoney, formatPercent } from '../../utils/format'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
}

export function KpiGrid({ kpis }) {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="grid grid-cols-2 md:grid-cols-3 gap-3"
    >
      {kpis.map((kpi) => (
        <motion.div key={kpi.label} variants={item}>
          <Card className="p-4">
            <p className="text-ink-faint text-xs mb-1.5">{kpi.label}</p>
            <p className="tabular font-display font-semibold text-lg text-ink">
              {kpi.isPercent ? formatPercent(kpi.value) : formatMoney(kpi.value)}
            </p>
          </Card>
        </motion.div>
      ))}
    </motion.div>
  )
}
