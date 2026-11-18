import { NavLink } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutDashboard, SlidersHorizontal, History, BarChart3, UserRound } from 'lucide-react'

const items = [
  { to: '/', label: 'Início', icon: LayoutDashboard },
  { to: '/simulador', label: 'Controle', icon: SlidersHorizontal },
  { to: '/historico', label: 'Histórico', icon: History },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/perfil', label: 'Perfil', icon: UserRound },
]

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-2xl px-4 pb-3">
        <div className="flex items-center justify-around rounded-2xl border border-white/10 bg-white/90 px-2 py-2 shadow-card backdrop-blur-xl dark:bg-deep-800/90">
          {items.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className="relative flex min-w-[4.25rem] flex-col items-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-semibold text-slate-500 transition dark:text-slate-400"
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="bottomnav-pill"
                      className="absolute inset-0 rounded-xl bg-aqua-500/12 ring-1 ring-aqua-400/30"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                    />
                  )}
                  <Icon
                    className={`relative size-5 transition-colors ${
                      isActive ? 'text-aqua-600 dark:text-aqua-400' : ''
                    }`}
                  />
                  <span className={`relative ${isActive ? 'text-aqua-700 dark:text-aqua-300' : ''}`}>
                    {label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  )
}
