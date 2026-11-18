import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { supabase } from '../lib/supabaseClient'

/**
 * ProcessContext · motor da rede PRISMA (v5 · arquitetura conceitual do projeto)
 * ---------------------------------------------------------------------------
 * Cada uma das 5 ETAs possui a MÁQUINA PRISMA completa, em 3 passos:
 *
 *  1) SENSOR 1 (entrada): sensor a laser vigia a água que chega.
 *       • plástico NÃO detectado (afluente ≤ 0,05 ppm) → água passa DIRETO
 *         (sem tratamento, sem gasto de energia de separação);
 *       • plástico DETECTADO (> 0,05 ppm) → água é DESVIADA para a separação:
 *         injeção do aglutinante + microbolhas de ar fazem o plástico boiar
 *         (FAD), que é retirado e enviado a cooperativas de reciclagem.
 *
 *  2) SENSOR 2 (saída · lógica falha-segura): vigia a água pós-limpeza.
 *       • água 100% segura (residual ≤ 0,15 ppm) → filtro pesado permanece
 *         em BYPASS (desligado) → é daí que vem a economia de energia;
 *       • passou partícula minúscula (residual > 0,15 ppm, bem acima do
 *         limite) → a NANOFILTRAÇÃO DA PRÓPRIA ETA liga automaticamente
 *         (e volta ao bypass quando o residual cai < 0,08 ppm).
 *
 *  A nanofiltração EXISTE em todas as ETAs — o que varia é o estado:
 *  bypass (economia) ou ativa (segurança).
 */

const TICK_MS = 2000
const TICKS_PER_AUTO_LOG = 120 // 4 min
const HISTORY_TICKS = 300 // 10 min de série para os gráficos

const LIMIT_PPM = 0.05 // limite de microplásticos para consumo humano
const DETECT_PPM = 0.05 // Sensor 1: acima disso, desvia para separação FAD
// Falha-segura (Sensor 2): NF é pesada e cara — só liga com residual bem alto
const NF_ON_PPM = 0.15 // residual 3× o limite → NF da ETA sai do bypass
const NF_OFF_PPM = 0.08 // residual caiu → NF volta ao bypass

// Consumo por m³/h de capacidade (kW)
const KW_SENSOR = 0.04 // sensores a laser (sempre ligados, consomem pouco)
const KW_PER_FLOW_FAD = 0.64 // separação FAD (só quando a água é desviada)
const KW_PER_FLOW_NF = 2.45 // nanofiltração (o "filtro pesado de alta pressão")

const INITIAL_ETAS = [
  { id: 'ETA-01', name: 'Central', capacity: 5.0, sensitivity: 1.0, hours: 14210 },
  { id: 'ETA-02', name: 'Norte', capacity: 4.0, sensitivity: 1.15, hours: 13890 },
  { id: 'ETA-03', name: 'Leste', capacity: 3.5, sensitivity: 0.9, hours: 12760 },
  { id: 'ETA-04', name: 'Sul', capacity: 2.5, sensitivity: 1.05, hours: 11045 },
  { id: 'ETA-05', name: 'Poente', capacity: 2.0, sensitivity: 1.2, hours: 8930 },
]

const rnd = (min, max) => Math.random() * (max - min) + min
const clamp = (v, min, max) => Math.min(max, Math.max(min, v))

const ProcessContext = createContext(null)

