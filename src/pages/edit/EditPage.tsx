import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/animate-ui/components/buttons/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { logAudit } from "@/utils/audit-log"
import { getChangedFields } from "@/utils/getChangedFields"
import {
  ArrowLeft, Save, CheckCircle2, AlertCircle,
  CircleDot, User, School, MapPin, GraduationCap,
  Calendar, Hash, ClipboardList,
} from "lucide-react"
import { generatePreviewUrl } from "@/utils/generateCAVpreview"

function EditPage() {
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

  const isDirty = JSON.stringify(formData) !== JSON.stringify(originalData)

  useEffect(() => {
    const fetchData = async () => {
      if (!id) return
      const { data, error } = await supabase
        .from("cav_forms")
        .select("*")
        .eq("id", id)
        .single()

      if (!error && data) {
        setFormData(data)
        setOriginalData(data)
      }
      setLoading(false)
    }
    fetchData()
  }, [id])

  useEffect(() => {
    if (!formData) return

    let active = true

    const generate = async () => {
      setGeneratingPreview(true)
      const url = await generatePreviewUrl(formData)
      if (active) setPreviewUrl(url)
      setGeneratingPreview(false)
    }

    generate()

    return () => {
      active = false
    }
  }, [formData])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => { if (isDirty) e.preventDefault() }
    window.addEventListener("beforeunload", handler)
    return () => window.removeEventListener("beforeunload", handler)
  }, [isDirty])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSaved(false)
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

 const handleUpdate = async () => {
  if (!id) return
  setSaving(true)
  setError(null)

  const { oldData, newData } = getChangedFields(originalData, formData)

  if (!newData) {
    setSaving(false)
    return
  }

  const { error } = await supabase
    .from("cav_forms")
    .update(formData)
    .eq("id", id)

  if (error) {
    setError(error.message)
    setSaving(false)
    return
  }

  try {
    await logAudit({
      action: "updated",
      event: `Updated CAV form for ${formData.full_legal_name}`,
      recordId: id as string,
      oldData,
      newData,
    })
  } catch (err) {
    console.error("Audit log failed:", err)
  }

  setOriginalData(formData)
  setSaving(false)
  setSaved(true)
  setTimeout(() => navigate("/"), 900)
}

  const handleDiscard = () => {
    setFormData(originalData)
    setSaved(false)
    setError(null)
  }

  if (loading) return <LoadingSkeleton />

  if (!formData) return (
    <div className="flex items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <p className="text-sm text-muted-foreground">Record not found.</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/")}>Go back</Button>
      </div>
    </div>
  )

  return (
    <div className="bg-background text-foreground p-10">
      <div className="w-full max-w-7xl mx-auto">

        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>

          <div className="flex items-center gap-2">
            {isDirty && !saved && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDiscard}
                className="text-xs text-muted-foreground"
              >
                Discard changes
              </Button>
            )}
            <Button
              size="sm"
              className="gap-1.5 min-w-[120px]"
              onClick={handleUpdate}
              disabled={saving || saved || !isDirty}
            >
              {saved ? (
                <><CheckCircle2 className="h-3.5 w-3.5" /> Saved!</>
              ) : saving ? (
                <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> Saving…</>
              ) : (
                <><Save className="h-3.5 w-3.5" /> Save changes</>
              )}
            </Button>
          </div>
        </div>

        {/* Page title */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-bold tracking-tight">Edit Form</h1>
            {isDirty && !saved && (
              <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wide bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1">
                <CircleDot className="h-2.5 w-2.5" />
                Unsaved changes
              </Badge>
            )}
            {saved && (
              <Badge variant="outline" className="text-[10px] font-semibold uppercase tracking-wide bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1">
                <CheckCircle2 className="h-2.5 w-2.5" />
                Saved
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Record ID: <span className="font-mono text-xs">{id}</span>
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3">
            <AlertCircle className="h-4 w-4 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Two-col layout */}
        <div className="grid grid-cols-2 gap-8 items-stretch">

          <Card className="p-6 rounded-2xl bg-card">
            <div className="flex flex-col h-full">
              
              <div className="grid grid-cols-2 gap-x-5 gap-y-4">
                <InputField label="Complete Name" name="full_legal_name" value={formData.full_legal_name} onChange={handleChange} icon={<User className="h-3.5 w-3.5" />} originalValue={originalData?.full_legal_name} />
                <InputField label="Date Issued" name="date_issued" value={formData.date_issued} onChange={handleChange} type="date" icon={<Calendar className="h-3.5 w-3.5" />} originalValue={originalData?.date_issued} />
                <InputField label="Name of School" name="school_name" value={formData.school_name} onChange={handleChange} icon={<School className="h-3.5 w-3.5" />} originalValue={originalData?.school_name} />
                <InputField label="School Year Completed" name="school_year_completed" value={formData.school_year_completed} onChange={handleChange} icon={<GraduationCap className="h-3.5 w-3.5" />} originalValue={originalData?.school_year_completed} />
                <InputField label="School Address" name="school_address" value={formData.school_address} onChange={handleChange} icon={<MapPin className="h-3.5 w-3.5" />} originalValue={originalData?.school_address} />
                <InputField label="Date of Application" name="date_of_application" value={formData.date_of_application} onChange={handleChange} type="date" icon={<ClipboardList className="h-3.5 w-3.5" />} originalValue={originalData?.date_of_application} />
                <InputField label="School Year Graduated" name="school_year_graduated" value={formData.school_year_graduated} onChange={handleChange} type="date" icon={<GraduationCap className="h-3.5 w-3.5" />} originalValue={originalData?.school_year_graduated} />
                <InputField label="Control No." name="control_no" value={formData.control_no} onChange={handleChange} icon={<Hash className="h-3.5 w-3.5" />} originalValue={originalData?.control_no} />
              </div>

              {/* Pinned to bottom */}
              <div className="mt-auto pt-4 border-t border-border/40 flex items-center justify-between">
                <p className="text-xs text-muted-foreground/50">
                  {isDirty ? "You have unsaved changes" : "All changes saved"}
                </p>
                <Button
                  onClick={handleUpdate}
                  disabled={saving || saved || !isDirty}
                  size="sm"
                  className="gap-1.5 min-w-[110px]"
                >
                  {saved ? (
                    <><CheckCircle2 className="h-3.5 w-3.5" /> Saved!</>
                  ) : saving ? (
                    <><div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> Saving…</>
                  ) : (
                    <><Save className="h-3.5 w-3.5" /> Save changes</>
                  )}
                </Button>
              </div>

            </div>
          </Card>

          <Card className="flex-1 rounded-2xl bg-card overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/60">
                Document Preview
              </p>
              {isDirty && (
                <Badge
                  variant="outline"
                  className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20"
                >
                  Unsaved changes
                </Badge>
              )}
            </div>

            {/* Preview area */}
            <div className="relative h-[520px] bg-muted/30">
              {generatingPreview && (
                <div className="flex h-full items-center justify-center gap-3 text-muted-foreground">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-sm">Generating preview…</p>
                </div>
              )}

              {previewUrl && !generatingPreview && (
                <iframe
                  src={`${previewUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                  className="h-full w-full border-0"
                  title="CAV PDF Preview"
                />
              )}
            </div>
          </Card>

        </div>
      </div>
    </div>
  )
}

/* ── Input field with dirty highlight ── */
function InputField({ label, name, value, onChange, type = "text", icon, originalValue }: any) {
  const isChanged = value !== originalValue
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon && <span className="text-muted-foreground/50">{icon}</span>}
        {label}
        {isChanged && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />}
      </label>
      <Input
        name={name}
        value={value || ""}
        onChange={onChange}
        type={type}
        className={`h-9 rounded-lg text-sm transition-all ${
          isChanged
            ? "border-amber-500/50 bg-amber-500/5 focus-visible:ring-amber-500/30"
            : "border-border/60 bg-background"
        }`}
      />
    </div>
  )
}

/* ── Loading skeleton ── */
function LoadingSkeleton() {
  return (
    <div className="bg-background p-10">
      <div className="w-full max-w-7xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-8 w-40 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div className="rounded-2xl border border-border p-6 space-y-4">
            <div className="grid grid-cols-2 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-1.5">
                  <Skeleton className="h-3 w-24 rounded" />
                  <Skeleton className="h-9 w-full rounded-lg" />
                </div>
              ))}
            </div>
          </div>
          <Skeleton className="h-full min-h-[400px] rounded-2xl" />
        </div>
      </div>
    </div>
  )
}

export default EditPage