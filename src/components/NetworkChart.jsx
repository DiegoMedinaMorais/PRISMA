/**
 * NetworkChart · gráfico da carga na rede (últimos 10 min)
 * ------------------------------------------------------------------
 * Linha de afluente (área preenchida) + linha de saída + linha do limite.
 * Escala sqrt no eixo Y (valoriza valores baixos), grade e rótulos de tempo.
 */

export default function NetworkChart({ history, limitPpm = 0.05 }) {
  const W = 560
  const H = 180
  const PAD = { l: 40, r: 46, t: 10, b: 20 }
  const iw = W - PAD.l - PAD.r
  const ih = H - PAD.t - PAD.b

  if (history.length < 2) {
    return (
      <p className="py-10 text-center text-[11px] text-slate-400">
        Coletando dados da rede... ({history.length}/300 amostras)
      </p>
    )
  }

  const n = history.length
  const maxVal = Math.max(limitPpm, ...history.map((h) => Math.max(h.feed, h.outlet))) * 1.15
  const x = (i) => PAD.l + (i / (HISTORY_MAX - 1)) * iw
  const y = (v) => PAD.t + ih - Math.sqrt(v / maxVal) * ih // escala sqrt

  const line = (field) =>
    history.map((h, i) => `${x(i).toFixed(1)},${y(h[field]).toFixed(1)}`).join(' ')
  const area = `M ${x(0).toFixed(1)},${(PAD.t + ih).toFixed(1)} L ` + history
    .map((h, i) => `${x(i).toFixed(1)},${y(h.feed).toFixed(1)}`)
    .join(' L ') + ` L ${x(n - 1).toFixed(1)},${(PAD.t + ih).toFixed(1)} Z`

  const gridValues = [0, 0.25, 0.5, 0.75, 1].map((f) => f * maxVal)
  const last = history[n - 1]
  const feedNow = last.feed
  const outletNow = last.outlet

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-44 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="feedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(13,162,214,0.28)" />
            <stop offset="100%" stopColor="rgba(13,162,214,0.02)" />
          </linearGradient>
        </defs>

        {/* grade horizontal + rótulos do eixo Y */}
        {gridValues.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD.l}
              y1={y(v)}
              x2={W - PAD.r}
              y2={y(v)}
              className="stroke-slate-200 dark:stroke-white/10"
              strokeWidth="1"
            />
            <text
              x={PAD.l - 6}
              y={y(v) + 3}
              textAnchor="end"
              className="fill-slate-400 dark:fill-slate-500"
              style={{ fontSize: 8 }}
            >
              {v.toFixed(2)}
            </text>
          </g>
        ))}

        {/* linha do limite */}
        <line
          x1={PAD.l}
          y1={y(limitPpm)}
          x2={W - PAD.r}
          y2={y(limitPpm)}
          className="stroke-rose-400/70"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
        <text
          x={W - PAD.r + 4}
          y={y(limitPpm) + 3}
          className="fill-rose-500"
          style={{ fontSize: 8, fontWeight: 700 }}
        >
          limite
        </text>

        {/* afluente: área + linha */}
        <path d={area} fill="url(#feedFill)" />
        <polyline points={line('feed')} fill="none" className="stroke-aqua-500" strokeWidth="1.8" />

        {/* saída */}
        <polyline points={line('outlet')} fill="none" className="stroke-leaf-500" strokeWidth="1.4" />

        {/* rótulos de tempo */}
        <text x={PAD.l} y={H - 6} className="fill-slate-400 dark:fill-slate-500" style={{ fontSize: 8 }}>
          -10 min
        </text>
        <text x={PAD.l + iw / 2 - 12} y={H - 6} className="fill-slate-400 dark:fill-slate-500" style={{ fontSize: 8 }}>
          -5 min
        </text>
        <text x={W - PAD.r - 24} y={H - 6} className="fill-slate-400 dark:fill-slate-500" style={{ fontSize: 8 }}>
          agora
        </text>
      </svg>

      {/* legenda com valores ao vivo */}
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[10px] text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3.5 rounded bg-aqua-500" />
          Afluente (chega): <b className="tabular-nums text-aqua-600 dark:text-aqua-300">{feedNow.toFixed(3)} ppm</b>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-0.5 w-3.5 rounded bg-leaf-500" />
          Saída (entregue): <b className="tabular-nums text-leaf-700 dark:text-leaf-400">{outletNow.toFixed(3)} ppm</b>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-px w-3.5 border-t border-dashed border-rose-400" />
          Limite consumo humano: <b className="tabular-nums">{limitPpm.toFixed(2)} ppm</b>
        </span>
      </div>
    </div>
  )
}

const HISTORY_MAX = 300
