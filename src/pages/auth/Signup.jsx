import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Banknote, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { Field, Input, PasswordInput } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { translateAuthError, normalizeEmail } from '../../utils/authErrors'

const PASSWORD_MIN_LENGTH = 8
const hasLetterAndNumber = (pw) => /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw)

export default function Signup() {
  const { signUp } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [sentTo, setSentTo] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < PASSWORD_MIN_LENGTH || !hasLetterAndNumber(password)) {
      setError(`La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres, con letras y números.`)
      return
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setLoading(true)
    const cleanEmail = normalizeEmail(email)
    const { data, error } = await signUp(cleanEmail, password, fullName.trim())
    setLoading(false)
    if (error) {
      setError(translateAuthError(error))
      return
    }
    // Supabase no devuelve un error explícito de "correo ya registrado"
    // (previene enumeración de usuarios): para un correo ya existente,
    // `identities` viene vacío en vez de tener al menos una identidad — así
    // se detecta el duplicado sin necesitar un endpoint admin.
    if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      setError('Ya existe una cuenta con este correo. Inicia sesión, o si te registraste con Google, usa "Continuar con Google" desde el login.')
      return
    }
    setSentTo(cleanEmail)
    setDone(true)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center p-4">
        <div className="bg-surface border border-border rounded-xl2 shadow-soft p-6 max-w-sm w-full text-center">
          <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-3" />
          <h1 className="font-display font-semibold text-lg text-ink mb-1">Revisa tu correo</h1>
          <p className="text-ink-muted text-sm mb-5">
            Te enviamos un enlace de confirmación a {sentTo}. Al confirmar, crearemos automáticamente
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
              <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dariel Pérez" autoComplete="name" />
            </Field>
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
            <Field label="Contraseña" hint="Mínimo 8 caracteres, con letras y números">
              <PasswordInput
                required
                minLength={PASSWORD_MIN_LENGTH}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
              />
            </Field>
            <Field label="Confirmar contraseña">
              <PasswordInput
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
              />
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
