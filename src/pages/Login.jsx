import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Waves, Mail, Lock, UserRound, Briefcase, Eye, EyeOff, Loader2, Droplets } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [form, setForm] = useState({ email: '', password: '', name: '', cargo: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      if (mode === 'login') {
        const err = await signIn(form.email.trim(), form.password)
        if (err) setError('E-mail ou senha incorretos.')
      } else {
        if (form.password.length < 6) {
          setError('A senha precisa ter ao menos 6 caracteres.')
          return
        }
        const err = await signUp(
          form.email.trim(),
          form.password,
          form.name.trim(),
          form.cargo.trim() || 'Operador'
        )
        if (err) setError(err.message)
        else setSent(true) // aguardando confirmação de e-mail (se habilitada)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDemo() {
    setError(null)
    setLoading(true)
    try {
      const err = await signIn('superadmin@gmail.com', 'admin123')
      if (err) setError('Conta demo indisponível. Execute npm run seed:demo no Supabase.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-b from-deep-900 via-deep-950 to-deep-900 px-4 text-slate-100">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center text-center">
          <motion.div
            whileHover={{ scale: 1.08, rotate: -4 }}
            className="grid size-16 place-items-center rounded-2xl bg-aqua-500"
          >
            <Waves className="size-8 text-white" />
          </motion.div>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight">PRISMA</h1>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Processo de Remoção Inteligente e
            <br />
            Sustentável de Microplásticos Aquáticos
          </p>
        </div>

        {/* Card do formulário */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-card backdrop-blur-xl">
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1">
            {[
              { id: 'login', label: 'Entrar' },
              { id: 'signup', label: 'Criar conta' },
            ].map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setMode(t.id)
                  setError(null)
                  setSent(false)
                }}
                className={`relative rounded-lg py-2 text-sm font-semibold transition ${
                  mode === t.id ? 'text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {mode === t.id && (
                  <motion.span
                    layoutId="login-tab"
                    className="absolute inset-0 rounded-lg bg-aqua-500"
                    transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  />
                )}
                <span className="relative">{t.label}</span>
              </button>
            ))}
          </div>

          {sent ? (
            <div className="flex flex-col items-center gap-3 py-6 text-center">
              <Droplets className="size-8 text-leaf-400" />
              <p className="text-sm font-semibold">Conta criada com sucesso!</p>
              <p className="text-xs text-slate-400">
                Se a confirmação de e-mail estiver ativa no Supabase, verifique sua caixa de
                entrada. Depois, faça login.
              </p>
              <button
                onClick={() => {
                  setMode('login')
                  setSent(false)
                }}
                className="mt-2 rounded-xl bg-aqua-500 px-5 py-2 text-sm font-bold text-white transition hover:bg-aqua-600"
              >
                Ir para login
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3.5">
              <AnimatePresence initial={false}>
                {mode === 'signup' && (
                  <motion.div
                    key="signup-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-3.5 overflow-hidden"
                  >
                    <Field icon={UserRound} placeholder="Nome completo" value={form.name} onChange={set('name')} required />
                    <Field icon={Briefcase} placeholder="Cargo (ex.: Operador)" value={form.cargo} onChange={set('cargo')} />
                  </motion.div>
                )}
              </AnimatePresence>

              <Field icon={Mail} type="email" placeholder="E-mail" value={form.email} onChange={set('email')} required />

              <div className="relative">
                <Field
                  icon={Lock}
                  type={showPass ? 'text' : 'password'}
                  placeholder="Senha (mín. 6 caracteres)"
                  value={form.password}
                  onChange={set('password')}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-aqua-300"
                  aria-label="Mostrar/ocultar senha"
                >
                  {showPass ? <EyeOff className="size-4.5" /> : <Eye className="size-4.5" />}
                </button>
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-400"
                >
                  {error}
                </motion.p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-aqua-500 py-3 text-sm font-bold text-white transition hover:bg-aqua-600 active:opacity-90 disabled:opacity-60"
              >
                {loading && <Loader2 className="size-4 animate-spin" />}
                {mode === 'login' ? 'Entrar' : 'Criar minha conta'}
              </button>

              <div className="mt-3 rounded-xl border border-aqua-400/20 bg-aqua-500/5 p-3">
                <p className="mb-2 text-center text-[11px] text-slate-400">
                  Conta de demonstração · SuperAdmin
                </p>
                <button
                  type="button"
                  onClick={handleDemo}
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-aqua-400/40 py-2.5 text-xs font-bold text-aqua-300 transition hover:bg-aqua-500/15 disabled:opacity-60"
                >
                  <Droplets className="size-4" /> Entrar com conta demo
                </button>
              </div>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-[11px] text-slate-500">
          MVP · Monitoramento SCADA/IoT · Supabase + React
        </p>
      </motion.div>
    </div>
  )
}

function Field({ icon: Icon, ...props }) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input
        {...props}
        className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 outline-none transition focus:border-aqua-400/60 focus:bg-white/10 focus:ring-2 focus:ring-aqua-500/30"
      />
    </div>
  )
}
