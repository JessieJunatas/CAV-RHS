"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { type Signatory } from "@/types/signatory"
import { logAudit } from "@/utils/audit-log"
import { Button } from "@/components/animate-ui/components/buttons/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
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
  Plus, Pencil, Archive, X, Trash2,
  Users, CheckCircle2, TriangleAlert, CheckCircle,
  RotateCcw, Search, UserPlus, Check,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useCollapse } from "@/context/collapse-provider"
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert"

const ROLE_OPTIONS = [
  { value: "assistant_registrar", label: "Assistant Registrar", sublabel: "Prepared By" },
  { value: "registrar", label: "Registrar", sublabel: "Submitted By" },
  { value: "principal", label: "Principal", sublabel: "Submitted By" },
]

const ROLE_COLORS: Record<string, string> = {
  assistant_registrar: "bg-sky-500/10 text-sky-700 dark:text-sky-400 border-sky-500/20",
  registrar: "bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20",
  principal: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
}

function Avatar({ name, size = "md" }: { name: string; size?: "sm" | "md" }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
  const colors = [
    "bg-indigo-600", "bg-violet-600", "bg-teal-600",
    "bg-rose-600", "bg-amber-600", "bg-cyan-600",
  ]
  const color = colors[name.charCodeAt(0) % colors.length]
  const sizeClass = size === "sm" ? "w-7 h-7 text-xs" : "w-9 h-9 text-sm"
  return (
    <div className={`${sizeClass} rounded-full flex items-center justify-center text-white font-bold shrink-0 ${color}`}>
      {initials || "?"}
    </div>
  )
}

function RoleBadge({ roleType }: { roleType: string }) {
  const opt = ROLE_OPTIONS.find((r) => r.value === roleType)
  const colorClass = ROLE_COLORS[roleType] ?? "bg-muted text-muted-foreground border-border"
  return (
    <Badge variant="outline" className={cn("text-xs font-medium", colorClass)}>
      {opt?.label ?? roleType.replace(/_/g, " ")}
    </Badge>
  )
}

function StatusBadge({ isActive }: { isActive: boolean }) {
  if (isActive) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
        </span>
        <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Active</span>
      </div>
    )
  }
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
      <span className="text-sm text-muted-foreground font-medium">Inactive</span>
    </div>
  )
}

type Toast = { id: number; title: string; message: string; type: "success" | "error" | "info" }

function SignatoryForm({
  fullName, setFullName,
  position, setPosition,
  roleType, setRoleType,
  errors, setErrors,
  submitting, editingId, onSubmit,
}: {
  fullName: string; setFullName: (v: string) => void
  position: string; setPosition: (v: string) => void
  roleType: string; setRoleType: (v: string) => void
  errors: { fullName?: string; position?: string; roleType?: string }
  setErrors: React.Dispatch<React.SetStateAction<{ fullName?: string; position?: string; roleType?: string }>>
  submitting: boolean; editingId: string | null; onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Full Name
        </label>
        <Input
          placeholder="e.g. JUAN DELA CRUZ"
          value={fullName}
          autoFocus
          onChange={(e) => { setFullName(e.target.value); setErrors((p) => ({ ...p, fullName: undefined })) }}
          className={cn(
            "h-10 rounded-lg text-base",
            errors.fullName ? "border-destructive/60 bg-destructive/5 focus-visible:ring-destructive/30" : "border-border/60",
          )}
        />
        {errors.fullName && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <TriangleAlert className="h-3.5 w-3.5 shrink-0" /> {errors.fullName}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Position / Title
        </label>
        <Input
          placeholder="e.g. Registrar"
          value={position}
          onChange={(e) => { setPosition(e.target.value); setErrors((p) => ({ ...p, position: undefined })) }}
          className={cn(
            "h-10 rounded-lg text-base",
            errors.position ? "border-destructive/60 bg-destructive/5 focus-visible:ring-destructive/30" : "border-border/60",
          )}
        />
        {errors.position && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <TriangleAlert className="h-3.5 w-3.5 shrink-0" /> {errors.position}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Role Type
        </label>
        <div className="grid gap-2">
          {ROLE_OPTIONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => { setRoleType(r.value); setErrors((p) => ({ ...p, roleType: undefined })) }}
              className={cn(
                "flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-sm text-left transition-all",
                roleType === r.value
                  ? "border-primary/40 bg-primary/5 ring-1 ring-primary/20"
                  : "border-border/60 hover:border-border hover:bg-muted/40",
              )}
            >
              <div>
                <p className={cn("font-medium text-base", roleType === r.value ? "text-primary" : "text-foreground")}>
                  {r.label}
                </p>
                <p className="text-sm text-muted-foreground mt-0.5">{r.sublabel}</p>
              </div>
              {roleType === r.value && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </button>
          ))}
        </div>
        {errors.roleType && (
          <p className="text-sm text-destructive flex items-center gap-1">
            <TriangleAlert className="h-3.5 w-3.5 shrink-0" /> {errors.roleType}
          </p>
        )}
      </div>

      <Button type="submit" disabled={submitting} className="w-full gap-1.5 mt-2">
        {submitting ? (
          <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />Saving…</>
        ) : editingId ? (
          <><Pencil className="h-3.5 w-3.5" />Save Changes</>
        ) : (
          <><Plus className="h-3.5 w-3.5" />Add Signatory</>
        )}
      </Button>
    </form>
  )
}

