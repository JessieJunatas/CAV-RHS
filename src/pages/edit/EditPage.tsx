/* eslint-disable @typescript-eslint/no-unused-expressions */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/animate-ui/components/buttons/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { logAudit } from "@/utils/audit-log"
import { getChangedFields } from "@/utils/getChangedFields"
import { getFormTypeLabel } from "@/utils/formTypeUtils"
import { generatePreviewUrl } from "@/utils/generateCAVpreview"
import { generateCavPDF } from "@/utils/generateCAVpdf"
import { generateK12PreviewUrl } from "@/utils/generateCAVK12preview"
import { generateCavK12PDF } from "@/utils/generateCAVK12pdf"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { DatePicker } from "@/components/ui/date-picker"
import {
  ArrowLeft, Save, CheckCircle2, AlertCircle,
  User, GraduationCap, BookOpen, Calendar,
  Hash, ClipboardList, Pencil, Send, CircleDot,
  FileText, Download, TriangleAlert, Loader2,
  ChevronDown, Pen, Printer, RotateCcw, X,
} from "lucide-react"
import { useCollapse } from "@/context/collapse-provider"

// ─── Types ────────────────────────────────────────────────────────────────────

type FormData = {
  full_legal_name: string
  date_issued: string
  date_of_transmission: string
  school_year_completed: string
  date_of_application: string
  school_year_graduated: string
  control_no: string
  lrn?: string
  enrolled_grade: string
  enrolled_sy: string
  status_completed_grade: string
  status_completed_sy: string
  status_graduated_sy: string
  prepared_by?: string
  submitted_by?: string
  form_type?: number
  [key: string]: any
}

