// MaintenanceBanner.tsx
import { Wrench, X } from "lucide-react"
import { useState } from "react"
import { useMaintenance } from "@/hooks/use-maintenance"
import { Button } from "./animate-ui/components/buttons/button"

export default function MaintenanceBanner() {
  const { enabled, message } = useMaintenance()
  const [dismissed, setDismissed] = useState(false)

  if (!enabled || dismissed) return null

  return (
    <div className="relative w-full bg-pending text-foreground px-10 py-2.5 flex items-center justify-center gap-2.5 text-sm font-medium z-50">
      <Wrench className="w-3.5 h-3.5 shrink-0" />
      <span>{message}</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 hover:bg-black/15 dark:hover:bg-black/25"
      >
        <X className="w-3.5 h-3.5" />
      </Button>
    </div>
  )
}