import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/animate-ui/components/buttons/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
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
import {
  Archive, Eye, RotateCcw, Clock, Hash,
  Inbox, Trash2, CheckCircle2, TriangleAlert,
} from "lucide-react"
import { logAudit } from "@/utils/audit-log"

type Toast = { id: number; type: "error" | "success"; title: string; message: string }

function ArchivePage() {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [restoringId, setRestoringId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const navigate = useNavigate()

  const pushToast = (type: Toast["type"], title: string, message: string) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, type, title, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }

  useEffect(() => {
    fetchArchived()
  }, [])

  const fetchArchived = async () => {
    const { data, error } = await supabase
      .from("cav_forms")
      .select("*")
      .eq("is_archived", true)
      .order("created_at", { ascending: false })

    if (!error && data) setRecords(data)
    setLoading(false)
  }

  const handleRestore = async (id: number) => {
    setRestoringId(id)
    
    const record = records.find(r => r.id === id)
    const fullName = record?.full_legal_name ?? "Unknown"

    const { error } = await supabase
      .from("cav_forms")
      .update({ is_archived: false })
      .eq("id", id)

    if (error) {
      pushToast("error", "Restore failed", error.message)
      setRestoringId(null)
      return
    }

    try {
      await logAudit({
        action: "restored",
        event: `Restored archived form for ${fullName}`,
        recordId: id.toString(),
      })
    } catch (err: any) {
      console.error("Audit log failed:", err)
    }

    setRecords(prev => prev.filter(r => r.id !== id))
    setSelected(prev => { const s = new Set(prev); s.delete(id); return s })
    pushToast("success", "Record restored", "The record is now visible on the main dashboard.")
    setRestoringId(null)
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    const { error } = await supabase.from("cav_forms").delete().eq("id", id)
    const record = records.find(r => r.id === id)
    const fullName = record?.full_legal_name ?? "Unknown"

    if (error) {
      pushToast("error", "Delete failed", error.message)
      setDeletingId(null)
      return
    }
    
    try {
        await logAudit({
          action: "deleted",
          event: `Deleted archived form for ${fullName}`,
          recordId: id.toString(),
        })
      } catch (err: any) {
        console.error("Audit log failed:", err)
    }
    
    setRecords(prev => prev.filter(r => r.id !== id))
    setSelected(prev => { const s = new Set(prev); s.delete(id); return s })
    pushToast("success", "Record deleted", "The record has been permanently removed.")
    setDeletingId(null)
  }

  const handleBulkDelete = async (ids: number[]) => {
    setBulkDeleting(true)
    const { error } = await supabase.from("cav_forms").delete().in("id", ids)

    if (error) {
      pushToast("error", "Bulk delete failed", error.message)
      setBulkDeleting(false)
      return
    }

    setRecords(prev => prev.filter(r => !ids.includes(r.id)))
    setSelected(new Set())
    pushToast("success", `${ids.length} record${ids.length !== 1 ? "s" : ""} deleted`, "They have been permanently removed.")
    setBulkDeleting(false)
  }

  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  const toggleSelectAll = () => {
    if (selected.size === records.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(records.map(r => r.id)))
    }
  }

  const displayDate = (val: string) => {
    if (!val) return "Unknown date"
    return new Intl.DateTimeFormat("en-US", {
      month: "short", day: "numeric", year: "numeric"
    }).format(new Date(val))
  }

  const allSelected = records.length > 0 && selected.size === records.length
  const someSelected = selected.size > 0
  const selectedIds = Array.from(selected)

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

          {/* Bulk action bar */}
          {!loading && records.length > 0 && (
            <div className="mb-4 flex items-center justify-between rounded-xl border border-border/60 bg-card px-4 py-2.5">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleSelectAll}
                  className="rounded"
                />
                <span className="text-xs text-muted-foreground">
                  {someSelected ? `${selected.size} selected` : "Select all"}
                </span>
              </div>

              {someSelected && (
                <div className="flex items-center gap-2">
                  {/* Bulk restore */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-3 gap-1.5 text-xs rounded-lg border-emerald-500/30 text-emerald-600 hover:bg-emerald-500 hover:text-white hover:border-emerald-500"
                        disabled={bulkDeleting}
                      >
                        <RotateCcw className="h-3 w-3" />
                        Restore {selected.size}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-sm">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Restore {selected.size} record{selected.size !== 1 ? "s" : ""}?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm leading-relaxed">
                          These records will be moved back to active records and visible on the main dashboard.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="h-8 text-xs rounded-lg">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="h-8 text-xs rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                          onClick={async () => {
                            for (const id of selectedIds) await handleRestore(id)
                          }}
                        >
                          <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                          Restore all
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* Bulk delete */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-3 gap-1.5 text-xs rounded-lg border-destructive/30 text-destructive hover:bg-destructive hover:text-white hover:border-destructive"
                        disabled={bulkDeleting}
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete {selected.size}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-sm">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete {selected.size} record{selected.size !== 1 ? "s" : ""}?</AlertDialogTitle>
                        <AlertDialogDescription className="text-sm leading-relaxed">
                          This action is <span className="font-semibold text-foreground">permanent</span> and cannot be undone.
                          {selected.size === records.length && " This will delete all archived records."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="gap-2">
                        <AlertDialogCancel className="h-8 text-xs rounded-lg">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          className="h-8 text-xs rounded-lg"
                          onClick={() => handleBulkDelete(selectedIds)}
                        >
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                          Yes, delete all
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          )}

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
                    <Skeleton className="h-8 w-16 rounded-lg" />
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
              <p className="mt-1 text-xs text-muted-foreground/60">Records you archive will appear here</p>
            </div>
          )}

          {/* Records list */}
          {!loading && records.length > 0 && (
            <div className="space-y-3">
              {records.map((record) => (
                <div
                  key={record.id}
                  className={`group flex items-center gap-4 rounded-xl border bg-card px-4 py-3.5 transition-all hover:shadow-sm ${
                    selected.has(record.id)
                      ? "border-primary/40 bg-primary/5"
                      : "border-border/60 hover:border-border"
                  }`}
                >
                  {/* Checkbox */}
                  <Checkbox
                    checked={selected.has(record.id)}
                    onCheckedChange={() => toggleSelect(record.id)}
                    className="rounded shrink-0"
                  />

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
                    {/* View */}
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

                    {/* Restore */}
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
                            onClick={() => handleRestore(record.id)}
                            className="h-8 text-xs rounded-lg"
                          >
                            <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                            Yes, restore it
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {/* Delete */}
                    <AlertDialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-3 gap-1.5 text-xs rounded-lg border-destructive/30 text-destructive hover:bg-destructive hover:text-white hover:border-destructive transition-colors"
                              disabled={deletingId === record.id}
                            >
                              <Trash2 className={`h-3.5 w-3.5 ${deletingId === record.id ? "animate-pulse" : ""}`} />
                              {deletingId === record.id ? "Deleting…" : "Delete"}
                            </Button>
                          </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">Permanently delete</TooltipContent>
                      </Tooltip>

                      <AlertDialogContent className="max-w-sm">
                        <AlertDialogHeader>
                          <AlertDialogTitle className="text-base">Delete this record?</AlertDialogTitle>
                          <AlertDialogDescription className="text-sm leading-relaxed">
                            <span className="font-medium text-foreground">"{record.full_legal_name}"</span> will be
                            permanently deleted. This action <span className="font-semibold text-foreground">cannot be undone</span>.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2">
                          <AlertDialogCancel className="h-8 text-xs rounded-lg">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(record.id)}
                            className="h-8 text-xs rounded-lg"
                          >
                            <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                            Yes, delete it
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

      {/* Toast stack */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((toast) =>
          toast.type === "error" ? (
            <Alert
              key={toast.id}
              variant="destructive"
              className="w-72 animate-in slide-in-from-bottom-2 fade-in shadow-lg"
            >
              <TriangleAlert className="h-4 w-4" />
              <AlertTitle>{toast.title}</AlertTitle>
              <AlertDescription>{toast.message}</AlertDescription>
            </Alert>
          ) : (
            <Alert
              key={toast.id}
              className="w-72 animate-in slide-in-from-bottom-2 fade-in shadow-lg border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 [&>svg]:text-emerald-600"
            >
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>{toast.title}</AlertTitle>
              <AlertDescription>{toast.message}</AlertDescription>
            </Alert>
          )
        )}
      </div>
    </TooltipProvider>
  )
}

export default ArchivePage