import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { generateCavPDF } from "@/utils/generateCAVpdf"
import { Button } from "@/components/animate-ui/components/buttons/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Pencil,
  Printer,
  Calendar,
  School,
  MapPin,
  Hash,
  GraduationCap,
  ClipboardList,
  Send,
  User,
  AlertCircle,
} from "lucide-react"

function ViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [form, setForm] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchForm = async () => {
      if (!id) { setError("Invalid ID"); setLoading(false); return }
      const { data, error } = await supabase
        .from("cav_forms")
        .select("*")
        .eq("id", id)
        .single()
      if (error) setError(error.message)
      else setForm(data)
      setLoading(false)
    }
    fetchForm()
  }, [id])

  if (loading) return <LoadingSkeleton />

  if (error) return (
    <div className="flex items-center justify-center p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <p className="text-sm font-medium text-destructive">Error: {error}</p>
        <Button variant="outline" size="sm" onClick={() => navigate("/")}>Go back</Button>
      </div>
    </div>
  )

  if (!form) return (
    <div className="flex items-center justify-center p-6">
      <p className="text-sm text-muted-foreground">No record found.</p>
    </div>
  )

  const formattedDate = (val: string) => {
    if (!val) return null
    try {
      return new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(val))
    } catch { return val }
  }

  return (
    <div className="bg-background">
      <div className="mx-auto max-w-4xl px-6 py-8">

        {/* Top nav */}
        <div className="mb-8 flex items-center justify-between">
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
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => navigate(`/edit/${id}`)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => generateCavPDF(form)}
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Export
            </Button>
          </div>
        </div>

        {/* Hero header */}
        <div className="mb-8 flex items-center gap-5">
          <img
            src={`https://avatar.vercel.sh/${encodeURIComponent(form.full_legal_name)}`}
            alt={form.full_legal_name}
            className="h-16 w-16 rounded-2xl object-cover shadow-sm ring-1 ring-border"
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 mb-1">
              <span className="text-xs text-muted-foreground">CAV Form</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight truncate">{form.full_legal_name}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Control No: <span className="font-medium text-foreground">{form.control_no}</span></p>
          </div>
        </div>

        <Separator className="mb-8" />

        {/* Sections */}
        <div className="space-y-8">

          {/* Student Info */}
          <Section title="Student Information" icon={<User className="h-4 w-4" />}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full Legal Name" value={form.full_legal_name} icon={<User className="h-3.5 w-3.5" />} />
              <Field label="Control Number" value={form.control_no} icon={<Hash className="h-3.5 w-3.5" />} />
            </div>
          </Section>

          {/* School Info */}
          <Section title="School Information" icon={<School className="h-4 w-4" />}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="School Name" value={form.school_name} icon={<School className="h-3.5 w-3.5" />} />
              <Field label="School Address" value={form.school_address} icon={<MapPin className="h-3.5 w-3.5" />} />
              <Field label="School Year Completed" value={form.school_year_completed} icon={<GraduationCap className="h-3.5 w-3.5" />} />
              <Field label="School Year Graduated" value={form.school_year_graduated} icon={<GraduationCap className="h-3.5 w-3.5" />} />
            </div>
          </Section>

          {/* Dates */}
          <Section title="Important Dates" icon={<Calendar className="h-4 w-4" />}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Date Issued" value={formattedDate(form.date_issued)} icon={<Calendar className="h-3.5 w-3.5" />} />
              <Field label="Date of Application" value={formattedDate(form.date_of_application)} icon={<ClipboardList className="h-3.5 w-3.5" />} />
              <Field label="Date of Transmission" value={formattedDate(form.date_of_transmission)} icon={<Send className="h-3.5 w-3.5" />} />
            </div>
          </Section>

        </div>

        {/* Footer meta */}
        <div className="mt-5 flex items-center justify-between border-t border-border/50 pt-5">
          <p className="text-xs text-muted-foreground/60">
            Record ID: <span className="font-mono">{id}</span>
          </p>
          {form.created_at && (
            <p className="text-xs text-muted-foreground/60">
              Created {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(form.created_at))}
            </p>
          )}
        </div>

      </div>
    </div>
  )
}

/* ── Section wrapper ── */
function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {icon}
        </div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      </div>
      {children}
    </div>
  )
}

/* ── Field card ── */
function Field({ label, value, icon }: { label: string; value: string | null | undefined; icon?: React.ReactNode }) {
  return (
    <div className="group rounded-xl border border-border/60 bg-card px-4 py-3 transition-colors hover:border-border hover:bg-accent/30">
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <span className="text-muted-foreground/50">{icon}</span>}
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">{label}</p>
      </div>
      <p className="text-sm font-medium text-foreground leading-snug">
        {value || <span className="text-muted-foreground/40 font-normal italic">Not provided</span>}
      </p>
    </div>
  )
}

/* ── Loading skeleton ── */
function LoadingSkeleton() {
  return (
    <div className="bg-background">
      <div className="mx-auto max-w-4xl px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-16 rounded-lg" />
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
        </div>
        <div className="flex items-center gap-5">
          <Skeleton className="h-16 w-16 rounded-2xl shrink-0" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3 w-24 rounded" />
            <Skeleton className="h-7 w-64 rounded" />
            <Skeleton className="h-3 w-40 rounded" />
          </div>
        </div>
        <Skeleton className="h-px w-full" />
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

export default ViewPage