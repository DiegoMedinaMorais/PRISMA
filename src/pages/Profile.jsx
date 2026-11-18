import { useRef, useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  UserRound,
  Briefcase,
  Camera,
  Loader2,
  Check,
  LogOut,
  ShieldCheck,
  Mail,
  Trash2,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Profile() {
  const { user, profile, updateProfile, uploadAvatar, signOut, isAdmin, API_URL, getAuthHeader } =
    useAuth()
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const [form, setForm] = useState({ full_name: '', cargo: '' })
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [msg, setMsg] = useState(null) // { type: 'ok' | 'err', text }

  useEffect(() => {
    if (profile) setForm({ full_name: profile.full_name || '', cargo: profile.cargo || '' })
  }, [profile])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true)
    setMsg(null)
    const err = await updateProfile(form.full_name.trim(), form.cargo.trim())
    setSaving(false)
    setMsg(err ? { type: 'err', text: err } : { type: 'ok', text: 'Perfil atualizado!' })
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setMsg({ type: 'err', text: 'Selecione um arquivo de imagem.' })
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setMsg({ type: 'err', text: 'Imagem muito grande (máx. 3 MB).' })
      return
    }
    setUploading(true)
    setMsg(null)
    const err = await uploadAvatar(file)
    setUploading(false)
    setMsg(err ? { type: 'err', text: err } : { type: 'ok', text: 'Foto atualizada!' })
    e.target.value = ''
  }

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="space-y-4">
      {/* Card do avatar */}
      <div className="surface relative overflow-hidden p-5">
        <div className="absolute -right-8 -top-8 size-32 rounded-full bg-aqua-500/10 blur-2xl" />
        <div className="flex items-center gap-4">
          <div className="relative">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Foto de perfil"
                className="size-20 rounded-2xl object-cover ring-2 ring-aqua-400/60"
              />
            ) : (
              <div className="grid size-20 place-items-center rounded-2xl bg-aqua-500/10 text-aqua-500 ring-2 ring-aqua-400/30">
                <UserRound className="size-10" />
              </div>
            )}
            <motion.button
              whileTap={{ scale: 0.85 }}
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 grid size-8 place-items-center rounded-xl bg-aqua-500 text-white transition hover:bg-aqua-600 disabled:opacity-60"
              aria-label="Trocar foto"
            >
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Camera className="size-4" />}
            </motion.button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
          </div>

          <div className="min-w-0">
            <h1 className="truncate text-lg font-extrabold leading-tight">
              {profile?.full_name || 'Usuário'}
            </h1>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">
              {profile?.cargo || '—'}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                  isAdmin
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'bg-aqua-500/12 text-aqua-700 dark:text-aqua-300'
                }`}
              >
                {profile?.role || 'operador'}
              </span>
              {isAdmin && <ShieldCheck className="size-3.5 text-amber-500" />}
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 dark:bg-white/5">
          <Mail className="size-3.5 shrink-0 text-slate-400" />
          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
        </div>
      </div>

      {/* Formulário de dados */}
      <form onSubmit={handleSave} className="surface space-y-3.5 p-5">
        <h2 className="text-sm font-bold">Editar dados</h2>

        <div className="relative">
          <UserRound className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={form.full_name}
            onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
            placeholder="Nome completo"
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-aqua-400 focus:ring-2 focus:ring-aqua-500/25 dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>

        <div className="relative">
          <Briefcase className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={form.cargo}
            onChange={(e) => setForm((f) => ({ ...f, cargo: e.target.value }))}
            placeholder="Cargo (ex.: Operador de planta)"
            className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm outline-none transition focus:border-aqua-400 focus:ring-2 focus:ring-aqua-500/25 dark:border-white/10 dark:bg-white/5 dark:text-white"
          />
        </div>

        {msg && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-xl px-3 py-2 text-xs font-medium ${
              msg.type === 'ok'
                ? 'bg-leaf-500/10 text-leaf-700 dark:text-leaf-400'
                : 'bg-rose-500/10 text-rose-500'
            }`}
          >
            {msg.type === 'ok' && <Check className="mr-1 inline size-3.5" />}
            {msg.text}
          </motion.p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-aqua-500 py-3 text-sm font-bold text-white transition hover:bg-aqua-600 active:opacity-90 disabled:opacity-60"
        >
          {saving && <Loader2 className="size-4 animate-spin" />}
          Salvar alterações
        </button>
      </form>

      {/* Área SuperAdmin (atalho) */}
      {isAdmin && (
        <button
          onClick={() => navigate('/admin')}
          className="surface flex w-full items-center gap-3 p-4 text-left transition hover:border-amber-400/50"
        >
          <span className="grid size-10 place-items-center rounded-xl bg-amber-500/15 text-amber-500">
            <ShieldCheck className="size-5" />
          </span>
          <div>
            <p className="text-sm font-bold">Gestão SuperAdmin</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Criar, editar e excluir usuários do sistema
            </p>
          </div>
        </button>
      )}

      {/* Sair */}
      <button
        onClick={handleSignOut}
        className="surface flex w-full items-center gap-3 p-4 text-left transition hover:border-rose-400/50"
      >
        <span className="grid size-10 place-items-center rounded-xl bg-rose-500/10 text-rose-500">
          <LogOut className="size-5" />
        </span>
        <p className="text-sm font-bold text-rose-600 dark:text-rose-400">Sair da conta</p>
      </button>

      <p className="pb-2 text-center text-[10px] text-slate-400 dark:text-slate-500">
        PRISMA MVP · foto armazenada no Supabase Storage (bucket avatars)
      </p>
    </div>
  )
}
