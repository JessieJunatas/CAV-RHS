import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { createForm } from "../../CRUD"
import { generateCavK12PDF } from "@/utils/generateCAVK12pdf"
import { generateK12PreviewUrl } from "@/utils/generateCAVK12preview"
import { Button } from "@/components/animate-ui/components/buttons/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DatePicker } from "@/components/ui/date-picker"
import {
  User, Calendar, GraduationCap, BookOpen,
  Hash, Send, CheckCircle2, FileText,
  AlertCircle, Download, TriangleAlert,
  ChevronDown, FilePen, Pen,
} from "lucide-react"
import { logAudit } from "@/utils/audit-log"
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// ─── Types ────────────────────────────────────────────────────────────────────

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
  prepared_by?: string
  submitted_by?: string
}

const EMPTY: CavK12FormData = {
  full_legal_name: "", lrn: "",
  date_issued: "", date_of_transmission: "",
  school_year_completed: "", date_of_application: "", school_year_graduated: "",
  control_no: "", enrolled_grade: "", enrolled_sy: "",
  status_completed_grade: "", status_completed_sy: "", status_graduated_sy: "",
  prepared_by: "", submitted_by: "",
}

const FIELD_LABELS: Record<keyof CavK12FormData, string> = {
  full_legal_name: "Complete Name",
  lrn: "LRN / Reference No.",
  date_issued: "Date Issued",
  date_of_transmission: "Date of Transmission",
  school_year_completed: "School Year Completed",
  date_of_application: "Date of Application",
  school_year_graduated: "School Year Graduated",
  control_no: "Control No.",
  enrolled_grade: "Enrolled Grade", enrolled_sy: "Enrolled SY",
  status_completed_grade: "Status Completed Grade", status_completed_sy: "Status Completed SY",
  status_graduated_sy: "Status Graduated SY",
  prepared_by: "Prepared By", submitted_by: "Submitted By",
}

const OPTIONAL: (keyof CavK12FormData)[] = [
  "enrolled_grade",
  "enrolled_sy",
  "school_year_completed",
  "school_year_graduated",
  "status_completed_grade",
  "status_completed_sy",
  "status_graduated_sy",
]

