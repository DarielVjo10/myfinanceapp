import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Field, Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { translateAuthError, normalizeEmail } from '../../utils/authErrors'

export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await resetPassword(normalizeEmail(email))
    setLoading(false)
    if (error) return setError(translateAuthError(error))
    setSent(true)
  }

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
      <div className="bg-surface border border-border rounded-xl2 shadow-soft p-6 max-w-sm w-full">
        {sent ? (
          <div className="text-center">
            <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-3" />
            <h1 className="font-display font-semibold text-lg text-ink mb-1">Enlace enviado</h1>
            <p className="text-ink-muted text-sm">Revisa tu correo para restablecer tu contraseña.</p>
          </div>
        ) : (
          <>
            <h1 className="font-display font-semibold text-lg text-ink mb-1">Recuperar contraseña</h1>
            <p className="text-ink-muted text-sm mb-6">Te enviaremos un enlace a tu correo.</p>
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
              {error && <p className="text-alert text-sm">{error}</p>}
              <Button type="submit" loading={loading} className="w-full">
                Enviar enlace
              </Button>
            </form>
          </>
        )}
        <Link to="/login" className="block text-center text-sm text-emerald-500 mt-5 hover:underline">
          Volver a entrar
        </Link>
      </div>
    </div>
  )
}
