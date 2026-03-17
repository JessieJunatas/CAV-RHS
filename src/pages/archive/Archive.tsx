/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useRef } from "react"
import { createPortal } from "react-dom"
import { supabase } from "@/lib/supabase"
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
  Archive, RotateCcw, Clock, Hash,
  Inbox, Trash2, CheckCircle2, TriangleAlert,
} from "lucide-react"
import { logAudit } from "@/utils/audit-log"
import { useCollapse } from "@/context/collapse-provider"

type Toast = { id: number; type: "error" | "success"; title: string; message: string }

type CavForm = {
  id: number
  full_legal_name: string
  control_no: string
  created_at: string
  is_archived: boolean
}

function ArchivePage() {
  const { px } = useCollapse()
  const [records, setRecords]       = useState<CavForm[]>([])
  const [loading, setLoading]       = useState(true)
  const [restoringId, setRestoringId] = useState<number | null>(null)
  const [deletingId, setDeletingId]   = useState<number | null>(null)
  const [selected, setSelected]     = useState<Set<number>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [toasts, setToasts]         = useState<Toast[]>([])

  const toastIdRef = useRef(0)

  const pushToast = (type: Toast["type"], title: string, message: string) => {
    const id = ++toastIdRef.current
    setToasts(prev => [...prev, { id, type, title, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4500)
  }

  // Initial load — setState calls are in the .then() callback, not the effect body
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    supabase
      .from("cav_forms")
      .select("*")
      .eq("is_archived", true)
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (cancelled) return
        if (!error && data) setRecords(data)
        setLoading(false)
      })
    return () => { cancelled = true }
  }, [])


  const handleRestore = async (id: number) => {
    setRestoringId(id)
    const record   = records.find(r => r.id === id)
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
    pushToast("success", "Record restored", `"${fullName}" is now visible on the main dashboard.`)
    setRestoringId(null)
  }

  const handleDelete = async (id: number) => {
    setDeletingId(id)
    const record   = records.find(r => r.id === id)
    const fullName = record?.full_legal_name ?? "Unknown"

    const { error } = await supabase.from("cav_forms").delete().eq("id", id)

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
    pushToast("success", "Record deleted", `"${fullName}" has been permanently removed.`)
    setDeletingId(null)
  }

  const handleBulkRestore = async (ids: number[]) => {
    setBulkDeleting(true)

    const { error } = await supabase
      .from("cav_forms")
      .update({ is_archived: false })
      .in("id", ids)

    if (error) {
      pushToast("error", "Bulk restore failed", error.message)
      setBulkDeleting(false)
      return
    }

    try {
      await Promise.all(ids.map(id => {
        const record = records.find(r => r.id === id)
        return logAudit({
          action: "restored",
          event: `Restored archived form for ${record?.full_legal_name ?? "Unknown"}`,
          recordId: id.toString(),
        })
      }))
    } catch (err: any) {
      console.error("Audit log failed:", err)
    }

    setRecords(prev => prev.filter(r => !ids.includes(r.id)))
    setSelected(new Set())
    pushToast(
      "success",
      `${ids.length} record${ids.length !== 1 ? "s" : ""} restored`,
      "They are now visible on the main dashboard."
    )
    setBulkDeleting(false)
  }

  const handleBulkDelete = async (ids: number[]) => {
    setBulkDeleting(true)
    const { error } = await supabase.from("cav_forms").delete().in("id", ids)

    if (error) {
      pushToast("error", "Bulk delete failed", error.message)
      setBulkDeleting(false)
      return
    }

    try {
      await Promise.all(ids.map(id => {
        const record = records.find(r => r.id === id)
        return logAudit({
          action: "deleted",
          event: `Deleted archived form for ${record?.full_legal_name ?? "Unknown"}`,
          recordId: id.toString(),
        })
      }))
    } catch (err: any) {
      console.error("Audit log failed:", err)
    }

    setRecords(prev => prev.filter(r => !ids.includes(r.id)))
    setSelected(new Set())
    pushToast(
      "success",
      `${ids.length} record${ids.length !== 1 ? "s" : ""} deleted`,
      "They have been permanently removed."
    )
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
      month: "short", day: "numeric", year: "numeric",
    }).format(new Date(val))
  }

  const allSelected  = records.length > 0 && selected.size === records.length
  const someSelected = selected.size > 0
  const selectedIds  = Array.from(selected)

  return (
    <TooltipProvider delayDuration={300}>
      <div className="bg-background text-foreground">
        <div className={`${px} py-10 transition-all duration-300`}>

          {/* ── Header ── */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
                <Archive className="h-5 w-5 text-secondary" />
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

          {/* ── Bulk action bar ── */}
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

                  {/* ── Bulk restore ── */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="success" disabled={bulkDeleting}>
                        <RotateCcw className="h-3 w-3" />
                        Restore {selected.size}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-sm rounded-2xl">
                      <AlertDialogHeader className="items-center text-center sm:text-center">
                        <div className="mx-auto mb-2 h-14 w-14 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center">
                          <RotateCcw className="h-7 w-7 text-success" />
                        </div>
                        <AlertDialogTitle className="text-base font-bold">
                          Restore {selected.size} record{selected.size !== 1 ? "s" : ""}?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm leading-relaxed">
                          These records will be moved back to active records and visible on the main dashboard.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
                        <AlertDialogCancel className="flex-1 rounded-xl h-10 m-0 text-sm">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleBulkRestore(selectedIds)}
                          variant="success"
                          className="flex-1 rounded-xl h-10 gap-2 m-0 text-sm"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Restore all
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* ── Bulk delete ── */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="sm" variant="destructive" disabled={bulkDeleting}>
                        <Trash2 className="h-3 w-3" />
                        Delete {selected.size}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-sm rounded-2xl">
                      <AlertDialogHeader className="items-center text-center sm:text-center">
                        <div className="mx-auto mb-2 h-14 w-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
                          <Trash2 className="h-7 w-7 text-destructive" />
                        </div>
                        <AlertDialogTitle className="text-base font-bold">
                          Delete {selected.size} record{selected.size !== 1 ? "s" : ""}?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm leading-relaxed">
                          This action is <span className="font-semibold text-foreground">permanent</span> and cannot
                          be undone.{selected.size === records.length && " This will delete all archived records."}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
                        <AlertDialogCancel className="flex-1 rounded-xl h-10 m-0 text-sm">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={() => handleBulkDelete(selectedIds)}
                          className="flex-1 rounded-xl h-10 gap-2 m-0 text-sm"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Yes, delete all
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                </div>
              )}
            </div>
          )}

          {/* ── Loading skeletons ── */}
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

          {/* ── Empty state ── */}
          {!loading && records.length === 0 && (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <Inbox className="h-6 w-6 text-muted-foreground/50" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No archived records</p>
              <p className="mt-1 text-xs text-muted-foreground/60">Records you archive will appear here</p>
            </div>
          )}

          {/* ── Records list ── */}
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
                  <Checkbox
                    checked={selected.has(record.id)}
                    onCheckedChange={() => toggleSelect(record.id)}
                    className="rounded shrink-0"
                  />

                  <img
                    src={`https://avatar.vercel.sh/${encodeURIComponent(record.full_legal_name)}`}
                    alt={record.full_legal_name}
                    className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-border"
                  />

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

                  <div className="flex items-center gap-1.5 shrink-0">

                    {/* ── Single restore ── */}
                    <AlertDialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="success"
                              disabled={restoringId === record.id || deletingId === record.id}
                            >
                              <RotateCcw className={`h-3.5 w-3.5 ${restoringId === record.id ? "animate-spin" : ""}`} />
                              {restoringId === record.id ? "Restoring…" : "Restore"}
                            </Button>
                          </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">Restore to active records</TooltipContent>
                      </Tooltip>

                      <AlertDialogContent className="max-w-sm rounded-2xl">
                        <AlertDialogHeader className="items-center text-center sm:text-center">
                          <div className="mx-auto mb-2 h-14 w-14 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center">
                            <RotateCcw className="h-7 w-7 text-success" />
                          </div>
                          <AlertDialogTitle className="text-base font-bold">
                            Restore this record?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-sm leading-relaxed">
                            <span className="font-medium text-foreground">"{record.full_legal_name}"</span> will be
                            moved back to active records and visible on the main dashboard.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
                          <AlertDialogCancel className="flex-1 rounded-xl h-10 m-0 text-sm">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleRestore(record.id)}
                            variant="success"
                            className="flex-1 rounded-xl h-10 gap-2 m-0 text-sm"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Yes, restore it
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>

                    {/* ── Single delete ── */}
                    <AlertDialog>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={deletingId === record.id}
                            >
                              <Trash2 className={`h-3.5 w-3.5 ${deletingId === record.id ? "animate-pulse" : ""}`} />
                              {deletingId === record.id ? "Deleting…" : "Delete"}
                            </Button>
                          </AlertDialogTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">Permanently delete</TooltipContent>
                      </Tooltip>

                      <AlertDialogContent className="max-w-sm rounded-2xl">
                        <AlertDialogHeader className="items-center text-center sm:text-center">
                          <div className="mx-auto mb-2 h-14 w-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
                            <Trash2 className="h-7 w-7 text-destructive" />
                          </div>
                          <AlertDialogTitle className="text-base font-bold">
                            Delete this record?
                          </AlertDialogTitle>
                          <AlertDialogDescription className="text-sm leading-relaxed">
                            <span className="font-medium text-foreground">"{record.full_legal_name}"</span> will be
                            permanently deleted. This action{" "}
                            <span className="font-semibold text-foreground">cannot be undone</span>.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
                          <AlertDialogCancel className="flex-1 rounded-xl h-10 m-0 text-sm">Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(record.id)}
                            variant="destructive"
                            className="flex-1 rounded-xl h-10 gap-2 m-0 text-sm"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

      {/* ══ TOAST NOTIFICATIONS — portalled to document.body ═════════════════ */}
      {createPortal(
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
          {toasts.map((t) => (
            <div key={t.id} className="pointer-events-auto animate-in slide-in-from-bottom-3 fade-in duration-200">
              {t.type === "error" ? (
                <Alert variant="destructive" className="w-80 shadow-lg">
                  <TriangleAlert className="h-4 w-4" />
                  <AlertTitle className="text-sm font-semibold">{t.title}</AlertTitle>
                  <AlertDescription className="text-sm">{t.message}</AlertDescription>
                </Alert>
              ) : (
                <Alert variant="success" className="w-80 shadow-lg">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle className="text-sm font-semibold">{t.title}</AlertTitle>
                  <AlertDescription className="text-sm">{t.message}</AlertDescription>
                </Alert>
              )}
            </div>
          ))}
        </div>,
        document.body
      )}
    </TooltipProvider>
  )
}

export default ArchivePage