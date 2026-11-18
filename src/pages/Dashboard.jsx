import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { SlidersHorizontal, Recycle } from 'lucide-react'
import { useProcess } from '../context/ProcessContext'
import { ETACard, formatMass } from '../components/Units'
import NetworkChart from '../components/NetworkChart'
import StatCard from '../components/StatCard'
import { AlarmBanner } from '../components/AlarmBanner'

function useClock() {
  const [now, setNow] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(t)
  }, [])
  return now
}

export default function Dashboard() {
  const proc = useProcess()
  const now = useClock()
  const { summary, alarms, session, etas } = proc
  const last = proc.history.at(-1) || { feed: 0, outlet: 0 }
  let prefs = {}
  try {
    prefs = JSON.parse(localStorage.getItem('prisma-prefs') || '{}')
  } catch {
    /* preferências ausentes → padrão */
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho da rede */}
      <div className="surface p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Rede PRISMA · 5 unidades de tratamento
            </p>
            <h1 className="mt-0.5 text-lg font-bold leading-tight tracking-tight">Painel de operação</h1>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold tabular-nums leading-tight">{now.toLocaleTimeString('pt-BR')}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-[11px] dark:border-white/5">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-leaf-500" />
            <b className="tabular-nums">{summary.run}</b> operando
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-amber-500" />
            <b className="tabular-nums">{summary.maint}</b> manut.
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className={`size-2 rounded-full ${
                summary.fault > 0 ? 'bg-rose-500 animate-pulse' : 'bg-slate-300 dark:bg-slate-600'
              }`}
            />
            <b className="tabular-nums">{summary.fault}</b> paradas
          </span>
          <span
            className={`ml-auto rounded-md px-2 py-0.5 font-bold ${
              summary.nonCompliant > 0
                ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                : 'bg-leaf-500/10 text-leaf-700 dark:text-leaf-400'
            }`}
          >
            {summary.nonCompliant > 0
              ? `${summary.nonCompliant} unidade(s) fora do limite`
              : 'Toda a água entregue dentro do limite ✓'}
          </span>
        </div>
      </div>

      {/* Alarmes recentes (o operador pode ocultar o banner em Configurações) */}
      {prefs.alarmBanner !== false &&
        alarms.slice(0, 2).map((a) => <AlarmBanner key={a.id} level={a.level} title={a.text} />)}

      {/* KPIs da rede */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatCard label="Vazão da rede" value={`${proc.flowTotal?.toFixed(1) ?? '0,0'} m³/h`} hint="captação" />
        <StatCard
          label="Afluente médio"
          value={`${last.feed.toFixed(3)} ppm`}
          hint={proc.peakActive ? 'EVENTO DE CARGA' : 'normal'}
          tone={last.feed > proc.limitPpm ? 'amber' : 'aqua'}
          delay={0.04}
        />
        <StatCard
          label="Saída média"
          value={`${last.outlet.toFixed(3)} ppm`}
          hint={summary.nonCompliant > 0 ? `${summary.nonCompliant} NÃO CONFORME` : 'CONFORME'}
          tone={summary.nonCompliant > 0 ? 'rose' : 'leaf'}
          delay={0.08}
        />
        <StatCard
          label="Economia de energia"
          value={`${proc.energySaved.toFixed(0)}%`}
          hint={proc.nfAny ? 'NF ATIVA' : 'NF EM BYPASS'}
          progress={proc.energySaved}
          tone={proc.nfAny ? 'amber' : 'leaf'}
          delay={0.12}
        />
      </div>

      {/* Gráfico principal */}
      <div className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200/80 px-3.5 py-2 dark:border-white/10">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Microplásticos na rede · últimos 10 minutos
          </p>
        </div>
        <div className="px-3 pb-3 pt-2">
          <NetworkChart history={proc.history} limitPpm={proc.limitPpm} />
        </div>
      </div>

      {/* As 5 ETAs */}
      <div>
        <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Unidades de tratamento · leitura individual
        </p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {etas.map((eta) => (
            <ETACard key={eta.id} eta={eta} />
          ))}
        </div>
      </div>

      {/* Reciclagem · destino do plástico capturado */}
      <div className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200/80 px-3.5 py-2 dark:border-white/10">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Reciclagem · cadeia do plástico capturado
          </p>
          <Recycle className="size-3.5 text-leaf-500" />
        </div>
        <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-white/5 [&>div]:px-3.5 [&>div]:py-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Capturado pela rede
            </p>
            <p className="text-lg font-bold tabular-nums text-aqua-600 dark:text-aqua-300">
              {formatMass(proc.massTotal ?? 0)}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">boiado e retirado no FAD</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Estoque (aguardando lote)
            </p>
            <p className="text-lg font-bold tabular-nums text-slate-800 dark:text-slate-100">
              {formatMass(proc.stockKg ?? 0)}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">lote fecha com 50 g</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Entregue às cooperativas
            </p>
            <p className="text-lg font-bold tabular-nums text-leaf-700 dark:text-leaf-400">
              {formatMass(proc.recycledKg ?? 0)}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {proc.lastBatch
                ? `último lote ${new Date(proc.lastBatch.at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                : 'nenhum lote ainda'}
            </p>
          </div>
        </div>
      </div>

      {/* Estatísticas gerais da rede (sessão) */}
      <div className="surface overflow-hidden">
        <div className="border-b border-slate-200/80 px-3.5 py-2 dark:border-white/10">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Estatísticas gerais · sessão
          </p>
        </div>
        <div className="grid grid-cols-2 divide-x divide-slate-100 sm:grid-cols-4 dark:divide-white/5 [&>div]:px-3.5 [&>div]:py-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Disponibilidade</p>
            <p className="text-lg font-bold tabular-nums text-leaf-700 dark:text-leaf-400">{summary.availability}%</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">{summary.total} unidades</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Energia economizada</p>
            <p className="text-lg font-bold tabular-nums text-leaf-700 dark:text-leaf-400">
              {session.savedKwh.toFixed(2)} kWh
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">{proc.energySaved.toFixed(0)}% agora</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Plástico recuperado</p>
            <p className="text-lg font-bold tabular-nums text-aqua-600 dark:text-aqua-300">
              {formatMass(proc.massTotal ?? 0)}
            </p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">acumulado na rede</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">Acionamentos NF</p>
            <p className="text-lg font-bold tabular-nums text-amber-600 dark:text-amber-400">{proc.nfEvents}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">eventos na sessão</p>
          </div>
        </div>
      </div>

      {/* Rodapé · link para o controle */}
      <Link
        to="/simulador"
        className="surface flex items-center justify-between p-3.5 transition hover:border-aqua-400/60"
      >
        <span className="text-xs text-slate-500 dark:text-slate-400">
          Controle de operação · manutenção das ETAs, alarmes e registros
        </span>
        <SlidersHorizontal className="size-4 shrink-0 text-slate-400" />
      </Link>
    </div>
  )
}
