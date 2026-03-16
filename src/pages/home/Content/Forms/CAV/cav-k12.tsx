import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { createForm } from "../../CRUD"
import { generateCavK12PDF } from "@/utils/generateCAVK12pdf"
import { generateK12PreviewUrl } from "@/utils/generateCAVK12preview"
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
  ChevronDown, FilePen, Pen, ArrowLeft, Eye, Edit2, ShieldCheck, Loader2,
} from "lucide-react"
import { logAudit } from "@/utils/audit-log"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useCollapse } from "@/context/collapse-provider"

type CavK12FormData = {
  full_legal_name: string
  lrn: string
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
  is_graduated: boolean   
  prepared_by?: string
  submitted_by?: string
}

type Step = "editing" | "previewing" | "submitted"

const EMPTY: CavK12FormData = {
  full_legal_name: "", lrn: "",
  date_issued: "", date_of_transmission: "",
  school_year_completed: "", date_of_application: "", school_year_graduated: "",
  control_no: "", enrolled_grade: "", enrolled_sy: "",
  status_completed_grade: "", status_completed_sy: "", status_graduated_sy: "",
  is_graduated: false, 
  prepared_by: "", submitted_by: "",
}

const FIELD_LABELS: Record<keyof CavK12FormData, string> = {
  full_legal_name: "Complete Name", lrn: "LRN / Reference No.",
  date_issued: "Date Issued", date_of_transmission: "Date of Transmission",
  school_year_completed: "School Year Completed", date_of_application: "Date of Application",
  school_year_graduated: "School Year Graduated", control_no: "Control No.",
  enrolled_grade: "Enrolled Grade", enrolled_sy: "Enrolled SY",
  status_completed_grade: "Status Completed Grade", status_completed_sy: "Status Completed SY",
  status_graduated_sy: "Status Graduated SY",
  is_graduated: "Completion Status",
  prepared_by: "Prepared By", submitted_by: "Submitted By",
}

const OPTIONAL: (keyof CavK12FormData)[] = [
  "enrolled_grade", "enrolled_sy", "school_year_completed", "school_year_graduated",
  "status_completed_grade", "status_completed_sy", "status_graduated_sy",
  "is_graduated",       
]

type Toast = { id: number; type: "error" | "success"; title: string; message: string }

// ─── Sub-components ──────────────────────────────────────────────────────────

function SectionBlock({ title, icon, children, dimmed }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; dimmed?: boolean
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card overflow-hidden transition-opacity duration-300 ${dimmed ? "opacity-40 pointer-events-none select-none" : ""}`}>
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted/60">
        <span className="text-muted-foreground/70">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function FieldRow({ label, icon, error, errorMsg, filled, optional, children }: {
  label: string; icon: React.ReactNode; error?: boolean; errorMsg?: string
  filled?: boolean; optional?: boolean; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${error ? "text-destructive" : "text-muted-foreground"}`}>
        <span className={error ? "text-destructive" : "text-muted-foreground/60"}>{icon}</span>
        {label}
        {optional && !filled && !error && (
          <span className="ml-auto text-xs font-normal normal-case tracking-normal text-muted-foreground/40">optional</span>
        )}
        {filled && !error && <CheckCircle2 className="h-3 w-3 text-muted-foreground/50 ml-auto shrink-0" />}
        {error && <AlertCircle className="h-3 w-3 text-destructive ml-auto shrink-0" />}
      </label>
      {children}
      {error && errorMsg && (
        <p className="text-xs font-medium text-destructive/90">{errorMsg}</p>
      )}
    </div>
  )
}

