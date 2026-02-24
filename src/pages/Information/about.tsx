import {
  FileText, Zap, Shield, Printer,
  ClipboardList, CheckCircle, ArrowRight,
  Database, FileBadge, MailCheck, ScrollText,
} from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

export default function About() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-6 py-14 space-y-16">

        {/* Hero */}
        <div className="space-y-4">
          <Badge variant="outline" className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground">
            Registrar's Office
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight">Auto-Forms</h1>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-2xl">
            A document automation system built for the Registrar's Office to streamline
            generation of academic documents — eliminating manual editing, repetitive
            encoding, and inconsistent formatting.
          </p>
        </div>

        <Separator />

        {/* Feature highlights */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/60 mb-6">
            What it does
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              { icon: <Zap className="h-4 w-4" />, title: "Reduce manual editing", desc: "Pre-fills CAV forms with student data automatically." },
              { icon: <ClipboardList className="h-4 w-4" />, title: "Eliminate repetitive encoding", desc: "Enter data once and reuse across all document types." },
              { icon: <Shield className="h-4 w-4" />, title: "Standardized formatting", desc: "Every document follows the official layout, every time." },
              { icon: <Printer className="h-4 w-4" />, title: "Instant print-ready PDFs", desc: "Generate and download PDFs in one click." },
              { icon: <Database className="h-4 w-4" />, title: "Dynamic tracking", desc: "All registrar actions are logged and auditable." },
            ].map((f) => (
              <div
                key={f.title}
                className="flex items-start gap-3 rounded-xl border border-border/60 bg-card px-4 py-3.5 transition-colors hover:border-border"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* How it works */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/60 mb-6">
            How it works
          </h2>
          <div className="space-y-3">
            {[
              {
                step: "01",
                icon: <ClipboardList className="h-4 w-4" />,
                title: "Input Data",
                desc: "Staff enter student details — name, date issued, and document-specific information.",
              },
              {
                step: "02",
                icon: <CheckCircle className="h-4 w-4" />,
                title: "Submit Form",
                desc: "The system validates the input and prepares the official document layout.",
              },
              {
                step: "03",
                icon: <Printer className="h-4 w-4" />,
                title: "Generate PDF",
                desc: "Automatically converts the form into a standardized, print-ready PDF file.",
              },
              {
                step: "04",
                icon: <Database className="h-4 w-4" />,
                title: "Archive & Track",
                desc: "The generated document is saved and logged in the audit system.",
              },
            ].map((s, i, arr) => (
              <div key={s.step} className="flex gap-4">
                {/* Step line */}
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-bold text-muted-foreground">
                    {s.step}
                  </div>
                  {i < arr.length - 1 && (
                    <div className="mt-1 w-px flex-1 bg-border/50" />
                  )}
                </div>

                {/* Content */}
                <div className={`pb-6 min-w-0 ${i === arr.length - 1 ? "pb-0" : ""}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-muted-foreground/50">{s.icon}</span>
                    <p className="text-sm font-semibold">{s.title}</p>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator />

        {/* Supported documents */}
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground/60 mb-6">
            Supported documents
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              { icon: <FileBadge className="h-4 w-4" />, label: "Certification, Authentication & Verification (CAV)" },
              { icon: <ScrollText className="h-4 w-4" />, label: "Academic Certifications" },
              { icon: <MailCheck className="h-4 w-4" />, label: "Verification Letters" },
              { icon: <FileText className="h-4 w-4" />, label: "Custom Registrar Forms" },
            ].map((d) => (
              <div
                key={d.label}
                className="flex items-center gap-3 rounded-xl border border-border/60 bg-card px-4 py-3 transition-colors hover:border-border group"
              >
                <span className="text-muted-foreground/50 group-hover:text-muted-foreground transition-colors">
                  {d.icon}
                </span>
                <span className="text-sm font-medium">{d.label}</span>
                <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/20 ml-auto group-hover:text-muted-foreground/50 transition-colors" />
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div className="rounded-xl border border-border/40 bg-muted/30 px-5 py-4">
          <p className="text-xs text-muted-foreground/60 leading-relaxed text-center">
            Auto-Forms is an internal tool developed for the Registrar's Office.
            For support or feature requests, contact your system administrator.
          </p>
        </div>

      </div>
    </div>
  )
}