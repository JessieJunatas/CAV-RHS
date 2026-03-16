/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { createForm } from "../../CRUD"
import { generateCavPDF } from "@/utils/generateCAVpdf"
import { generatePreviewUrl } from "@/utils/generateCAVpreview"
import { Button } from "@/components/animate-ui/components/buttons/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DatePicker } from "@/components/ui/date-picker"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  User, Calendar, GraduationCap, BookOpen, Hash, Send,
  CheckCircle2, FileText, AlertCircle, Download, TriangleAlert,
  ChevronDown, FilePen, Pen, ArrowLeft, Eye, Edit2, ShieldCheck,
  Loader2, Printer, X, Info,
} from "lucide-react"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCollapse } from "@/context/collapse-provider"
import { logAudit } from "@/utils/audit-log"

type CavFormData = {
  full_legal_name: string
  date_issued: string
  date_of_transmission: string
  school_year_completed: string
  date_of_application: string
  school_year_graduated: string
  control_no: string
  enrolled_grade: string
  enrolled_sy: string
  status_completed_grade: string
  status_completed_sy: string
  status_graduated_sy: string
  prepared_by?: string
  submitted_by?: string
  is_graduated: boolean
}

type Step = "editing" | "previewing" | "submitted"
type Toast = { id: number; type: "error" | "success"; title: string; message: string }

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY: CavFormData = {
  full_legal_name: "", date_issued: "", date_of_transmission: "",
  school_year_completed: "", date_of_application: "", school_year_graduated: "",
  control_no: "", enrolled_grade: "", enrolled_sy: "",
  status_completed_grade: "", status_completed_sy: "", status_graduated_sy: "",
  prepared_by: "", submitted_by: "", is_graduated: false,
}

const FIELD_LABELS: Record<keyof CavFormData, string> = {
  full_legal_name: "Complete Name", date_issued: "Date Issued",
  date_of_transmission: "Date of Transmission", school_year_completed: "School Year Completed",
  date_of_application: "Date of Application", school_year_graduated: "School Year Graduated",
  control_no: "Control No.", enrolled_grade: "Enrolled Grade", enrolled_sy: "Enrolled SY",
  status_completed_grade: "Status Completed Grade", status_completed_sy: "Status Completed SY",
  status_graduated_sy: "Status Graduated SY", prepared_by: "Prepared By", submitted_by: "Submitted By",
  is_graduated: "Completion Status",
}

const OPTIONAL: (keyof CavFormData)[] = [
  "enrolled_grade", "enrolled_sy", "school_year_completed",
  "status_completed_grade", "status_completed_sy", "status_graduated_sy", "is_graduated",
]

