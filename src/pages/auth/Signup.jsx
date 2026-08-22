import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Banknote, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Field, Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

export default function Signup() {
  const { signUp } = useAuth()
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await signUp(email, password, fullName)
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="bg-surface border border-border rounded-xl2 shadow-soft p-6 max-w-sm w-full text-center">
          <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-3" />
          <h1 className="font-display font-semibold text-lg text-ink mb-1">Revisa tu correo</h1>
          <p className="text-ink-muted text-sm mb-5">
            Te enviamos un enlace de confirmación a {email}. Al confirmar, crearemos automáticamente
            tus cuentas y categorías por defecto.
          </p>
          <Link to="/login">
            <Button className="w-full">Volver a entrar</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-9 h-9 rounded-lg bg-emerald-500 flex items-center justify-center">
            <Banknote size={20} className="text-emerald-950" />
          </div>
          <span className="font-display font-semibold text-xl text-ink">MyBudget</span>
        </div>

        <div className="bg-surface border border-border rounded-xl2 shadow-soft p-6">
          <h1 className="font-display font-semibold text-lg text-ink mb-1">Crea tu cuenta</h1>
          <p className="text-ink-muted text-sm mb-6">Empieza a construir tu historial financiero.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label="Nombre completo">
              <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dariel Pérez" />
            </Field>
            <Field label="Correo">
              <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@correo.com" />
            </Field>
            <Field label="Contraseña" hint="Mínimo 8 caracteres">
              <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
            </Field>

            {error && <p className="text-alert text-sm">{error}</p>}

            <Button type="submit" loading={loading} className="w-full">
              Crear cuenta
            </Button>
          </form>

          <p className="text-center text-sm text-ink-muted mt-5">
            ¿Ya tienes cuenta?{' '}
            <Link to="/login" className="text-emerald-500 font-medium hover:underline">
              Entrar
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
