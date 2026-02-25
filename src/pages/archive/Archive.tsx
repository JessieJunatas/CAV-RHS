import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/animate-ui/components/buttons/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { logAudit } from "@/utils/audit-log"
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
import { Archive, Eye, RotateCcw, Clock, Hash, Inbox } from "lucide-react"

function ArchivePage() {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [restoringId, setRestoringId] = useState<number | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchArchived = async () => {
      const { data, error } = await supabase
        .from("cav_forms")
        .select("*")
        .eq("is_archived", true)
        .order("created_at", { ascending: false })

      if (!error && data) setRecords(data)
      setLoading(false)
    }

    fetchArchived()
  }, [])

  const handleRestore = async (id: number, fullName: string) => {
  setRestoringId(id)

  const { error } = await supabase
    .from("cav_forms")
    .update({ is_archived: false })
    .eq("id", id)

  if (error) {
    alert("Restore failed: " + error.message)
    setRestoringId(null)
    return
  }

  try {
  await logAudit({
    action: "restored",
    event: `Restored archived form for ${fullName}`,
    recordId: id.toString(),
    
  })
  } 
  catch (err: any) {
    console.error("Audit log failed:", err)
  }

  setRecords((prev) => prev.filter((r) => r.id !== id))
  setRestoringId(null)
}

  const displayDate = (val: string) => {
    if (!val) return "Unknown date"
    return new Intl.DateTimeFormat("en-US", {
      month: "short", day: "numeric", year: "numeric"
    }).format(new Date(val))
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="bg-background text-foreground">
        <div className="mx-auto max-w-4xl px-6 py-10">

          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
                <Archive className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold tracking-tight">Archived Records</h1>
                <p className="text-sm text-muted-foreground">
                  {loading ? "Loading…" : `${records.length} record${records.length !== 1 ? "s" : ""} archived`}
                </p>
              </div>
            </div>

            {!loading && records.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {records.length} total
              </Badge>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 rounded-xl border border-border/60 p-4">
                  <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48 rounded" />
                    <Skeleton className="h-3 w-32 rounded" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-8 w-16 rounded-lg" />
                    <Skeleton className="h-8 w-20 rounded-lg" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && records.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Inbox className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No archived records</p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Records you archive will appear here
              </p>
            </div>
          )}

          {/* Records list */}
          {!loading && records.length > 0 && (
            <div className="space-y-3">
              {records.map((record) => (
                <div
                  key={record.id}
                  className="group flex items-center gap-4 rounded-xl border border-border/60 bg-card px-4 py-3.5 transition-all hover:border-border hover:shadow-sm"
                >
                  {/* Avatar */}
                  <img
                    src={`https://avatar.vercel.sh/${encodeURIComponent(record.full_legal_name)}`}
                    alt={record.full_legal_name}
                    className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-border"
                  />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{record.full_legal_name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Hash className="h-2.5 w-2.5" />
                        {record.control_no}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="h-2.5 w-2.5" />
                        Archived {displayDate(record.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 gap-1.5 text-xs rounded-lg"
                          onClick={() => navigate(`/view/${record.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" className="text-xs">View record</TooltipContent>
                    </Tooltip>

                    <AlertDialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 gap-1.5 text-xs rounded-lg border-emerald-500/30 text-emerald-600 hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-colors"
                              disabled={restoringId === record.id}
                            >
                              <RotateCcw className={`h-3.5 w-3.5 ${restoringId === record.id ? "animate-spin" : ""}`} />
                              {restoringId === record.id ? "Restoring…" : "Restore"}
                            </Button>
                          </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">Restore to active records</TooltipContent>
                      </Tooltip>

                      <AlertDialogContent className="max-w-sm">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-base">Restore this record?</AlertDialogTitle>
                          <AlertDialogDescription className="text-sm leading-relaxed">
                            <span className="font-medium text-foreground">"{record.full_legal_name}"</span> will be
                            moved back to active records and visible on the main dashboard.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2">
                          <AlertDialogCancel className="h-8 text-xs rounded-lg">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRestore(record.id, record.full_legal_name)}
                            className="h-8 text-xs rounded-lg bg-background text-foreground"
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                            Yes, restore it
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </TooltipProvider>
  )
}

export default ArchivePage