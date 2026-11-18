import { motion } from 'framer-motion'

/**
 * StatCard · KPI flat (HMI) · tone: 'aqua' | 'leaf' | 'amber' | 'slate' | 'rose'
 */
const TONES = {
  aqua: { value: 'text-aqua-600 dark:text-aqua-300', bar: 'bg-aqua-500' },
  leaf: { value: 'text-leaf-700 dark:text-leaf-400', bar: 'bg-leaf-500' },
  amber: { value: 'text-amber-600 dark:text-amber-400', bar: 'bg-amber-500' },
  slate: { value: 'text-slate-800 dark:text-slate-100', bar: 'bg-slate-500' },
  rose: { value: 'text-rose-600 dark:text-rose-400', bar: 'bg-rose-500' },
}

export default function StatCard({ label, value, hint, progress, tone = 'slate', delay = 0 }) {
  const t = TONES[tone] || TONES.slate
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25, delay }}
      className="surface p-3.5"
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          {label}
        </p>
        {hint && (
          <span
            className={`shrink-0 text-[9px] font-extrabold uppercase tracking-wider ${t.value}`}
          >
            {hint}
          </span>
        )}
      </div>
      <p className={`mt-1 text-xl font-bold tabular-nums ${t.value}`}>{value}</p>
      {typeof progress === 'number' && (
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
          <div
            className={`h-full rounded-full ${t.bar} transition-[width] duration-700`}
            style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
          />
        </div>
      )}
    </motion.div>
  )
}
