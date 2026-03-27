import { Wrench } from "lucide-react"

interface Props {
  message?: string
}

export default function MaintenancePage({ message }: Props) {
  const body =
    message ??
    "This system is currently undergoing scheduled maintenance or an update. Please check back shortly."

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background text-center px-6">

      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center mb-8">
        <Wrench className="w-7 h-7 text-foreground" />
      </div>

      {/* Eyebrow */}
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-3">
        Down for maintenance
      </p>

      {/* Heading */}
      <h1 className="text-3xl font-semibold tracking-tight mb-3">
        We'll be right back
      </h1>

      {/* Message */}
      <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
        {body}
      </p>

    </div>
  )
}