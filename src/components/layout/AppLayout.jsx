import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { MobileNav } from './MobileNav'
import { Topbar } from './Topbar'
import { usePeriod } from '../../contexts/PeriodContext'

export function AppLayout() {
  const { loading } = usePeriod()

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
    </div>
  )
}
