import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CheckCircle2, Banknote } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { Field, Input } from '../../components/ui/Input'
import { Button } from '../../components/ui/Button'

export default function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) return setError(error.message)
    setDone(true)
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
          {done ? (
            <div className="text-center">
              <CheckCircle2 size={32} className="text-emerald-500 mx-auto mb-3" />
              <h1 className="font-display font-semibold text-lg text-ink mb-1">Contraseña actualizada</h1>
              <p className="text-ink-muted text-sm mb-5">Ya puedes entrar con tu nueva contraseña.</p>
              <Button className="w-full" onClick={() => navigate('/login')}>Ir a entrar</Button>
            </div>
          ) : (
            <>
              <h1 className="font-display font-semibold text-lg text-ink mb-1">Nueva contraseña</h1>
              <p className="text-ink-muted text-sm mb-6">Elige una contraseña nueva para tu cuenta.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <Field label="Contraseña nueva" hint="Mínimo 8 caracteres">
                  <Input
                    type="password"
                    required
                    minLength={8}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="new-password"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                </Field>
                {error && <p className="text-alert text-sm">{error}</p>}
                <Button type="submit" loading={loading} className="w-full">
                  Guardar contraseña
                </Button>
              </form>
              <Link to="/login" className="block text-center text-sm text-emerald-500 mt-5 hover:underline">
                Volver a entrar
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
