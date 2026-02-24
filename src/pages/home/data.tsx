import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/animate-ui/components/buttons/button"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Eye, Pencil, Archive, Clock } from "lucide-react"

/* ────────────────────────────────────────────
   Skeleton — matches DataCard layout exactly
──────────────────────────────────────────── */
export function DataCardSkeleton() {
  return (
    <Card className="w-full max-w-5xl overflow-hidden border border-border/60">
      <div className="flex min-h-[140px]">
        {/* Full-height image skeleton */}
        <Skeleton className="w-[160px] shrink-0 rounded-none rounded-l-xl" />

        {/* Content */}
        <div className="flex flex-1 min-w-0 flex-col gap-3 p-5">
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1 min-w-0">
              <Skeleton className="h-4 w-48 rounded" />
              <Skeleton className="h-3 w-full max-w-xs rounded" />
              <Skeleton className="h-3 w-3/4 rounded" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full shrink-0" />
          </div>

          {/* Value */}
          <Skeleton className="h-7 w-32 rounded" />

          {/* Footer */}
          <div className="flex items-center justify-between mt-auto pt-1">
            <Skeleton className="h-3.5 w-36 rounded" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}


interface DataCardProps {
  id: number
  title: string
  value: string
  description: string
  status?: "active" | "pending" | "draft"
  modifiedAt?: string
  onDelete?: (id: number) => void
}

export default function DataCard({
  id,
  title,
  value,
  description,
  modifiedAt,
  onDelete,
}: DataCardProps) {
  const navigate = useNavigate()
  const [archiving, setArchiving] = useState(false)

  const handleDelete = async () => {
    setArchiving(true)
    const { data, error } = await supabase
      .from("cav_forms")
      .update({ is_archived: true })
      .eq("id", id)
      .select()

    console.log("Updated rows:", data)
    setArchiving(false)

    if (error) {
      alert("Failed to archive: " + error.message)
      return
    }

    onDelete?.(id)
    window.location.reload()
  }
  const displayDate = modifiedAt
    ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(modifiedAt))
    : "Recently"

  return (
    <TooltipProvider delayDuration={300}>
      <Card className="group w-full max-w-5xl overflow-hidden border border-border/60 transition-all duration-200 hover:border-border hover:shadow-md hover:shadow-black/[0.04] dark:hover:shadow-black/20">
        <div className="flex">

          {/* Full-height split image */}
          <div className="overflow-hidden self-stretch">
            <img
              src={`https://avatar.vercel.sh/${encodeURIComponent(title)}`}
              alt={title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </div>

          {/* Main content */}
          <div className="flex min-w-0 flex-1 flex-col gap-2.5 px-5 py-5">

            {/* Header row */}
            <div className="flex items-start justify-between gap-3">
              <CardHeader className="p-0 space-y-1 min-w-0">
                <CardTitle className="truncate text-[15px] font-semibold leading-snug">
                  {title}
                </CardTitle>
                <CardDescription className="line-clamp-2 text-[13px] leading-relaxed">
                  {description}
                </CardDescription>
              </CardHeader>
            </div>

            {/* Primary value */}
            <p className="text-2xl font-bold tracking-tight text-foreground leading-none">
              {value}
            </p>

            {/* Footer row */}
            <CardFooter className="mt-auto flex items-center justify-between gap-4 p-0 pt-1">

              {/* Timestamp */}
              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground/70">
                <Clock className="size-3 shrink-0" />
                <span>Modified {displayDate}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      className="h-8 px-3 gap-1.5 text-xs font-medium rounded-lg"
                      onClick={() => navigate(`/view/${id}`)}
                    >
                      <Eye className="size-3.5" />
                      View
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">View record details</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8 px-3 gap-1.5 text-xs font-medium rounded-lg"
                      onClick={() => navigate(`/edit/${id}`)}
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Edit this record</TooltipContent>
                </Tooltip>

                <AlertDialog>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 gap-1.5 text-xs font-medium rounded-lg border-destructive/30 text-destructive hover:text-destructive-foreground hover:border-destructive transition-colors"
                          disabled={archiving}
                        >
                          <Archive className="size-3.5" />
                          {archiving ? "Archiving…" : "Archive"}
                        </Button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">Archive this record</TooltipContent>
                  </Tooltip>

                  <AlertDialogContent className="max-w-sm">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-base">Archive this record?</AlertDialogTitle>
                      <AlertDialogDescription className="text-sm leading-relaxed">
                        <span className="font-medium text-foreground">"{title}"</span> will be
                        moved to the archive. You can restore it later from the archived records view.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 sm:gap-2">
                      <AlertDialogCancel className="h-8 text-xs rounded-lg">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="h-8 text-xs rounded-lg bg-destructive text-destructive-foreground"
                      >
                        <Archive className="size-3.5" />
                        Yes, archive it
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardFooter>
          </div>
        </div>
      </Card>

    </TooltipProvider>
  )
}