type Toast = { id: number; type: "error" | "success"; title: string; message: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const REQUIRED_FIELDS: (keyof FormData)[] = [
  "full_legal_name",
  "control_no",
  "school_year_graduated",
  "date_issued",
  "date_of_application",
  "date_of_transmission",
  "prepared_by",
  "submitted_by",
]

const FIELD_LABELS: Partial<Record<keyof FormData, string>> = {
  full_legal_name: "Complete Name",
  control_no: "Control No.",
  school_year_graduated: "SY Graduated",
  date_issued: "Date Issued",
  date_of_application: "Date of Application",
  date_of_transmission: "Date of Transmission",
  prepared_by: "Prepared By",
  submitted_by: "Submitted By",
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  title, subtitle, icon, children, changedCount,
}: {
  title: string
  subtitle?: string
  icon: React.ReactNode
  children: React.ReactNode
  changedCount?: number
}) {
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-start gap-3 px-6 py-4 border-b border-border bg-muted/30">
        <div className="h-8 w-8 rounded-lg bg-background border border-border flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground leading-none">{title}</p>
            {changedCount != null && changedCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/20 leading-none">
                <span className="h-1 w-1 rounded-full bg-amber-500 shrink-0" />
                {changedCount} changed
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function Field({
  label, icon, changed, error, errorMsg, children,
}: {
  label: string
  icon?: React.ReactNode
  changed?: boolean
  error?: boolean
  errorMsg?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        {icon && (
          <span className={`shrink-0 ${error ? "text-destructive" : "text-muted-foreground/50"}`}>
            {icon}
          </span>
        )}
        <label className={`text-sm font-medium leading-none ${error ? "text-destructive" : "text-foreground"}`}>
          {label}
        </label>
        {changed && !error && (
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
        )}
        {error && (
          <AlertCircle className="ml-auto h-3.5 w-3.5 text-destructive shrink-0" />
        )}
      </div>
      {children}
      {error && errorMsg && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {errorMsg}
        </p>
      )}
    </div>
  )
}

function StatusCard({ active, changed, label, children }: {
  active: boolean; changed?: boolean; label: string; children: React.ReactNode
}) {
  return (
    <div className={`rounded-xl border p-4 transition-all duration-200 ${
      active
        ? "border-foreground/20 bg-muted/50 shadow-sm"
        : "border-border/50 bg-muted/10 hover:border-border hover:bg-muted/20"
    } ${changed ? "ring-1 ring-amber-400/40" : ""}`}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`h-5 w-5 shrink-0 rounded-md flex items-center justify-center transition-all duration-200 ${
          active ? "bg-foreground text-background" : "border-2 border-border/60 bg-background"
        }`}>
          {active && <CheckCircle2 className="h-3 w-3" />}
        </div>
        <span className={`text-sm font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
          {label}
        </span>
        {changed && (
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
        )}
      </div>
      <div className="pl-7">{children}</div>
    </div>
  )
}

function DirtyInput({
  name, value, originalValue, onChange,
  placeholder, className = "", size = "default", error = false,
}: {
  name: string; value: string; originalValue: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string; className?: string
  size?: "default" | "sm"; error?: boolean
}) {
  const changed = (value || "") !== (originalValue || "")
  const h = size === "sm" ? "h-9 text-sm" : "h-10 text-sm"
  return (
    <Input
      name={name} value={value || ""} onChange={onChange}
      placeholder={placeholder}
      className={`rounded-lg transition-all focus-visible:ring-1 disabled:opacity-50 ${h} ${className} ${
        error
          ? "border-destructive bg-destructive/5 focus-visible:ring-destructive"
          : changed
          ? "border-amber-400/60 bg-amber-50/40 dark:bg-amber-900/10 focus-visible:ring-ring"
          : "border-border bg-background focus-visible:ring-ring"
      }`}
    />
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function EditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { px } = useCollapse()

  const [previewUrl, setPreviewUrl]         = useState<string | null>(null)
  const [generatingPreview, setGenerating]  = useState(false)
  const [loading, setLoading]               = useState(true)
  const [saving, setSaving]                 = useState(false)
  const [saved, setSaved]                   = useState(false)
  const [formData, setFormData]             = useState<FormData | null>(null)
  const [originalData, setOriginalData]     = useState<FormData | null>(null)
  const [preparedOptions, setPrepared]      = useState<any[]>([])
  const [submittedOptions, setSubmitted]    = useState<any[]>([])
  const [fieldErrors, setFieldErrors]       = useState<Partial<Record<keyof FormData, string>>>({})
  const [errorDismissed, setErrorDismissed] = useState(false)
  const [toasts, setToasts]                 = useState<Toast[]>([])
  const [showBackDialog, setBackDialog]     = useState(false)
  const [printing, setPrinting]             = useState(false)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isDirty = formData && originalData
    ? JSON.stringify(formData) !== JSON.stringify(originalData)
    : false
  const isK12 = formData?.form_type === 2

  useEffect(() => { setErrorDismissed(false) }, [fieldErrors])

  // ── Load signatories ──
  useEffect(() => {
    supabase.from("signatories").select("id, full_name, position").eq("role_type", "assistant_registrar")
      .then(({ data }) => setPrepared(data || []))
    supabase.from("signatories").select("id, full_name, position").in("role_type", ["registrar", "principal"])
      .then(({ data }) => setSubmitted(data || []))
  }, [])

  // ── Load record ──
  useEffect(() => {
    if (!id) return
    supabase.from("cav_forms").select("*").eq("id", id).single().then(({ data, error }) => {
      if (!error && data) { setFormData(data); setOriginalData(data) }
      setLoading(false)
    })
  }, [id])

  // ── Debounced live preview ──
  const regeneratePreview = useCallback((data: FormData, prepared: any[], submitted: any[]) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setGenerating(true)
      try {
        const fn = data.form_type === 2 ? generateK12PreviewUrl : generatePreviewUrl
        const url = await fn(data, prepared, submitted)
        setPreviewUrl(url)
      } catch { /* silent */ }
      finally { setGenerating(false) }
    }, 600)
  }, [])

  useEffect(() => {
    if (!formData) return
    regeneratePreview(formData, preparedOptions, submittedOptions)
  }, [formData, preparedOptions, submittedOptions, regeneratePreview])

  // ── Navigation guards ──
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = "" }
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isDirty])

  useEffect(() => {
    window.history.pushState(null, "", window.location.href)
    const handlePopState = () => {
      if (isDirty) {
        window.history.pushState(null, "", window.location.href)
        setBackDialog(true)
      }
    }
    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [isDirty])

  // ── Helpers ──
  const pushToast = (type: Toast["type"], title: string, message: string) => {
    const id = Date.now()
    setToasts(p => [...p, { id, type, title, message }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5000)
  }

  const clearError = (key: keyof FormData) =>
    setFieldErrors(p => { const n = { ...p }; delete n[key]; return n })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!formData) return
    clearError(e.target.name as keyof FormData)
    setSaved(false)
    setFormData(p => p ? ({ ...p, [e.target.name]: e.target.value }) : p)
  }

  const handleDate = (name: keyof FormData, val: string) => {
    clearError(name)
    setSaved(false)
    setFormData(p => p ? ({ ...p, [name]: val }) : p)
  }

  const ch = (field: string) => {
    const a = formData?.[field]
    const b = originalData?.[field]
    if (typeof a === "boolean" || typeof b === "boolean") return a !== b
    return (a || "") !== (b || "")
  }

  const countChanged = (...fields: string[]) => fields.filter(ch).length

  // ── Validation ──
  const validate = (): boolean => {
    if (!formData) return false
    const errors: Partial<Record<keyof FormData, string>> = {}
    for (const key of REQUIRED_FIELDS) {
      if (!formData[key]?.toString().trim()) {
        errors[key] = `${FIELD_LABELS[key] ?? key} is required`
      }
    }
    setFieldErrors(errors)
    const count = Object.keys(errors).length
    if (count > 0) {
      pushToast("error", "Incomplete form", `${count} field${count > 1 ? "s" : ""} need attention`)
      const firstKey = Object.keys(errors)[0]
      document.getElementsByName(firstKey)[0]?.scrollIntoView({ behavior: "smooth", block: "center" })
    }
    return count === 0
  }

  // ── Save ──
  const handleUpdate = async () => {
    if (!id || !formData || !originalData) return
    if (!validate()) return

    setSaving(true)
    const { newData, oldData } = getChangedFields(originalData, formData)
    const { error } = await supabase.from("cav_forms").update(formData).eq("id", id)

    if (error) {
      pushToast("error", "Save failed", error.message)
      setSaving(false)
      return
    }

    try {
      await logAudit({
        action: "updated",
        event: `Updated CAV form for ${formData.full_legal_name}`,
        recordId: id, oldData, newData,
      })
    } catch (e) { console.error("Audit log failed:", e) }

    setOriginalData(formData)
    setSaving(false)
    setSaved(true)
    pushToast("success", "Saved!", `Changes to ${formData.full_legal_name}'s form were saved.`)
  }

  const handleDownload = () => {
    if (!formData) return
    isK12 ? generateCavK12PDF(formData) : generateCavPDF(formData)
  }

  const handlePrint = async () => {
    if (!formData) return
    setPrinting(true)
    try {
      const fn = isK12 ? generateK12PreviewUrl : generatePreviewUrl
      const url = previewUrl ?? await fn(formData, preparedOptions, submittedOptions)
      const iframe = document.createElement("iframe")
      iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:0;height:0;border:0"
      iframe.src = url
      document.body.appendChild(iframe)
      iframe.onload = () => {
        const cleanup = () => {
          if (document.body.contains(iframe)) document.body.removeChild(iframe)
          setPrinting(false)
          window.removeEventListener("afterprint", cleanup)
        }
        window.addEventListener("afterprint", cleanup)
        setTimeout(cleanup, 30000)
        try {
          iframe.contentWindow?.focus()
          iframe.contentWindow?.print()
        } catch {
          window.open(url, "_blank")
          cleanup()
        }
      }
    } catch (e: any) {
      pushToast("error", "Print failed", e.message)
      setPrinting(false)
    }
  }

  const handleBack = () => {
    if (isDirty) { setBackDialog(true) } else { navigate("/") }
  }

  // ── Computed ──
  const prepObj    = preparedOptions.find(p => p.id === formData?.prepared_by)
  const subObj     = submittedOptions.find(s => s.id === formData?.submitted_by)
  const hasErr     = (key: keyof FormData) => !!fieldErrors[key]
  const errorCount = Object.keys(fieldErrors).length
  const showErrorBanner = errorCount > 0 && !errorDismissed

  const enrolledActive  = !!(formData?.enrolled_grade || formData?.enrolled_sy)
  const completedActive = !!(formData?.status_completed_grade || formData?.status_completed_sy)
  const graduatedActive = !!formData?.status_graduated_sy

  if (loading) return <LoadingSkeleton />

  if (!formData) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <p className="text-sm font-medium">Record not found</p>
        <p className="text-sm text-muted-foreground">
          The form with ID{" "}
          <code className="font-mono text-xs bg-muted px-1 py-0.5 rounded">{id}</code>{" "}
          doesn't exist.
        </p>
        <Button variant="outline" size="sm" onClick={() => navigate("/")}>Go back</Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <div className={`${px} py-8 transition-all duration-300`}>

        {/* ══ PAGE HEADER ══════════════════════════════════════════════════════ */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost" size="sm" onClick={handleBack}
              className="text-muted-foreground hover:text-foreground h-9 w-9 p-0 rounded-lg"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-sm shrink-0">
              <Pencil className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2 leading-none">
                <h1 className="text-lg font-bold tracking-tight">Edit CAV Form</h1>
                <Badge variant="secondary" className="text-[10px] px-2 py-0.5 rounded-md">
                  {getFormTypeLabel(formData.form_type)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 font-mono">{id}</p>
            </div>
          </div>

          {/* Header actions */}
          <div className="flex items-center gap-2.5">
            {isDirty && !saved && (
              <>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                  <CircleDot className="h-3 w-3 text-amber-500" />
                  Unsaved changes
                </div>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => { setFormData(originalData); setSaved(false); setFieldErrors({}) }}
                  className="h-8 gap-1.5 text-xs text-muted-foreground rounded-lg"
                >
                  <RotateCcw className="h-3 w-3" /> Discard
                </Button>
              </>
            )}
            {saved && (
              <div className="flex items-center gap-1.5 text-xs text-success font-medium">
                <CheckCircle2 className="h-3 w-3" /> All changes saved
              </div>
            )}
            <Button
              size="sm"
              className="h-9 gap-1.5 min-w-36 rounded-lg text-sm font-semibold"
              onClick={handleUpdate}
              disabled={saving || saved || !isDirty}
            >
              {saved
                ? <><CheckCircle2 className="h-3.5 w-3.5" /> Saved!</>
                : saving
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
                : <><Save className="h-3.5 w-3.5" /> Save Changes</>
              }
            </Button>
          </div>
        </div>

        {/* ══ UNSAVED CHANGES BANNER ═══════════════════════════════════════════
            Simplified: indicator-only strip. The header button is the sole save action.
        ════════════════════════════════════════════════════════════════════════ */}
        {isDirty && !saved && (
          <div className="mb-6 animate-in slide-in-from-top-2 duration-200 rounded-xl border border-amber-400/30 bg-amber-50/60 dark:bg-amber-900/10 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2.5">
              <div className="h-6 w-6 rounded-md bg-amber-400/25 flex items-center justify-center shrink-0">
                <CircleDot className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-sm text-amber-800 dark:text-amber-300 flex-1 min-w-0">
                <span className="font-semibold">You have unsaved changes.</span>{" "}
                <span className="text-amber-700/80 dark:text-amber-400/80">
                  Use the Save Changes button above before leaving.
                </span>
              </p>
            </div>
          </div>
        )}

        {/* ══ VALIDATION ERROR BANNER ══════════════════════════════════════════ */}
        {showErrorBanner && (
          <div className="mb-6 animate-in slide-in-from-top-2 duration-200 rounded-xl border border-destructive/30 bg-destructive/5 overflow-hidden">
            <div className="flex items-start gap-3 px-4 py-3.5">
              <div className="h-8 w-8 rounded-lg bg-destructive/20 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-destructive leading-none mb-2">
                  {errorCount} field{errorCount > 1 ? "s" : ""} need{errorCount === 1 ? "s" : ""} attention
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {Object.values(fieldErrors).filter(Boolean).map((msg, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center rounded-md bg-destructive/15 border border-destructive/20 px-2 py-0.5 text-[11px] font-medium text-destructive leading-none"
                    >
                      {msg?.replace(" is required", "")}
                    </span>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setErrorDismissed(true)}
                className="h-7 w-7 rounded-lg flex items-center justify-center text-destructive/50 hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ══ MAIN LAYOUT ══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-[1fr_490px] gap-6 items-start">
          <div className="space-y-5">

            {/* ── Student Information ── */}
            <SectionCard
              title="Student Information"
              icon={<User className="h-4 w-4" />}
              changedCount={countChanged("full_legal_name", "control_no", "lrn", "school_year_completed", "school_year_graduated")}
            >
              <div className="grid grid-cols-2 gap-x-5 gap-y-5">
                <div className="col-span-2">
                  <Field
                    label="Full Legal Name"
                    icon={<User className="h-3.5 w-3.5" />}
                    changed={ch("full_legal_name")}
                    error={hasErr("full_legal_name")}
                    errorMsg={fieldErrors.full_legal_name}
                  >
                    <DirtyInput
                      name="full_legal_name"
                      value={formData.full_legal_name}
                      originalValue={originalData?.full_legal_name || ""}
                      onChange={handleChange}
                      placeholder="Full legal name"
                      error={hasErr("full_legal_name")}
                    />
                  </Field>
                </div>

                <Field
                  label="Control Number"
                  icon={<Hash className="h-3.5 w-3.5" />}
                  changed={ch("control_no")}
                  error={hasErr("control_no")}
                  errorMsg={fieldErrors.control_no}
                >
                  <DirtyInput
                    name="control_no"
                    value={formData.control_no}
                    originalValue={originalData?.control_no || ""}
                    onChange={handleChange}
                    placeholder="e.g. RHS-031626"
                    error={hasErr("control_no")}
                  />
                </Field>

                {isK12 && (
                  <Field
                    label="LRN / Reference No."
                    icon={<Hash className="h-3.5 w-3.5" />}
                    changed={ch("lrn")}
                  >
                    <DirtyInput
                      name="lrn"
                      value={formData.lrn || ""}
                      originalValue={originalData?.lrn || ""}
                      onChange={handleChange}
                      placeholder="Learner Reference No."
                    />
                  </Field>
                )}

                <Field
                  label="School Year Completed"
                  icon={<GraduationCap className="h-3.5 w-3.5" />}
                  changed={ch("school_year_completed")}
                >
                  <DirtyInput
                    name="school_year_completed"
                    value={formData.school_year_completed}
                    originalValue={originalData?.school_year_completed || ""}
                    onChange={handleChange}
                    placeholder="e.g. 2023-2024"
                  />
                </Field>

                <Field
                  label="School Year Graduated"
                  icon={<GraduationCap className="h-3.5 w-3.5" />}
                  changed={ch("school_year_graduated")}
                  error={hasErr("school_year_graduated")}
                  errorMsg={fieldErrors.school_year_graduated}
                >
                  <DatePicker
                    value={formData.school_year_graduated}
                    onChange={v => handleDate("school_year_graduated", v)}
                    placeholder="Pick date"
                    className={
                      hasErr("school_year_graduated")
                        ? "border-destructive bg-destructive/5"
                        : ch("school_year_graduated")
                        ? "border-amber-400/60 bg-amber-50/40 dark:bg-amber-900/10"
                        : ""
                    }
                  />
                </Field>
              </div>
            </SectionCard>

            {/* ── Dates ── */}
            <SectionCard
              title="Important Dates"
              icon={<Calendar className="h-4 w-4" />}
              changedCount={countChanged("date_issued", "date_of_application", "date_of_transmission")}
            >
              <div className="grid grid-cols-3 gap-x-5 gap-y-5">
                <Field
                  label="Date Issued"
                  icon={<Calendar className="h-3.5 w-3.5" />}
                  changed={ch("date_issued")}
                  error={hasErr("date_issued")}
                  errorMsg={fieldErrors.date_issued}
                >
                  <DatePicker
                    value={formData.date_issued}
                    onChange={v => handleDate("date_issued", v)}
                    placeholder="Pick date"
                    className={
                      hasErr("date_issued")
                        ? "border-destructive bg-destructive/5"
                        : ch("date_issued")
                        ? "border-amber-400/60 bg-amber-50/40 dark:bg-amber-900/10"
                        : ""
                    }
                  />
                </Field>

                <Field
                  label="Date of Application"
                  icon={<ClipboardList className="h-3.5 w-3.5" />}
                  changed={ch("date_of_application")}
                  error={hasErr("date_of_application")}
                  errorMsg={fieldErrors.date_of_application}
                >
                  <DatePicker
                    value={formData.date_of_application}
                    onChange={v => handleDate("date_of_application", v)}
                    placeholder="Pick date"
                    className={
                      hasErr("date_of_application")
                        ? "border-destructive bg-destructive/5"
                        : ch("date_of_application")
                        ? "border-amber-400/60 bg-amber-50/40 dark:bg-amber-900/10"
                        : ""
                    }
                  />
                </Field>

                <Field
                  label="Date of Transmission"
                  icon={<Send className="h-3.5 w-3.5" />}
                  changed={ch("date_of_transmission")}
                  error={hasErr("date_of_transmission")}
                  errorMsg={fieldErrors.date_of_transmission}
                >
                  <DatePicker
                    value={formData.date_of_transmission}
                    onChange={v => handleDate("date_of_transmission", v)}
                    placeholder="Pick date"
                    className={
                      hasErr("date_of_transmission")
                        ? "border-destructive bg-destructive/5"
                        : ch("date_of_transmission")
                        ? "border-amber-400/60 bg-amber-50/40 dark:bg-amber-900/10"
                        : ""
                    }
                  />
                </Field>
              </div>
            </SectionCard>

            {/* ── Student Status ── */}
            <SectionCard
              title="Student Status"
              subtitle="Optional — entering values will auto-fill and check the corresponding box in the PDF."
              icon={<BookOpen className="h-4 w-4" />}
              changedCount={countChanged(
                "is_graduated", "enrolled_grade", "enrolled_sy",
                "status_completed_grade", "status_completed_sy", "status_graduated_sy"
              )}
            >
              {/* Completion Status toggle */}
              <div className={`mb-5 rounded-xl border border-border bg-muted/20 p-4 ${ch("is_graduated") ? "ring-1 ring-amber-400/40" : ""}`}>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-foreground">Completion Status</p>
                      {ch("is_graduated") && (
                        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Toggle between <strong>Attended</strong> and <strong>Completed</strong>.
                      This controls the wording printed on the PDF.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSaved(false)
                      setFormData(p => p ? ({ ...p, is_graduated: !p.is_graduated }) : p)
                    }}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none ${
                      formData.is_graduated ? "bg-foreground" : "bg-muted-foreground/30"
                    }`}
                    aria-label="Toggle completion status"
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                      formData.is_graduated ? "translate-x-5" : "translate-x-0"
                    }`} />
                  </button>
                </div>
                <div className={`mt-3 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${
                  formData.is_graduated
                    ? "bg-foreground/8 text-foreground border border-foreground/10"
                    : "bg-muted text-muted-foreground border border-border"
                }`}>
                  <GraduationCap className="h-3 w-3" />
                  {formData.is_graduated ? "Completed" : "Attended"}
                </div>
              </div>

              <div className="space-y-2.5">
                <StatusCard
                  active={enrolledActive}
                  label="Enrolled in"
                  changed={ch("enrolled_grade") || ch("enrolled_sy")}
                >
                  <div className="flex items-center gap-2">
                    <DirtyInput
                      name="enrolled_grade"
                      value={formData.enrolled_grade}
                      originalValue={originalData?.enrolled_grade || ""}
                      onChange={handleChange}
                      placeholder="Grade level (e.g. Grade 10)"
                      size="sm" className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">during SY</span>
                    <DirtyInput
                      name="enrolled_sy"
                      value={formData.enrolled_sy}
                      originalValue={originalData?.enrolled_sy || ""}
                      onChange={handleChange}
                      placeholder="2020-2021"
                      size="sm" className="w-28"
                    />
                  </div>
                </StatusCard>

                <StatusCard
                  active={completedActive}
                  label="Completed"
                  changed={ch("status_completed_grade") || ch("status_completed_sy")}
                >
                  <div className="flex items-center gap-2">
                    <DirtyInput
                      name="status_completed_grade"
                      value={formData.status_completed_grade}
                      originalValue={originalData?.status_completed_grade || ""}
                      onChange={handleChange}
                      placeholder="Grade level (e.g. Grade 10)"
                      size="sm" className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">during SY</span>
                    <DirtyInput
                      name="status_completed_sy"
                      value={formData.status_completed_sy}
                      originalValue={originalData?.status_completed_sy || ""}
                      onChange={handleChange}
                      placeholder="2020-2021"
                      size="sm" className="w-28"
                    />
                  </div>
                </StatusCard>

                <StatusCard
                  active={graduatedActive}
                  label="Satisfactorily graduated from Secondary Course"
                  changed={ch("status_graduated_sy")}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">for SY</span>
                    <DirtyInput
                      name="status_graduated_sy"
                      value={formData.status_graduated_sy}
                      originalValue={originalData?.status_graduated_sy || ""}
                      onChange={handleChange}
                      placeholder="2020-2021"
                      size="sm" className="flex-1"
                    />
                  </div>
                </StatusCard>
              </div>
            </SectionCard>

            {/* ── Signatories ── */}
            <SectionCard
              title="Signatories"
              subtitle="Select the staff members who will sign and appear on the CAV form."
              icon={<Pen className="h-4 w-4" />}
              changedCount={countChanged("prepared_by", "submitted_by")}
            >
              <div className="grid grid-cols-2 gap-5">
                {/* Prepared By */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Pen className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                    <label className={`text-sm font-medium ${hasErr("prepared_by") ? "text-destructive" : "text-foreground"}`}>
                      Prepared By
                    </label>
                    {ch("prepared_by") && !hasErr("prepared_by") && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    )}
                    {hasErr("prepared_by") && (
                      <AlertCircle className="ml-auto h-3.5 w-3.5 text-destructive shrink-0" />
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full h-10 px-3 text-sm font-normal justify-between ${
                          hasErr("prepared_by")
                            ? "border-destructive bg-destructive/5"
                            : ch("prepared_by")
                            ? "border-amber-400/60 bg-amber-50/40 dark:bg-amber-900/10"
                            : ""
                        }`}
                      >
                        <span className={`truncate text-left text-sm ${!prepObj ? "text-muted-foreground" : ""}`}>
                          {prepObj ? prepObj.full_name : "Select a signatory…"}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-(--radix-dropdown-menu-trigger-width)" align="start">
                      {preparedOptions.map(p => (
                        <DropdownMenuItem key={p.id} onSelect={() => {
                          clearError("prepared_by")
                          setSaved(false)
                          setFormData(prev => prev ? ({ ...prev, prepared_by: p.id }) : prev)
                        }}>
                          <div className="py-0.5">
                            <p className="text-sm font-medium">{p.full_name}</p>
                            <p className="text-xs text-muted-foreground">{p.position}</p>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {hasErr("prepared_by") && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0" /> {fieldErrors.prepared_by}
                    </p>
                  )}
                  {prepObj && !hasErr("prepared_by") && (
                    <p className="text-xs text-muted-foreground pl-1 truncate">{prepObj.position}</p>
                  )}
                </div>

                {/* Submitted By */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Pen className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                    <label className={`text-sm font-medium ${hasErr("submitted_by") ? "text-destructive" : "text-foreground"}`}>
                      Submitted By
                    </label>
                    {ch("submitted_by") && !hasErr("submitted_by") && (
                      <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                    )}
                    {hasErr("submitted_by") && (
                      <AlertCircle className="ml-auto h-3.5 w-3.5 text-destructive shrink-0" />
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className={`w-full h-10 px-3 text-sm font-normal justify-between ${
                          hasErr("submitted_by")
                            ? "border-destructive bg-destructive/5"
                            : ch("submitted_by")
                            ? "border-amber-400/60 bg-amber-50/40 dark:bg-amber-900/10"
                            : ""
                        }`}
                      >
                        <span className={`truncate text-left text-sm ${!subObj ? "text-muted-foreground" : ""}`}>
                          {subObj ? subObj.full_name : "Select a signatory…"}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-(--radix-dropdown-menu-trigger-width)" align="start">
                      {submittedOptions.map(s => (
                        <DropdownMenuItem key={s.id} onSelect={() => {
                          clearError("submitted_by")
                          setSaved(false)
                          setFormData(prev => prev ? ({ ...prev, submitted_by: s.id }) : prev)
                        }}>
                          <div className="py-0.5">
                            <p className="text-sm font-medium">{s.full_name}</p>
                            <p className="text-xs text-muted-foreground">{s.position}</p>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {hasErr("submitted_by") && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3 shrink-0" /> {fieldErrors.submitted_by}
                    </p>
                  )}
                  {subObj && !hasErr("submitted_by") && (
                    <p className="text-xs text-muted-foreground pl-1 truncate">{subObj.position}</p>
                  )}
                </div>
              </div>
            </SectionCard>

            {/* ── Bottom spacer — no save button here anymore ── */}
            <div className="h-2" />
          </div>

          {/* ══ PDF Preview Panel ════════════════════════════════════════════════ */}
          <div className="sticky top-6 space-y-3">
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">Live Preview</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-background border border-border">
                  <div className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    generatingPreview
                      ? "bg-pending animate-pulse"
                      : isDirty
                      ? "bg-amber-500"
                      : "bg-success"
                  }`} />
                  <span className="text-xs text-muted-foreground">
                    {generatingPreview ? "Updating…" : isDirty ? "Unsaved" : "Synced"}
                  </span>
                </div>
              </div>
              <div className="relative bg-muted/10" style={{ height: "780px" }}>
                {generatingPreview && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 z-10 bg-background/60 backdrop-blur-[2px]">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground font-medium">Updating preview…</p>
                  </div>
                )}
                {previewUrl && (
                  <iframe
                    src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-300 ${
                      generatingPreview ? "opacity-20" : "opacity-100"
                    }`}
                    title="CAV PDF Preview"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Button
                onClick={handleDownload}
                variant="outline"
                className="h-10 gap-2 rounded-xl text-sm font-medium"
              >
                <Download className="h-4 w-4" /> Download PDF
              </Button>
              <Button
                onClick={handlePrint}
                variant="outline"
                disabled={printing || generatingPreview || !previewUrl}
                className="h-10 gap-2 rounded-xl text-sm font-medium"
              >
                {printing
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Printing…</>
                  : <><Printer className="h-4 w-4" /> Print</>
                }
              </Button>
            </div>

            {/* Sync note */}
            {isDirty && !generatingPreview && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-400/25 bg-amber-50/40 dark:bg-amber-900/10 px-4 py-3">
                <CircleDot className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                  The preview reflects your current edits but the record hasn't been saved yet.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ DISCARD & BACK DIALOG ════════════════════════════════════════════ */}
      <AlertDialog open={showBackDialog} onOpenChange={setBackDialog}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader className="items-center text-center sm:text-center">
            <div className="mx-auto mb-2 h-14 w-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
              <TriangleAlert className="h-7 w-7 text-destructive" />
            </div>
            <AlertDialogTitle className="text-base font-bold">Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              You have unsaved changes. Leaving now will permanently discard everything you've edited.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel className="flex-1 rounded-xl h-10 m-0 text-sm">Keep Editing</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => navigate("/")}
              className="flex-1 rounded-xl h-10 gap-2 m-0 text-sm"
            >
              <TriangleAlert className="h-3.5 w-3.5" /> Discard &amp; Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ══ TOASTS ═══════════════════════════════════════════════════════════ */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto animate-in slide-in-from-bottom-3 fade-in duration-200">
            {t.type === "error" ? (
              <Alert variant="destructive" className="w-80 shadow-lg">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle className="text-sm font-semibold">{t.title}</AlertTitle>
                <AlertDescription className="text-sm">{t.message}</AlertDescription>
              </Alert>
            ) : (
              <Alert variant="success">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle className="text-sm font-semibold">{t.title}</AlertTitle>
                <AlertDescription className="text-sm">{t.message}</AlertDescription>
              </Alert>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-7">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-lg" />
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-40 rounded" />
              <Skeleton className="h-3 w-56 rounded" />
            </div>
          </div>
          <Skeleton className="h-9 w-36 rounded-lg" />
        </div>
        <div className="grid grid-cols-[1fr_490px] gap-6">
          <div className="space-y-5">
            {[4, 3, 3, 2].map((cols, i) => (
              <div key={i} className="rounded-2xl border border-border overflow-hidden">
                <div className="h-[60px] bg-muted/30 border-b border-border" />
                <div className="p-6 grid grid-cols-2 gap-5">
                  {Array.from({ length: cols }).map((_, j) => (
                    <div key={j} className={`space-y-2 ${j === 0 && i === 0 ? "col-span-2" : ""}`}>
                      <Skeleton className="h-3.5 w-24 rounded" />
                      <Skeleton className="h-10 w-full rounded-lg" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="h-[900px] rounded-2xl" />
        </div>
      </div>
    </div>
  )
}