import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import TopBar from './TopBar'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'

/**
 * AppLayout · casca do app (Mobile-First)
 * TopBar fixo + Sidebar retrátil + BottomNav fixo + conteúdo com transição.
 */
export default function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const location = useLocation()
  const prevPath = useRef(location.pathname)

  // Fecha a sidebar ao navegar (padrão mobile)
  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      setSidebarOpen(false)
      prevPath.current = location.pathname
    }
  }, [location.pathname])

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100 dark:from-deep-900 dark:via-deep-950 dark:to-deep-900">
      <TopBar onMenu={() => setSidebarOpen(true)} />

      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Overlay atrás da sidebar (mobile) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <main className="mx-auto w-full max-w-2xl px-4 pb-28 pt-4 lg:pt-6">{children}</main>

      <BottomNav />
    </div>
  )
}
