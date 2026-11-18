import { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { History as HistoryIcon, Droplets, Droplet, Recycle, Zap, Trash2, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import Loader from '../components/Loader'

export default function History() {
  const { user, isAdmin } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: err } = await supabase
      .from('readings')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (err) setError(err.message)
    else setItems(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function remove(id) {
    const { error: err } = await supabase.from('readings').delete().eq('id', id)
    if (!err) setItems((list) => list.filter((i) => i.id !== id))
  }

  if (loading) return <Loader label="Carregando histórico..." />

  return (
    <div className="space-y-4">
      <div className="surface p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-aqua-500/15 text-aqua-500">
              <HistoryIcon className="size-6" />
            </span>
            <div>
              <h1 className="text-lg font-extrabold leading-tight">Histórico</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Últimas 50 leituras do processo
              </p>
            </div>
          </div>
          <button
            onClick={load}
            className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-aqua-400 hover:text-aqua-600 dark:border-white/10 dark:text-slate-300 dark:hover:text-aqua-400"
          >
            Atualizar
          </button>
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-500">
          {error}
        </p>
      )}

      {items.length === 0 && !error && (
        <div className="surface flex flex-col items-center gap-2 p-10 text-center">
          <Droplets className="size-8 text-aqua-400" />
          <p className="text-sm font-semibold">Nenhuma leitura ainda</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            A planta registra automaticamente a cada 4 min · ou use Controle → Registrar
          </p>
        </div>
      )}

      <div className="space-y-2.5">
        {items.map((r, i) => {
          const contaminated = r.scenario === 'contaminated'
          return (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.04, 0.4) }}
              className={`surface flex items-center gap-3 p-4 ${
                contaminated ? 'border-amber-400/30' : 'border-leaf-500/20'
              }`}
            >
              <span
                className={`grid size-10 shrink-0 place-items-center rounded-xl ${
                  contaminated
                    ? 'bg-amber-500/15 text-amber-500'
                    : 'bg-leaf-500/12 text-leaf-600 dark:text-leaf-400'
                }`}
              >
                {contaminated ? <Droplet className="size-5" /> : <Droplets className="size-5" />}
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-bold">
                    {contaminated ? 'Filtragem pesada acionada · residual alto após a limpeza' : 'Operação normal · NF em bypass'}
                  </p>
                  {contaminated && (
                    <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                      Nano ON
                    </span>
                  )}
                </div>
                <p className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1">
                    <Droplets className="size-3 text-aqua-400" />
                    {Number(r.lif1_ppm).toFixed(3)} ppm
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Recycle className="size-3 text-leaf-500" />
                    {Number(r.mass_recovered_kg).toFixed(3)} kg
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Zap className="size-3 text-amber-400" />
                    {Number(r.energy_saved_pct).toFixed(0)}%
                  </span>
                </p>
                <p className="mt-0.5 text-[10px] text-slate-400 dark:text-slate-500">
                  {new Date(r.created_at).toLocaleString('pt-BR')}
                </p>
              </div>

              {isAdmin && (
                <button
                  onClick={() => remove(r.id)}
                  className="grid size-9 shrink-0 place-items-center rounded-xl text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-500"
                  aria-label="Excluir leitura"
                >
                  <Trash2 className="size-4" />
                </button>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
