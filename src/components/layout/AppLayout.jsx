import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { Topbar } from './Topbar'
import { usePeriod } from '../../contexts/PeriodContext'
import { OnboardingTour, ONBOARDING_STORAGE_KEY } from '../onboarding/OnboardingTour'

export function AppLayout() {
  const { loading } = usePeriod()
  const [tourOpen, setTourOpen] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem(ONBOARDING_STORAGE_KEY)) setTourOpen(true)
    const replay = () => setTourOpen(true)
    window.addEventListener('replay-onboarding', replay)
    return () => window.removeEventListener('replay-onboarding', replay)
  }, [])

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar />
      <div className="flex-1 min-w-0">
        <Topbar />
        <main className="px-4 md:px-8 py-6 pb-24 md:pb-10 max-w-6xl mx-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-ink-faint text-sm">
              Cargando tu mes…
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
      <MobileNav />
      <OnboardingTour open={tourOpen} onClose={() => setTourOpen(false)} />
    </div>
  )
}
