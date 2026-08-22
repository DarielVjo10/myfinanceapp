import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  LayoutDashboard, TrendingUp, TrendingDown, Repeat, PiggyBank,
  Coins, Landmark, CreditCard, LineChart, Settings, X,
} from 'lucide-react'
import { Button } from '../ui/Button'

export const ONBOARDING_STORAGE_KEY = 'onboarding_tour_seen_v1'

const STEPS = [
  {
    icon: LayoutDashboard,
    title: 'Bienvenido a MyBudget',
    description: 'El Panel es tu resumen del mes: patrimonio neto, ingresos, gastos, ahorro y alertas — todo lo importante de un vistazo. Cada tarjeta tiene un ícono (ⓘ) que explica exactamente cómo se calcula.',
  },
  {
    icon: TrendingUp,
    title: 'Ingresos y Gastos',
    description: 'Registra tus ingresos y gastos del mes en sus propias páginas. Cada gasto se puede clasificar por categoría, con presupuesto y fecha límite opcional.',
  },
  {
    icon: Repeat,
    title: 'Gastos Recurrentes',
    description: 'Suscripciones, alquiler, u otros pagos fijos: configúralos una vez con su día del mes, y se registran solos cada mes — sin que tengas que confirmarlos.',
  },
  {
    icon: PiggyBank,
    title: 'Ahorros e Inversiones',
    description: 'Crea metas de ahorro con proyección de cuándo las vas a completar, y lleva el control de tus inversiones con su rendimiento real.',
  },
  {
    icon: Landmark,
    title: 'Cuentas y Tarjetas',
    description: 'Registra tus cuentas bancarias (con interés si aplica) y tus tarjetas de crédito por separado — cada una con su propio historial y balance.',
  },
  {
    icon: LineChart,
    title: 'Historial y Analítica',
    description: 'Compara meses, mira tendencias por categoría, y revisa tu progreso de largo plazo con gráficos que puedes agrupar por día, mes o año.',
  },
  {
    icon: Settings,
    title: 'Ajustes',
    description: 'Cambia tu idioma, configura tu objetivo de distribución 50/30/20, tu sueldo (con cálculo automático de ley dominicana), y más — todo en un solo lugar.',
  },
]

export function OnboardingTour({ open, onClose }) {
  const [step, setStep] = useState(0)
  const isLast = step === STEPS.length - 1
  const current = STEPS[step]

  const finish = () => {
    localStorage.setItem(ONBOARDING_STORAGE_KEY, 'true')
    setStep(0)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={finish} />
          <motion.div
            key={step}
            initial={{ opacity: 0, scale: 0.96, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            className="relative bg-surface border border-border rounded-xl2 shadow-soft w-full max-w-sm p-6"
          >
            <button onClick={finish} className="absolute top-4 right-4 text-ink-faint hover:text-ink transition-colors" aria-label="Omitir tutorial">
              <X size={18} />
            </button>

            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
              <current.icon size={22} className="text-emerald-500" />
            </div>
            <h2 className="font-display font-semibold text-lg text-ink mb-2">{current.title}</h2>
            <p className="text-ink-muted text-sm mb-6">{current.description}</p>

            <div className="flex items-center justify-center gap-1.5 mb-5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === step ? 'w-5 bg-emerald-500' : 'w-1.5 bg-border'}`}
                />
              ))}
            </div>

            <div className="flex items-center justify-between gap-3">
              <button onClick={finish} className="text-sm text-ink-faint hover:text-ink transition-colors">
                Omitir
              </button>
              <div className="flex items-center gap-2">
                {step > 0 && (
                  <Button variant="secondary" onClick={() => setStep((s) => s - 1)}>Atrás</Button>
                )}
                <Button onClick={() => (isLast ? finish() : setStep((s) => s + 1))}>
                  {isLast ? 'Entendido' : 'Siguiente'}
                </Button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
