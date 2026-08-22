import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Banknote } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Field, Input, PasswordInput } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { translateAuthError, normalizeEmail } from '../../utils/authErrors'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
}
const item = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', bounce: 0, duration: 0.5 } },
}

export default function Login() {
  const { signInWithPassword, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signInWithPassword(normalizeEmail(email), password)
    setLoading(false)
    if (error) {
      setError(translateAuthError(error))
      return
    }
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-1/4 -left-24 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="absolute bottom-1/4 -right-24 w-72 h-72 rounded-full bg-emerald-500/10 blur-3xl" />

      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="w-full max-w-sm relative"
      >
        <motion.div variants={item} className="flex items-center gap-2 justify-center mb-8">
          <motion.div
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.5 }}
            className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center shadow-glow"
          >
            <Banknote size={20} className="text-emerald-950" />
          </motion.div>
          <span className="font-display font-semibold text-xl text-ink">MyBudget</span>
        </motion.div>

        <motion.div variants={item} className="bg-surface border border-border rounded-xl2 shadow-soft p-6">
          <h1 className="font-display font-semibold text-lg text-ink mb-1">Bienvenido de vuelta</h1>
          <p className="text-ink-muted text-sm mb-6">Entra para ver tu progreso financiero.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Correo">
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@correo.com"
                autoComplete="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                inputMode="email"
              />
            </Field>
            <Field label="Contraseña">
              <PasswordInput
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
              />
            </Field>

            {error && <p className="text-alert text-sm">{error}</p>}

            <Button type="submit" loading={loading} className="w-full">
              Entrar
            </Button>
          </form>

          <div className="flex items-center gap-3 my-5">
            <div className="h-px bg-border flex-1" />
            <span className="text-ink-faint text-xs">o</span>
            <div className="h-px bg-border flex-1" />
          </div>

          <Button variant="secondary" className="w-full" onClick={signInWithGoogle}>
            Continuar con Google
          </Button>

          <div className="flex items-center justify-between mt-5 text-sm">
            <Link to="/forgot-password" className="text-ink-muted hover:text-emerald-500 transition-colors">
              Olvidé mi contraseña
            </Link>
            <Link to="/signup" className="text-emerald-500 font-medium hover:underline">
              Crear cuenta
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
