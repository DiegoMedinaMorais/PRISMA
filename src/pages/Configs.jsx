import { useEffect, useState } from 'react'
import { Settings, Sun, Moon, Bell, BellOff, Info } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'

/**
 * Configurações · preferências do operador (persistidas no navegador):
 *  - Tema claro/escuro;
 *  - Exibição do banner de alarmes no Painel;
 *  - Especificação do processo PRISMA (parâmetros fixos da máquina, só leitura).
 */

const PREFS_KEY = 'prisma-prefs'

function readPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}')
  } catch {
    return {}
  }
}

/** Lista dos parâmetros fixos da máquina PRISMA (iguais aos do motor). */
const PROCESS_PARAMS = [
  { label: 'Limite de microplásticos para consumo humano', value: '0,05 ppm' },
  { label: 'Sensor 1 (entrada) · desvia para separação FAD acima de', value: '0,05 ppm' },
  { label: 'Sensor 2 (falha-segura) · NF liga acima de', value: '0,15 ppm (3× o limite)' },
  { label: 'Sensor 2 · NF volta ao bypass abaixo de', value: '0,08 ppm' },
  { label: 'Eficiência da separação FAD', value: '~92% da massa' },
  { label: 'Ciclo de leitura da rede', value: '2 s' },
  { label: 'Registro automático no histórico', value: 'a cada 4 min' },
  { label: 'Unidades na rede', value: '5 ETAs · 17,0 m³/h somados' },
]

export default function Configs() {
  const { theme, setTheme } = useTheme()
  const [prefs, setPrefs] = useState(readPrefs)

  useEffect(() => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  }, [prefs])

  const toggle = (key) => setPrefs((p) => ({ ...p, [key]: !p[key] }))

  return (
    <div className="space-y-4">
      {/* Cabeçalho */}
      <div className="surface p-4">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-lg bg-aqua-500/10 text-aqua-600 dark:text-aqua-400">
            <Settings className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-bold leading-tight tracking-tight">Configurações</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Preferências do operador · salvas neste navegador
            </p>
          </div>
        </div>
      </div>

      {/* Tema */}
      <div className="surface overflow-hidden">
        <div className="border-b border-slate-200/80 px-3.5 py-2 dark:border-white/10">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Aparência
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2.5 p-3.5">
          {[
            { key: 'light', label: 'Claro', icon: Sun },
            { key: 'dark', label: 'Escuro', icon: Moon },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTheme(key)}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-bold transition ${
                theme === key
                  ? 'border-aqua-400 bg-aqua-500/10 text-aqua-700 dark:text-aqua-300'
                  : 'border-slate-200 text-slate-500 hover:border-aqua-400/60 hover:text-aqua-600 dark:border-white/10 dark:text-slate-400'
              }`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Alarmes */}
      <div className="surface overflow-hidden">
        <div className="border-b border-slate-200/80 px-3.5 py-2 dark:border-white/10">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Alarmes
          </p>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          <div className="flex items-center justify-between gap-3 px-3.5 py-3">
            <div className="min-w-0">
              <p className="text-[13px] font-bold">Banner de alarmes no Painel</p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                Destaca em vermelho/âmbar o alarme mais recente sobre os KPIs
              </p>
            </div>
            <button
              onClick={() => toggle('alarmBanner')}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                prefs.alarmBanner !== false ? 'bg-leaf-500' : 'bg-slate-300 dark:bg-white/15'
              }`}
              aria-label="Banner de alarmes no Painel"
            >
              <span
                className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
                  prefs.alarmBanner !== false ? 'left-[1.375rem]' : 'left-0.5'
                }`}
              />
            </button>
          </div>
        </div>
        <p className="flex items-center gap-1.5 border-t border-slate-100 px-3.5 py-2 text-[10px] text-slate-400 dark:border-white/5 dark:text-slate-500">
          {prefs.alarmBanner === false ? <BellOff className="size-3" /> : <Bell className="size-3" />}
          {prefs.alarmBanner === false
            ? 'Banner oculto · os alarmes continuam no Histórico de alarmes (Controle)'
            : 'Banner ativo · o histórico completo fica no Controle'}
        </p>
      </div>

      {/* Especificação do processo (somente leitura) */}
      <div className="surface overflow-hidden">
        <div className="border-b border-slate-200/80 px-3.5 py-2 dark:border-white/10">
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Especificação do processo PRISMA · fixa na máquina
          </p>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {PROCESS_PARAMS.map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <p className="text-[11px] text-slate-600 dark:text-slate-300">{label}</p>
              <p className="shrink-0 text-[11px] font-bold tabular-nums text-aqua-600 dark:text-aqua-300">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Sobre */}
      <div className="surface p-3.5">
        <div className="flex items-start gap-2.5">
          <Info className="mt-0.5 size-4 shrink-0 text-slate-400" />
          <div className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
            <p className="font-bold text-slate-700 dark:text-slate-200">MVP PRISMA · v1.6</p>
            <p className="mt-0.5">
              Processo de Remoção Inteligente e Sustentável de Microplásticos Aquáticos —
              rede de 5 ETAs com sensor de entrada, separação FAD com reciclagem e
              nanofiltração em lógica falha-segura. Dados de leitura no Supabase;
              preferências locais neste navegador.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