function SignatorySheet({
  open, onClose, editingId,
  fullName, setFullName,
  position, setPosition,
  roleType, setRoleType,
  errors, setErrors,
  submitting, onSubmit,
}: {
  open: boolean
  onClose: () => void
  editingId: string | null
  fullName: string; setFullName: (v: string) => void
  position: string; setPosition: (v: string) => void
  roleType: string; setRoleType: (v: string) => void
  errors: { fullName?: string; position?: string; roleType?: string }
  setErrors: React.Dispatch<React.SetStateAction<{ fullName?: string; position?: string; roleType?: string }>>
  submitting: boolean
  onSubmit: (e: React.FormEvent) => void
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="w-full max-w-sm p-0 flex flex-col gap-0">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <SheetTitle className="text-base font-semibold">
            {editingId ? "Edit Signatory" : "New Signatory"}
          </SheetTitle>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          {editingId && (
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-muted/50 border border-border/60 mb-5">
              <Avatar name={fullName} size="sm" />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{fullName}</p>
                <p className="text-xs text-muted-foreground truncate">{position}</p>
              </div>
              <Badge variant="outline" className="ml-auto text-xs shrink-0">Editing</Badge>
            </div>
          )}
          <SignatoryForm
            fullName={fullName} setFullName={setFullName}
            position={position} setPosition={setPosition}
            roleType={roleType} setRoleType={setRoleType}
            errors={errors} setErrors={setErrors}
            submitting={submitting} editingId={editingId} onSubmit={onSubmit}
          />
        </div>
      </SheetContent>
    </Sheet>
  )
}

function DialogShell({
  icon, iconBg, title, description, nameChip, children, footer,
}: {
  icon: React.ReactNode
  iconBg: string
  title: string
  description: React.ReactNode
  nameChip?: string
  children?: React.ReactNode
  footer: React.ReactNode
}) {
  return (
    <AlertDialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
      <div className="flex items-start gap-3 px-5 pt-5 pb-4">
        <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5", iconBg)}>
          {icon}
        </div>
        <div className="space-y-1 min-w-0">
          <AlertDialogTitle className="text-base font-semibold leading-tight">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed text-muted-foreground">
            {description}
          </AlertDialogDescription>
        </div>
      </div>

      {nameChip && (
        <div className="mx-5 mb-4 flex items-center gap-2.5 px-3 py-2 rounded-lg bg-muted/50 border border-border/50">
          <div className="w-0.5 h-5 rounded-full bg-border shrink-0" />
          <p className="text-sm font-medium text-foreground truncate">{nameChip}</p>
        </div>
      )}

      {children && (
        <div className="px-5 pb-5">
          {children}
        </div>
      )}

      <AlertDialogFooter className="px-5 py-3 border-t border-border/60 bg-muted/30 sm:justify-end gap-2">
        {footer}
      </AlertDialogFooter>
    </AlertDialogContent>
  )
}

