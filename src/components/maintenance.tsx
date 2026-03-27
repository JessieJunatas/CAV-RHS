import { Wrench, X } from "lucide-react"
import { useState } from "react"

interface Props {
  message?: string
}

export default function MaintenanceBanner({ message }: Props) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  const body =
    message ??
    "This system is currently undergoing scheduled maintenance or an update. Please check back shortly."

  return (
    <div className="relative w-full bg-yellow-400 dark:bg-yellow-500 text-yellow-950 px-10 py-2.5 flex items-center justify-center gap-2.5 text-sm font-medium z-50">
      <Wrench className="w-3.5 h-3.5 shrink-0" />
      <span>{body}</span>
      <button
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-yellow-500/40 dark:hover:bg-yellow-600/40 transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}