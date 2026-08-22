import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Banknote, CheckCircle2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import { useLanguage } from '../../contexts/LanguageContext'
import { Field, Input, PasswordInput } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'
import { translateAuthError, normalizeEmail } from '../../utils/authErrors'

const PASSWORD_MIN_LENGTH = 8
const hasLetterAndNumber = (pw) => /[a-zA-Z]/.test(pw) && /[0-9]/.test(pw)

export default function Signup() {
  const { signUp } = useAuth()
  const { t } = useLanguage()
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
      setError(t('auth.signup.weakPassword', { min: PASSWORD_MIN_LENGTH }))
      return
    }
    if (password !== confirmPassword) {
      setError(t('auth.signup.passwordMismatch'))
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
      setError(t('auth.signup.emailExists'))
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
          <h1 className="font-display font-semibold text-lg text-ink mb-1">{t('auth.signup.checkEmailTitle')}</h1>
          <p className="text-ink-muted text-sm mb-5">
            {t('auth.signup.checkEmailDescription', { email: sentTo })}
          </p>
          <Link to="/login">
            <Button className="w-full">{t('auth.signup.backToLogin')}</Button>
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
          <h1 className="font-display font-semibold text-lg text-ink mb-1">{t('auth.signup.title')}</h1>
          <p className="text-ink-muted text-sm mb-6">{t('auth.signup.subtitle')}</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Field label={t('auth.signup.fullName')}>
              <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Dariel Pérez" autoComplete="name" />
            </Field>
            <Field label={t('auth.login.email')}>
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
            <Field label={t('auth.login.password')} hint={t('auth.signup.passwordHint')}>
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
            <Field label={t('auth.signup.confirmPassword')}>
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
              {t('auth.signup.submit')}
            </Button>
          </form>

          <p className="text-center text-sm text-ink-muted mt-5">
            {t('auth.signup.alreadyHaveAccount')}{' '}
            <Link to="/login" className="text-emerald-500 font-medium hover:underline">
              {t('auth.signup.login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
