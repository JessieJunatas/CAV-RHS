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
  User, Calendar, GraduationCap, BookOpen,
  Hash, Send, CheckCircle2, FileText,
  AlertCircle, Download, TriangleAlert,
  ChevronDown, FilePen, Pen,
  ArrowLeft, Eye, Edit2, ShieldCheck, Loader2,
} from "lucide-react"
import { logAudit } from "@/utils/audit-log"
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"


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
}

type Step = "editing" | "previewing" | "submitted"

const EMPTY: CavFormData = {
  full_legal_name: "", date_issued: "", date_of_transmission: "",
  school_year_completed: "", date_of_application: "", school_year_graduated: "",
  control_no: "", enrolled_grade: "", enrolled_sy: "",
  status_completed_grade: "", status_completed_sy: "", status_graduated_sy: "",
  prepared_by: "", submitted_by: "",
}

const FIELD_LABELS: Record<keyof CavFormData, string> = {
  full_legal_name: "Complete Name", date_issued: "Date Issued",
  date_of_transmission: "Date of Transmission", school_year_completed: "School Year Completed",
  date_of_application: "Date of Application", school_year_graduated: "School Year Graduated",
  control_no: "Control No.", enrolled_grade: "Enrolled Grade", enrolled_sy: "Enrolled SY",
  status_completed_grade: "Status Completed Grade", status_completed_sy: "Status Completed SY",
  status_graduated_sy: "Status Graduated SY",
  prepared_by: "Prepared By", submitted_by: "Submitted By",
}

const OPTIONAL: (keyof CavFormData)[] = [
  "enrolled_grade", "enrolled_sy", "school_year_completed",
  "school_year_graduated", "status_completed_grade",
  "status_completed_sy", "status_graduated_sy",
]

type Toast = { id: number; type: "error" | "success"; title: string; message: string }


function SectionBlock({ title, icon, children, dimmed }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; dimmed?: boolean
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card overflow-hidden transition-opacity duration-300 ${dimmed ? "opacity-50 pointer-events-none select-none" : ""}`}>
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border bg-muted">
        <span className="text-muted-foreground">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</span>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function FieldRow({ label, icon, error, filled, children }: {
  label: string; icon: React.ReactNode; error?: boolean; filled?: boolean; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
        error ? "text-destructive" : "text-muted-foreground"
      }`}>
        <span className={error ? "text-destructive" : "text-muted-foreground"}>{icon}</span>
        {label}
        {filled && !error && <CheckCircle2 className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />}
        {error && <AlertCircle className="h-3 w-3 text-destructive ml-auto shrink-0" />}
      </label>
      {children}
    </div>
  )
}

function StatusCard({ active, label, children }: {
  active: boolean; label: string; children: React.ReactNode
}) {
  return (
    <div className={`rounded-xl border p-3.5 transition-all duration-200 ${
      active ? "border-border bg-muted" : "border-border bg-muted hover:border-border"
    }`}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`h-4 w-4 shrink-0 rounded flex items-center justify-center text-[10px] font-black transition-all duration-200 ${
          active ? "bg-muted-foreground text-background" : "border border-border bg-background text-background"
        }`}>✓</div>
        <span className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
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
        const done   = i < current
        const active = i === current
        return (
          <div key={s.key} className="flex items-center">
            <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all duration-300 ${active ? "bg-muted" : ""}`}>
              <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 transition-all duration-300 ${
                done    ? "bg-muted-foreground text-background"
                : active ? "bg-foreground text-background ring-4 ring-foreground"
                : "border-2 border-border text-muted-foreground"
              }`}>
                {done
                  ? <CheckCircle2 className="h-3 w-3" />
                  : <span className="text-[10px] font-bold">{i + 1}</span>
                }
              </div>
              <div className="hidden sm:block">
                <p className={`text-[11px] font-semibold leading-none transition-colors ${
                  active ? "text-foreground" : done ? "text-muted-foreground" : "text-muted-foreground"
                }`}>{s.label}</p>
                <p className={`text-[10px] mt-0.5 transition-colors ${
                  active ? "text-muted-foreground" : "text-muted-foreground"
                }`}>{s.desc}</p>
              </div>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-px w-5 mx-1 transition-colors duration-500 ${done ? "bg-border/60" : "bg-border/30"}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}