function DeactivateConfirmDialog({
  signatory, open, onOpenChange, onConfirmed,
}: {
  signatory: Signatory | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirmed: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <DialogShell
        iconBg="bg-amber-500/10"
        icon={<Archive className="h-4 w-4 text-amber-600 dark:text-amber-400" />}
        title="Deactivate signatory?"
        description={
          <>
            This signatory will be hidden from CAV form selectors.{" "}
            <span className="text-foreground font-medium">You can reactivate them anytime.</span>
          </>
        }
        nameChip={signatory?.full_name}
        footer={
          <>
            <AlertDialogCancel className="h-9 text-sm rounded-lg">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onConfirmed}
              variant={"pending"}
            >
              <Archive className="h-3.5 w-3.5 mr-1.5" />
              Yes, deactivate
            </AlertDialogAction>
          </>
        }
      />
    </AlertDialog>
  )
}

function DeleteConfirmDialog({
  signatory, open, onOpenChange, onConfirmed,
}: {
  signatory: Signatory | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirmed: () => void
}) {
  const [input, setInput] = useState("")
  const isMatch = input.trim() === "DELETE"

  useEffect(() => {
    if (open) setInput("")
  }, [open])

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <DialogShell
        iconBg="bg-destructive/10"
        icon={<Trash2 className="h-4 w-4 text-destructive" />}
        title="Delete signatory?"
        description={
          <>
            This is <span className="text-destructive font-medium">permanent</span> and cannot be undone.
            Consider deactivating instead if you may need this record later.
          </>
        }
        nameChip={signatory?.full_name}
        footer={
          <>
            <AlertDialogCancel className="h-9 text-sm rounded-lg" onClick={() => setInput("")}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!isMatch}
              onClick={onConfirmed}
              variant={"destructive"}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete permanently
            </AlertDialogAction>
          </>
        }
      >
        <div className="space-y-2">
          <label className="text-xs font-medium uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
            Type{" "}
            <code className="text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-md text-xs tracking-normal normal-case">
              DELETE
            </code>{" "}
            to confirm
          </label>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="DELETE"
            autoFocus
            className={cn(
              "h-9 text-sm rounded-lg tracking-widest",
              input.length > 0 && !isMatch
                ? "border-destructive/50 bg-destructive/5 focus-visible:ring-destructive/20"
                : isMatch
                  ? "border-emerald-500/50 bg-emerald-500/5 focus-visible:ring-emerald-500/20"
                  : "border-border/60",
            )}
            onKeyDown={(e) => {
              if (e.key === "Enter" && isMatch) { onOpenChange(false); onConfirmed() }
            }}
          />
          <div className="h-5">
            {input.length > 0 && !isMatch && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <TriangleAlert className="h-3 w-3 shrink-0" />
                Type DELETE in all caps to confirm.
              </p>
            )}
            {isMatch && (
              <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="h-3 w-3 shrink-0" />
                Confirmed.
              </p>
            )}
          </div>
        </div>
      </DialogShell>
    </AlertDialog>
  )
}

