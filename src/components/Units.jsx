/**
 * Unidades · componentes de HMI da rede PRISMA
 * ------------------------------------------------------------------
 * ETACard — card completo de uma unidade de tratamento (ETA)
 * ComplianceBar — barra "saída × limite" (verde dentro / vermelho fora)
 */

import { Wrench, RotateCcw } from 'lucide-react'

export const LIMIT_PPM = 0.05

const STATUS = {
  run: { label: 'OPERANDO', dot: 'bg-leaf-500', text: 'text-leaf-700 dark:text-leaf-400' },
  standby: { label: 'STANDBY', dot: 'bg-slate-400', text: 'text-slate-500 dark:text-slate-400' },
  maint: { label: 'MANUT.', dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400' },
  fault: { label: 'PARADA', dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' },
}

export function StatusDot({ status }) {
  const s = STATUS[status] || STATUS.standby
  return (
    <span
      className={`inline-block size-2 shrink-0 rounded-full ${s.dot} ${status === 'run' ? 'animate-pulse' : ''}`}
    />
  )
}

export function statusLabel(status) {
  return (STATUS[status] || STATUS.standby).label
}

export function formatHours(h) {
  return h >= 1000 ? `${(h / 1000).toFixed(1)}k h` : `${h.toFixed(0)} h`
}

export function formatMass(kg) {
  return kg < 0.1 ? `${(kg * 1000).toFixed(0)} g` : `${kg.toFixed(3)} kg`
}

/** Barra horizontal: onde a saída da ETA está em relação ao limite (escala 2× limite). */
export function ComplianceBar({ eta }) {
  const scale = LIMIT_PPM * 2
  const pct = clampPct((eta.outlet ?? 0) / scale) * 100
  const ok = eta.compliant
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-[10px] tabular-nums text-slate-500 dark:text-slate-400">
        <span>saída: <b className={ok ? 'text-leaf-700 dark:text-leaf-400' : 'text-rose-600 dark:text-rose-400'}>
          {(eta.outlet ?? 0).toFixed(3)} ppm
        </b></span>
        <span>limite {LIMIT_PPM.toFixed(3)}</span>
      </div>
      <div className="relative mt-1 h-1.5 w-full rounded-full bg-slate-200 dark:bg-white/10">
        <div
          className={`absolute inset-y-0 left-0 rounded-full ${ok ? 'bg-leaf-500' : 'bg-rose-500'}`}
          style={{ width: `${pct}%` }}
        />
        {/* marcador do limite (metade da escala) */}
        <div className="absolute inset-y-[-2px] left-1/2 w-px bg-rose-400/70" />
      </div>
    </div>
  )
}

function clampPct(v) {
  return Math.min(1, Math.max(0.02, v))
}

export function ETACard({ eta, onCommand }) {
  const s = STATUS[eta.status] || STATUS.standby
  const operating = eta.status === 'run'

  return (
    <div className="surface overflow-hidden">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 px-3.5 py-2.5 dark:border-white/10">
        <div className="flex min-w-0 items-center gap-2">
          <StatusDot status={eta.status} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold leading-tight tracking-tight">
              {eta.id} <span className="font-medium text-slate-400 dark:text-slate-500">· {eta.name}</span>
            </p>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {eta.capacity.toFixed(1)} m³/h · nanofiltração instalada · {formatHours(eta.hours)}
            </p>
          </div>
        </div>
        <span className={`shrink-0 text-[10px] font-extrabold uppercase tracking-wider ${s.text}`}>
          {s.label}
        </span>
      </div>

      {operating ? (
        <div className="px-3.5 py-2.5">
          {/* Números principais */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Chega (afluente)
              </p>
              <p className="mt-0.5 text-base font-bold tabular-nums text-aqua-600 dark:text-aqua-300">
                {eta.influent.toFixed(3)}
                <span className="text-[9px] font-medium text-slate-400"> ppm</span>
              </p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Pós-limpeza
              </p>
              <p
                className={`mt-0.5 text-base font-bold tabular-nums ${
                  eta.residual > LIMIT_PPM ? 'text-amber-600 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'
                }`}
              >
                {eta.residual.toFixed(3)}
                <span className="text-[9px] font-medium text-slate-400"> ppm</span>
              </p>
            </div>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                Sai (entregue)
              </p>
              <p
                className={`mt-0.5 text-base font-bold tabular-nums ${
                  eta.compliant ? 'text-leaf-700 dark:text-leaf-400' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {eta.outlet.toFixed(3)}
                <span className="text-[9px] font-medium text-slate-400"> ppm</span>
              </p>
            </div>
          </div>

          <ComplianceBar eta={eta} />

          {/* Rodapé de operação */}
          <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-[10px] tabular-nums text-slate-500 dark:border-white/5 dark:text-slate-400">
            <span>
              {eta.flow.toFixed(1)} m³/h · carga {eta.load.toFixed(0)}% · {(eta.powerKw ?? 0).toFixed(2)} kW
            </span>
            <span className="flex shrink-0 items-center gap-1">
              {/* rota decidida pelo Sensor 1 */}
              <span
                className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                  eta.route === 'fad'
                    ? 'bg-aqua-500/10 text-aqua-600 dark:text-aqua-400'
                    : 'bg-slate-100 text-slate-400 dark:bg-white/5'
                }`}
              >
                {eta.route === 'fad' ? 'FAD · separação' : 'DIRETO · bypass'}
              </span>
              {/* estado da NF decidido pelo Sensor 2 (falha-segura) */}
              <span
                className={`rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider ${
                  eta.nfRun
                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    : 'bg-leaf-500/10 text-leaf-700 dark:text-leaf-400'
                }`}
              >
                NF {eta.nfRun ? 'ATIVA' : 'BYPASS'}
              </span>
            </span>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between px-3.5 py-3 text-[11px] text-slate-400 dark:text-slate-500">
          <span>Unidade parada · sem produção</span>
          {onCommand && eta.status !== 'run' && (
            <button
              onClick={() => onCommand(eta.id, 'restore')}
              className="flex items-center gap-1 rounded-md px-2 py-1 text-[10px] font-bold text-leaf-700 transition hover:bg-leaf-500/10 dark:text-leaf-400"
            >
              <RotateCcw className="size-3" /> Restaurar
            </button>
          )}
        </div>
      )}

      {/* Ação do operador (unidade operando) */}
      {onCommand && operating && (
        <button
          onClick={() => onCommand(eta.id, 'maint')}
          className="flex w-full items-center justify-center gap-1.5 border-t border-slate-100 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 transition hover:bg-amber-500/5 hover:text-amber-600 dark:border-white/5 dark:hover:text-amber-400"
        >
          <Wrench className="size-3" /> Enviar para manutenção
        </button>
      )}
    </div>
  )
}
