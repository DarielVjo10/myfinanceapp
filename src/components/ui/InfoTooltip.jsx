import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Info } from 'lucide-react'

export function InfoTooltip({ text, className = 'text-ink-faint hover:text-ink' }) {
  const [open, setOpen] = useState(false)

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onBlur={() => setOpen(false)}
        aria-label="Más información"
        className={`transition-colors ${className}`}
      >
        <Info size={13} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.15 }}
            className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 text-left text-xs font-normal leading-snug text-white bg-ink dark:bg-surface-raised dark:border dark:border-border px-3 py-2 rounded-lg shadow-soft pointer-events-none"
          >
            {text}
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  )
}
