import { Menu, Waves, Sun, Moon, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '../context/ThemeContext'
import { useAuth } from '../context/AuthContext'

export default function TopBar({ onMenu }) {
  const { isDark, toggleTheme } = useTheme()
  const { isAdmin } = useAuth()

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-deep-900/80">
      <div className="mx-auto flex h-14 w-full max-w-2xl items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={onMenu}
            className="grid size-10 place-items-center rounded-xl text-slate-600 transition hover:bg-slate-100 hover:text-aqua-600 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-aqua-400"
            aria-label="Abrir menu"
          >
            <Menu className="size-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="grid size-8 place-items-center rounded-lg bg-aqua-500">
              <Waves className="size-4 text-white" />
            </div>
            <span className="text-base font-extrabold tracking-tight">PRISMA</span>
            {isAdmin && (
              <ShieldCheck className="size-4 text-amber-500" aria-label="SuperAdmin" />
            )}
          </div>
        </div>

        {/* Alternador Dark/Light com micro-interação */}
        <motion.button
          whileTap={{ scale: 0.88, rotate: 20 }}
          onClick={toggleTheme}
          className="relative grid size-10 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-white text-amber-500 transition hover:bg-amber-500/5 dark:border-white/10 dark:bg-white/5 dark:text-aqua-300"
          aria-label="Alternar tema"
        >
          {isDark ? <Moon className="size-5" /> : <Sun className="size-5" />}
        </motion.button>
      </div>
    </header>
  )
}