export default function SignatoriesPage() {
  const { px } = useCollapse()
  const [signatories, setSignatories] = useState<Signatory[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [fullName, setFullName] = useState("")
  const [position, setPosition] = useState("")
  const [roleType, setRoleType] = useState<string>("assistant_registrar")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ fullName?: string; position?: string; roleType?: string }>({})

  const [panelOpen, setPanelOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all")

  const [confirmDeactivateId, setConfirmDeactivateId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  const pushToast = (title: string, message: string, type: Toast["type"] = "success") => {
    const id = Date.now()
    setToasts((p) => [...p, { id, title, message, type }])
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4000)
  }

  const fetchSignatories = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("signatories")
      .select("*")
      .order("created_at", { ascending: false })
    if (!error && data) setSignatories(data)
    setLoading(false)
  }

  useEffect(() => { fetchSignatories() }, [])

  const filtered = signatories.filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.position.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter =
      filterStatus === "all" ||
      (filterStatus === "active" && s.is_active) ||
      (filterStatus === "inactive" && !s.is_active)
    return matchesSearch && matchesFilter
  })

  const validate = () => {
    const e: typeof errors = {}
    if (!fullName.trim()) e.fullName = "Full name is required."
    if (!position.trim()) e.position = "Position is required."
    if (!roleType) e.roleType = "Role type is required."
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)

    if (editingId) {
      const { error } = await supabase
        .from("signatories")
        .update({ full_name: fullName, position, role_type: roleType })
        .eq("id", editingId)

      if (error) { pushToast("Update failed", error.message, "error"); setSubmitting(false); return }
      pushToast("Signatory updated", `${fullName} has been updated.`)
      try { await logAudit({ action: "updated", event: `Updated signatory: ${fullName} (${position})`, recordId: editingId, tableName: "signatories" }) } catch {}
      setEditingId(null)
    } else {
      const { data: existing } = await supabase
        .from("signatories").select("id").ilike("full_name", fullName.trim()).single()

      if (existing) {
        setErrors((p) => ({ ...p, fullName: "A signatory with this name already exists." }))
        setSubmitting(false)
        return
      }

      const { data: inserted, error } = await supabase
        .from("signatories")
        .insert({ full_name: fullName, position, role_type: roleType, is_active: true })
        .select("id").single()

      if (error) { pushToast("Failed to add", error.message, "error"); setSubmitting(false); return }
      pushToast("Signatory added", `${fullName} has been added.`)
      try { await logAudit({ action: "created", event: `Added signatory: ${fullName} (${position})`, recordId: inserted.id, tableName: "signatories" }) } catch {}
    }

    setFullName(""); setPosition(""); setRoleType("assistant_registrar"); setErrors({})
    setSubmitting(false)
    setPanelOpen(false)
    fetchSignatories()
  }

  const handleDeactivateConfirmed = async () => {
    if (!confirmDeactivateId) return
    const s = signatories.find((s) => s.id === confirmDeactivateId)
    const { error } = await supabase.from("signatories").update({ is_active: false }).eq("id", confirmDeactivateId)
    if (error) { pushToast("Deactivation failed", error.message, "error"); setConfirmDeactivateId(null); return }
    try { await logAudit({ action: "deactivated", event: `Deactivated signatory: ${s?.full_name}`, recordId: confirmDeactivateId, tableName: "signatories" }) } catch {}
    setConfirmDeactivateId(null)
    pushToast("Deactivated", `${s?.full_name} marked inactive.`, "info")
    fetchSignatories()
  }

  const handleReactivate = async (s: Signatory) => {
    const { error } = await supabase.from("signatories").update({ is_active: true }).eq("id", s.id)
    if (error) { pushToast("Reactivation failed", error.message, "error"); return }
    try { await logAudit({ action: "reactivated", event: `Reactivated signatory: ${s.full_name}`, recordId: s.id, tableName: "signatories" }) } catch {}
    pushToast("Reactivated", `${s.full_name} is now active.`)
    fetchSignatories()
  }

  const handleDeleteConfirmed = async () => {
    if (!confirmDeleteId) return
    const s = signatories.find((s) => s.id === confirmDeleteId)
    const { error } = await supabase.from("signatories").delete().eq("id", confirmDeleteId)
    if (error) { pushToast("Delete failed", error.message, "error"); return }
    try { await logAudit({ action: "deleted", event: `Deleted signatory: ${s?.full_name}`, recordId: confirmDeleteId, tableName: "signatories" }) } catch {}
    setConfirmDeleteId(null)
    pushToast("Deleted", `${s?.full_name} permanently removed.`)
    fetchSignatories()
  }

  const handleEdit = (s: Signatory) => {
    setEditingId(s.id)
    setFullName(s.full_name)
    setPosition(s.position)
    setRoleType(s.role_type ?? "assistant_registrar")
    setErrors({})
    setPanelOpen(true)
  }

  const handleClosePanel = () => {
    setPanelOpen(false)
    setTimeout(() => {
      setEditingId(null); setFullName(""); setPosition(""); setRoleType("assistant_registrar"); setErrors({})
    }, 300)
  }

  const activeCount = signatories.filter((s) => s.is_active).length
  const inactiveCount = signatories.filter((s) => !s.is_active).length
  const deactivateTarget = signatories.find((s) => s.id === confirmDeactivateId)
  const deleteTarget = signatories.find((s) => s.id === confirmDeleteId)

  return (
    <div className={`bg-background text-foreground ${px} pt-5 transition-all duration-300`}>
      <div className="space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-background" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-tight">Signatories</h1>
              <p className="text-sm text-muted-foreground leading-tight mt-0.5">
                Records Management — Document Signatories
              </p>
            </div>
          </div>
          <Button size="sm" className="gap-1.5 shrink-0" onClick={() => {
            setEditingId(null)
            setFullName(""); setPosition(""); setRoleType("assistant_registrar"); setErrors({})
            setPanelOpen(true)
          }}>
            <UserPlus className="h-4 w-4" />
            Add Signatory
          </Button>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Signatories", value: signatories.length, icon: <Users className="h-4 w-4 text-muted-foreground" />, bg: "bg-muted/60" },
            { label: "Active", value: activeCount, icon: <CheckCircle className="h-4 w-4 text-emerald-600" />, bg: "bg-emerald-500/10", valueClass: "text-emerald-700 dark:text-emerald-400" },
            { label: "Inactive", value: inactiveCount, icon: <Archive className="h-4 w-4 text-muted-foreground" />, bg: "bg-muted/60" },
          ].map(({ label, value, icon, bg, valueClass }) => (
            <div key={label} className="rounded-2xl border bg-card p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>{icon}</div>
              <div>
                <p className={cn("text-2xl font-bold leading-none", valueClass)}>{value}</p>
                <p className="text-xs text-muted-foreground mt-1 font-medium leading-tight">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Table Card ── */}
        <Card className="rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2.5 px-4 py-3 border-b bg-muted/30">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search by name or position…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 pl-9 pr-3 text-sm rounded-full border bg-background"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {(["all", "active", "inactive"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilterStatus(f)}
                  className={cn(
                    "h-9 px-3 rounded-lg text-sm font-medium transition-all capitalize",
                    filterStatus === f
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted",
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <CardContent className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-9 w-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3.5 w-40 rounded" />
                    <Skeleton className="h-3 w-24 rounded" />
                  </div>
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-20 rounded" />
                </div>
              ))}
            </CardContent>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              {searchQuery ? (
                <>
                  <Search className="h-8 w-8 opacity-20" />
                  <div className="text-center">
                    <p className="text-base font-medium">No results for "{searchQuery}"</p>
                    <p className="text-sm opacity-60 mt-0.5">Try a different name or position.</p>
                  </div>
                  <button onClick={() => setSearchQuery("")} className="text-sm text-primary hover:underline mt-1">
                    Clear search
                  </button>
                </>
              ) : (
                <>
                  <Users className="h-8 w-8 opacity-20" />
                  <div className="text-center">
                    <p className="text-base font-medium">No signatories yet</p>
                    <p className="text-sm opacity-60 mt-0.5">Add one to get started.</p>
                  </div>
                  <Button size="sm" variant="outline" className="gap-1.5 mt-1" onClick={() => setPanelOpen(true)}>
                    <Plus className="h-3.5 w-3.5" /> Add Signatory
                  </Button>
                </>
              )}
            </div>
          ) : (
            <>
              <ScrollArea className="h-120">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="pl-5 text-xs uppercase tracking-wider font-semibold text-muted-foreground w-[38%]">Signatory</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground w-[22%]">Role</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground w-[16%]">Status</TableHead>
                      <TableHead className="text-xs uppercase tracking-wider font-semibold text-muted-foreground text-right pr-5 w-[24%]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((s) => (
                      <TableRow
                        key={s.id}
                        className={cn(
                          "transition-colors border-b border-border/40 last:border-0",
                          editingId === s.id && "bg-primary/5",
                          !s.is_active && "opacity-55",
                        )}
                      >
                        <TableCell className="pl-5 py-3.5">
                          <div className="flex items-center gap-2.5">
                            <Avatar name={s.full_name} />
                            <div className="min-w-0">
                              <p className="font-semibold text-base truncate">{s.full_name}</p>
                              <p className="text-sm text-muted-foreground truncate mt-0.5">{s.position}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-3.5">
                          <RoleBadge roleType={s.role_type ?? ""} />
                        </TableCell>
                        <TableCell className="py-3.5">
                          <StatusBadge isActive={s.is_active} />
                        </TableCell>
                        <TableCell className="py-3.5 pr-5">
                          <div className="flex items-center justify-end gap-1.5">
                            {s.is_active ? (
                              <>
                                <button
                                  onClick={() => handleEdit(s)}
                                  title="Edit"
                                  className="h-8 w-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => setConfirmDeactivateId(s.id)}
                                  title="Deactivate"
                                  className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors font-medium"
                                >
                                  <Archive className="h-3.5 w-3.5" />
                                  Deactivate
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleReactivate(s)}
                                  title="Reactivate"
                                  className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-sm text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 transition-colors font-medium"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  Reactivate
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(s.id)}
                                  title="Delete permanently"
                                  className="h-8 px-2.5 rounded-md flex items-center gap-1.5 text-sm text-destructive hover:bg-destructive/10 transition-colors font-medium"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>

              <div className="px-5 py-3 border-t bg-muted/20 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {filtered.length !== signatories.length
                    ? <>{filtered.length} of {signatories.length} signatories</>
                    : <>{signatories.length} signator{signatories.length !== 1 ? "ies" : "y"}</>
                  }
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-emerald-600 dark:text-emerald-400">{activeCount}</span> active ·{" "}
                  <span className="font-medium">{inactiveCount}</span> inactive
                </p>
              </div>
            </>
          )}
        </Card>
      </div>

      <SignatorySheet
        open={panelOpen}
        onClose={handleClosePanel}
        editingId={editingId}
        fullName={fullName} setFullName={setFullName}
        position={position} setPosition={setPosition}
        roleType={roleType} setRoleType={setRoleType}
        errors={errors} setErrors={setErrors}
        submitting={submitting}
        onSubmit={handleSubmit}
      />

      <DeactivateConfirmDialog
        signatory={deactivateTarget}
        open={!!confirmDeactivateId}
        onOpenChange={(o) => { if (!o) setConfirmDeactivateId(null) }}
        onConfirmed={handleDeactivateConfirmed}
      />

      <DeleteConfirmDialog
        signatory={deleteTarget}
        open={!!confirmDeleteId}
        onOpenChange={(o) => { if (!o) setConfirmDeleteId(null) }}
        onConfirmed={handleDeleteConfirmed}
      />

      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 pointer-events-none">
        {toasts.map((toast) => {
          const isError = toast.type === "error"
          const isInfo = toast.type === "info"
          return (
            <Alert
              key={toast.id}
              variant={isError ? "destructive" : "default"}
              className={cn(
                "w-80 shadow-lg animate-in slide-in-from-bottom-2 fade-in pointer-events-auto",
                isInfo && "text-amber-700 dark:text-amber-400 border-amber-500/20 bg-amber-500/10",
                !isError && !isInfo && "text-emerald-700 dark:text-emerald-400 border-emerald-500/20 bg-emerald-500/10",
              )}
            >
              {isError
                ? <TriangleAlert className="h-4 w-4" />
                : isInfo
                  ? <Archive className="h-4 w-4" />
                  : <CheckCircle2 className="h-4 w-4" />
              }
              <AlertTitle>{toast.title}</AlertTitle>
              <AlertDescription>{toast.message}</AlertDescription>
            </Alert>
          )
        })}
      </div>
    </div>
  )
}