const STEPS: { key: Step; label: string; desc: string }[] = [
  { key: "editing",    label: "Fill in Details", desc: "Enter student info"    },
  { key: "previewing", label: "Review PDF",       desc: "Check before saving"  },
  { key: "submitted",  label: "Done",             desc: "Saved to database"    },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionCard({
  title, subtitle, icon, children, dimmed,
}: {
  title: string
  subtitle?: string
  icon: React.ReactNode
  children: React.ReactNode
  dimmed?: boolean
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card overflow-hidden transition-opacity duration-300 ${dimmed ? "opacity-40 pointer-events-none select-none" : ""}`}>
      <div className="flex items-start gap-3 px-6 py-4 border-b border-border bg-muted/30">
        <div className="h-8 w-8 rounded-lg bg-background border border-border flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-muted-foreground">{icon}</span>
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{title}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{subtitle}</p>}
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function Field({
  label, hint, icon, error, errorMsg, filled, optional, children,
}: {
  label: string
  hint?: string
  icon?: React.ReactNode
  error?: boolean
  errorMsg?: string
  filled?: boolean
  optional?: boolean
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
        {optional && !filled && !error && (
          <span className="ml-auto text-[11px] text-muted-foreground/50 border border-border/50 rounded px-1.5 py-0.5 leading-none">
            Optional
          </span>
        )}
        {filled && !error && (
          <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-success shrink-0" />
        )}
        {error && (
          <AlertCircle className="ml-auto h-3.5 w-3.5 text-destructive shrink-0" />
        )}
      </div>
      {hint && !error && (
        <p className="text-xs text-muted-foreground leading-snug">{hint}</p>
      )}
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

function StatusCard({ active, label, children }: {
  active: boolean; label: string; children: React.ReactNode
}) {
  return (
    <div className={`rounded-xl border p-4 transition-all duration-200 ${
      active
        ? "border-foreground/20 bg-muted/50 shadow-sm"
        : "border-border/50 bg-muted/10 hover:border-border hover:bg-muted/20"
    }`}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`h-5 w-5 shrink-0 rounded-md flex items-center justify-center transition-all duration-200 ${
          active ? "bg-foreground text-background" : "border-2 border-border/60 bg-background"
        }`}>
          {active && <CheckCircle2 className="h-3 w-3" />}
        </div>
        <span className={`text-sm font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>
          {label}
        </span>
      </div>
      <div className="pl-7">{children}</div>
    </div>
  )
}

function StepTracker({ step }: { step: Step }) {
  const current = STEPS.findIndex(s => s.key === step)
  return (
    <div className="flex items-center gap-1">
      {STEPS.map((s, i) => {
        const done   = i < current
        const active = i === current
        return (
          <div key={s.key} className="flex items-center">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all duration-300 ${active ? "bg-muted" : ""}`}>
              <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 text-xs font-bold ${
                done    ? "bg-success/10 text-success border border-success"
                : active ? "bg-foreground text-background ring-[3px] ring-border"
                :          "border-2 border-border/50 text-muted-foreground/50"
              }`}>
                {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
              </div>
              <div className="hidden sm:block">
                <p className={`text-xs font-semibold leading-none ${
                  done ? "text-success" : active ? "text-foreground" : "text-muted-foreground/40"
                }`}>{s.label}</p>
                <p className="text-[11px] text-muted-foreground/40 mt-0.5">{s.desc}</p>
              </div>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-6 mx-0.5 transition-colors duration-500 ${done ? "bg-success/40" : "bg-border/40"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function ProgressBar({ value, filled, total }: { value: number; filled: number; total: number }) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs">
        <span className="text-muted-foreground font-medium">
          {filled} of {total} required fields filled
        </span>
        <span className={`font-semibold tabular-nums ${value === 100 ? "text-success" : "text-muted-foreground"}`}>
          {value}%
        </span>
      </div>
      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            value === 100 ? "bg-success" : "bg-foreground/50"
          }`}
          style={{ width: `${value}%` }}
        />
      </div>
      {value === 100 && (
        <p className="text-xs text-success font-medium flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          All required fields complete — ready to preview!
        </p>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CAV() {
  const navigate = useNavigate()
  const { px } = useCollapse()

  const [step, setStep]                     = useState<Step>("editing")
  const [submitting, setSubmitting]         = useState(false)
  const [generatingPreview, setGenerating]  = useState(false)
  const [printing, setPrinting]             = useState(false)
  const [savedForm, setSavedForm]           = useState<(CavFormData & { id: string }) | null>(null)
  const [fieldErrors, setFieldErrors]       = useState<Partial<Record<keyof CavFormData, string>>>({})
  const [formData, setFormData]             = useState<CavFormData>(EMPTY)
  const [previewUrl, setPreviewUrl]         = useState<string | null>(null)
  const [toasts, setToasts]                 = useState<Toast[]>([])
  const [preparedOptions, setPrepared]      = useState<any[]>([])
  const [submittedOptions, setSubmitted]    = useState<any[]>([])
  const [showSubmitDialog, setSubmitDialog] = useState(false)
  const [showBackDialog, setBackDialog]     = useState(false)
  const [errorDismissed, setErrorDismissed] = useState(false)

  const isDirty = step !== "submitted" && Object.values(formData).some(v =>
    typeof v === "boolean" ? v : !!(v as string)?.trim()
  )

  useEffect(() => { setErrorDismissed(false) }, [fieldErrors])

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

  useEffect(() => {
    supabase.from("signatories").select("id, full_name, position").eq("role_type", "assistant_registrar")
      .then(({ data }) => setPrepared(data || []))
    supabase.from("signatories").select("id, full_name, position").in("role_type", ["registrar", "principal"])
      .then(({ data }) => setSubmitted(data || []))
  }, [])

  // ─── Helpers ────────────────────────────────────────────────────────────────

  const pushToast = (type: Toast["type"], title: string, message: string) => {
    const id = Date.now()
    setToasts(p => [...p, { id, type, title, message }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5000)
  }

  const clearError = (key: keyof CavFormData) =>
    setFieldErrors(p => { const n = { ...p }; delete n[key]; return n })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearError(e.target.name as keyof CavFormData)
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }))
  }

  const handleDate = (name: keyof CavFormData, val: string) => {
    clearError(name)
    setFormData(p => ({ ...p, [name]: val }))
  }

  // ─── Computed ────────────────────────────────────────────────────────────────

  const requiredKeys   = (Object.keys(EMPTY) as (keyof CavFormData)[]).filter(k => !OPTIONAL.includes(k))
  const filledRequired = requiredKeys.filter(k => !!(formData[k] as string)?.trim()).length
  const progress       = Math.round((filledRequired / requiredKeys.length) * 100)

  const enrolledActive  = !!(formData.enrolled_grade || formData.enrolled_sy)
  const completedActive = !!(formData.status_completed_grade || formData.status_completed_sy)
  const graduatedActive = !!formData.status_graduated_sy

  const hasErr   = (key: keyof CavFormData) => !!fieldErrors[key]
  const isFilled = (key: keyof CavFormData) => {
    const v = formData[key]
    return typeof v === "boolean" ? v : !!v?.trim()
  }
  const inputCls = (key: keyof CavFormData) =>
    `h-10 rounded-lg text-sm transition-all focus-visible:ring-1 disabled:opacity-50 ${
      hasErr(key)
        ? "border-destructive bg-destructive/5 focus-visible:ring-destructive"
        : isFilled(key)
        ? "border-border bg-muted/60 focus-visible:ring-ring"
        : "border-border bg-background focus-visible:ring-ring"
    }`

  const isLocked   = step !== "editing"
  const prepObj    = preparedOptions.find(p => p.id === formData.prepared_by)
  const subObj     = submittedOptions.find(s => s.id === formData.submitted_by)
  const errorCount = Object.keys(fieldErrors).length
  const showErrorAlert = errorCount > 0 && step === "editing" && !errorDismissed

  // ─── Actions ─────────────────────────────────────────────────────────────────

  const validate = (): boolean => {
    const errors: Partial<Record<keyof CavFormData, string>> = {}
    for (const key of requiredKeys) {
      if (!(formData[key] as string)?.trim()) errors[key] = `${FIELD_LABELS[key]} is required`
    }
    setFieldErrors(errors)
    const count = Object.keys(errors).length
    if (count > 0) {
      pushToast("error", "Some fields are missing", `Please fill in ${count} required field${count > 1 ? "s" : ""} before previewing.`)
      const firstKey = Object.keys(errors)[0]
      document.getElementsByName(firstKey)[0]?.scrollIntoView({ behavior: "smooth", block: "center" })
    }
    return count === 0
  }

  const handlePreview = async () => {
    if (!validate()) return
    setFieldErrors({})
    setStep("previewing")
    setGenerating(true)
    setPreviewUrl(null)
    try {
      const url = await generatePreviewUrl(formData, preparedOptions, submittedOptions)
      setPreviewUrl(url)
    } catch (e: any) {
      pushToast("error", "Preview failed", e.message)
      setStep("editing")
    } finally {
      setGenerating(false)
    }
  }

  const handleEditFromPreview = () => { setStep("editing"); setPreviewUrl(null) }

  const handleConfirmSubmit = async () => {
    try {
      setSubmitting(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")
      const created = await createForm({
        table: "cav_forms", data: formData, formType: 1,
        userId: user.id, userEmail: user.email!, label: "CAV Form",
      })
      if (!created?.id) throw new Error("Form creation failed")
      try {
        await logAudit({ action: "created", event: `Created CAV JHS form for ${formData.full_legal_name}`, recordId: created.id, newData: formData })
      } catch (e) { console.error("Audit log failed:", e) }
      const saved = { ...formData, id: created.id }
      setSavedForm(saved)
      setSubmitDialog(false)
      setStep("submitted")
      pushToast("success", "Form submitted!", `CAV form for ${formData.full_legal_name} was saved successfully.`)
      setGenerating(true)
      const url = await generatePreviewUrl(saved, preparedOptions, submittedOptions)
      setPreviewUrl(url)
      setGenerating(false)
    } catch (e: any) {
      pushToast("error", "Submission failed", e.message)
      setSubmitDialog(false)
    } finally {
      setSubmitting(false)
    }
  }

  const handlePrint = async () => {
    if (!formData) return
    setPrinting(true)
    try {
      const url = previewUrl ?? await generatePreviewUrl(formData, preparedOptions, submittedOptions)
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
    if (step === "submitted")  { navigate("/"); return }
    if (step === "previewing") { handleEditFromPreview(); return }
    if (isDirty) { setBackDialog(true) } else { navigate("/") }
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="bg-background min-h-screen">
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
              <FilePen className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-none">CAV Form</h1>
              <p className="text-xs text-muted-foreground mt-1">
                Certification, Authentication &amp; Verification — Junior High School
              </p>
            </div>
          </div>
          <StepTracker step={step} />
        </div>

        {/* ══ VALIDATION ERROR BANNER ══════════════════════════════════════════ */}
        {showErrorAlert && (
          <div className="mb-6 animate-in slide-in-from-top-2 duration-200 rounded-xl border border-destructive/30 bg-destructive/5 overflow-hidden">
            <div className="flex items-start gap-3 px-4 py-3.5">
              {/* Icon square */}
              <div className="h-8 w-8 rounded-lg bg-destructive/20 flex items-center justify-center shrink-0 mt-0.5">
                <AlertCircle className="h-4 w-4 text-destructive" />
              </div>
              {/* Text + pills */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-destructive leading-none mb-2">
                  {errorCount} field{errorCount > 1 ? "s" : ""} need{errorCount === 1 ? "s" : ""} to be filled in
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
              {/* Dismiss */}
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

        {/* ══ REVIEW BANNER ════════════════════════════════════════════════════ */}
        {step === "previewing" && (
          <div className="mb-6 animate-in slide-in-from-top-2 duration-200 rounded-xl border border-info/30 bg-info/5 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3.5">
              <div className="h-8 w-8 rounded-lg bg-info/20 flex items-center justify-center shrink-0">
                <Eye className="h-4 w-4 text-info" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-info leading-none mb-0.5">
                  Review your PDF before submitting
                </p>
                <p className="text-xs text-info/70 leading-snug">
                  Check the preview on the right — if everything looks correct, click{" "}
                  <span className="font-semibold text-info">Confirm &amp; Submit</span>.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditFromPreview}
                  className="h-8 gap-1.5 text-xs rounded-lg border-info/40 text-info bg-transparent hover:bg-info/10 hover:text-info"
                >
                  <Edit2 className="h-3 w-3" /> Edit
                </Button>
                <Button
                  size="sm"
                  onClick={() => setSubmitDialog(true)}
                  className="h-8 gap-1.5 text-xs rounded-lg bg-info hover:bg-info/90 text-white border-0"
                >
                  <ShieldCheck className="h-3.5 w-3.5" /> Confirm &amp; Submit
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ══ SUBMITTED BANNER ═════════════════════════════════════════════════ */}
        {step === "submitted" && (
          <div className="mb-6 animate-in slide-in-from-top-2 duration-200 rounded-xl border border-success/30 bg-success/5 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3.5">
              {/* Icon square */}
              <div className="h-8 w-8 rounded-lg bg-success/20 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4 text-success" />
              </div>
              {/* Text */}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-success leading-none mb-0.5">
                  Form submitted successfully
                </p>
                <p className="text-xs text-success/80 leading-snug">
                  CAV form for{" "}
                  <span className="font-semibold text-success">{formData.full_legal_name}</span>{" "}
                  has been saved. Download or print it using the buttons on the right.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══ MAIN LAYOUT ══════════════════════════════════════════════════════ */}
        <div className="grid grid-cols-[1fr_490px] gap-6 items-start">

          {/* ── LEFT: Form sections ─────────────────────────────────────────── */}
          <div className="space-y-5">

            {/* 1 ── Student Information */}
            <SectionCard
              title="Student Information"
              subtitle="Basic details about the student this CAV form is being prepared for."
              icon={<User className="h-4 w-4" />}
              dimmed={step === "submitted"}
            >
              <div className="grid grid-cols-2 gap-x-5 gap-y-5">
                <div className="col-span-2">
                  <Field
                    label="Full Legal Name"
                    hint="Enter the name exactly as it appears on official school documents."
                    icon={<User className="h-3.5 w-3.5" />}
                    error={hasErr("full_legal_name")}
                    errorMsg={fieldErrors.full_legal_name}
                    filled={isFilled("full_legal_name")}
                  >
                    <Input
                      name="full_legal_name"
                      value={formData.full_legal_name}
                      onChange={handleChange}
                      disabled={isLocked}
                      placeholder="e.g. Juan Dela Cruz"
                      className={inputCls("full_legal_name")}
                    />
                  </Field>
                </div>

                <Field
                  label="Control Number"
                  icon={<Hash className="h-3.5 w-3.5" />}
                  error={hasErr("control_no")}
                  errorMsg={fieldErrors.control_no}
                  filled={isFilled("control_no")}
                >
                  <Input
                    name="control_no"
                    value={formData.control_no}
                    onChange={handleChange}
                    disabled={isLocked}
                    placeholder="e.g. RHS-031626"
                    className={inputCls("control_no")}
                  />
                </Field>

                <Field
                  label="School Year Completed"
                  icon={<GraduationCap className="h-3.5 w-3.5" />}
                  filled={isFilled("school_year_completed")}
                  optional
                >
                  <Input
                    name="school_year_completed"
                    value={formData.school_year_completed}
                    onChange={handleChange}
                    disabled={isLocked}
                    placeholder="e.g. 2023-2024"
                    className={inputCls("school_year_completed")}
                  />
                </Field>

                <Field
                  label="School Year Graduated"
                  icon={<GraduationCap className="h-3.5 w-3.5" />}
                  error={hasErr("school_year_graduated")}
                  errorMsg={fieldErrors.school_year_graduated}
                  filled={isFilled("school_year_graduated")}
                >
                  <DatePicker
                    value={formData.school_year_graduated}
                    onChange={v => handleDate("school_year_graduated", v)}
                    disabled={isLocked}
                    placeholder="Pick a date"
                    className={hasErr("school_year_graduated") ? "border-destructive bg-destructive/5" : isFilled("school_year_graduated") ? "border-border bg-muted/60" : ""}
                  />
                </Field>
              </div>
            </SectionCard>

            {/* 2 ── Important Dates */}
            <SectionCard
              title="Important Dates"
              subtitle="All dates relevant to this CAV request and the student's application."
              icon={<Calendar className="h-4 w-4" />}
              dimmed={step === "submitted"}
            >
              <div className="grid grid-cols-3 gap-x-5 gap-y-5">
                <Field
                  label="Date Issued"
                  icon={<Calendar className="h-3.5 w-3.5" />}
                  error={hasErr("date_issued")}
                  errorMsg={fieldErrors.date_issued}
                  filled={isFilled("date_issued")}
                >
                  <DatePicker
                    value={formData.date_issued}
                    onChange={v => handleDate("date_issued", v)}
                    disabled={isLocked}
                    placeholder="Pick a date"
                    className={hasErr("date_issued") ? "border-destructive bg-destructive/5" : isFilled("date_issued") ? "border-border bg-muted/60" : ""}
                  />
                </Field>

                <Field
                  label="Date of Application"
                  icon={<Calendar className="h-3.5 w-3.5" />}
                  error={hasErr("date_of_application")}
                  errorMsg={fieldErrors.date_of_application}
                  filled={isFilled("date_of_application")}
                >
                  <DatePicker
                    value={formData.date_of_application}
                    onChange={v => handleDate("date_of_application", v)}
                    disabled={isLocked}
                    placeholder="Pick a date"
                    className={hasErr("date_of_application") ? "border-destructive bg-destructive/5" : isFilled("date_of_application") ? "border-border bg-muted/60" : ""}
                  />
                </Field>

                <Field
                  label="Date of Transmission"
                  icon={<Send className="h-3.5 w-3.5" />}
                  error={hasErr("date_of_transmission")}
                  errorMsg={fieldErrors.date_of_transmission}
                  filled={isFilled("date_of_transmission")}
                >
                  <DatePicker
                    value={formData.date_of_transmission}
                    onChange={v => handleDate("date_of_transmission", v)}
                    disabled={isLocked}
                    placeholder="Pick a date"
                    className={hasErr("date_of_transmission") ? "border-destructive bg-destructive/5" : isFilled("date_of_transmission") ? "border-border bg-muted/60" : ""}
                  />
                </Field>
              </div>
            </SectionCard>

            {/* 3 ── Student Status */}
            <SectionCard
              title="Student Status"
              subtitle="All fields here are optional. Fill in whichever rows apply — the PDF will automatically check the matching box for each one you complete."
              icon={<BookOpen className="h-4 w-4" />}
              dimmed={step === "submitted"}
            >
              <div className="mb-5 rounded-xl border border-border bg-muted/20 p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-foreground">Completion Status</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Toggle between <strong>Attended</strong> and <strong>Completed</strong>.
                      This controls the wording printed on the PDF.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => setFormData(p => ({ ...p, is_graduated: !p.is_graduated }))}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none disabled:opacity-50 ${
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
                <StatusCard active={enrolledActive} label="Enrolled in">
                  <div className="flex items-center gap-2">
                    <Input
                      name="enrolled_grade" value={formData.enrolled_grade} onChange={handleChange}
                      disabled={isLocked} placeholder="Grade level (e.g. Grade 10)"
                      className={`h-9 text-sm flex-1 rounded-lg border-border disabled:opacity-50 ${formData.enrolled_grade ? "bg-muted/60" : "bg-background"}`}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">during SY</span>
                    <Input
                      name="enrolled_sy" value={formData.enrolled_sy} onChange={handleChange}
                      disabled={isLocked} placeholder="2020-2021"
                      className={`h-9 text-sm w-28 rounded-lg border-border disabled:opacity-50 ${formData.enrolled_sy ? "bg-muted/60" : "bg-background"}`}
                    />
                  </div>
                </StatusCard>

                <StatusCard active={completedActive} label="Completed">
                  <div className="flex items-center gap-2">
                    <Input
                      name="status_completed_grade" value={formData.status_completed_grade} onChange={handleChange}
                      disabled={isLocked} placeholder="Grade level (e.g. Grade 10)"
                      className={`h-9 text-sm flex-1 rounded-lg border-border disabled:opacity-50 ${formData.status_completed_grade ? "bg-muted/60" : "bg-background"}`}
                    />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">during SY</span>
                    <Input
                      name="status_completed_sy" value={formData.status_completed_sy} onChange={handleChange}
                      disabled={isLocked} placeholder="2020-2021"
                      className={`h-9 text-sm w-28 rounded-lg border-border disabled:opacity-50 ${formData.status_completed_sy ? "bg-muted/60" : "bg-background"}`}
                    />
                  </div>
                </StatusCard>

                <StatusCard active={graduatedActive} label="Satisfactorily graduated from Secondary Course">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground whitespace-nowrap">for SY</span>
                    <Input
                      name="status_graduated_sy" value={formData.status_graduated_sy} onChange={handleChange}
                      disabled={isLocked} placeholder="2020-2021"
                      className={`h-9 text-sm flex-1 rounded-lg border-border disabled:opacity-50 ${formData.status_graduated_sy ? "bg-muted/60" : "bg-background"}`}
                    />
                  </div>
                </StatusCard>
              </div>
            </SectionCard>

            {/* 4 ── Signatories */}
            <SectionCard
              title="Signatories"
              subtitle="Select the staff members who will sign and appear on the CAV form."
              icon={<Pen className="h-4 w-4" />}
              dimmed={step === "submitted"}
            >
              <div className="grid grid-cols-2 gap-5">
                {/* Prepared By */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Pen className="h-3.5 w-3.5 text-muted-foreground/50 shrink-0" />
                    <label className={`text-sm font-medium ${hasErr("prepared_by") ? "text-destructive" : "text-foreground"}`}>
                      Prepared By
                    </label>
                    {isFilled("prepared_by") && !hasErr("prepared_by") && (
                      <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-success shrink-0" />
                    )}
                    {hasErr("prepared_by") && (
                      <AlertCircle className="ml-auto h-3.5 w-3.5 text-destructive shrink-0" />
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={isLocked}>
                      <Button
                        variant="outline"
                        className={`w-full h-10 px-3 text-sm font-normal justify-between disabled:opacity-50 ${
                          hasErr("prepared_by") ? "border-destructive bg-destructive/5"
                          : prepObj ? "border-border bg-muted/60" : ""
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
                          setFormData(prev => ({ ...prev, prepared_by: p.id }))
                          clearError("prepared_by")
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
                    {isFilled("submitted_by") && !hasErr("submitted_by") && (
                      <CheckCircle2 className="ml-auto h-3.5 w-3.5 text-success shrink-0" />
                    )}
                    {hasErr("submitted_by") && (
                      <AlertCircle className="ml-auto h-3.5 w-3.5 text-destructive shrink-0" />
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={isLocked}>
                      <Button
                        variant="outline"
                        className={`w-full h-10 px-3 text-sm font-normal justify-between disabled:opacity-50 ${
                          hasErr("submitted_by") ? "border-destructive bg-destructive/5"
                          : subObj ? "border-border bg-muted/60" : ""
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
                          setFormData(prev => ({ ...prev, submitted_by: s.id }))
                          clearError("submitted_by")
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

            {/* Bottom CTA */}
            {step === "editing" && (
              <Button
                onClick={handlePreview}
                className="w-full h-12 text-sm font-semibold gap-2 rounded-xl shadow-sm"
              >
                <Eye className="h-4 w-4" />
                Preview PDF
                {progress < 100 && (
                  <span className="ml-auto text-xs opacity-50 font-normal tabular-nums">
                    {filledRequired}/{requiredKeys.length} required
                  </span>
                )}
              </Button>
            )}

            {step === "submitted" && (
              <Button disabled variant="outline" className="w-full h-12 text-sm font-semibold gap-2 rounded-xl">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Form Submitted Successfully
              </Button>
            )}
          </div>

          {/* ── RIGHT: PDF Preview panel ──────────────────────────────────────── */}
          <div className="sticky top-6 space-y-3">
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">PDF Preview</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 bg-background border border-border">
                  <div className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    step === "submitted"   ? "bg-success"
                    : step === "previewing" ? "bg-pending animate-pulse"
                    :                        "bg-muted-foreground/30"
                  }`} />
                  <span className="text-xs text-muted-foreground">
                    {step === "submitted"   ? "Saved"
                    : step === "previewing" ? "Review mode"
                    :                        "Awaiting input"}
                  </span>
                </div>
              </div>

              <div className="relative bg-muted/10" style={{ height: "760px" }}>
                {step === "editing" && !generatingPreview && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8">
                    <div className="relative">
                      <div className="w-16 h-20 rounded-xl border-2 border-dashed border-border/60 bg-background flex flex-col items-center justify-end pb-3 gap-1.5 pt-4">
                        <div className="h-1 w-8 rounded-full bg-border/70" />
                        <div className="h-1 w-8 rounded-full bg-border/70" />
                        <div className="h-1 w-5 rounded-full bg-border/70" />
                      </div>
                      <div className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-background border border-border flex items-center justify-center">
                        <FileText className="h-3 w-3 text-muted-foreground/60" />
                      </div>
                    </div>
                    <div className="text-center space-y-1.5">
                      <p className="text-sm font-semibold text-foreground">No preview yet</p>
                      <p className="text-sm text-muted-foreground leading-relaxed max-w-[200px]">
                        Fill in the form on the left, then click{" "}
                        <span className="font-semibold text-foreground">Preview PDF</span>{" "}
                        to see a live preview here.
                      </p>
                    </div>
                    <div className="w-full max-w-[220px]">
                      <ProgressBar value={progress} filled={filledRequired} total={requiredKeys.length} />
                    </div>
                  </div>
                )}

                {generatingPreview && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
                    <p className="text-sm font-medium text-muted-foreground">Generating preview…</p>
                    <p className="text-xs text-muted-foreground/60">This usually takes a moment.</p>
                  </div>
                )}

                {previewUrl && !generatingPreview && (
                  <iframe
                    src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="absolute inset-0 h-full w-full border-0"
                    title="CAV PDF Preview"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <Button
                onClick={() => savedForm && generateCavPDF(savedForm)}
                disabled={step !== "submitted" || generatingPreview}
                variant="outline"
                className="h-10 gap-2 rounded-xl text-sm font-medium"
              >
                <Download className="h-4 w-4" /> Download PDF
              </Button>
              <Button
                onClick={handlePrint}
                variant="outline"
                disabled={step !== "submitted" || printing || generatingPreview || !previewUrl}
                className="h-10 gap-2 rounded-xl text-sm font-medium"
              >
                {printing
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Printing…</>
                  : <><Printer className="h-4 w-4" /> Print</>
                }
              </Button>
            </div>

            {step === "submitted" && (
              <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/30 px-4 py-3">
                <Info className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  The form has been saved to the database. Use the buttons above to download a copy or send it to the printer.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ SUBMIT CONFIRMATION DIALOG ═══════════════════════════════════════ */}
      <AlertDialog open={showSubmitDialog} onOpenChange={open => !submitting && setSubmitDialog(open)}>
        <AlertDialogContent className="max-w-md rounded-2xl">
          <AlertDialogHeader className="items-center text-center sm:text-center">
            <div className="mx-auto mb-2 h-14 w-14 rounded-2xl bg-success/10 border border-success/20 flex items-center justify-center">
              <ShieldCheck className="h-7 w-7 text-success" />
            </div>
            <AlertDialogTitle className="text-base font-bold">Ready to submit this form?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              This will permanently save the CAV form for{" "}
              <span className="font-semibold text-foreground">{formData.full_legal_name || "this student"}</span>{" "}
              to the database. Make sure the PDF preview looks correct before you continue.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-2 rounded-xl border border-border bg-muted/50 divide-y divide-border overflow-hidden">
            {[
              { label: "Student",     value: formData.full_legal_name },
              { label: "Control No.", value: formData.control_no },
              { label: "Date Issued", value: formData.date_issued },
              { label: "Prepared by", value: prepObj?.full_name },
              { label: "Status",      value: formData.is_graduated ? "Completed" : "Attended" },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between px-4 py-2.5 gap-4">
                <span className="text-xs text-muted-foreground shrink-0">{row.label}</span>
                <span className="text-sm font-medium truncate text-right">
                  {row.value || <span className="text-muted-foreground italic font-normal">—</span>}
                </span>
              </div>
            ))}
          </div>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel disabled={submitting} className="flex-1 rounded-xl h-10 m-0 text-sm">
              Go Back &amp; Check
            </AlertDialogCancel>
            <AlertDialogAction
              variant="success"
              onClick={e => { e.preventDefault(); handleConfirmSubmit() }}
              disabled={submitting}
              className="flex-1 rounded-xl h-10 gap-2 m-0 text-sm"
            >
              {submitting
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting…</>
                : <><CheckCircle2 className="h-3.5 w-3.5" /> Yes, Submit</>
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ══ DISCARD & LEAVE DIALOG ═══════════════════════════════════════════ */}
      <AlertDialog open={showBackDialog} onOpenChange={setBackDialog}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader className="items-center text-center sm:text-center">
            <div className="mx-auto mb-2 h-14 w-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
              <TriangleAlert className="h-7 w-7 text-destructive" />
            </div>
            <AlertDialogTitle className="text-base font-bold">Leave without saving?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              You have unsaved changes. If you leave now, everything you've entered will be permanently lost.
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

      {/* ══ TOAST NOTIFICATIONS ══════════════════════════════════════════════ */}
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
              <Alert variant={"success"}>
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