function StatusCard({ active, label, children }: {
  active: boolean; label: string; children: React.ReactNode
}) {
  return (
    <div className={`rounded-xl border p-3.5 transition-all duration-200 ${
      active ? "border-border bg-muted/80" : "border-border/50 bg-muted/20 hover:border-border hover:bg-muted/40"
    }`}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`h-4 w-4 shrink-0 rounded flex items-center justify-center text-[10px] font-black transition-all duration-200 ${
          active ? "bg-foreground text-background" : "border border-border/60 bg-background"
        }`}>{active && "✓"}</div>
        <span className={`text-sm font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
      </div>
      <div className="pl-6">{children}</div>
    </div>
  )
}

function StepTracker({ step }: { step: Step }) {
  const steps: { key: Step; label: string; desc: string }[] = [
    { key: "editing",    label: "Fill Form",  desc: "Enter details"   },
    { key: "previewing", label: "Review PDF", desc: "Check & confirm" },
    { key: "submitted",  label: "Submitted",  desc: "Saved to DB"     },
  ]
  const current = steps.findIndex(s => s.key === step)
  return (
    <div className="flex items-center">
      {steps.map((s, i) => {
        const done = i < current; const active = i === current
        return (
          <div key={s.key} className="flex items-center">
            <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all duration-300 ${active ? "bg-muted" : ""}`}>
              <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                done ? "bg-muted-foreground text-background" : active ? "bg-foreground text-background ring-4 ring-border" : "border-2 border-border text-muted-foreground"
              }`}>
                {done ? <CheckCircle2 className="h-3 w-3" /> : <span className="text-[10px] font-bold">{i + 1}</span>}
              </div>
              <div className="hidden sm:block">
                <p className={`text-xs font-semibold leading-none ${active ? "text-foreground" : "text-muted-foreground"}`}>{s.label}</p>
                <p className="text-xs mt-0.5 text-muted-foreground">{s.desc}</p>
              </div>
            </div>
            {i < steps.length - 1 && <div className={`h-px w-5 mx-1 ${done ? "bg-border" : "bg-border/30"}`} />}
          </div>
        )
      })}
    </div>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

export default function CAVK12() {
  const navigate = useNavigate()
  const { px } = useCollapse()

  const [step, setStep]                     = useState<Step>("editing")
  const [submitting, setSubmitting]         = useState(false)
  const [generatingPreview, setGenerating]  = useState(false)
  const [savedForm, setSavedForm]           = useState<(CavK12FormData & { id: string }) | null>(null)
  const [fieldErrors, setFieldErrors]       = useState<Partial<Record<keyof CavK12FormData, string>>>({})
  const [formData, setFormData]             = useState<CavK12FormData>(EMPTY)
  const [previewUrl, setPreviewUrl]         = useState<string | null>(null)
  const [toasts, setToasts]                 = useState<Toast[]>([])
  const [preparedOptions, setPrepared]      = useState<any[]>([])
  const [submittedOptions, setSubmitted]    = useState<any[]>([])
  const [showSubmitDialog, setSubmitDialog] = useState(false)
  const [showBackDialog, setBackDialog]     = useState(false)

  const isDirty = step !== "submitted" && Object.values(formData).some(v => 
    typeof v === "boolean" ? v : !!(v as string)?.trim()
  )
  // ── Guard: browser tab close / refresh ──
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (isDirty) { e.preventDefault(); e.returnValue = "" }
    }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isDirty])

  // ── Guard: browser back button ──
  useEffect(() => {
    // Push a state so popstate fires when user presses back
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

  const pushToast = (type: Toast["type"], title: string, message: string) => {
    const id = Date.now()
    setToasts(p => [...p, { id, type, title, message }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5000)
  }

  const clearError = (key: keyof CavK12FormData) =>
    setFieldErrors(p => { const n = { ...p }; delete n[key]; return n })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearError(e.target.name as keyof CavK12FormData)
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }))
  }
  const handleDate = (name: keyof CavK12FormData, val: string) => {
    clearError(name)
    setFormData(p => ({ ...p, [name]: val }))
  }

  const requiredKeys   = (Object.keys(EMPTY) as (keyof CavK12FormData)[]).filter(k => !OPTIONAL.includes(k))
  const filledRequired = requiredKeys.filter(k => !!(formData[k] as string)?.trim()).length
  const progress       = Math.round((filledRequired / requiredKeys.length) * 100)

  const enrolledActive  = !!(formData.enrolled_grade || formData.enrolled_sy)
  const completedActive = !!(formData.status_completed_grade || formData.status_completed_sy)
  const graduatedActive = !!formData.status_graduated_sy

  const hasErr   = (key: keyof CavK12FormData) => !!fieldErrors[key]
  const isFilled = (key: keyof CavK12FormData) => {
    const v = formData[key]
    return typeof v === "boolean" ? v : !!v?.trim()
  }
  const inputCls = (key: keyof CavK12FormData) =>
    `h-9 rounded-lg text-sm transition-all focus-visible:ring-1 disabled:opacity-50 ${
      hasErr(key)     ? "border-destructive bg-destructive/5 focus-visible:ring-destructive"
      : isFilled(key) ? "border-border bg-muted focus-visible:ring-ring"
      : "border-border bg-background focus-visible:ring-ring"
    }`

  const isLocked = step !== "editing"

  const validate = (): boolean => {
    const errors: Partial<Record<keyof CavK12FormData, string>> = {}
    for (const key of requiredKeys) {
      if (!(formData[key] as string)?.trim()) errors[key] = `${FIELD_LABELS[key]} is required`
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

  const handlePreview = async () => {
    if (!validate()) return
    setFieldErrors({})
    setStep("previewing")
    setGenerating(true)
    setPreviewUrl(null)
    try {
      const url = await generateK12PreviewUrl(formData, preparedOptions, submittedOptions)
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
        table: "cav_forms", data: formData, formType: 2,
        userId: user.id, userEmail: user.email!, label: "CAV K-12 Form",
      })
      if (!created?.id) throw new Error("Form creation failed")
      try {
        await logAudit({ action: "created", event: `Created CAV K-12 form for ${formData.full_legal_name}`, recordId: created.id, newData: formData })
      } catch (e) { console.error("Audit log failed:", e) }
      const saved = { ...formData, id: created.id }
      setSavedForm(saved)
      setSubmitDialog(false)
      setStep("submitted")
      pushToast("success", "Submitted!", `CAV K-12 form for ${formData.full_legal_name} was saved.`)
      setGenerating(true)
      const url = await generateK12PreviewUrl(saved, preparedOptions, submittedOptions)
      setPreviewUrl(url)
      setGenerating(false)
    } catch (e: any) {
      pushToast("error", "Submission failed", e.message)
      setSubmitDialog(false)
    } finally {
      setSubmitting(false)
    }
  }

  const handleBack = () => {
    if (step === "submitted")  { navigate("/"); return }
    if (step === "previewing") { handleEditFromPreview(); return }
    if (isDirty) { setBackDialog(true) } else { navigate("/") }
  }

  const prepObj    = preparedOptions.find(p => p.id === formData.prepared_by)
  const subObj     = submittedOptions.find(s => s.id === formData.submitted_by)
  const errorCount = Object.keys(fieldErrors).length

  return (
    <div className="bg-background min-h-screen">
      <div className={`${px} py-8 transition-all duration-300`}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleBack}
              className="gap-1 text-muted-foreground hover:text-foreground h-8 px-2">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-sm shrink-0">
              <FilePen className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-none">CAV Form</h1>
              <p className="text-sm text-muted-foreground mt-0.5">K-12 — Certification, Authentication & Verification</p>
            </div>
          </div>
          <StepTracker step={step} />
        </div>

        {/* ── Error summary banner ── */}
        {errorCount > 0 && step === "editing" && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 animate-in slide-in-from-top-2 duration-200">
            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-destructive">
                {errorCount} field{errorCount > 1 ? "s" : ""} need attention
              </p>
              <p className="text-sm text-destructive/70 mt-0.5 line-clamp-2">
                {Object.values(fieldErrors).filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
        )}

        {/* ── Previewing banner — actions live here only, no duplicate below ── */}
        {step === "previewing" && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20 overflow-hidden">
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="h-9 w-9 rounded-xl bg-white dark:bg-background border border-amber-200 dark:border-amber-900/50 flex items-center justify-center shrink-0">
                <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200 leading-none">Review before submitting</p>
                <p className="text-sm text-amber-700/80 dark:text-amber-400/70 mt-1">Check the PDF on the right. Go back to edit, or confirm to submit.</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={handleEditFromPreview}
                  className="h-8 gap-1.5 text-sm rounded-lg border-amber-300 dark:border-amber-800">
                  <Edit2 className="h-3 w-3" /> Edit
                </Button>
                <Button size="sm" onClick={() => setSubmitDialog(true)} className="h-8 gap-1.5 text-sm rounded-lg">
                  <ShieldCheck className="h-3 w-3" /> Confirm & Submit
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Submitted banner ── */}
        {step === "submitted" && (
          <div className="mb-5 rounded-xl border border-border bg-muted/60 overflow-hidden">
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="h-9 w-9 rounded-xl bg-background border border-border flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground leading-none">Form submitted successfully</p>
                <p className="text-sm text-muted-foreground mt-1">
                  CAV K-12 form for <span className="font-medium text-foreground">{formData.full_legal_name}</span> has been saved to the database.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-[1fr_490px] gap-5 items-start">
          <div className="space-y-4">

            {/* ── Student Information ── */}
            <SectionBlock title="Student Information" icon={<User className="h-3.5 w-3.5" />} dimmed={step === "submitted"}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <FieldRow label="Complete Name" icon={<User className="h-3 w-3" />}
                    error={hasErr("full_legal_name")} errorMsg={fieldErrors.full_legal_name}
                    filled={isFilled("full_legal_name")}>
                    <Input name="full_legal_name" value={formData.full_legal_name} onChange={handleChange}
                      disabled={isLocked} placeholder="Full legal name" className={inputCls("full_legal_name")} />
                  </FieldRow>
                </div>
                <FieldRow label="LRN / Reference No." icon={<Hash className="h-3 w-3" />}
                  error={hasErr("lrn")} errorMsg={fieldErrors.lrn} filled={isFilled("lrn")}>
                  <Input name="lrn" value={formData.lrn} onChange={handleChange}
                    disabled={isLocked} placeholder="Learner Reference No." className={inputCls("lrn")} />
                </FieldRow>
                <FieldRow label="Control No." icon={<Hash className="h-3 w-3" />}
                  error={hasErr("control_no")} errorMsg={fieldErrors.control_no} filled={isFilled("control_no")}>
                  <Input name="control_no" value={formData.control_no} onChange={handleChange}
                    disabled={isLocked} placeholder="e.g. 2024-001" className={inputCls("control_no")} />
                </FieldRow>
                <FieldRow label="SY Completed" icon={<GraduationCap className="h-3 w-3" />}
                  filled={isFilled("school_year_completed")} optional>
                  <Input name="school_year_completed" value={formData.school_year_completed} onChange={handleChange}
                    disabled={isLocked} placeholder="e.g. 2023-2024" className={inputCls("school_year_completed")} />
                </FieldRow>
                <FieldRow label="SY Graduated" icon={<GraduationCap className="h-3 w-3" />}
                  filled={isFilled("school_year_graduated")} optional>
                  <DatePicker value={formData.school_year_graduated} onChange={v => handleDate("school_year_graduated", v)}
                    disabled={isLocked} placeholder="Pick date"
                    className={isFilled("school_year_graduated") ? "border-border bg-muted" : ""} />
                </FieldRow>
              </div>
            </SectionBlock>

            {/* ── Dates ── */}
            <SectionBlock title="Dates" icon={<Calendar className="h-3.5 w-3.5" />} dimmed={step === "submitted"}>
              <div className="grid grid-cols-3 gap-4">
                <FieldRow label="Date Issued" icon={<Calendar className="h-3 w-3" />}
                  error={hasErr("date_issued")} errorMsg={fieldErrors.date_issued} filled={isFilled("date_issued")}>
                  <DatePicker value={formData.date_issued} onChange={v => handleDate("date_issued", v)}
                    disabled={isLocked} placeholder="Pick date"
                    className={hasErr("date_issued") ? "border-destructive bg-destructive/5" : isFilled("date_issued") ? "border-border bg-muted" : ""} />
                </FieldRow>
                <FieldRow label="Date of Application" icon={<Calendar className="h-3 w-3" />}
                  error={hasErr("date_of_application")} errorMsg={fieldErrors.date_of_application} filled={isFilled("date_of_application")}>
                  <DatePicker value={formData.date_of_application} onChange={v => handleDate("date_of_application", v)}
                    disabled={isLocked} placeholder="Pick date"
                    className={hasErr("date_of_application") ? "border-destructive bg-destructive/5" : isFilled("date_of_application") ? "border-border bg-muted" : ""} />
                </FieldRow>
                <FieldRow label="Date of Transmission" icon={<Send className="h-3 w-3" />}
                  error={hasErr("date_of_transmission")} errorMsg={fieldErrors.date_of_transmission} filled={isFilled("date_of_transmission")}>
                  <DatePicker value={formData.date_of_transmission} onChange={v => handleDate("date_of_transmission", v)}
                    disabled={isLocked} placeholder="Pick date"
                    className={hasErr("date_of_transmission") ? "border-destructive bg-destructive/5" : isFilled("date_of_transmission") ? "border-border bg-muted" : ""} />
                </FieldRow>
              </div>
            </SectionBlock>

            {/* ── Student Status ── */}
            <SectionBlock title="Student Status" icon={<BookOpen className="h-3.5 w-3.5" />} dimmed={step === "submitted"}>
              <p className="text-sm text-muted-foreground mb-3.5">
                Optional — entering values will auto-fill and check the corresponding box in the PDF.
              </p>
              {/* ── Completion Status toggle ── */}
              <div className="mb-3.5 rounded-xl border border-border p-3.5">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-0.5">
                    <p className="text-sm font-medium text-foreground">Completion Status</p>
                    <p className="text-xs text-muted-foreground">
                      Controls the output text printed on the PDF
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isLocked}
                    onClick={() => setFormData(p => ({ ...p, is_graduated: !p.is_graduated }))}
                    className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none disabled:opacity-50 ${
                      formData.is_graduated ? "bg-foreground" : "bg-muted-foreground/30"
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
                      formData.is_graduated ? "translate-x-4" : "translate-x-0"
                    }`} />
                  </button>
                </div>
                <div className={`mt-2.5 flex items-center gap-2 text-xs font-medium px-2.5 py-1.5 rounded-lg w-fit transition-all ${
                  formData.is_graduated
                    ? "bg-foreground/8 text-foreground"
                    : "bg-muted text-muted-foreground"
                }`}>
                  <GraduationCap className="h-3 w-3" />
                  {formData.is_graduated ? "Completed" : "Attended"}
                </div>
              </div>
              <div className="space-y-2.5">
                <StatusCard active={enrolledActive} label="Enrolled in">
                  <div className="flex items-center gap-2">
                    <Input name="enrolled_grade" value={formData.enrolled_grade} onChange={handleChange}
                      disabled={isLocked} placeholder="Grade level (e.g. Grade 10)"
                      className={`h-8 text-sm flex-1 rounded-lg border-border disabled:opacity-50 ${formData.enrolled_grade ? "bg-muted" : "bg-background"}`} />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">during SY</span>
                    <Input name="enrolled_sy" value={formData.enrolled_sy} onChange={handleChange}
                      disabled={isLocked} placeholder="2020-2021"
                      className={`h-8 text-sm w-24 rounded-lg border-border disabled:opacity-50 ${formData.enrolled_sy ? "bg-muted" : "bg-background"}`} />
                  </div>
                </StatusCard>
                <StatusCard active={completedActive} label="Completed">
                  <div className="flex items-center gap-2">
                    <Input name="status_completed_grade" value={formData.status_completed_grade} onChange={handleChange}
                      disabled={isLocked} placeholder="Grade level (e.g. Grade 10)"
                      className={`h-8 text-sm flex-1 rounded-lg border-border disabled:opacity-50 ${formData.status_completed_grade ? "bg-muted" : "bg-background"}`} />
                    <span className="text-sm text-muted-foreground whitespace-nowrap">during SY</span>
                    <Input name="status_completed_sy" value={formData.status_completed_sy} onChange={handleChange}
                      disabled={isLocked} placeholder="2020-2021"
                      className={`h-8 text-sm w-24 rounded-lg border-border disabled:opacity-50 ${formData.status_completed_sy ? "bg-muted" : "bg-background"}`} />
                  </div>
                </StatusCard>
                <StatusCard active={graduatedActive} label="Satisfactorily graduated from Secondary Course">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground whitespace-nowrap">for SY</span>
                    <Input name="status_graduated_sy" value={formData.status_graduated_sy} onChange={handleChange}
                      disabled={isLocked} placeholder="2020-2021"
                      className={`h-8 text-sm flex-1 rounded-lg border-border disabled:opacity-50 ${formData.status_graduated_sy ? "bg-muted" : "bg-background"}`} />
                  </div>
                </StatusCard>
              </div>
            </SectionBlock>

            {/* ── Signatories ── */}
            <SectionBlock title="Signatories" icon={<Pen className="h-3.5 w-3.5" />} dimmed={step === "submitted"}>
              <div className="grid grid-cols-2 gap-4">
                {/* Prepared By */}
                <div className="space-y-1.5">
                  <label className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${hasErr("prepared_by") ? "text-destructive" : "text-muted-foreground"}`}>
                    <Pen className="h-3 w-3 opacity-60" /> Prepared By
                    {hasErr("prepared_by") && <AlertCircle className="h-3 w-3 text-destructive ml-auto" />}
                  </label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={isLocked}>
                      <Button variant="outline" className={`w-full h-9 px-3 text-sm font-normal justify-between disabled:opacity-50 ${hasErr("prepared_by") ? "border-destructive bg-destructive/5" : prepObj ? "border-border bg-muted" : ""}`}>
                        <span className={`truncate text-left text-sm ${!prepObj ? "text-muted-foreground" : ""}`}>
                          {prepObj ? prepObj.full_name : "Select signatory"}
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
                            <p className="text-sm text-muted-foreground">{p.position}</p>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {hasErr("prepared_by") && <p className="text-xs font-medium text-destructive/90">{fieldErrors.prepared_by}</p>}
                  {prepObj && !hasErr("prepared_by") && <p className="text-xs text-muted-foreground pl-1 truncate">{prepObj.position}</p>}
                </div>

                {/* Submitted By */}
                <div className="space-y-1.5">
                  <label className={`flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider ${hasErr("submitted_by") ? "text-destructive" : "text-muted-foreground"}`}>
                    <Pen className="h-3 w-3 opacity-60" /> Submitted By
                    {hasErr("submitted_by") && <AlertCircle className="h-3 w-3 text-destructive ml-auto" />}
                  </label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={isLocked}>
                      <Button variant="outline" className={`w-full h-9 px-3 text-sm font-normal justify-between disabled:opacity-50 ${hasErr("submitted_by") ? "border-destructive bg-destructive/5" : subObj ? "border-border bg-muted" : ""}`}>
                        <span className={`truncate text-left text-sm ${!subObj ? "text-muted-foreground" : ""}`}>
                          {subObj ? subObj.full_name : "Select signatory"}
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
                            <p className="text-sm text-muted-foreground">{s.position}</p>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {hasErr("submitted_by") && <p className="text-xs font-medium text-destructive/90">{fieldErrors.submitted_by}</p>}
                  {subObj && !hasErr("submitted_by") && <p className="text-xs text-muted-foreground pl-1 truncate">{subObj.position}</p>}
                </div>
              </div>
            </SectionBlock>

            {/* ── Bottom CTA ──
                editing   → "Preview PDF" button
                previewing → nothing here; actions are in the amber banner above
                submitted  → disabled "Form Submitted" pill
            ── */}
            {step === "editing" && (
              <Button onClick={handlePreview} className="w-full h-11 text-sm font-semibold gap-2 rounded-xl">
                <Eye className="h-4 w-4" /> Preview PDF
                {progress < 100 && (
                  <span className="ml-auto text-xs opacity-55 font-normal tabular-nums">
                    {filledRequired}/{requiredKeys.length} fields
                  </span>
                )}
              </Button>
            )}
            {step === "submitted" && (
              <Button disabled variant="outline" className="w-full h-11 text-sm font-semibold gap-2 rounded-xl">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" /> Form Submitted
              </Button>
            )}
          </div>

          {/* ── PDF Preview Panel ── */}
          <div className="sticky top-6 space-y-3">
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/60">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">PDF Preview</span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium bg-background border border-border">
                  <div className={`h-1.5 w-1.5 rounded-full transition-colors ${
                    step === "submitted" ? "bg-foreground" : step === "previewing" ? "bg-amber-500 animate-pulse" : "bg-muted-foreground/30"
                  }`} />
                  <span className="text-xs text-muted-foreground">
                    {step === "submitted" ? "Saved" : step === "previewing" ? "Review mode" : "Awaiting preview"}
                  </span>
                </div>
              </div>
              <div className="relative bg-muted/30" style={{ height: "780px" }}>
                {step === "editing" && !generatingPreview && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 text-center px-10">
                    <div className="relative">
                      <div className="w-16 h-20 rounded-xl border-2 border-dashed border-border bg-background flex items-end justify-center pb-3">
                        <div className="space-y-1.5 w-9">
                          <div className="h-1 rounded-full bg-border" />
                          <div className="h-1 rounded-full bg-border" />
                          <div className="h-1 w-6 rounded-full bg-border" />
                        </div>
                      </div>
                      <div className="absolute -top-2.5 -right-2.5 h-6 w-6 rounded-full bg-background border border-border flex items-center justify-center">
                        <FileText className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold text-muted-foreground">No preview yet</p>
                      <p className="text-sm text-muted-foreground/70 leading-relaxed max-w-50">
                        Complete the form and click <span className="font-medium text-foreground">Preview PDF</span> to review before submitting
                      </p>
                    </div>
                    <div className="w-full max-w-[140px] space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>{filledRequired} of {requiredKeys.length}</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-border overflow-hidden">
                        <div className="h-full rounded-full bg-foreground/50 transition-all duration-500" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </div>
                )}
                {generatingPreview && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Generating preview…</p>
                  </div>
                )}
                {previewUrl && !generatingPreview && (
                  <iframe src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="absolute inset-0 h-full w-full border-0" title="CAV K-12 PDF Preview" />
                )}
              </div>
            </div>
            <Button onClick={() => savedForm && generateCavK12PDF(savedForm)}
              disabled={step !== "submitted" || generatingPreview}
              variant="outline" className="w-full h-10 gap-2 rounded-xl text-sm">
              <Download className="h-4 w-4" />
              {generatingPreview ? "Generating…" : "Download PDF"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Submit Dialog ── */}
      <AlertDialog open={showSubmitDialog} onOpenChange={open => !submitting && setSubmitDialog(open)}>
        <AlertDialogContent className="max-w-md rounded-2xl">
          <AlertDialogHeader className="items-center text-center sm:text-center">
            <div className="mx-auto mb-1 h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
              <ShieldCheck className="h-7 w-7 text-foreground" />
            </div>
            <AlertDialogTitle className="text-base">Submit this CAV K-12 Form?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              This will permanently save the form for{" "}
              <span className="font-semibold text-foreground">{formData.full_legal_name || "this student"}</span>{" "}
              to the database. Make sure the PDF preview looks correct before proceeding.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-1 rounded-xl border border-border bg-muted divide-y divide-border overflow-hidden">
              {[
                { label: "Student",     value: formData.full_legal_name },
                { label: "LRN",         value: formData.lrn },
                { label: "Control No.", value: formData.control_no },
                { label: "Date Issued", value: formData.date_issued },
                { label: "Status",      value: formData.is_graduated ? "Completed" : "Attended" },  // ← ADD
                { label: "Prepared by", value: prepObj?.full_name },
              ].map(row => (
              <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-sm text-muted-foreground shrink-0">{row.label}</span>
                <span className="text-sm font-medium truncate max-w-[200px] text-right ml-4">
                  {row.value || <span className="text-muted-foreground italic">—</span>}
                </span>
              </div>
            ))}
          </div>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel disabled={submitting} className="flex-1 rounded-xl h-10 m-0 text-sm">Go Back & Check</AlertDialogCancel>
            <AlertDialogAction variant="default"
              onClick={e => { e.preventDefault(); handleConfirmSubmit() }}
              disabled={submitting} className="flex-1 rounded-xl h-10 gap-2 m-0 text-sm">
              {submitting
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting…</>
                : <><CheckCircle2 className="h-3.5 w-3.5" /> Yes, Submit</>}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Discard & Back Dialog ── */}
      <AlertDialog open={showBackDialog} onOpenChange={setBackDialog}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader className="items-center text-center sm:text-center">
            <div className="mx-auto mb-1 h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <TriangleAlert className="h-7 w-7 text-destructive" />
            </div>
            <AlertDialogTitle className="text-base">Discard this form?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              You have unsaved data. Leaving now will permanently discard everything you've entered.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <AlertDialogCancel className="flex-1 rounded-xl h-10 m-0 text-sm">Keep Editing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => navigate("/")}
              className="flex-1 rounded-xl h-10 gap-2 m-0 text-sm">
              <TriangleAlert className="h-3.5 w-3.5" /> Discard & Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Toasts ── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto animate-in slide-in-from-bottom-3 fade-in duration-200">
            {t.type === "error" ? (
              <Alert variant="destructive" className="w-80 shadow-lg">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle className="text-sm">{t.title}</AlertTitle>
                <AlertDescription className="text-sm">{t.message}</AlertDescription>
              </Alert>
            ) : (
              <Alert className="w-80 shadow-lg border-border bg-muted text-foreground [&>svg]:text-foreground">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle className="text-sm">{t.title}</AlertTitle>
                <AlertDescription className="text-sm">{t.message}</AlertDescription>
              </Alert>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}