export function ProcessProvider({ children }) {
  const initialState = {
    etas: INITIAL_ETAS.map((e) => ({
      ...e,
      status: 'run',
      route: 'direct', // 'direct' (bypass) | 'fad' (desviada para separação)
      nfRun: false, // false = NF em bypass · true = filtragem pesada ativa
      compliant: true,
      influent: 0,
      residual: 0,
      outlet: 0,
      flow: 0,
      load: 0,
      powerKw: 0,
      massKg: 0,
    })),
    basePpm: 0.06, // carga média na captação da bacia (varia sozinha)
    powerKw: 0,
    energySaved: 90,
    nfAny: false, // alguma NF ativa na rede
    nfEvents: 0, // acionamentos de NF nesta sessão
    stockKg: 0, // plástico capturado aguardando envio à cooperativa
    recycledKg: 0, // total já entregue às cooperativas de reciclagem
    lastBatch: null, // último lote enviado { kg, at }
    alarms: [], // { id, at, level, text }
    history: [], // { feed, outlet } · últimos 10 min
    startedAt: Date.now(),
  }

  const stateRef = useRef(initialState)
  const [state, setState] = useState(initialState)

  const baseTargetRef = useRef(0.06)
  const peakRef = useRef({ active: false, until: 0, target: 0 })
  const recoverAtRef = useRef({})
  const tickCountRef = useRef(0)
  const logQueueRef = useRef([])

  const apply = useCallback((next) => {
    stateRef.current = next
    setState(next)
  }, [])

  /** Snapshot agregado → tabela `readings`. */
  const persist = useCallback(async (snapshot) => {
    const { data } = await supabase.auth.getSession()
    if (!data?.session) return
    await supabase.from('readings').insert({
      user_id: data.session.user.id,
      scenario: snapshot.scenario,
      lif1_ppm: +snapshot.feedPpm.toFixed(3),
      lif2_ppm: +snapshot.outletPpm.toFixed(3),
      mass_recovered_kg: +snapshot.massKg.toFixed(3),
      energy_saved_pct: +snapshot.energySaved.toFixed(1),
      nanofiltration_active: snapshot.nanoActive,
    })
  }, [])

  /** Um tick da rede: Sensor 1 → desvio/FAD → Sensor 2 → NF (falha-segura). */
  const step = useCallback((prev) => {
    const t = Date.now()
    let alarms = prev.alarms
    const push = (level, text) => {
      alarms = [{ id: crypto.randomUUID(), at: t, level, text }, ...alarms].slice(0, 12)
    }

    // --- Carga na captação: passeio aleatório + eventos de carga ocasionais
    const peak = peakRef.current
    if (peak.active && t >= peak.until) {
      peak.active = false
      push('info', 'Evento de carga encerrado · captação voltando ao normal')
    }
    if (!peak.active && Math.random() < 0.0035) {
      peak.active = true
      peak.until = t + rnd(120_000, 360_000)
      peak.target = rnd(1.5, 12)
      push('warn', `Evento de carga na bacia · afluente subindo (~${peak.target.toFixed(1)} ppm por alguns minutos)`)
    }
    const band = peak.active ? [peak.target * 0.8, peak.target * 1.2] : [0.02, 0.12]
    baseTargetRef.current = clamp(
      baseTargetRef.current + rnd(-0.03, 0.03) * (band[1] - band[0]),
      band[0],
      band[1]
    )
    const basePpm = clamp(prev.basePpm + (baseTargetRef.current - prev.basePpm) * 0.25, 0.001, 30)

    // --- Cada ETA executa a máquina PRISMA
    const etas = prev.etas.map((e) => ({ ...e }))
    const dtH = TICK_MS / 3_600_000
    let nanoActive = false
    let nonCompliant = 0
    let capturedKg = 0 // massa boiada neste tick (vai para o estoque de reciclagem)

    for (const e of etas) {
      // recuperação automática de falha/manutenção
      if ((e.status === 'fault' || e.status === 'maint') && t >= (recoverAtRef.current[e.id] || Infinity)) {
        e.status = 'run'
        delete recoverAtRef.current[e.id]
        push('info', `${e.id} de volta à operação`)
      }
      // falha de equipamento e manutenção preventiva: acontecem e se resolvem sozinhas
      if (e.status === 'run' && Math.random() < 0.0012) {
        e.status = 'fault'
        recoverAtRef.current[e.id] = t + rnd(40_000, 100_000)
        push('crit', `${e.id} fora de operação · capacidade da rede reduzida`)
      } else if (e.status === 'run' && Math.random() < 0.001) {
        e.status = 'maint'
        recoverAtRef.current[e.id] = t + rnd(50_000, 110_000)
        push('warn', `${e.id} entrou em manutenção preventiva`)
      }

      const operating = e.status === 'run'
      const influent = operating ? basePpm * e.sensitivity * rnd(0.92, 1.08) : 0
      const flow = operating ? e.capacity * (peak.active ? 1.12 : 1.0) * rnd(0.97, 1.03) : 0

      // SENSOR 1 · o plástico foi detectado?
      const detected = influent > DETECT_PPM
      const newRoute = operating && detected ? 'fad' : 'direct'
      if (operating && newRoute !== e.route) {
        push(
          newRoute === 'fad' ? 'warn' : 'info',
          newRoute === 'fad'
            ? `${e.id} · plástico detectado (${influent.toFixed(3)} ppm) · água desviada para separação e reciclagem`
            : `${e.id} · afluente limpo · retorno ao bypass direto (sem tratamento)`
        )
      }
      e.route = newRoute

      // SEPARAÇÃO FAD (só quando desviada): aglutinante + microbolhas → ~92%
      const eff = e.route === 'fad' ? 0.92 : 0
      const residual = influent * (1 - eff)

      // SENSOR 2 · lógica falha-segura: a NF pesada só liga se sobrar muito
      if (operating) {
        e.nfRun = e.nfRun ? residual > NF_OFF_PPM : residual > NF_ON_PPM
      } else {
        e.nfRun = false
      }
      // em carga extrema a NF trabalha no limite (eficiência cai um pouco)
      const nfRemoval = residual > 2.5 ? 0.9 : 0.955
      const outlet = operating ? (e.nfRun ? residual * (1 - nfRemoval) : residual) : 0

      const wasCompliant = e.compliant
      e.compliant = operating ? outlet <= LIMIT_PPM : true
      if (operating && !e.compliant && wasCompliant) {
        push('crit', `${e.id} entregando água acima do limite (${outlet.toFixed(3)} ppm) · carga extrema na rede`)
      }
      if (operating && e.compliant && !wasCompliant) {
        push('info', `${e.id} voltou a entregar água dentro do limite`)
      }

      e.influent = influent
      e.flow = flow
      e.residual = residual
      e.outlet = outlet
      e.load = operating ? clamp((flow / e.capacity) * 100, 0, 130) : 0
      e.powerKw = operating
        ? e.capacity * KW_SENSOR +
          (e.route === 'fad' ? e.capacity * KW_PER_FLOW_FAD : 0) +
          e.capacity * KW_PER_FLOW_NF * (e.nfRun ? 1 : 0.05)
        : 0
      const gained = operating && e.route === 'fad' ? (influent * flow * eff * dtH) / 1000 : 0
      e.massKg += gained
      capturedKg += gained
      if (operating) e.hours += dtH
      if (e.nfRun) nanoActive = true
      if (operating && !e.compliant) nonCompliant += 1
    }

    // --- RECICLAGEM: o plástico boiado fica em estoque e, ao fechar lote (50 g),
    // é despachado para as cooperativas de reciclagem
    let stockKg = prev.stockKg + capturedKg
    let recycledKg = prev.recycledKg
    let lastBatch = prev.lastBatch
    if (stockKg >= 0.05) {
      recycledKg += stockKg
      lastBatch = { kg: stockKg, at: t }
      push('info', `Lote de ${(stockKg * 1000).toFixed(0)} g de plástico enviado à cooperativa de reciclagem`)
      stockKg = 0
    }

    const avgFeed = avgOf(etas, 'influent')
    const avgOutlet = avgOf(etas, 'outlet')
    if (nanoActive && !prev.nfAny) {
      push('warn', 'Filtragem pesada ligada · partículas passaram do tratamento comum (residual > 0,15 ppm)')
      logQueueRef.current.push({
        scenario: 'contaminated', feedPpm: avgFeed, outletPpm: avgOutlet,
        massKg: totalMass(etas), energySaved: prev.energySaved, nanoActive: true,
      })
    } else if (!nanoActive && prev.nfAny) {
      push('info', 'Água 100% segura novamente · nanofiltração de volta ao bypass (economia restabelecida)')
      logQueueRef.current.push({
        scenario: 'clean', feedPpm: avgFeed, outletPpm: avgOutlet,
        massKg: totalMass(etas), energySaved: prev.energySaved, nanoActive: false,
      })
    }

    // --- Energia: consumo real × potência de TUDO ligado 24 h (referência)
    const pmaxKw = INITIAL_ETAS.reduce(
      (sum, e) => sum + e.capacity * (KW_SENSOR + KW_PER_FLOW_FAD + KW_PER_FLOW_NF),
      0
    )
    const powerKw = etas.reduce((sum, e) => sum + e.powerKw, 0)
    const energySaved = clamp(((pmaxKw - powerKw) / pmaxKw) * 100, 0, 100)

    const history = [...prev.history, { feed: avgFeed, outlet: avgOutlet }].slice(-HISTORY_TICKS)

    tickCountRef.current += 1
    if (tickCountRef.current % TICKS_PER_AUTO_LOG === 0) {
      logQueueRef.current.push({
        scenario: nanoActive ? 'contaminated' : 'clean',
        feedPpm: avgFeed, outletPpm: avgOutlet,
        massKg: totalMass(etas), energySaved, nanoActive,
      })
    }

    return {
      ...prev,
      etas,
      basePpm,
      powerKw,
      energySaved,
      nfAny: nanoActive,
      nfEvents: prev.nfEvents + (nanoActive && !prev.nfAny ? 1 : 0),
      history,
      flowTotal: etas.reduce((s, e) => s + e.flow, 0),
      massTotal: totalMass(etas),
      stockKg,
      recycledKg,
      lastBatch,
      peakActive: peak.active,
    }
  }, [])

  function avgOf(etas, field) {
    const ops = etas.filter((e) => e.status === 'run')
    return ops.length ? ops.reduce((s, e) => s + e[field], 0) / ops.length : 0
  }
  function totalMass(etas) {
    return etas.reduce((s, e) => s + e.massKg, 0)
  }

  /** Loop principal da rede. */
  useEffect(() => {
    const interval = setInterval(() => {
      const next = step(stateRef.current)
      apply(next)
      if (logQueueRef.current.length > 0) {
        const logs = logQueueRef.current
        logQueueRef.current = []
        logs.forEach(persist)
      }
    }, TICK_MS)
    return () => clearInterval(interval)
  }, [step, apply, persist])

  /** Ordem do operador: manutenção / restauração de uma ETA. */
  const commandUnit = useCallback(
    (id, command) => {
      const prev = stateRef.current
      const target = prev.etas.find((e) => e.id === id)
      if (!target) return
      let text = null
      const etas = prev.etas.map((e) => ({ ...e }))
      const e = etas.find((x) => x.id === id)
      if (command === 'maint' && (e.status === 'run' || e.status === 'standby')) {
        e.status = 'maint'
        delete recoverAtRef.current[id]
        text = `Ordem do operador: ${id} (${e.name}) para manutenção`
      } else if (command === 'restore' && (e.status === 'maint' || e.status === 'fault')) {
        e.status = 'run'
        delete recoverAtRef.current[id]
        text = `Ordem do operador: ${id} (${e.name}) restaurada`
      }
      if (!text) return
      apply({
        ...prev,
        etas,
        alarms: [
          { id: crypto.randomUUID(), at: Date.now(), level: 'info', text },
          ...prev.alarms,
        ].slice(0, 12),
      })
    },
    [apply]
  )

  /** Registro manual de leitura agregada. */
  const registerReading = useCallback(async () => {
    const s = stateRef.current
    await persist({
      scenario: s.nfAny ? 'contaminated' : 'clean',
      feedPpm: avgOf(s.etas, 'influent'),
      outletPpm: avgOf(s.etas, 'outlet'),
      massKg: totalMass(s.etas),
      energySaved: s.energySaved,
      nanoActive: s.nfAny,
    })
  }, [persist])

  const summary = useMemo(() => {
    const count = (status) => state.etas.filter((e) => e.status === status).length
    const total = state.etas.length
    const operating = state.etas.filter((e) => e.status === 'run').length
    const compliant = state.etas.filter((e) => e.status === 'run' && e.compliant).length
    const treating = state.etas.filter((e) => e.status === 'run' && e.route === 'fad').length
    const nfOn = state.etas.filter((e) => e.status === 'run' && e.nfRun).length
    return {
      total,
      run: count('run'),
      maint: count('maint'),
      fault: count('fault'),
      availability: +(((total - count('maint') - count('fault')) / total) * 100).toFixed(1),
      operating,
      compliant,
      nonCompliant: operating - compliant,
      treating,
      nfOn,
    }
  }, [state.etas])

  const session = useMemo(() => {
    const elapsedH = (Date.now() - state.startedAt) / 3_600_000
    const pmaxKw = INITIAL_ETAS.reduce(
      (sum, e) => sum + e.capacity * (KW_SENSOR + KW_PER_FLOW_FAD + KW_PER_FLOW_NF),
      0
    )
    return {
      elapsedH,
      savedKwh: (pmaxKw - state.powerKw) * elapsedH,
      maxFeedPpm: state.history.reduce((m, h) => Math.max(m, h.feed), 0),
    }
  }, [state.startedAt, state.powerKw, state.history])

  const value = useMemo(
    () => ({ ...state, commandUnit, registerReading, summary, session, limitPpm: LIMIT_PPM }),
    [state, commandUnit, registerReading, summary, session]
  )

  return <ProcessContext.Provider value={value}>{children}</ProcessContext.Provider>
}

export function useProcess() {
  const ctx = useContext(ProcessContext)
  if (!ctx) throw new Error('useProcess deve ser usado dentro de <ProcessProvider>')
  return ctx
}
