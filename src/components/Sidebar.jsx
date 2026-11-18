import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Waves,
  LayoutDashboard,
  SlidersHorizontal,
  History,
  UserRound,
  ShieldCheck,
  BarChart3,
  Settings,
  LogOut,
  LogIn,
  Droplets,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const mainLinks = [
  { to: '/', label: 'Início', icon: LayoutDashboard },
  { to: '/simulador', label: 'Controle', icon: SlidersHorizontal },
  { to: '/historico', label: 'Histórico', icon: History },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart3 },
  { to: '/configuracoes', label: 'Configurações', icon: Settings },
  { to: '/perfil', label: 'Perfil', icon: UserRound },
]

export default function Sidebar({ open, onClose }) {
  const { user, profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    onClose()
    navigate('/login')
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'spring', stiffness: 380, damping: 34 }}
          className="fixed inset-y-0 left-0 z-50 flex w-[19rem] flex-col border-r border-white/10 bg-white/95 shadow-2xl backdrop-blur-xl dark:bg-deep-800/95"
        >
          {/* Cabeçalho */}
          <div className="flex items-center justify-between px-5 pt-5">
            <div className="flex items-center gap-2.5">
              <div className="grid size-10 place-items-center rounded-xl bg-aqua-500">
                <Waves className="size-5 text-white" />
              </div>
              <div>
                <p className="text-lg font-extrabold tracking-tight">PRISMA</p>
                <p className="text-[10px] font-medium uppercase tracking-widest text-aqua-600 dark:text-aqua-400">
                  Microplásticos · IoT
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="grid size-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
              aria-label="Fechar menu"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Usuário */}
          {user && (
            <div className="mx-4 mt-5 flex items-center gap-3 rounded-2xl bg-slate-100 p-3 dark:bg-white/5">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt="Foto de perfil"
                  className="size-10 rounded-full object-cover ring-2 ring-aqua-400/60"
                />
              ) : (
                <div className="grid size-10 place-items-center rounded-full bg-aqua-500/15 text-aqua-600 dark:text-aqua-300">
                  <UserRound className="size-5" />
                </div>
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {profile?.full_name || user.email}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {profile?.cargo || 'Operador'} · {profile?.role || '—'}
                </p>
              </div>
            </div>
          )}

          {/* Navegação principal */}
          <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
            <p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Navegação
            </p>
            {mainLinks.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                onClick={onClose}
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-aqua-500/10 hover:text-aqua-700 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:text-aqua-300"
              >
                <Icon className="size-[1.15rem] text-slate-400 transition group-hover:text-aqua-500 dark:group-hover:text-aqua-400" />
                {label}
              </Link>
            ))}

            <p className="px-3 pb-1 pt-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Avançado
            </p>

            {isAdmin && (
              <Link
                to="/admin"
                onClick={onClose}
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-amber-600 transition hover:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/10"
              >
                <ShieldCheck className="size-[1.15rem]" />
                Gestão SuperAdmin
              </Link>
            )}

            <div className="mx-3 my-3 border-t border-slate-200 dark:border-white/10" />

            {user ? (
              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-500/10 dark:text-rose-400"
              >
                <LogOut className="size-[1.15rem]" />
                Sair da conta
              </button>
            ) : (
              <Link
                to="/login"
                onClick={onClose}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-aqua-600 dark:text-aqua-400"
              >
                <LogIn className="size-[1.15rem]" />
                Entrar
              </Link>
            )}
          </nav>

          {/* Rodapé */}
          <div className="border-t border-slate-200 px-5 py-3 dark:border-white/10">
            <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500">
              <Droplets className="size-3.5 text-aqua-400" />
              <span>MVP PRISMA · v1.6 · Monitoramento sustentável</span>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
