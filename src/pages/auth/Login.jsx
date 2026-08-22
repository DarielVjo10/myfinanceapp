import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sprout } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Field, Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

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
    const { error } = await signInWithPassword(email, password)
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center">
            <Sprout size={20} className="text-emerald-950" />
          </div>
          <span className="font-display font-semibold text-xl text-ink">Brote</span>
        </div>

        <div className="bg-surface border border-border rounded-xl2 shadow-soft p-6">
          <h1 className="font-display font-semibold text-lg text-ink mb-1">Bienvenido de vuelta</h1>
          <p className="text-ink-muted text-sm mb-6">Entra para ver tu progreso financiero.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Correo">
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
            </Field>
            <Field label="Contraseña">
              <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
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
        </div>
      </motion.div>
    </div>
  )
}
