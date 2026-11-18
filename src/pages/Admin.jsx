import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ShieldCheck,
  UserPlus,
  Trash2,
  Loader2,
  X,
  Users,
  Mail,
  Lock,
  UserRound,
  Briefcase,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

/**
 * Admin · Gestão SuperAdmin
 * Lista usuários, cria novos e exclui — via BFF Node (server/index.js),
 * pois exige a service_role key (nunca exposta no navegador).
 */
export default function Admin() {
  const { API_URL, getAuthHeader, user } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    email: '',
    password: '',
    full_name: '',
    cargo: '',
    role: 'operador',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const headers = await getAuthHeader()
      const res = await fetch(`${API_URL}/api/admin/users`, { headers })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Falha ao carregar usuários')
      setUsers(json.users)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [API_URL, getAuthHeader])

  useEffect(() => {
    load()
  }, [load])

  async function handleCreate(e) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const headers = await getAuthHeader()
      const res = await fetch(`${API_URL}/api/admin/users`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Falha ao criar usuário')
      setModalOpen(false)
      setForm({ email: '', password: '', full_name: '', cargo: '', role: 'operador' })
      await load()
    } catch (e) {
      setError(e.message)
    } finally {
      setCreating(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Excluir este usuário definitivamente?')) return
    try {
      const headers = await getAuthHeader()
      const res = await fetch(`${API_URL}/api/admin/users/${id}`, {
        method: 'DELETE',
        headers,
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Falha ao excluir')
      setUsers((list) => list.filter((u) => u.id !== id))
    } catch (e) {
      setError(e.message)
    }
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="surface border-amber-400/30 p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-amber-500/15 text-amber-500">
              <ShieldCheck className="size-6" />
            </span>
            <div>
              <h1 className="text-lg font-extrabold leading-tight">Gestão SuperAdmin</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {users.length} usuário(s) cadastrado(s)
              </p>
            </div>
          </div>
          <motion.button
            whileTap={{ scale: 0.94 }}
            onClick={() => setModalOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-amber-600"
          >
            <UserPlus className="size-4" />
            Novo
          </motion.button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-500">
          {error}
        </p>
      )}

      {loading ? (
        <div className="surface grid place-items-center py-12">
          <Loader2 className="size-7 animate-spin text-aqua-400" />
        </div>
      ) : (
        <div className="space-y-2.5">
          {users.map((u, i) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.4) }}
              className="surface flex items-center gap-3 p-4"
            >
              {u.avatar_url ? (
                <img
                  src={u.avatar_url}
                  alt=""
                  className="size-11 shrink-0 rounded-xl object-cover ring-1 ring-aqua-400/40"
                />
              ) : (
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-aqua-500/10 text-aqua-500">
                  <UserRound className="size-5" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">
                  {u.full_name || '—'}
                  {u.id === user?.id && (
                    <span className="ml-1.5 text-[10px] font-bold text-aqua-500">(você)</span>
                  )}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                      u.role === 'superadmin'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : u.role === 'operador'
                          ? 'bg-aqua-500/12 text-aqua-700 dark:text-aqua-300'
                          : 'bg-slate-500/10 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {u.role}
                  </span>
                  {u.cargo && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500">{u.cargo}</span>
                  )}
                </div>
              </div>
              {u.id !== user?.id && (
                <button
                  onClick={() => handleDelete(u.id)}
                  className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-500"
                  aria-label="Excluir usuário"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Modal: criar usuário */}
      <AnimatePresence>
        {modalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm"
            onClick={() => !creating && setModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.94, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.94, y: 16 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-3xl border border-white/10 bg-white p-6 shadow-2xl dark:bg-deep-800"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-extrabold">
                  <UserPlus className="size-5 text-amber-500" />
                  Novo usuário
                </h2>
                <button
                  onClick={() => !creating && setModalOpen(false)}
                  className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 dark:hover:bg-white/10"
                  aria-label="Fechar"
                >
                  <X className="size-4" />
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-3">
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="E-mail"
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/25 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </div>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Senha (mín. 6 caracteres)"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-500/25 dark:border-white/10 dark:bg-white/5 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="relative">
                    <UserRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      placeholder="Nome"
                      value={form.full_name}
                      onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-amber-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                  </div>
                  <div className="relative">
                    <Briefcase className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <input
                      placeholder="Cargo"
                      value={form.cargo}
                      onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm outline-none transition focus:border-amber-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                    />
                  </div>
                </div>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-amber-400 dark:border-white/10 dark:bg-white/5 dark:text-white"
                >
                  <option value="operador">Operador</option>
                  <option value="visualizador">Visualizador</option>
                  <option value="superadmin">SuperAdmin</option>
                </select>

                <button
                  type="submit"
                  disabled={creating}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-white transition hover:bg-amber-600 disabled:opacity-60"
                >
                  {creating && <Loader2 className="size-4 animate-spin" />}
                  Criar usuário
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
