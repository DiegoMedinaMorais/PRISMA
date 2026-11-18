import { useCallback, useEffect, useMemo, useState } from 'react'
import { BarChart3, Download, RefreshCw, Droplets } from 'lucide-react'
import { supabase } from '../lib/supabaseClient'
import Loader from '../components/Loader'
import StatCard from '../components/StatCard'

/**
 * Relatórios · consolida as leituras da tabela `readings` por período:
 *  - KPIs do período (afluente, saída, plástico recuperado, economia, NF ativa);
 *  - Tabela com a média por dia;
 *  - Exportação CSV (abre no Excel pt-BR).
 */

const PERIODS = [
  { key: '24h', label: '24 horas', days: 1 },
  { key: '7d', label: '7 dias', days: 7 },
  { key: '30d', label: '30 dias', days: 30 },
  { key: 'all', label: 'Tudo', days: null },
]

const avg = (list, f) => list.reduce((s, r) => s + Number(r[f] || 0), 0) / list.length
const sum = (list, f) => list.reduce((s, r) => s + Number(r[f] || 0), 0)

export default function Reports() {
  const [period, setPeriod] = useState('7d')
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async (key) => {
    setLoading(true)
    setError(null)
    const p = PERIODS.find((x) => x.key === key)
    let query = supabase.from('readings').select('*').order('created_at', { ascending: false })
    if (p.days) {
      const since = new Date(Date.now() - p.days * 86_400_000).toISOString()
      query = query.gte('created_at', since)
    }
    const { data, error: err } = await query
    if (err) setError(err.message)
    else setRows(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load(period)
  }, [period, load])

  /** Média por dia, mais antigo → mais recente. */
  const days = useMemo(() => {
    const byDay = new Map()
    for (const r of rows) {
      const day = new Date(r.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      })
      if (!byDay.has(day)) byDay.set(day, [])
      byDay.get(day).push(r)
    }
    return [...byDay.entries()]
      .map(([day, list]) => ({
        day,
        count: list.length,
        feed: avg(list, 'lif1_ppm'),
        outlet: avg(list, 'lif2_ppm'),
        mass: sum(list, 'mass_recovered_kg'),
        saved: avg(list, 'energy_saved_pct'),
        nf: list.filter((r) => r.nanofiltration_active).length,
      }))
      .reverse()
  }, [rows])

  const kpis = useMemo(() => {
    if (rows.length === 0) return null
    return {
      count: rows.length,
      feed: avg(rows, 'lif1_ppm'),
      feedMax: Math.max(...rows.map((r) => Number(r.lif1_ppm || 0))),
      outlet: avg(rows, 'lif2_ppm'),
      mass: sum(rows, 'mass_recovered_kg'),
      saved: avg(rows, 'energy_saved_pct'),
      nfPct: (rows.filter((r) => r.nanofiltration_active).length / rows.length) * 100,
    }
  }, [rows])

  /** CSV com BOM e ";" → abre direto no Excel em pt-BR. */
  function exportCsv() {
    const head = [
      'data_hora', 'cenario', 'afluente_ppm', 'saida_ppm',
      'plastico_recuperado_kg', 'economia_energia_pct', 'nanofiltracao_ativa',
    ]
    const lines = rows
      .slice()
      .reverse()
      .map((r) =>
        [
          new Date(r.created_at).toLocaleString('pt-BR'),
          r.scenario === 'contaminated' ? 'NF acionada' : 'normal',
          Number(r.lif1_ppm).toFixed(3),
          Number(r.lif2_ppm).toFixed(3),
          Number(r.mass_recovered_kg).toFixed(3),
          Number(r.energy_saved_pct).toFixed(1),
          r.nanofiltration_active ? 'sim' : 'nao',
        ].join(';')
      )
    const csv = '\uFEFF' + [head.join(';'), ...lines].join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `prisma-relatorio-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho + período + exportar */}
      <div className="surface p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-lg bg-aqua-500/10 text-aqua-600 dark:text-aqua-400">
              <BarChart3 className="size-5" />
            </span>
            <div>
              <h1 className="text-lg font-bold leading-tight tracking-tight">Relatórios</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Consolidação das leituras da rede · exportável
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => load(period)}
              className="grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:text-aqua-600 dark:border-white/10 dark:text-slate-400 dark:hover:text-aqua-400"
              aria-label="Atualizar"
            >
              <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={exportCsv}
              disabled={rows.length === 0}
              className="flex items-center gap-1.5 rounded-lg bg-aqua-500 px-3 py-2.5 text-xs font-bold text-white transition hover:bg-aqua-600 active:opacity-80 disabled:opacity-40"
            >
              <Download className="size-4" />
              CSV
            </button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-slate-100 pt-3 dark:border-white/5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition ${
                period === p.key
                  ? 'bg-aqua-500 text-white'
                  : 'bg-slate-100 text-slate-500 hover:text-aqua-600 dark:bg-white/5 dark:text-slate-400 dark:hover:text-aqua-400'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-xs font-medium text-rose-500">{error}</p>
      )}

      {loading && rows.length === 0 ? (
        <Loader label="Consolidando leituras..." />
      ) : rows.length === 0 ? (
        <div className="surface flex flex-col items-center gap-2 p-10 text-center">
          <Droplets className="size-8 text-aqua-400" />
          <p className="text-sm font-semibold">Nenhuma leitura neste período</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            A rede registra sozinha a cada 4 min · também dá para registrar no Controle
          </p>
        </div>
      ) : (
        <>
          {/* KPIs do período */}
          {kpis && (
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <StatCard label="Leituras" value={String(kpis.count)} hint={PERIODS.find((p) => p.key === period).label} tone="slate" />
              <StatCard
                label="Afluente médio"
                value={`${kpis.feed.toFixed(3)} ppm`}
                hint={`máx ${kpis.feedMax.toFixed(2)}`}
                tone={kpis.feed > 0.05 ? 'amber' : 'aqua'}
                delay={0.04}
              />
              <StatCard
                label="Saída média"
                value={`${kpis.outlet.toFixed(3)} ppm`}
                hint={kpis.outlet <= 0.05 ? 'CONFORME' : 'ATENÇÃO'}
                tone={kpis.outlet <= 0.05 ? 'leaf' : 'rose'}
                delay={0.08}
              />
              <StatCard
                label="Economia média"
                value={`${kpis.saved.toFixed(0)}%`}
                hint={`NF ativa ${kpis.nfPct.toFixed(0)}% do tempo`}
                progress={kpis.saved}
                tone={kpis.nfPct > 0 ? 'amber' : 'leaf'}
                delay={0.12}
              />
            </div>
          )}

          {/* Plástico recuperado no período */}
          {kpis && (
            <div className="surface flex items-center justify-between p-4">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                  Plástico recuperado · enviado para reciclagem
                </p>
                <p className="mt-0.5 text-2xl font-bold tabular-nums text-aqua-600 dark:text-aqua-300">
                  {kpis.mass >= 0.1 ? `${kpis.mass.toFixed(3)} kg` : `${(kpis.mass * 1000).toFixed(0)} g`}
                </p>
              </div>
              <p className="max-w-[16rem] text-right text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                Massa separada pelo FAD nas 5 ETAs e entregue às cooperativas
              </p>
            </div>
          )}

          {/* Média por dia */}
          <div className="surface overflow-hidden">
            <div className="border-b border-slate-200/80 px-3.5 py-2 dark:border-white/10">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                Resumo por dia · médias do período
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] text-left text-[11px]">
                <thead>
                  <tr className="border-b border-slate-100 text-[9px] font-extrabold uppercase tracking-wider text-slate-400 dark:border-white/5 dark:text-slate-500">
                    <th className="px-3.5 py-2">Dia</th>
                    <th className="px-2 py-2 text-right">Leituras</th>
                    <th className="px-2 py-2 text-right">Afluente</th>
                    <th className="px-2 py-2 text-right">Saída</th>
                    <th className="px-2 py-2 text-right">Recuperado</th>
                    <th className="px-2 py-2 text-right">Economia</th>
                    <th className="px-3.5 py-2 text-right">NF ativa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums dark:divide-white/5">
                  {days.map((d) => (
                    <tr key={d.day} className="transition hover:bg-aqua-500/5">
                      <td className="px-3.5 py-2 font-bold">{d.day}</td>
                      <td className="px-2 py-2 text-right text-slate-500 dark:text-slate-400">{d.count}</td>
                      <td className="px-2 py-2 text-right text-aqua-600 dark:text-aqua-300">{d.feed.toFixed(3)} ppm</td>
                      <td
                        className={`px-2 py-2 text-right font-bold ${
                          d.outlet <= 0.05 ? 'text-leaf-700 dark:text-leaf-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {d.outlet.toFixed(3)} ppm
                      </td>
                      <td className="px-2 py-2 text-right text-slate-500 dark:text-slate-400">
                        {d.mass >= 0.1 ? `${d.mass.toFixed(2)} kg` : `${(d.mass * 1000).toFixed(0)} g`}
                      </td>
                      <td className="px-2 py-2 text-right text-leaf-700 dark:text-leaf-400">{d.saved.toFixed(0)}%</td>
                      <td className="px-3.5 py-2 text-right text-slate-500 dark:text-slate-400">
                        {d.nf > 0 ? `${d.nf} leitura(s)` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
