/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { Pencil, Archive, Clock, FileText } from "lucide-react"
import { logAudit } from "@/utils/audit-log"

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function DataCardSkeleton() {
  return (
    <Card className="w-full max-w-5xl overflow-hidden border border-border/60">
      <div className="flex min-h-35">
        <Skeleton className="w-40 shrink-0 rounded-none rounded-l-xl" />

        <div className="flex flex-1 min-w-0 flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2 flex-1 min-w-0">
              <Skeleton className="h-4 w-48 rounded" />
              <Skeleton className="h-3 w-full max-w-xs rounded" />
              <Skeleton className="h-3 w-3/4 rounded" />
            </div>
            <Skeleton className="h-5 w-14 rounded-full shrink-0" />
          </div>

          <Skeleton className="h-7 w-32 rounded" />

          <div className="flex items-center justify-between mt-auto pt-1">
            <Skeleton className="h-3.5 w-36 rounded" />
            <div className="flex gap-2">
              <Skeleton className="h-8 w-20 rounded-lg" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DataCardProps {
  id: number
  title: string
  value: string
  description: string
  modifiedAt?: string
  onArchived?: (id: number, name: string) => void
  onError?: (message: string) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function DataCard({
  id,
  title,
  value,
  description,
  modifiedAt,
  onArchived,
  onError,
}: DataCardProps) {
  const navigate = useNavigate()
  const [archiving, setArchiving] = useState(false)
  const [imgError, setImgError]   = useState(false)

  const handleArchive = async () => {
    setArchiving(true)
    const { data, error } = await supabase
      .from("cav_forms")
      .update({ is_archived: true })
      .eq("id", id)
      .select()

    console.log("Updated rows:", data)
    setArchiving(false)

    if (error) {
      onError?.(error.message)
      return
    }

    try {
      await logAudit({
        action: "archived",
        event: `Archived form for ${title}`,
        recordId: id.toString(),
        oldData: { is_archived: false },
        newData: { is_archived: true },
      })
    } catch (err: any) {
      console.error("Audit log failed:", err)
    }

    // Pass the student name so the parent can show a meaningful success toast
    onArchived?.(id, value)
  }

  const displayDate = modifiedAt
    ? new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(modifiedAt))
    : "Recently"

  return (
    <TooltipProvider delayDuration={300}>
      <Card className="group w-full max-w-5xl overflow-hidden border border-border/60 transition-all duration-200 hover:border-border hover:shadow-md hover:shadow-black/4 dark:hover:shadow-black/20">
        <div className="flex">

          {/* Image / Fallback */}
          <div className="w-40 shrink-0 self-stretch overflow-hidden">
            {imgError ? (
              <div className="flex h-full w-full items-center justify-center bg-muted">
                <FileText className="size-8 text-muted-foreground/40" />
              </div>
            ) : (
              <img
                src={`https://avatar.vercel.sh/${encodeURIComponent(title)}`}
                alt={title}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                onError={() => setImgError(true)}
              />
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-2.5 px-5 py-5">

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

            <p className="text-2xl font-bold tracking-tight text-foreground leading-none">
              {value}
            </p>

            <CardFooter className="mt-auto flex items-center justify-between gap-4 p-0 pt-1">

              <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground/70">
                <Clock className="size-3 shrink-0" />
                <span>Modified {displayDate}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      className="h-8 px-3 gap-1.5 text-xs font-medium rounded-lg"
                      onClick={() => navigate(`/edit/${id}`)}
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">
                    Edit this record
                  </TooltipContent>
                </Tooltip>

                <AlertDialog>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="archive"
                          disabled={archiving}
                        >
                          <Archive className="size-3.5" />
                          {archiving ? "Archiving…" : "Archive"}
                        </Button>
                      </AlertDialogTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-xs">
                      Archive this record
                    </TooltipContent>
                  </Tooltip>

                  <AlertDialogContent className="max-w-sm rounded-2xl">
                    <AlertDialogHeader className="items-center text-center sm:text-center">
                      <div className="mx-auto mb-2 h-14 w-14 rounded-2xl bg-archive/10 border border-archive/20 flex items-center justify-center">
                        <Archive className="h-7 w-7 text-archive" />
                      </div>
                      <AlertDialogTitle className="text-base font-bold">
                        Archive this record?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-sm leading-relaxed">
                        <span className="font-medium text-foreground">"{value}"</span> will be
                        moved to the archive. You can restore it later from the archived records view.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
                      <AlertDialogCancel className="flex-1 rounded-xl h-10 m-0 text-sm">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        variant="archive"
                        onClick={handleArchive}
                        className="flex-1 rounded-xl h-10 gap-2 m-0 text-sm"
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