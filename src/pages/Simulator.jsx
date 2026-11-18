import { NotebookPen, Activity } from 'lucide-react'
import { useProcess } from '../context/ProcessContext'
import { ETACard, formatMass } from '../components/Units'
import NetworkChart from '../components/NetworkChart'
import StatCard from '../components/StatCard'
import { AlarmBanner } from '../components/AlarmBanner'

/**
 * Controle de Operação · ações do operador sobre a rede de 5 ETAs:
 *  - Ordens de manutenção por ETA (enviar para manutenção / restaurar);
 *  - Histórico de alarmes da operação;
 *  - Registro manual de leitura (a rede também registra sozinha).
 */
export default function Simulator() {
  const proc = useProcess()
  const { etas, alarms } = proc

  return (
    <div className="space-y-4">
      <div className="surface p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-aqua-500/10 text-aqua-600 dark:text-aqua-400">
            <Activity className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold leading-tight tracking-tight">Controle de operação</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Ordens de manutenção, alarmes e registros das 5 unidades
            </p>
          </div>
        </div>
      </div>

      {/* Como a rede decide (cadeia simples) */}
      <div className="surface overflow-hidden">
        <div className="border-b border-slate-200/80 px-3.5 py-2 dark:border-white/10">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Como a rede decide · automático
          </p>
        </div>
        <div className="space-y-2 px-4 py-3 text-[11px] leading-relaxed text-slate-600 dark:text-slate-400">
          <p>
            <b>1 · Sensor de entrada:</b> um sensor a laser vigia a água que chega a cada ETA.
            Sem plástico (≤ 0,05 ppm) a água passa <b>direto</b>, sem gastar energia de
            tratamento. Plástico detectado → a água é <b>desviada</b> para a separação
            (aglutinante + microbolhas fazem o plástico boiar) e o material vai para
            <b> cooperativas de reciclagem</b>.
          </p>
          <p>
            <b>2 · Falha-segura na saída:</b> um segundo sensor vigia a água pós-limpeza. Se ela
            estiver <b>100% segura</b>, o filtro pesado (nanofiltração) permanece{' '}
            <b>em bypass — desligado</b>. Só liga automaticamente se passar alguma partícula
            minúscula (residual &gt; 0,15 ppm = 3× o limite), e volta ao bypass quando o
            residual cai (&lt; 0,08 ppm).
          </p>
          <p>
            <b>3 · O diferencial:</b> ao não deixar a filtragem de alta pressão ligada o dia
            todo sem necessidade, a rede garante água segura e projeta{' '}
            <b className="text-leaf-700 dark:text-leaf-400">economia de mais de 70%</b> na
            energia das estações.
          </p>
        </div>
      </div>

      {/* Último alarme */}
      {alarms.length > 0 && <AlarmBanner level={alarms[0].level} title={alarms[0].text} />}

      {/* Ações */}
      <div className="surface flex items-center justify-between gap-3 p-3.5">
        <div>
          <p className="text-[13px] font-bold">Registrar leitura no histórico</p>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
            Snapshot agregado da rede · registros automáticos a cada 4 min
          </p>
        </div>
        <button
          onClick={() => proc.registerReading()}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-aqua-500 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-aqua-600 active:opacity-80"
        >
          <NotebookPen className="size-4" />
          Registrar
        </button>
      </div>

      {/* Gráfico da rede */}
      <div className="surface overflow-hidden">
        <div className="border-b border-slate-200/80 px-3.5 py-2 dark:border-white/10">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Microplásticos na rede · últimos 10 minutos
          </p>
        </div>
        <div className="px-3 pb-3 pt-2">
          <NetworkChart history={proc.history} limitPpm={proc.limitPpm} />
        </div>
      </div>

      {/* KPIs ao vivo */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatCard
          label="Afluente médio"
          value={`${(proc.history.at(-1)?.feed ?? 0).toFixed(3)} ppm`}
          tone={(proc.history.at(-1)?.feed ?? 0) > 0.05 ? 'amber' : 'aqua'}
        />
        <StatCard label="Recuperado" value={formatMass(proc.massTotal ?? 0)} tone="leaf" delay={0.04} />
        <StatCard
          label="Saída média"
          value={`${(proc.history.at(-1)?.outlet ?? 0).toFixed(3)} ppm`}
          tone={proc.summary?.nonCompliant > 0 ? 'rose' : 'leaf'}
          delay={0.08}
        />
        <StatCard
          label="Economia"
          value={`${proc.energySaved.toFixed(0)}%`}
          progress={proc.energySaved}
          tone={proc.nfAny ? 'amber' : 'leaf'}
          delay={0.12}
        />
      </div>

      {/* As 5 ETAs com ordens de manutenção */}
      <div className="space-y-2.5">
        <p className="px-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          Ordens de manutenção · botão no rodapé de cada unidade
        </p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {etas.map((eta) => (
            <ETACard key={eta.id} eta={eta} onCommand={proc.commandUnit} />
          ))}
        </div>
      </div>

      {/* Histórico de alarmes */}
      <div className="surface overflow-hidden">
        <div className="border-b border-slate-200/80 px-3.5 py-2 dark:border-white/10">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Histórico de alarmes · mais recentes
          </p>
        </div>
        {alarms.length === 0 ? (
          <p className="px-4 py-4 text-center text-[11px] text-slate-400 dark:text-slate-500">
            Nenhum alarme ainda · a rede está estável
          </p>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-white/5">
            {alarms.slice(0, 8).map((a) => (
              <div key={a.id} className="flex items-center gap-3 px-4 py-2.5">
                <span
                  className={`size-2 shrink-0 rounded-full ${
                    a.level === 'crit' ? 'bg-rose-500' : a.level === 'warn' ? 'bg-amber-500' : 'bg-slate-400'
                  }`}
                />
                <p className="min-w-0 flex-1 truncate text-[11px]">{a.text}</p>
                <span className="shrink-0 text-[10px] tabular-nums text-slate-400 dark:text-slate-500">
                  {new Date(a.at).toLocaleTimeString('pt-BR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
