import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  const redirectBase = `${window.location.origin}${import.meta.env.BASE_URL}`

  const signInWithPassword = (email, password) =>
    supabase.auth.signInWithPassword({ email, password })

  // sin emailRedirectTo explícito, Supabase usa la "Site URL" del
  // Dashboard como destino del link de confirmación — si esa Site URL
  // no coincide exactamente con /myfinanceapp/ (GitHub Pages sirve la
  // app en un subpath, no en la raíz del dominio), el link cae en 404.
  // Mismo patrón que signInWithGoogle/resetPassword: se construye el
  // destino en el cliente para que siempre apunte a donde el usuario
  // realmente está usando la app (prod o localhost).
  const signUp = (email, password, fullName) =>
    supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName }, emailRedirectTo: redirectBase },
    })

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: redirectBase },
    })

  const resetPassword = (email) =>
    supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${redirectBase}reset-password`,
    })

  const signOut = () => supabase.auth.signOut()

  const value = {
    session,
    user: session?.user ?? null,
    loading,
    signInWithPassword,
    signUp,
    signInWithGoogle,
    resetPassword,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
