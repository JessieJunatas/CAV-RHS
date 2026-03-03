import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/animate-ui/components/buttons/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { logAudit } from "@/utils/audit-log"
import { getChangedFields } from "@/utils/getChangedFields"
import { getFormTypeLabel } from "@/utils/formTypeUtils"
import { generatePreviewUrl } from "@/utils/generateCAVpreview"
import { generateCavPDF } from "@/utils/generateCAVpdf"
import { generateK12PreviewUrl } from "@/utils/generateCAVK12preview"
import { generateCavK12PDF } from "@/utils/generateCAVK12pdf"
import {
  ArrowLeft, Save, CheckCircle2, AlertCircle,
  User, GraduationCap, BookOpen, Calendar,
  Hash, ClipboardList, Pencil, Send, CircleDot,
  FileText, Download,
} from "lucide-react"

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

function FieldRow({ label, icon, changed, children }: {
  label: string; icon: React.ReactNode; changed?: boolean; children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        <span className="text-muted-foreground/40">{icon}</span>
        {label}
        {changed && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />}
      </label>
      {children}
    </div>
  )
}

function StatusCard({ active, changed, label, children }: {
  active: boolean; changed?: boolean; label: string; children: React.ReactNode
}) {
  return (
    <div className={`rounded-xl border p-3.5 transition-all duration-200 ${
      active ? "border-primary/25 bg-primary/5" : "border-border/40 bg-muted/20 hover:border-border/70"
    } ${changed ? "ring-1 ring-amber-500/30" : ""}`}>
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

function DirtyInput({ name, value, originalValue, onChange, type = "text", placeholder, className = "" }: any) {
  const changed = (value || "") !== (originalValue || "")
  return (
    <Input name={name} value={value || ""} onChange={onChange} type={type} placeholder={placeholder}
      className={`h-9 rounded-lg text-sm transition-all ${className} ${
        changed
          ? "border-amber-500/50 bg-amber-500/5 focus-visible:ring-amber-500/20"
          : "border-border/60 bg-background focus-visible:ring-primary/20"
      }`}
    />
  )
}

function SmallDirtyInput({ name, value, originalValue, onChange, placeholder, className = "" }: any) {
  const changed = (value || "") !== (originalValue || "")
  return (
    <Input name={name} value={value || ""} onChange={onChange} placeholder={placeholder}
      className={`h-8 text-xs rounded-lg transition-all ${className} ${
        changed
          ? "border-amber-500/50 bg-amber-500/5 focus-visible:ring-amber-500/20"
          : "border-border/60 bg-background focus-visible:ring-primary/20"
      }`}
    />
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EditPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [generatingPreview, setGeneratingPreview] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState<any>(null)
  const [originalData, setOriginalData] = useState<any>(null)
  const [preparedOptions, setPreparedOptions] = useState<any[]>([])
  const [submittedOptions, setSubmittedOptions] = useState<any[]>([])

  const isDirty = JSON.stringify(formData) !== JSON.stringify(originalData)
  const isK12 = formData?.form_type === 2

  useEffect(() => {
    supabase.from("signatories").select("id, full_name, position").eq("role_type", "assistant_registrar")
      .then(({ data }) => setPreparedOptions(data || []))
    supabase.from("signatories").select("id, full_name, position").in("role_type", ["registrar", "principal"])
      .then(({ data }) => setSubmittedOptions(data || []))
  }, [])

  useEffect(() => {
    if (!id) return
    supabase.from("cav_forms").select("*").eq("id", id).single().then(({ data, error }) => {
      if (!error && data) { setFormData(data); setOriginalData(data) }
      setLoading(false)
    })
  }, [id])

  useEffect(() => {
    if (!formData) return
    let active = true
    setGeneratingPreview(true)
    const previewFn = formData.form_type === 2 ? generateK12PreviewUrl : generatePreviewUrl
    previewFn(formData, preparedOptions, submittedOptions).then(url => {
      if (active) { setPreviewUrl(url); setGeneratingPreview(false) }
    })
    return () => { active = false }
  }, [formData, preparedOptions, submittedOptions])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (isDirty) e.preventDefault() }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isDirty])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSaved(false)
    setFormData((p: any) => ({ ...p, [e.target.name]: e.target.value }))
  }

  const handleUpdate = async () => {
    if (!id) return
    setSaving(true); setError(null)
    const { oldData, newData } = getChangedFields(originalData, formData)
    if (!newData) { setSaving(false); return }
    const { error } = await supabase.from("cav_forms").update(formData).eq("id", id)
    if (error) { setError(error.message); setSaving(false); return }
    try {
      await logAudit({ action: "updated", event: `Updated CAV form for ${formData.full_legal_name}`, recordId: id as string, oldData, newData })
    } catch (e) { console.error("Audit log failed:", e) }
    setOriginalData(formData); setSaving(false); setSaved(true)
  }

  const handleDownload = () => {
    if (!formData) return
    if (isK12) generateCavK12PDF(formData)
    else generateCavPDF(formData)
  }

  const ch = (field: string) => (formData?.[field] || "") !== (originalData?.[field] || "")

  const enrolledActive = !!(formData?.enrolled_grade || formData?.enrolled_sy)
  const completedActive = !!(formData?.status_completed_grade || formData?.status_completed_sy)
  const graduatedActive = !!formData?.status_graduated_sy

  if (loading) return <LoadingSkeleton />

  if (!formData) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <p className="text-sm text-muted-foreground">Record not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/")}>Go back</Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-7">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")}
              className="gap-1.5 text-muted-foreground hover:text-foreground -ml-2 h-8">
              <ArrowLeft className="h-3.5 w-3.5" />Back
            </Button>
            <div className="h-4 w-px bg-border/60" />
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <Pencil className="h-4 w-4 text-secondary" />
              </div>
              <div>
                <div className="flex items-center gap-2 leading-none">
                  <h1 className="text-base font-bold tracking-tight">Edit CAV Form</h1>
                  {/* ← form type badge */}
                  <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
                    {getFormTypeLabel(formData.form_type)}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{id}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isDirty && !saved && (
              <>
                <div className="flex items-center gap-1.5 text-[11px] text-amber-600 font-medium">
                  <CircleDot className="h-3 w-3" />Unsaved changes
                </div>
                <Button variant="ghost" size="sm" onClick={() => { setFormData(originalData); setSaved(false); setError(null) }}
                  className="text-xs text-muted-foreground h-8">
                  Discard
                </Button>
              </>
            )}
            {saved && (
              <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
                <CheckCircle2 className="h-3 w-3" />Saved!
              </div>
            )}
            <Button size="sm" className="h-8 gap-1.5 min-w-[120px]" onClick={handleUpdate} disabled={saving || saved || !isDirty}>
              {saved
                ? <><CheckCircle2 className="h-3.5 w-3.5" />Saved!</>
                : saving
                ? <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />Saving…</>
                : <><Save className="h-3.5 w-3.5" />Save changes</>}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* ── Main grid ── */}
        <div className="grid grid-cols-[1fr_520px] gap-5 items-start">
          <div className="space-y-4">

            <SectionBlock title="Student Information" icon={<User className="h-3.5 w-3.5" />}>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <FieldRow label="Complete Name" icon={<User className="h-3 w-3" />} changed={ch("full_legal_name")}>
                    <DirtyInput name="full_legal_name" value={formData.full_legal_name} originalValue={originalData.full_legal_name}
                      onChange={handleChange} placeholder="Full legal name" />
                  </FieldRow>
                </div>
                <FieldRow label="Control No." icon={<Hash className="h-3 w-3" />} changed={ch("control_no")}>
                  <DirtyInput name="control_no" value={formData.control_no} originalValue={originalData.control_no}
                    onChange={handleChange} placeholder="e.g. RHS-031626" />
                </FieldRow>

                {/* K-12 specific field */}
                {isK12 && (
                  <FieldRow label="LRN / Reference No." icon={<Hash className="h-3 w-3" />} changed={ch("lrn")}>
                    <DirtyInput name="lrn" value={formData.lrn} originalValue={originalData.lrn}
                      onChange={handleChange} placeholder="Learner Reference No." />
                  </FieldRow>
                )}

                <FieldRow label="SY Completed" icon={<GraduationCap className="h-3 w-3" />} changed={ch("school_year_completed")}>
                  <DirtyInput name="school_year_completed" value={formData.school_year_completed} originalValue={originalData.school_year_completed}
                    onChange={handleChange} placeholder="e.g. 2023-2024" />
                </FieldRow>
                <FieldRow label="SY Graduated" icon={<GraduationCap className="h-3 w-3" />} changed={ch("school_year_graduated")}>
                  <DirtyInput name="school_year_graduated" value={formData.school_year_graduated} originalValue={originalData.school_year_graduated}
                    onChange={handleChange} type="date" />
                </FieldRow>
              </div>
            </SectionBlock>

            <SectionBlock title="Dates" icon={<Calendar className="h-3.5 w-3.5" />}>
              <div className="grid grid-cols-3 gap-4">
                <FieldRow label="Date Issued" icon={<Calendar className="h-3 w-3" />} changed={ch("date_issued")}>
                  <DirtyInput name="date_issued" value={formData.date_issued} originalValue={originalData.date_issued}
                    onChange={handleChange} type="date" />
                </FieldRow>
                <FieldRow label="Date of Application" icon={<ClipboardList className="h-3 w-3" />} changed={ch("date_of_application")}>
                  <DirtyInput name="date_of_application" value={formData.date_of_application} originalValue={originalData.date_of_application}
                    onChange={handleChange} type="date" />
                </FieldRow>
                <FieldRow label="Date of Transmission" icon={<Send className="h-3 w-3" />} changed={ch("date_of_transmission")}>
                  <DirtyInput name="date_of_transmission" value={formData.date_of_transmission} originalValue={originalData.date_of_transmission}
                    onChange={handleChange} type="date" />
                </FieldRow>
              </div>
            </SectionBlock>

            <SectionBlock title="Student Status" icon={<BookOpen className="h-3.5 w-3.5" />}>
              <p className="text-[11px] text-muted-foreground/50 mb-3.5">
                Optional — values auto-fill and check the corresponding box in the PDF.
              </p>
              <div className="space-y-2.5">
                <StatusCard active={enrolledActive} label="Enrolled in" changed={ch("enrolled_grade") || ch("enrolled_sy")}>
                  <div className="flex items-center gap-2">
                    <SmallDirtyInput name="enrolled_grade" value={formData.enrolled_grade} originalValue={originalData.enrolled_grade}
                      onChange={handleChange} placeholder="Grade level (e.g. Grade 10)" className="flex-1" />
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">during SY</span>
                    <SmallDirtyInput name="enrolled_sy" value={formData.enrolled_sy} originalValue={originalData.enrolled_sy}
                      onChange={handleChange} placeholder="2020-2021" className="w-24" />
                  </div>
                </StatusCard>
                <StatusCard active={completedActive} label="Completed" changed={ch("status_completed_grade") || ch("status_completed_sy")}>
                  <div className="flex items-center gap-2">
                    <SmallDirtyInput name="status_completed_grade" value={formData.status_completed_grade} originalValue={originalData.status_completed_grade}
                      onChange={handleChange} placeholder="Grade level (e.g. Grade 10)" className="flex-1" />
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">during SY</span>
                    <SmallDirtyInput name="status_completed_sy" value={formData.status_completed_sy} originalValue={originalData.status_completed_sy}
                      onChange={handleChange} placeholder="2020-2021" className="w-24" />
                  </div>
                </StatusCard>
                <StatusCard active={graduatedActive} label="Satisfactorily graduated from Secondary Course" changed={ch("status_graduated_sy")}>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-muted-foreground whitespace-nowrap">for SY</span>
                    <SmallDirtyInput name="status_graduated_sy" value={formData.status_graduated_sy} originalValue={originalData.status_graduated_sy}
                      onChange={handleChange} placeholder="2020-2021" className="flex-1" />
                  </div>
                </StatusCard>
              </div>
            </SectionBlock>

            <Button onClick={handleUpdate} disabled={saving || saved || !isDirty}
              className="w-full h-11 text-sm font-semibold gap-2 rounded-xl">
              {saved
                ? <><CheckCircle2 className="h-4 w-4" />Saved!</>
                : saving
                ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />Saving…</>
                : <><Save className="h-4 w-4" />Save Changes</>}
            </Button>
          </div>

          {/* ── RIGHT: sticky PDF preview ── */}
          <div className="sticky top-6 space-y-3">
            <div className="rounded-2xl border border-border/50 bg-card overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border/40">
                <div className="flex items-center gap-2">
                  <FileText className="h-3.5 w-3.5 text-muted-foreground/50" />
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/60">Live Preview</span>
                </div>
                {isDirty && !generatingPreview && (
                  <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold bg-amber-500/10 text-amber-600">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />Unsaved
                  </div>
                )}
                {!isDirty && !generatingPreview && (
                  <div className="flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold bg-emerald-500/10 text-emerald-600">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Synced
                  </div>
                )}
              </div>
              <div className="relative bg-muted/20" style={{ height: "780px" }}>
                {generatingPreview && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/20 z-10">
                    <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Updating preview…</p>
                  </div>
                )}
                {previewUrl && (
                  <iframe src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                    className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-300 ${generatingPreview ? "opacity-30" : "opacity-100"}`}
                    title="CAV PDF Preview" />
                )}
              </div>
            </div>
            <Button onClick={handleDownload} variant="outline" className="w-full h-10 gap-2 rounded-xl text-sm">
              <Download className="h-4 w-4" />Download PDF
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-7">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-8 w-48 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
        <div className="grid grid-cols-[1fr_420px] gap-5">
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="rounded-2xl border border-border/50 overflow-hidden">
                <div className="h-11 bg-muted/30 border-b border-border/40" />
                <div className="p-5 grid grid-cols-2 gap-4">
                  {Array.from({ length: i === 2 ? 3 : 4 }).map((_, j) => (
                    <div key={j} className="space-y-1.5">
                      <Skeleton className="h-3 w-20 rounded" />
                      <Skeleton className="h-9 w-full rounded-lg" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <Skeleton className="h-[640px] rounded-2xl" />
        </div>
      </div>
    </div>
  )
}