export default function CAV() {
  const navigate = useNavigate()

  const [step, setStep]                     = useState<Step>("editing")
  const [submitting, setSubmitting]         = useState(false)
  const [generatingPreview, setGenerating]  = useState(false)
  const [savedForm, setSavedForm]           = useState<(CavFormData & { id: string }) | null>(null)
  const [errors, setErrors]                 = useState<string[]>([])
  const [formData, setFormData]             = useState<CavFormData>(EMPTY)
  const [previewUrl, setPreviewUrl]         = useState<string | null>(null)
  const [toasts, setToasts]                 = useState<Toast[]>([])
  const [preparedOptions, setPrepared]      = useState<any[]>([])
  const [submittedOptions, setSubmitted]    = useState<any[]>([])
  const [showSubmitDialog, setSubmitDialog] = useState(false)
  const [showBackDialog, setBackDialog]     = useState(false)

  const isDirty = Object.values(formData).some(v => !!v?.trim())

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrors([])
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }))
  }
  const handleDate = (name: keyof CavFormData, val: string) => {
    setErrors([])
    setFormData(p => ({ ...p, [name]: val }))
  }

  const requiredKeys  = (Object.keys(EMPTY) as (keyof CavFormData)[]).filter(k => !OPTIONAL.includes(k))
  const filledRequired = requiredKeys.filter(k => !!formData[k]?.trim()).length
  const progress       = Math.round((filledRequired / requiredKeys.length) * 100)

  const enrolledActive  = !!(formData.enrolled_grade || formData.enrolled_sy)
  const completedActive = !!(formData.status_completed_grade || formData.status_completed_sy)
  const graduatedActive = !!formData.status_graduated_sy

  const err      = (label: string) => errors.includes(label)
  const isFilled = (key: keyof CavFormData) => !!formData[key]?.trim()
  const inputCls = (label: string, key: keyof CavFormData) =>
    `h-9 rounded-lg text-sm transition-all focus-visible:ring-1 disabled:opacity-50 ${
      err(label)
        ? "border-destructive/50 bg-destructive/10 focus-visible:ring-destructive"
        : isFilled(key)
        ? "border-border bg-muted focus-visible:ring-border"
        : "border-border bg-background focus-visible:ring-border"
    }`

  const isLocked = step !== "editing"

  const handlePreview = async () => {
    const missing = requiredKeys.filter(k => !formData[k]?.trim()).map(k => FIELD_LABELS[k])
    if (missing.length) {
      setErrors(missing)
      pushToast("error", "Incomplete form", `Please fill in: ${missing.join(", ")}`)
      return
    }
    setErrors([])
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

  const handleEditFromPreview = () => {
    setStep("editing")
    setPreviewUrl(null)
  }

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
        await logAudit({ action: "created", event: `Created CAV form for ${formData.full_legal_name}`, recordId: created.id, newData: formData })
      } catch (e) { console.error("Audit log failed:", e) }
      const saved = { ...formData, id: created.id }
      setSavedForm(saved)
      setSubmitDialog(false)
      setStep("submitted")
      pushToast("success", "Submitted!", `CAV form for ${formData.full_legal_name} was saved.`)
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

  const handleBack = () => {
    if (step === "submitted")  { navigate("/"); return }
    if (step === "previewing") { handleEditFromPreview(); return }
    if (isDirty) { setBackDialog(true) } else { navigate("/") }
  }

  const prepObj = preparedOptions.find(p => p.id === formData.prepared_by)
  const subObj  = submittedOptions.find(s => s.id === formData.submitted_by)

  return (
    <div className="bg-background min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-8">

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
              <p className="text-xs text-muted-foreground mt-0.5">Junior High School — Certification, Authentication & Verification</p>
            </div>
          </div>
          <StepTracker step={step} />
        </div>

        {step === "previewing" && (
          <div className="mb-5 rounded-xl border border-border bg-muted overflow-hidden">
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground leading-none">Review before submitting</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Check the PDF on the right. You can still edit any field before finalizing.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={handleEditFromPreview}
                  className="h-8 gap-1.5 text-xs rounded-lg border-border hover:bg-muted text-foreground">
                  <Edit2 className="h-3 w-3" /> Edit Form
                </Button>
                <Button size="sm" onClick={() => setSubmitDialog(true)}
                  className="h-8 gap-1.5 text-xs rounded-lg bg-foreground hover:bg-foreground text-background">
                  <ShieldCheck className="h-3 w-3" /> Confirm & Submit
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === "submitted" && (
          <div className="mb-5 rounded-xl border border-border bg-muted overflow-hidden">
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="h-9 w-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-4.5 w-4.5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground leading-none">Form submitted successfully</p>
                <p className="text-xs text-muted-foreground mt-1">
                  CAV form for <span className="font-medium">{formData.full_legal_name}</span> has been saved to the database.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-[1fr_490px] gap-5 items-start">

          <div className="space-y-4">

            <SectionBlock title="Student Information" icon={<User className="h-3.5 w-3.5" />} dimmed={step === "submitted"}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <FieldRow label="Complete Name" icon={<User className="h-3 w-3" />} error={err("Complete Name")} filled={!!formData.full_legal_name}>
                    <Input name="full_legal_name" value={formData.full_legal_name} onChange={handleChange}
                      disabled={isLocked} placeholder="Full legal name" className={inputCls("Complete Name", "full_legal_name")} />
                  </FieldRow>
                </div>
                <FieldRow label="Control No." icon={<Hash className="h-3 w-3" />} error={err("Control No.")} filled={!!formData.control_no}>
                  <Input name="control_no" value={formData.control_no} onChange={handleChange}
                    disabled={isLocked} placeholder="e.g. 2024-001" className={inputCls("Control No.", "control_no")} />
                </FieldRow>
                <FieldRow label="SY Completed" icon={<GraduationCap className="h-3 w-3" />} error={err("School Year Completed")} filled={!!formData.school_year_completed}>
                  <Input name="school_year_completed" value={formData.school_year_completed} onChange={handleChange}
                    disabled={isLocked} placeholder="e.g. 2023-2024" className={inputCls("School Year Completed", "school_year_completed")} />
                </FieldRow>
                <FieldRow label="SY Graduated" icon={<GraduationCap className="h-3 w-3" />} error={err("School Year Graduated")} filled={!!formData.school_year_graduated}>
                  <DatePicker value={formData.school_year_graduated} onChange={v => handleDate("school_year_graduated", v)}
                    disabled={isLocked} placeholder="Pick date"
                    className={err("School Year Graduated") ? "border-destructive/50 bg-destructive/10" : isFilled("school_year_graduated") ? "border-border bg-muted" : ""} />
                </FieldRow>
              </div>
            </SectionBlock>

            <SectionBlock title="Dates" icon={<Calendar className="h-3.5 w-3.5" />} dimmed={step === "submitted"}>
              <div className="grid grid-cols-3 gap-4">
                <FieldRow label="Date Issued" icon={<Calendar className="h-3 w-3" />} error={err("Date Issued")} filled={!!formData.date_issued}>
                  <DatePicker value={formData.date_issued} onChange={v => handleDate("date_issued", v)}
                    disabled={isLocked} placeholder="Pick date"
                    className={err("Date Issued") ? "border-destructive/50 bg-destructive/10" : isFilled("date_issued") ? "border-border bg-muted" : ""} />
                </FieldRow>
                <FieldRow label="Date of Application" icon={<Calendar className="h-3 w-3" />} error={err("Date of Application")} filled={!!formData.date_of_application}>
                  <DatePicker value={formData.date_of_application} onChange={v => handleDate("date_of_application", v)}
                    disabled={isLocked} placeholder="Pick date"
                    className={err("Date of Application") ? "border-destructive/50 bg-destructive/10" : isFilled("date_of_application") ? "border-border bg-muted" : ""} />
                </FieldRow>
                <FieldRow label="Date of Transmission" icon={<Send className="h-3 w-3" />} error={err("Date of Transmission")} filled={!!formData.date_of_transmission}>
                  <DatePicker value={formData.date_of_transmission} onChange={v => handleDate("date_of_transmission", v)}
                    disabled={isLocked} placeholder="Pick date"
                    className={err("Date of Transmission") ? "border-destructive/50 bg-destructive/10" : isFilled("date_of_transmission") ? "border-border bg-muted" : ""} />
                </FieldRow>
              </div>
            </SectionBlock>

            <SectionBlock title="Student Status" icon={<BookOpen className="h-3.5 w-3.5" />} dimmed={step === "submitted"}>
              <p className="text-[11px] text-muted-foreground mb-3.5">
                Optional — entering values will auto-fill and check the corresponding box in the PDF.
              </p>
              <div className="space-y-2.5">
                <StatusCard active={enrolledActive} label="Enrolled in">
                  <div className="flex items-center gap-2">
                    <Input name="enrolled_grade" value={formData.enrolled_grade} onChange={handleChange}
                      disabled={isLocked} placeholder="Grade level (e.g. Grade 10)"
                      className={`h-8 text-xs flex-1 rounded-lg border-border disabled:opacity-50 ${formData.enrolled_grade ? "bg-muted" : "bg-background"}`} />
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">during SY</span>
                    <Input name="enrolled_sy" value={formData.enrolled_sy} onChange={handleChange}
                      disabled={isLocked} placeholder="2020-2021"
                      className={`h-8 text-xs w-24 rounded-lg border-border disabled:opacity-50 ${formData.enrolled_sy ? "bg-muted" : "bg-background"}`} />
                  </div>
                </StatusCard>
                <StatusCard active={completedActive} label="Completed">
                  <div className="flex items-center gap-2">
                    <Input name="status_completed_grade" value={formData.status_completed_grade} onChange={handleChange}
                      disabled={isLocked} placeholder="Grade level (e.g. Grade 10)"
                      className={`h-8 text-xs flex-1 rounded-lg border-border disabled:opacity-50 ${formData.status_completed_grade ? "bg-muted border-border" : "bg-background"}`} />
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">during SY</span>
                    <Input name="status_completed_sy" value={formData.status_completed_sy} onChange={handleChange}
                      disabled={isLocked} placeholder="2020-2021"
                      className={`h-8 text-xs w-24 rounded-lg border-border disabled:opacity-50 ${formData.status_completed_sy ? "bg-muted border-border" : "bg-background"}`} />
                  </div>
                </StatusCard>
                <StatusCard active={graduatedActive} label="Satisfactorily graduated from Secondary Course">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">for SY</span>
                    <Input name="status_graduated_sy" value={formData.status_graduated_sy} onChange={handleChange}
                      disabled={isLocked} placeholder="2020-2021"
                      className={`h-8 text-xs flex-1 rounded-lg border-border disabled:opacity-50 ${formData.status_graduated_sy ? "bg-muted border-border" : "bg-background"}`} />
                  </div>
                </StatusCard>
              </div>
            </SectionBlock>

            <SectionBlock title="Signatories" icon={<Pen className="h-3.5 w-3.5" />} dimmed={step === "submitted"}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={`text-[11px] font-semibold uppercase tracking-wider ${err("Prepared By") ? "text-destructive" : "text-muted-foreground"}`}>Prepared By</label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={isLocked}>
                      <Button variant="outline" className={`w-full h-9 px-3 text-sm font-normal justify-between disabled:opacity-50 ${err("Prepared By") ? "border-destructive/50 bg-destructive/10" : prepObj ? "border-border bg-muted" : ""}`}>
                        <span className={`truncate text-left text-sm ${!prepObj ? "text-muted-foreground" : ""}`}>
                          {prepObj ? prepObj.full_name : "Select signatory"}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-[var(--radix-dropdown-menu-trigger-width)]" align="start">
                      {preparedOptions.map(p => (
                        <DropdownMenuItem key={p.id} onSelect={() => setFormData(prev => ({ ...prev, prepared_by: p.id }))}>
                          <div className="py-0.5">
                            <p className="text-sm font-medium">{p.full_name}</p>
                            <p className="text-xs text-muted-foreground">{p.position}</p>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {prepObj && <p className="text-[10px] text-muted-foreground pl-1 truncate">{prepObj.position}</p>}
                </div>
                <div className="space-y-1.5">
                  <label className={`text-[11px] font-semibold uppercase tracking-wider ${err("Submitted By") ? "text-destructive" : "text-muted-foreground"}`}>Submitted By</label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={isLocked}>
                      <Button variant="outline" className={`w-full h-9 px-3 text-sm font-normal justify-between disabled:opacity-50 ${err("Submitted By") ? "border-destructive/50 bg-destructive/10" : subObj ? "border-border bg-muted" : ""}`}>
                        <span className={`truncate text-left text-sm ${!subObj ? "text-muted-foreground" : ""}`}>
                          {subObj ? subObj.full_name : "Select signatory"}
                        </span>
                        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="min-w-[var(--radix-dropdown-menu-trigger-width)]" align="start">
                      {submittedOptions.map(s => (
                        <DropdownMenuItem key={s.id} onSelect={() => setFormData(prev => ({ ...prev, submitted_by: s.id }))}>
                          <div className="py-0.5">
                            <p className="text-sm font-medium">{s.full_name}</p>
                            <p className="text-xs text-muted-foreground">{s.position}</p>
                          </div>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {subObj && <p className="text-[10px] text-muted-foreground pl-1 truncate">{subObj.position}</p>}
                </div>
              </div>
            </SectionBlock>

            {step === "editing" && (
              <Button onClick={handlePreview} className="w-full h-11 text-sm font-semibold gap-2 rounded-xl">
                <Eye className="h-4 w-4" />
                Preview PDF
                {progress < 100 && (
                  <span className="ml-auto text-[10px] opacity-55 font-normal tabular-nums">
                    {filledRequired}/{requiredKeys.length}
                  </span>
                )}
              </Button>
            )}
            {step === "previewing" && (
              <div className="flex gap-2.5">
                <Button variant="outline" onClick={handleEditFromPreview} className="flex-1 h-11 text-sm font-semibold gap-2 rounded-xl">
                  <Edit2 className="h-4 w-4" /> Edit Form
                </Button>
                <Button onClick={() => setSubmitDialog(true)} className="flex-1 h-11 text-sm font-semibold gap-2 rounded-xl bg-foreground hover:bg-foreground">
                  <ShieldCheck className="h-4 w-4" /> Confirm & Submit
                </Button>
              </div>
            )}
            {step === "submitted" && (
              <Button disabled variant="outline" className="w-full h-11 text-sm font-semibold gap-2 rounded-xl">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" /> Form Submitted
              </Button>
            )}
          </div>

          <div className="sticky top-6 space-y-3">
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">PDF Preview</span>
                </div>
                <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-all duration-300 ${
                  step === "submitted"  ? "bg-muted text-muted-foreground"
                  : step === "previewing" ? "bg-muted text-muted-foreground"
                  : "bg-muted text-muted-foreground"
                }`}>
                  <div className={`h-1.5 w-1.5 rounded-full ${
                    step === "submitted"  ? "bg-muted-foreground"
                    : step === "previewing" ? "bg-muted-foreground animate-pulse"
                    : "bg-muted-foreground"
                  }`} />
                  {step === "submitted" ? "Saved" : step === "previewing" ? "Review mode" : "Awaiting preview"}
                </div>
              </div>

              <div className="relative bg-muted" style={{ height: "780px" }}>
                {step === "editing" && !generatingPreview && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 text-center px-10">
                    <div className="relative">
                      <div className="w-16 h-20 rounded-xl border-2 border-dashed border-border bg-background flex items-end justify-center pb-3">
                        <div className="space-y-1.5 w-9">
                          <div className="h-1 rounded-full bg-muted-foreground" />
                          <div className="h-1 rounded-full bg-muted-foreground" />
                          <div className="h-1 w-6 rounded-full bg-muted-foreground" />
                        </div>
                      </div>
                      <div className="absolute -top-2.5 -right-2.5 h-6 w-6 rounded-full bg-muted border border-border flex items-center justify-center">
                        <FileText className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold text-muted-foreground">No preview yet</p>
                      <p className="text-xs text-muted-foreground leading-relaxed max-w-[180px]">
                        Complete the form and click <span className="font-medium text-muted-foreground">Preview PDF</span> to review before submitting
                      </p>
                    </div>
                    <div className="w-full max-w-[140px] space-y-2">
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>{filledRequired} of {requiredKeys.length}</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-muted-foreground transition-all duration-500" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </div>
                )}
                {generatingPreview && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Generating preview…</p>
                  </div>
                )}
                {previewUrl && !generatingPreview && (
                  <iframe src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="absolute inset-0 h-full w-full border-0" title="CAV PDF Preview" />
                )}
              </div>
            </div>

            <Button onClick={() => savedForm && generateCavPDF(savedForm)}
              disabled={step !== "submitted" || generatingPreview}
              variant="outline" className="w-full h-10 gap-2 rounded-xl text-sm">
              <Download className="h-4 w-4" />
              {generatingPreview ? "Generating…" : "Download PDF"}
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={showSubmitDialog} onOpenChange={open => !submitting && setSubmitDialog(open)}>
        <AlertDialogContent className="max-w-md rounded-2xl">
          <AlertDialogHeader className="items-center text-center sm:text-center">
            <div className="mx-auto mb-1 h-14 w-14 rounded-2xl bg-muted flex items-center justify-center">
              <ShieldCheck className="h-7 w-7 text-foreground" />
            </div>
            <AlertDialogTitle className="text-base">Submit this CAV Form?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              This will permanently save the form for{" "}
              <span className="font-semibold text-foreground">{formData.full_legal_name || "this student"}</span>{" "}
              to the database. Make sure the PDF preview looks correct before proceeding.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="my-1 rounded-xl border border-border bg-muted divide-y divide-border overflow-hidden">
            {[
              { label: "Student",     value: formData.full_legal_name },
              { label: "Control No.", value: formData.control_no },
              { label: "Date Issued", value: formData.date_issued },
              { label: "Prepared by", value: prepObj?.full_name },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-xs text-muted-foreground shrink-0">{row.label}</span>
                <span className="text-xs font-medium truncate max-w-[200px] text-right ml-4">
                  {row.value || <span className="text-muted-foreground italic">—</span>}
                </span>
              </div>
            ))}
          </div>

          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-2">
            <AlertDialogCancel disabled={submitting} className="flex-1 rounded-xl h-10 m-0">
              Go Back & Check
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={e => { e.preventDefault(); handleConfirmSubmit() }}
              disabled={submitting}
              className="flex-1 rounded-xl h-10 bg-foreground hover:bg-foreground focus:ring-foreground gap-2 m-0"
            >
              {submitting
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Submitting…</>
                : <><CheckCircle2 className="h-3.5 w-3.5" /> Yes, Submit</>
              }
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showBackDialog} onOpenChange={setBackDialog}>
        <AlertDialogContent className="max-w-md rounded-2xl">
          <AlertDialogHeader className="items-center text-center sm:text-center">
            <div className="mx-auto mb-1 h-14 w-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <TriangleAlert className="h-7 w-7 text-destructive" />
            </div>
            <AlertDialogTitle className="text-base">Discard this form?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm leading-relaxed">
              You have unsaved data. Leaving now will permanently discard everything you've entered. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-2">
            <AlertDialogCancel className="flex-1 rounded-xl h-10 m-0">
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => navigate("/")}
              className="flex-1 rounded-xl h-10 bg-destructive hover:bg-destructive gap-2 m-0"
            >
              <TriangleAlert className="h-3.5 w-3.5" /> Discard & Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto animate-in slide-in-from-bottom-3 fade-in duration-200">
            {t.type === "error"
              ? (
                <Alert variant="destructive" className="w-80 shadow-lg">
                  <TriangleAlert className="h-4 w-4" />
                  <AlertTitle>{t.title}</AlertTitle>
                  <AlertDescription>{t.message}</AlertDescription>
                </Alert>
              ) : (
                <Alert className="w-80 shadow-lg border-border bg-muted text-foreground [&>svg]:text-foreground">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle>{t.title}</AlertTitle>
                  <AlertDescription>{t.message}</AlertDescription>
                </Alert>
              )
            }
          </div>
        ))}
      </div>
    </div>
  )
}