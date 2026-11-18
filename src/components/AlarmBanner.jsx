import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Info } from 'lucide-react'

/** Banner de alarme (flat, sem glow) · level: 'warn' | 'crit' | 'info' */
export function AlarmBanner({ level = 'warn', title, description }) {
  const isInfo = level === 'info'
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      className={`flex items-start gap-3 rounded-xl border p-3.5 ${
        isInfo
          ? 'border-slate-300/70 bg-slate-50 dark:border-white/10 dark:bg-white/5'
          : 'border-amber-400/50 bg-amber-50 dark:border-amber-400/30 dark:bg-amber-400/10'
      }`}
    >
      <span
        className={`grid size-8 shrink-0 place-items-center rounded-lg ${
          isInfo
            ? 'bg-slate-200 text-slate-500 dark:bg-white/10 dark:text-slate-300'
            : 'bg-amber-500/15 text-amber-500'
        }`}
      >
        {isInfo ? <Info className="size-4" /> : <AlertTriangle className="size-4" />}
      </span>
      <div>
        <p
          className={`text-[13px] font-bold leading-tight ${
            isInfo ? '' : 'text-amber-700 dark:text-amber-400'
          }`}
        >
          {title}
        </p>
        {description && (
          <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{description}</p>
        )}
      </div>
    </motion.div>
  )
}

/** Fita de alarmes contínua (rolagem dos últimos eventos) */
export function AlarmFeed({ alarms, max = 3 }) {
  return (
    <AnimatePresence initial={false}>
      {alarms.slice(0, max).map((a) => (
        <AlarmBanner key={a.id} level={a.level} title={a.text} />
      ))}
    </AnimatePresence>
  )
}