type Toast = { id: number; type: "error" | "success"; title: string; message: string }

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionBlock({ title, icon, children }: {
  title: string; icon: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-border/40 bg-muted/30">
        <span className="text-muted-foreground/60">{icon}</span>
        <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/70">{title}</span>
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
        error ? "text-destructive" : "text-muted-foreground/60"
      }`}>
        <span className={error ? "text-destructive/70" : "text-muted-foreground/40"}>{icon}</span>
        {label}
        {filled && !error && <CheckCircle2 className="h-3 w-3 text-emerald-500 ml-auto shrink-0" />}
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
      active ? "border-primary/25 bg-primary/5" : "border-border/40 bg-muted/20 hover:border-border/70"
    }`}>
      <div className="flex items-center gap-2.5 mb-3">
        <div className={`h-4 w-4 shrink-0 rounded flex items-center justify-center text-[10px] font-black transition-all duration-200 ${
          active ? "bg-primary text-primary-foreground" : "border border-border/60 bg-background text-transparent"
        }`}>✓</div>
        <span className={`text-xs font-medium ${active ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
      </div>
      <div className="pl-6">{children}</div>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CAVK12() {
  const [loading, setLoading] = useState(false)
  const [savedForm, setSavedForm] = useState<(CavK12FormData & { id: string }) | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [formData, setFormData] = useState<CavK12FormData>(EMPTY)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [generatingPreview, setGeneratingPreview] = useState(false)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [preparedOptions, setPreparedOptions] = useState<any[]>([])
  const [submittedOptions, setSubmittedOptions] = useState<any[]>([])

  useEffect(() => {
    supabase.from("signatories").select("id, full_name, position").eq("role_type", "assistant_registrar")
      .then(({ data }) => setPreparedOptions(data || []))
    supabase.from("signatories").select("id, full_name, position").in("role_type", ["registrar", "principal"])
      .then(({ data }) => setSubmittedOptions(data || []))
  }, [])

  const pushToast = (type: Toast["type"], title: string, message: string) => {
    const id = Date.now()
    setToasts(p => [...p, { id, type, title, message }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrors([])
    setFormData(p => ({ ...p, [e.target.name]: e.target.value }))
  }
  const handleDate = (name: keyof CavK12FormData, val: string) => {
    setErrors([])
    setFormData(p => ({ ...p, [name]: val }))
  }

  const requiredKeys = (Object.keys(EMPTY) as (keyof CavK12FormData)[]).filter(k => !OPTIONAL.includes(k))
  const filledRequired = requiredKeys.filter(k => !!formData[k]?.trim()).length
  const progress = Math.round((filledRequired / requiredKeys.length) * 100)

  const enrolledActive = !!(formData.enrolled_grade || formData.enrolled_sy)
  const completedActive = !!(formData.status_completed_grade || formData.status_completed_sy)
  const graduatedActive = !!formData.status_graduated_sy

  const err = (label: string) => errors.includes(label)
  const inputCls = (label: string) =>
    `h-9 rounded-lg text-sm transition-all focus-visible:ring-1 disabled:opacity-50 ${
      err(label)
        ? "border-destructive/50 bg-destructive/5 focus-visible:ring-destructive/20"
        : "border-border/60 bg-background focus-visible:ring-primary/20"
    }`

  const handleSubmit = async () => {
    const missing = requiredKeys.filter(k => !formData[k]?.trim()).map(k => FIELD_LABELS[k])
    if (missing.length) {
      setErrors(missing)
      pushToast("error", "Incomplete form", `Missing: ${missing.join(", ")}`)
      return
    }
    try {
      setLoading(true); setErrors([])
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
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
      pushToast("success", "Form submitted!", "PDF is being generated.")
      setGeneratingPreview(true)
      const url = await generateK12PreviewUrl(saved, preparedOptions, submittedOptions)
      setPreviewUrl(url)
      setGeneratingPreview(false)
    } catch (e: any) {
      pushToast("error", "Submission failed", e.message)
    } finally { setLoading(false) }
  }

  const prepObj = preparedOptions.find(p => p.id === formData.prepared_by)
  const subObj = submittedOptions.find(s => s.id === formData.submitted_by)

  return (
    <div className="bg-background">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ── Page header ── */}
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-3.5">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-sm">
              <FilePen className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight leading-none">CAV Form</h1>
              <p className="text-xs text-muted-foreground mt-0.5">K-12 — Certification, Authentication & Verification</p>
            </div>
          </div>

          {/* Progress pill */}
          <div className="flex items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-2.5">
            <div className="relative h-8 w-8">
              <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32">
                <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted/50" />
                <circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" strokeWidth="2.5"
                  strokeDasharray={`${progress * 0.817} 100`} strokeLinecap="round"
                  className="text-primary transition-all duration-500" />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold">{progress}</span>
            </div>
            <div>
              <p className="text-xs font-semibold leading-none">{filledRequired}/{requiredKeys.length} fields</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{progress === 100 ? "Ready to submit" : "In progress"}</p>
            </div>
          </div>
        </div>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-[1fr_490px] gap-5 items-start">

          {/* ── LEFT: form sections ── */}
          <div className="space-y-4">

            {/* Student Information */}
            <SectionBlock title="Student Information" icon={<User className="h-3.5 w-3.5" />}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <FieldRow label="Complete Name" icon={<User className="h-3 w-3" />}
                    error={err("Complete Name")} filled={!!formData.full_legal_name}>
                    <Input name="full_legal_name" value={formData.full_legal_name}
                      onChange={handleChange} disabled={!!savedForm} placeholder="Full legal name"
                      className={inputCls("Complete Name")} />
                  </FieldRow>
                </div>

                {/* LRN / Reference No. — K-12 specific */}
                <FieldRow label="LRN / Reference No." icon={<Hash className="h-3 w-3" />}
                  error={err("LRN / Reference No.")} filled={!!formData.lrn}>
                  <Input name="lrn" value={formData.lrn}
                    onChange={handleChange} disabled={!!savedForm} placeholder="Learner Reference No."
                    className={inputCls("LRN / Reference No.")} />
                </FieldRow>

                <FieldRow label="Control No." icon={<Hash className="h-3 w-3" />}
                  error={err("Control No.")} filled={!!formData.control_no}>
                  <Input name="control_no" value={formData.control_no}
                    onChange={handleChange} disabled={!!savedForm} placeholder="e.g. 2024-001"
                    className={inputCls("Control No.")} />
                </FieldRow>

                <FieldRow label="SY Completed" icon={<GraduationCap className="h-3 w-3" />}
                  filled={!!formData.school_year_completed}>
                  <Input name="school_year_completed" value={formData.school_year_completed}
                    onChange={handleChange} disabled={!!savedForm} placeholder="e.g. 2023-2024"
                    className={inputCls("School Year Completed")} />
                </FieldRow>

                <FieldRow label="SY Graduated" icon={<GraduationCap className="h-3 w-3" />}
                  filled={!!formData.school_year_graduated}>
                  <DatePicker value={formData.school_year_graduated}
                    onChange={v => handleDate("school_year_graduated", v)}
                    disabled={!!savedForm} placeholder="Pick date" />
                </FieldRow>
              </div>
            </SectionBlock>

            {/* Dates */}
            <SectionBlock title="Dates" icon={<Calendar className="h-3.5 w-3.5" />}>
              <div className="grid grid-cols-3 gap-4">
                <FieldRow label="Date Issued" icon={<Calendar className="h-3 w-3" />}
                  error={err("Date Issued")} filled={!!formData.date_issued}>
                  <DatePicker value={formData.date_issued}
                    onChange={v => handleDate("date_issued", v)}
                    disabled={!!savedForm} placeholder="Pick date"
                    className={err("Date Issued") ? "border-destructive/50 bg-destructive/5" : ""} />
                </FieldRow>

                <FieldRow label="Date of Application" icon={<Calendar className="h-3 w-3" />}
                  error={err("Date of Application")} filled={!!formData.date_of_application}>
                  <DatePicker value={formData.date_of_application}
                    onChange={v => handleDate("date_of_application", v)}
                    disabled={!!savedForm} placeholder="Pick date"
                    className={err("Date of Application") ? "border-destructive/50 bg-destructive/5" : ""} />
                </FieldRow>

                <FieldRow label="Date of Transmission" icon={<Send className="h-3 w-3" />}
                  error={err("Date of Transmission")} filled={!!formData.date_of_transmission}>
                  <DatePicker value={formData.date_of_transmission}
                    onChange={v => handleDate("date_of_transmission", v)}
                    disabled={!!savedForm} placeholder="Pick date"
                    className={err("Date of Transmission") ? "border-destructive/50 bg-destructive/5" : ""} />
                </FieldRow>
              </div>
            </SectionBlock>

            {/* Student Status */}
            <SectionBlock title="Student Status" icon={<BookOpen className="h-3.5 w-3.5" />}>
              <p className="text-[11px] text-muted-foreground/50 mb-3.5">
                Optional — entering values will auto-fill and check the corresponding box in the PDF.
              </p>
              <div className="space-y-2.5">
                <StatusCard active={enrolledActive} label="Enrolled in">
                  <div className="flex items-center gap-2">
                    <Input name="enrolled_grade" value={formData.enrolled_grade}
                      onChange={handleChange} disabled={!!savedForm}
                      placeholder="Grade level (e.g. Grade 10)"
                      className="h-8 text-xs flex-1 rounded-lg border-border/60 bg-background disabled:opacity-50" />
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">during SY</span>
                    <Input name="enrolled_sy" value={formData.enrolled_sy}
                      onChange={handleChange} disabled={!!savedForm}
                      placeholder="2020-2021"
                      className="h-8 text-xs w-24 rounded-lg border-border/60 bg-background disabled:opacity-50" />
                  </div>
                </StatusCard>

                <StatusCard active={completedActive} label="Completed">
                  <div className="flex items-center gap-2">
                    <Input name="status_completed_grade" value={formData.status_completed_grade}
                      onChange={handleChange} disabled={!!savedForm}
                      placeholder="Grade level (e.g. Grade 10)"
                      className="h-8 text-xs flex-1 rounded-lg border-border/60 bg-background disabled:opacity-50" />
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">during SY</span>
                    <Input name="status_completed_sy" value={formData.status_completed_sy}
                      onChange={handleChange} disabled={!!savedForm}
                      placeholder="2020-2021"
                      className="h-8 text-xs w-24 rounded-lg border-border/60 bg-background disabled:opacity-50" />
                  </div>
                </StatusCard>

                <StatusCard active={graduatedActive} label="Satisfactorily graduated from Secondary Course">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">for SY</span>
                    <Input name="status_graduated_sy" value={formData.status_graduated_sy}
                      onChange={handleChange} disabled={!!savedForm}
                      placeholder="2020-2021"
                      className="h-8 text-xs flex-1 rounded-lg border-border/60 bg-background disabled:opacity-50" />
                  </div>
                </StatusCard>
              </div>
            </SectionBlock>

            {/* Signatories */}
            <SectionBlock title="Signatories" icon={<Pen className="h-3.5 w-3.5" />}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className={`text-[11px] font-semibold uppercase tracking-wider ${err("Prepared By") ? "text-destructive" : "text-muted-foreground/60"}`}>
                    Prepared By
                  </label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={!!savedForm}>
                      <Button variant="outline" className={`w-full h-9 px-3 text-sm font-normal justify-between disabled:opacity-50 ${err("Prepared By") ? "border-destructive/50 bg-destructive/5" : ""}`}>
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
                  {prepObj && <p className="text-[10px] text-muted-foreground/50 pl-1 truncate">{prepObj.position}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className={`text-[11px] font-semibold uppercase tracking-wider ${err("Submitted By") ? "text-destructive" : "text-muted-foreground/60"}`}>
                    Submitted By
                  </label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild disabled={!!savedForm}>
                      <Button variant="outline" className={`w-full h-9 px-3 text-sm font-normal justify-between disabled:opacity-50 ${err("Submitted By") ? "border-destructive/50 bg-destructive/5" : ""}`}>
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
                  {subObj && <p className="text-[10px] text-muted-foreground/50 pl-1 truncate">{subObj.position}</p>}
                </div>
              </div>
            </SectionBlock>

            {/* Submit */}
            <Button
              onClick={handleSubmit}
              disabled={loading || !!savedForm}
              className="w-full h-11 text-sm font-semibold gap-2 rounded-xl"
            >
              {loading
                ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />Submitting…</>
                : savedForm
                ? <><CheckCircle2 className="h-4 w-4" />Form Submitted</>
                : "Submit & Generate PDF"}
            </Button>
          </div>

          {/* ── RIGHT: sticky PDF preview ── */}
          <div className="sticky top-6 space-y-3">
            <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground/50" />
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">Preview</span>
                </div>
                <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold transition-colors ${
                  savedForm ? "bg-emerald-500/10 text-emerald-600" : "bg-muted/60 text-muted-foreground/50"
                }`}>
                  <div className={`h-1.5 w-1.5 rounded-full transition-colors ${savedForm ? "bg-emerald-500" : "bg-muted-foreground/30"}`} />
                  {savedForm ? "Ready" : "Awaiting submission"}
                </div>
              </div>

              <div className="relative bg-muted/20" style={{ height: "780px" }}>
                {!savedForm && !generatingPreview && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-8">
                    <div className="relative">
                      <div className="w-16 h-20 rounded-lg border-2 border-dashed border-border/40 bg-background flex items-end justify-center pb-2">
                        <div className="space-y-1 w-10">
                          <div className="h-1 rounded-full bg-muted-foreground/15" />
                          <div className="h-1 rounded-full bg-muted-foreground/15" />
                          <div className="h-1 w-7 rounded-full bg-muted-foreground/15" />
                        </div>
                      </div>
                      <FileText className="absolute -top-2 -right-2 h-5 w-5 text-muted-foreground/20" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground/60">No preview yet</p>
                      <p className="text-xs text-muted-foreground/40 leading-relaxed">Submit the form to generate your PDF</p>
                    </div>
                    <div className="w-full max-w-[150px] space-y-1.5">
                      <div className="flex justify-between text-[10px] text-muted-foreground/40">
                        <span>{filledRequired}/{requiredKeys.length} required</span>
                        <span>{progress}%</span>
                      </div>
                      <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                        <div className="h-full rounded-full bg-primary/40 transition-all duration-500" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  </div>
                )}
                {generatingPreview && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Generating PDF…</p>
                  </div>
                )}
                {previewUrl && !generatingPreview && (
                  <iframe src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    className="absolute inset-0 h-full w-full border-0" title="CAV K-12 PDF Preview" />
                )}
              </div>
            </div>

            <Button onClick={() => savedForm && generateCavK12PDF(savedForm)}
              disabled={!savedForm || generatingPreview} variant="outline"
              className="w-full h-10 gap-2 rounded-xl text-sm">
              <Download className="h-4 w-4" />
              {generatingPreview ? "Generating…" : "Download PDF"}
            </Button>
          </div>
        </div>
      </div>

      {/* ── Toasts ── */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
        {toasts.map(t => t.type === "error" ? (
          <Alert key={t.id} variant="destructive" className="w-80 animate-in slide-in-from-bottom-2 fade-in shadow-lg">
            <TriangleAlert className="h-4 w-4" /><AlertTitle>{t.title}</AlertTitle>
            <AlertDescription>{t.message}</AlertDescription>
          </Alert>
        ) : (
          <Alert key={t.id} className="w-80 animate-in slide-in-from-bottom-2 fade-in shadow-lg border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 [&>svg]:text-emerald-600">
            <CheckCircle2 className="h-4 w-4" /><AlertTitle>{t.title}</AlertTitle>
            <AlertDescription>{t.message}</AlertDescription>
          </Alert>
        ))}
      </div>
    </div>
  )
}