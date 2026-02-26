"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { type Signatory } from "@/types/signatory"
import { logAudit } from "@/utils/audit-log"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Plus, Pencil, Archive, X,
  Users, CheckCircle2, TriangleAlert, CheckCircle,
} from "lucide-react"

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const initials = name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase()
  const colors = ["bg-indigo-600", "bg-violet-600", "bg-teal-600", "bg-rose-600", "bg-amber-600", "bg-cyan-600"]
  const color = colors[name.charCodeAt(0) % colors.length]
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0 ${color}`}>
      {initials || "?"}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, className }: {
  label: string; value: number; icon: React.ReactNode; className?: string
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4 flex items-center gap-3.5">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${className}`}>
          {icon}
        </div>
        <div>
          <p className="text-xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Toast type ───────────────────────────────────────────────────────────────
type Toast = { id: number; title: string; message: string; type: "success" | "error" | "info" }

export default function SignatoriesPage() {
  const [signatories, setSignatories] = useState<Signatory[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [fullName, setFullName] = useState("")
  const [position, setPosition] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ fullName?: string; position?: string }>({})

  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  const pushToast = (title: string, message: string, type: Toast["type"] = "success") => {
    const id = Date.now()
    setToasts((p) => [...p, { id, title, message, type }])
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000)
  }

  const fetchSignatories = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("signatories").select("*").order("created_at", { ascending: false })
    if (!error && data) setSignatories(data)
    setLoading(false)
  }

  useEffect(() => { fetchSignatories() }, [])

  const validate = () => {
    const e: typeof errors = {}
    if (!fullName.trim()) e.fullName = "Full name is required."
    if (!position.trim()) e.position = "Position is required."
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)

    if (editingId) {
      await supabase.from("signatories").update({ full_name: fullName, position }).eq("id", editingId)
      pushToast("Signatory updated", `${fullName} has been updated.`)
      setEditingId(null)
    } else {
      await supabase.from("signatories").insert({ full_name: fullName, position })
      pushToast("Signatory added", `${fullName} has been added.`)
    }

    try {
      await logAudit({
        action: editingId ? "updated" : "created",
        event: `${editingId ? "Updated" : "Added"} signatory: ${fullName} (${position})`,
        recordId: editingId || "new",
        tableName: "signatories",
      })
    } catch (err) { console.error("Audit log failed:", err) }

    setFullName(""); setPosition(""); setErrors({})
    setSubmitting(false)
    fetchSignatories()
  }

  const handleDeactivateConfirmed = async () => {
    if (!confirmId) return
    const s = signatories.find((s) => s.id === confirmId)
    await supabase.from("signatories").update({ is_active: false }).eq("id", confirmId)

    try {
      await logAudit({
        action: "archived",
        event: `Deactivated signatory: ${s?.full_name}`,
        recordId: confirmId,
        tableName: "signatories",
      })
    } catch (err) { console.error("Audit log failed:", err) }

    setConfirmId(null)
    pushToast("Signatory deactivated", `${s?.full_name} has been marked inactive.`, "info")
    fetchSignatories()
  }

  const handleEdit = (s: Signatory) => {
    setEditingId(s.id); setFullName(s.full_name); setPosition(s.position); setErrors({})
    setTimeout(() => document.getElementById("signatory-form")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50)
  }

  const handleCancelEdit = () => { setEditingId(null); setFullName(""); setPosition(""); setErrors({}) }

  const activeCount = signatories.filter((s) => s.is_active).length
  const inactiveCount = signatories.filter((s) => !s.is_active).length
  const confirmTarget = signatories.find((s) => s.id === confirmId)

  return (
    <div className="bg-background text-foreground p-6 lg:p-8">
      <div className="max-w-3xl mx-auto space-y-7">

        {/* Header */}
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <Badge variant="outline" className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground mb-1">
              Records Management
            </Badge>
            <h1 className="text-2xl font-bold tracking-tight">Signatories</h1>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Total" value={signatories.length}
            icon={<Users className="h-5 w-5 text-muted-foreground" />}
            className="bg-muted"
          />
          <StatCard label="Active" value={activeCount}
            icon={<CheckCircle className="h-5 w-5 text-emerald-600" />}
            className="bg-emerald-500/10"
          />
          <StatCard label="Inactive" value={inactiveCount}
            icon={<Archive className="h-5 w-5 text-muted-foreground" />}
            className="bg-muted"
          />
        </div>

        {/* Form Card */}
        <Card
          id="signatory-form"
          className={`rounded-2xl transition-all duration-300 ${editingId ? "ring-2 ring-primary/30 border-primary/30" : ""}`}
        >
          <CardHeader className={`flex flex-row items-center justify-between px-6 py-4 border-b rounded-t-2xl ${editingId ? "bg-primary/5 border-primary/20" : "bg-muted/40"}`}>
            <div className="flex items-center gap-2.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${editingId ? "bg-primary text-primary-foreground" : "bg-foreground text-background"}`}>
                {editingId ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-4 w-4" />}
              </div>
              <h2 className="text-sm font-semibold">
                {editingId ? "Edit Signatory" : "Add New Signatory"}
              </h2>
            </div>
            {editingId && (
              <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="gap-1.5 text-xs text-muted-foreground">
                <X className="h-4 w-4" /> Cancel
              </Button>
            )}
          </CardHeader>

          <CardContent className="px-6 py-5">
            <form onSubmit={handleSubmit}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Full Name
                  </label>
                  <Input
                    placeholder="e.g. JUAN DELA CRUZ"
                    value={fullName}
                    onChange={(e) => { setFullName(e.target.value); setErrors((p) => ({ ...p, fullName: undefined })) }}
                    className={`h-9 rounded-lg text-sm ${errors.fullName ? "border-destructive/60 bg-destructive/5 focus-visible:ring-destructive/30" : "border-border/60"}`}
                  />
                  {errors.fullName && <p className="text-xs text-destructive">{errors.fullName}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Position / Title
                  </label>
                  <Input
                    placeholder="e.g. Registrar"
                    value={position}
                    onChange={(e) => { setPosition(e.target.value); setErrors((p) => ({ ...p, position: undefined })) }}
                    className={`h-9 rounded-lg text-sm ${errors.position ? "border-destructive/60 bg-destructive/5 focus-visible:ring-destructive/30" : "border-border/60"}`}
                  />
                  {errors.position && <p className="text-xs text-destructive">{errors.position}</p>}
                </div>
              </div>

              <div className="flex justify-end">
                <Button type="submit" disabled={submitting} size="sm" className="gap-1.5 min-w-[130px]">
                  {submitting ? (
                    <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />Saving…</>
                  ) : editingId ? (
                    <><Pencil className="h-3.5 w-3.5" />Save Changes</>
                  ) : (
                    <><Plus className="h-3.5 w-3.5" />Add Signatory</>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Table Card */}
        <Card className="rounded-2xl overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between px-6 py-4 border-b bg-muted/40 rounded-t-2xl">
            <h2 className="text-sm font-semibold">All Signatories</h2>
            {!loading && (
              <span className="text-xs text-muted-foreground">
                {signatories.length} record{signatories.length !== 1 ? "s" : ""}
              </span>
            )}
          </CardHeader>

          {loading ? (
            <CardContent className="p-6 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-40 rounded" />
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              ))}
            </CardContent>
          ) : signatories.length === 0 ? (
            <CardContent className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground">
              <Users className="h-8 w-8 opacity-30" />
              <p className="text-sm font-medium">No signatories yet</p>
              <p className="text-xs opacity-60">Add one using the form above.</p>
            </CardContent>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/20">
                    <TableHead className="pl-6 text-xs uppercase tracking-wider">Signatory</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Position</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-xs uppercase tracking-wider text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {signatories.map((s) => (
                    <TableRow
                      key={s.id}
                      className={`group transition-colors ${editingId === s.id ? "bg-primary/5" : ""} ${!s.is_active ? "opacity-50" : ""}`}
                    >
                      <TableCell className="pl-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <Avatar name={s.full_name} />
                          <span className={`font-semibold text-sm ${!s.is_active ? "line-through decoration-muted-foreground" : ""}`}>
                            {s.full_name}
                          </span>
                        </div>
                      </TableCell>

                      <TableCell className="text-sm text-muted-foreground py-3.5">{s.position}</TableCell>

                      <TableCell className="py-3.5">
                        <Badge
                          variant="outline"
                          className={s.is_active
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1.5"
                            : "bg-muted text-muted-foreground border-border gap-1.5"}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${s.is_active ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                          {s.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>

                      <TableCell className="py-3.5 pr-6">
                        <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 gap-1.5 text-xs rounded-lg"
                            onClick={() => handleEdit(s)}
                          >
                            <Pencil className="h-3 w-3" /> Edit
                          </Button>
                          {s.is_active && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 gap-1.5 text-xs rounded-lg border-amber-500/30 text-amber-600 hover:bg-amber-500 hover:text-white hover:border-amber-500 transition-colors"
                              onClick={() => setConfirmId(s.id)}
                            >
                              <Archive className="h-3 w-3" /> Deactivate
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="px-6 py-3 border-t bg-muted/20">
                <p className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">{activeCount}</span> active ·{" "}
                  <span className="font-semibold text-foreground">{inactiveCount}</span> inactive
                </p>
              </div>
            </>
          )}
        </Card>

      </div>

      {/* Confirm Deactivate Dialog */}
      <AlertDialog open={!!confirmId} onOpenChange={(o) => { if (!o) setConfirmId(null) }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate this signatory?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              <span className="font-semibold text-foreground">"{confirmTarget?.full_name}"</span> will be
              marked inactive and hidden from CAV form selectors.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="h-8 text-xs rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivateConfirmed}
              className="h-8 text-xs rounded-lg"
            >
              Yes, Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3">
        {toasts.map((toast) =>
          toast.type === "error" ? (
            <Alert key={toast.id} variant="destructive" className="w-72 animate-in slide-in-from-bottom-2 fade-in shadow-lg">
              <TriangleAlert className="h-4 w-4" />
              <AlertTitle>{toast.title}</AlertTitle>
              <AlertDescription>{toast.message}</AlertDescription>
            </Alert>
          ) : toast.type === "info" ? (
            <Alert key={toast.id} className="w-72 animate-in slide-in-from-bottom-2 fade-in shadow-lg border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-400 [&>svg]:text-amber-600">
              <Archive className="h-4 w-4" />
              <AlertTitle>{toast.title}</AlertTitle>
              <AlertDescription>{toast.message}</AlertDescription>
            </Alert>
          ) : (
            <Alert key={toast.id} className="w-72 animate-in slide-in-from-bottom-2 fade-in shadow-lg border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 [&>svg]:text-emerald-600">
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>{toast.title}</AlertTitle>
              <AlertDescription>{toast.message}</AlertDescription>
            </Alert>
          )
        )}
      </div>
    </div>
  )
}