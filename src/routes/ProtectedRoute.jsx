import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { PeriodProvider } from '../contexts/PeriodContext'

export function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas text-ink-faint text-sm">
        Cargando…
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />

  return (
    <PeriodProvider>
      <Outlet />
    </PeriodProvider>
  )
}
