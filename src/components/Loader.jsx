import { Droplets } from 'lucide-react'

export default function Loader({ label = 'Carregando...' }) {
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-slate-400 dark:text-slate-500">
      <Droplets className="size-8 animate-pulse text-aqua-400" />
      <p className="text-sm">{label}</p>
    </div>
  )
}
