import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import {
  FileText, FolderArchive, Users, ClipboardList,
  ShieldCheck, FilePen, Eye, Pencil,
  ChevronRight, ArrowLeft, Copy, Check,
  BookMarked, Workflow, Database, Lock,
  AlertTriangle, Info, Lightbulb, Terminal,
  Zap,
} from "lucide-react"
import { useCollapse } from "@/context/collapse-provider"

// ─── Types ────────────────────────────────────────────────────────────────────

type NavItem = { id: string; label: string; badge?: string; icon?: React.ReactNode }
type NavSection = { title: string; items: NavItem[] }
type TocItem = { id: string; label: string }
type Field = { name: string; type: string; required: boolean; description: string }
type Step = { title: string; description: string; tip?: string }

// ─── Navigation ───────────────────────────────────────────────────────────────

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Getting Started",
    items: [
      { id: "introduction",   label: "Introduction",    icon: <BookMarked className="h-3.5 w-3.5" /> },
      { id: "quickstart",     label: "Quick Start",     icon: <Zap className="h-3.5 w-3.5" /> },
      { id: "architecture",   label: "Architecture",    icon: <Workflow className="h-3.5 w-3.5" /> },
      { id: "authentication", label: "Authentication",  icon: <Lock className="h-3.5 w-3.5" /> },
    ],
  },
  {
    title: "Forms",
    items: [
      { id: "cav-jhs", label: "CAV — JHS",  icon: <FilePen className="h-3.5 w-3.5" />, badge: "Type 1" },
      { id: "cav-k12", label: "CAV — K-12", icon: <FilePen className="h-3.5 w-3.5" />, badge: "Type 2" },
    ],
  },
  {
    title: "Features",
    items: [
      { id: "preview",     label: "PDF Preview",   icon: <Eye className="h-3.5 w-3.5" /> },
      { id: "edit",        label: "Edit Records",  icon: <Pencil className="h-3.5 w-3.5" /> },
      { id: "archive",     label: "Archive",       icon: <FolderArchive className="h-3.5 w-3.5" /> },
      { id: "audit",       label: "Audit Logs",    icon: <ClipboardList className="h-3.5 w-3.5" /> },
      { id: "signatories", label: "Signatories",   icon: <Users className="h-3.5 w-3.5" /> },
    ],
  },
  {
    title: "Reference",
    items: [
      { id: "database", label: "Database Schema", icon: <Database className="h-3.5 w-3.5" /> },
      { id: "routes",   label: "Route Reference", icon: <Terminal className="h-3.5 w-3.5" /> },
    ],
  },
]

const TOC_FOR_PAGE: Record<string, TocItem[]> = {
  introduction:   [
    { id: "what-is",      label: "What is CAV-RHS?" },
    { id: "who-uses",     label: "Who uses it?" },
    { id: "how-it-works", label: "How it works" },
    { id: "stack",        label: "Tech stack" },
  ],
  quickstart:     [
    { id: "qs-login",       label: "Step 1 — Log in" },
    { id: "qs-signatories", label: "Step 2 — Set up signatories" },
    { id: "qs-form",        label: "Step 3 — Create a form" },
    { id: "qs-submit",      label: "Step 4 — Submit" },
    { id: "qs-next",        label: "What's next?" },
  ],
  "cav-jhs":     [
    { id: "jhs-overview", label: "Overview" },
    { id: "jhs-fields",   label: "Form fields" },
    { id: "jhs-status",   label: "Student status" },
    { id: "jhs-flow",     label: "Submission flow" },
    { id: "jhs-pdf",      label: "PDF generation" },
  ],
  "cav-k12":     [
    { id: "k12-overview", label: "Overview" },
    { id: "k12-lrn",      label: "LRN field" },
    { id: "k12-fields",   label: "Form fields" },
    { id: "k12-flow",     label: "Submission flow" },
  ],
  preview:        [
    { id: "preview-overview", label: "Overview" },
    { id: "preview-steps",    label: "How it works" },
    { id: "preview-errors",   label: "Validation errors" },
  ],
  edit:           [
    { id: "edit-overview",  label: "Overview" },
    { id: "edit-tracking",  label: "Change tracking" },
    { id: "edit-unsaved",   label: "Unsaved changes" },
  ],
  audit:          [
    { id: "audit-overview", label: "Overview" },
    { id: "audit-events",   label: "Event types" },
    { id: "audit-usage",    label: "Code usage" },
  ],
  signatories:    [
    { id: "sig-overview", label: "Overview" },
    { id: "sig-roles",    label: "Role types" },
    { id: "sig-manage",   label: "Managing signatories" },
    { id: "sig-schema",   label: "Database schema" },
  ],
  archive:        [
    { id: "archive-overview",  label: "Overview" },
    { id: "archive-vs-delete", label: "Archive vs. delete" },
  ],
  authentication: [
    { id: "auth-overview",  label: "Overview" },
    { id: "auth-login",     label: "Logging in" },
    { id: "auth-protected", label: "Protected routes" },
  ],
  architecture:   [
    { id: "arch-overview", label: "Overview" },
    { id: "arch-folder",   label: "Folder structure" },
    { id: "arch-state",    label: "Form state machine" },
    { id: "arch-utils",    label: "Utility files" },
  ],
  database:       [
    { id: "db-overview",    label: "Overview" },
    { id: "db-cav",         label: "cav_forms" },
    { id: "db-signatories", label: "signatories" },
    { id: "db-audit",       label: "audit_logs" },
  ],
  routes:         [
    { id: "routes-all",       label: "All routes" },
    { id: "routes-protected", label: "Protected routes" },
    { id: "routes-public",    label: "Public routes" },
  ],
}

// ─── Field data ───────────────────────────────────────────────────────────────

const JHS_FIELDS: Field[] = [
  { name: "full_legal_name",        type: "string",  required: true,  description: "Student's complete legal name as it appears on official school records." },
  { name: "control_no",             type: "string",  required: true,  description: "Unique document control number. Recommended format: RHS-DDMMYY (e.g. RHS-030426)." },
  { name: "date_issued",            type: "date",    required: true,  description: "The date the CAV document is officially issued." },
  { name: "date_of_application",    type: "date",    required: true,  description: "The date the student submitted their application request." },
  { name: "date_of_transmission",   type: "date",    required: true,  description: "The date the document was transmitted to DepEd." },
  { name: "prepared_by",            type: "uuid",    required: true,  description: "Signatory ID of the assistant registrar who prepared the form." },
  { name: "submitted_by",           type: "uuid",    required: true,  description: "Signatory ID of the registrar or principal who submitted the form." },
  { name: "school_year_completed",  type: "string",  required: false, description: "School year the student completed their grade. Auto-checks the corresponding PDF checkbox." },
  { name: "school_year_graduated",  type: "string",  required: false, description: "School year the student graduated. Auto-checks the corresponding PDF checkbox." },
  { name: "enrolled_grade",         type: "string",  required: false, description: "Grade level the student is currently enrolled in." },
  { name: "enrolled_sy",            type: "string",  required: false, description: "School year during which the student is currently enrolled." },
  { name: "status_completed_grade", type: "string",  required: false, description: "The specific grade level that was completed." },
  { name: "status_completed_sy",    type: "string",  required: false, description: "School year in which the grade was completed." },
  { name: "status_graduated_sy",    type: "string",  required: false, description: "School year in which the student graduated." },
]

const K12_FIELDS: Field[] = [
  ...JHS_FIELDS.slice(0, 2),
  { name: "lrn", type: "string", required: true, description: "Learner Reference Number — a 12-digit DepEd-assigned ID unique to each K-12 student." },
  ...JHS_FIELDS.slice(2),
]

const SUBMISSION_STEPS: Step[] = [
  {
    title: "Fill in the form",
    description: "Enter all required fields. The Student Status section (enrolled, completed, graduated) is entirely optional — leave it blank if not applicable.",
    tip: "Set up your Signatories first at /signatories so they appear in the dropdowns automatically.",
  },
  {
    title: "Click 'Preview PDF'",
    description: "The form is validated on the spot. Missing required fields are highlighted in red and listed in an error message. If everything passes, a live PDF is generated client-side — no data is saved yet.",
  },
  {
    title: "Review the document",
    description: "Inspect the rendered PDF in the right panel. Check student name, dates, signatories, and status checkboxes. Click 'Edit Form' to return to the form — all your data is preserved.",
    tip: "Pay close attention to dates and signatory names before proceeding. Edits after submission require navigating to the edit page.",
  },
  {
    title: "Confirm & Submit",
    description: "Click 'Confirm & Submit'. A dialog shows a summary of the record. Clicking Confirm writes the record to the database, logs an audit event, and makes the final PDF available for download.",
  },
]

const DB_SIGNATORIES: Field[] = [
  { name: "id",        type: "uuid", required: true,  description: "Primary key, auto-generated by Supabase on insert." },
  { name: "full_name", type: "text", required: true,  description: "Full name of the signatory, printed on the PDF." },
  { name: "position",  type: "text", required: true,  description: "Job title printed below the name (e.g. 'Registrar', 'School Principal')." },
  { name: "role_type", type: "text", required: true,  description: "Controls which dropdown the signatory appears in: assistant_registrar | registrar | principal" },
]

// ─── UI primitives ────────────────────────────────────────────────────────────

function CodeBlock({ code, language = "bash" }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }
  return (
    <div className="my-5 rounded-lg border border-border bg-muted overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border">
        <span className="text-[11px] text-muted-foreground font-mono uppercase tracking-wider">{language}</span>
        <button onClick={copy} className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5">
          {copied
            ? <><Check className="h-3 w-3" style={{ color: "var(--success)" }} /><span style={{ color: "var(--success)" }}>Copied!</span></>
            : <><Copy className="h-3 w-3" />Copy</>}
        </button>
      </div>
      <pre className="p-4 text-sm font-mono text-foreground leading-relaxed whitespace-pre"><code>{code}</code></pre>
    </div>
  )
}

function Callout({ children, variant = "default", title }: {
  children: React.ReactNode
  variant?: "default" | "warning" | "info" | "tip"
  title?: string
}) {
  const config = {
    warning: {
      style: { backgroundColor: "color-mix(in oklch, var(--pending) 8%, transparent)", borderColor: "color-mix(in oklch, var(--pending) 35%, transparent)" },
      icon: <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--pending)" }} />,
      label: title ?? "Warning",
      labelStyle: { color: "var(--pending)" },
    },
    info: {
      style: {},
      icon: <Info className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />,
      label: title ?? "Note",
      labelStyle: {},
    },
    tip: {
      style: { backgroundColor: "color-mix(in oklch, var(--success) 8%, transparent)", borderColor: "color-mix(in oklch, var(--success) 35%, transparent)" },
      icon: <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" style={{ color: "var(--success)" }} />,
      label: title ?? "Tip",
      labelStyle: { color: "var(--success)" },
    },
    default: {
      style: {},
      icon: <Info className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />,
      label: title ?? "Info",
      labelStyle: {},
    },
  }
  const c = config[variant]
  const isCustom = variant === "warning" || variant === "tip"
  return (
    <div
      className={`my-5 rounded-lg border px-4 py-3.5 flex gap-3 ${isCustom ? "" : "border-border bg-muted"}`}
      style={isCustom ? c.style : {}}
    >
      {c.icon}
      <div className="text-sm leading-relaxed min-w-0">
        <span className="font-semibold" style={c.labelStyle}>{c.label} — </span>
        <span className="text-muted-foreground">{children}</span>
      </div>
    </div>
  )
}

function SectionHeading({ id, children, level = 2 }: { id: string; children: React.ReactNode; level?: 2 | 3 }) {
  const base = "scroll-mt-8 text-foreground font-bold tracking-tight"
  if (level === 3) return <h3 id={id} className={`${base} text-base mt-8 mb-2.5`}>{children}</h3>
  return <h2 id={id} className={`${base} text-xl mt-12 mb-3 pb-2.5 border-b border-border first:mt-0`}>{children}</h2>
}

function Inline({ children }: { children: React.ReactNode }) {
  return (
    <code className="text-[12px] font-mono bg-muted px-1.5 py-0.5 rounded border border-border text-foreground">
      {children}
    </code>
  )
}

function Badge({ children, color = "default" }: { children: React.ReactNode; color?: "default" | "green" | "amber" }) {
  if (color === "green") {
    return (
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border"
        style={{ backgroundColor: "color-mix(in oklch, var(--success) 12%, transparent)", borderColor: "color-mix(in oklch, var(--success) 35%, transparent)", color: "var(--success)" }}
      >
        {children}
      </span>
    )
  }
  if (color === "amber") {
    return (
      <span
        className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border"
        style={{ backgroundColor: "color-mix(in oklch, var(--pending) 12%, transparent)", borderColor: "color-mix(in oklch, var(--pending) 35%, transparent)", color: "var(--pending)" }}
      >
        {children}
      </span>
    )
  }
  return <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium border bg-muted border-border text-muted-foreground">{children}</span>
}

function FieldTable({ fields }: { fields: Field[] }) {
  return (
    <div className="my-5 rounded-lg border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted border-b border-border">
            {["Field", "Type", "Required", "Description"].map(h => (
              <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {fields.map((f) => (
            <tr key={f.name} className="bg-card hover:bg-muted/50 transition-colors">
              <td className="px-4 py-3 font-mono text-xs text-foreground whitespace-nowrap">{f.name}</td>
              <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{f.type}</td>
              <td className="px-4 py-3 whitespace-nowrap">
                <Badge>{f.required ? "Required" : "Optional"}</Badge>
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground leading-relaxed">{f.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StepList({ steps }: { steps: Step[] }) {
  return (
    <div className="my-5 space-y-0">
      {steps.map((step, i) => (
        <div key={i} className="relative pl-9 pb-7 last:pb-0">
          <div className="absolute left-0 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-background text-[11px] font-bold shrink-0">
            {i + 1}
          </div>
          {i < steps.length - 1 && (
            <div className="absolute left-3 top-6 bottom-0 w-px bg-border" />
          )}
          <p className="text-sm font-semibold text-foreground mb-1">{step.title}</p>
          <p className="text-sm text-muted-foreground leading-relaxed mb-1">{step.description}</p>
          {step.tip && (
            <div
              className="flex items-start gap-2 text-xs text-muted-foreground rounded-md px-3 py-2 mt-2 border"
              style={{ backgroundColor: "color-mix(in oklch, var(--success) 8%, transparent)", borderColor: "color-mix(in oklch, var(--success) 35%, transparent)" }}
            >
              <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
              <span>{step.tip}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

function PageBreadcrumb({ section, label }: { section: string; label: string }) {
  return (
    <p className="text-xs text-muted-foreground mb-4 flex items-center gap-1.5">
      <span>{section}</span>
      <ChevronRight className="h-3 w-3" />
      <span className="text-foreground font-medium">{label}</span>
    </p>
  )
}

function PageTitle({ children, subtitle }: { children: React.ReactNode; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2 flex items-center gap-3 flex-wrap">{children}</h1>
      {subtitle && <p className="text-base text-muted-foreground leading-relaxed">{subtitle}</p>}
    </div>
  )
}

function P({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <p className={`text-sm text-muted-foreground leading-relaxed mb-4 ${className}`}>{children}</p>
}

// ─── Page content ─────────────────────────────────────────────────────────────

function PageContent({ pageId, onNavigate }: { pageId: string; onNavigate: (id: string) => void }) {
  switch (pageId) {

    // ── Introduction ──────────────────────────────────────────────────────────
    case "introduction": return (
      <>
        <PageBreadcrumb section="Getting Started" label="Introduction" />
        <PageTitle subtitle="An internal registrar tool for digitizing and managing CAV documents at Rizal High School.">
          Introduction
        </PageTitle>

        <SectionHeading id="what-is">What is CAV-RHS?</SectionHeading>
        <P>
          <strong className="text-foreground">CAV-RHS</strong> is a web application built for the school's Registrar's office. 
          It replaces manual, paper-based CAV form processing with a structured digital workflow: fill a form, preview the 
          generated PDF, confirm the details, and submit.
        </P>
        <P>
          All records are stored securely in Supabase, every action is audit-logged, and generated PDFs can be
          downloaded at any time from the record's view page.
        </P>
        <Callout variant="info">
          CAV-RHS supports two form types: <strong>Type 1 (JHS)</strong> for Junior High School students, and <strong>Type 2 (K-12)</strong> which is identical but adds a Learner Reference Number (LRN) field.
        </Callout>

        <SectionHeading id="who-uses">Who uses it?</SectionHeading>
        <P>Auto-Form is intended exclusively for Registrar's office staff. Two main roles are involved:</P>
        <div className="my-4 space-y-2">
          {[
            { role: "Assistant Registrar", desc: "Prepares CAV forms, fills in student information, and appears as the Prepared By signatory on the printed document." },
            { role: "Registrar / Principal", desc: "Reviews submitted forms and serves as the Submitted By signatory on the printed document." },
          ].map(({ role, desc }) => (
            <div key={role} className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground mb-1">{role}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <SectionHeading id="how-it-works">How it works</SectionHeading>
        <P>Every CAV form passes through a three-stage lifecycle before it is saved to the database:</P>
        <StepList steps={[
          { title: "Editing",    description: "The user fills out the form. The right panel shows a placeholder — no PDF is generated and nothing is saved." },
          { title: "Previewing", description: "The form is validated and a PDF is rendered live from the entered data. The user can still navigate back and make edits. No database write has occurred at this stage." },
          { title: "Submitted",  description: "The user confirms via a summary dialog. The record is written to the database, an audit log entry is created, and the final PDF becomes available for download." },
        ]} />
        <Callout variant="tip">
          Because the PDF preview is generated from form state and not from the database, you can freely adjust fields during the preview step without creating any partial records.
        </Callout>

        <SectionHeading id="stack">Tech Stack</SectionHeading>
        <div className="grid grid-cols-2 gap-3 my-4">
          {[
            { label: "React + Vite",    desc: "Frontend framework with fast HMR during development" },
            { label: "TypeScript",      desc: "Strict typing throughout the entire codebase" },
            { label: "Tailwind CSS v4", desc: "Utility-first styling with custom CSS design tokens" },
            { label: "shadcn/ui",       desc: "Component library: Alert, Dialog, Dropdown, DatePicker…" },
            { label: "Supabase",        desc: "Postgres database + authentication" },
            { label: "Bun",             desc: "Package manager and JavaScript runtime" },
          ].map(({ label, desc }) => (
            <div key={label} className="rounded-lg border border-border bg-card p-4">
              <p className="text-sm font-semibold text-foreground mb-1">{label}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </>
    )

    // ── Quick Start ───────────────────────────────────────────────────────────
    case "quickstart": return (
      <>
        <PageBreadcrumb section="Getting Started" label="Quick Start" />
        <PageTitle subtitle="Get from zero to a submitted CAV form in four steps.">
          Quick Start
        </PageTitle>

        <SectionHeading id="qs-login">Step 1 — Log in</SectionHeading>
        <P>
          Navigate to <Inline>/login</Inline> and sign in with your credentials. All pages except the login page
          are protected — you'll be redirected if you're not authenticated.
        </P>
        <Callout variant="info">
          If you don't have an account, contact your system administrator. Self-registration is not available.
        </Callout>

        <SectionHeading id="qs-signatories">Step 2 — Set up signatories (first-time only)</SectionHeading>
        <P>
          Before creating any forms, make sure your signatories are configured. Go to <Inline>/signatories</Inline> and
          add the staff members who will appear on printed CAV documents. Each form requires exactly two:
        </P>
        <div className="my-4 space-y-2">
          <div className="flex items-start gap-4 rounded-lg border border-border bg-card px-4 py-3">
            <span className="text-sm font-medium text-foreground w-28 shrink-0 pt-0.5">Prepared By</span>
            <span className="text-sm text-muted-foreground">The assistant registrar. Uses the <Inline>assistant_registrar</Inline> role type.</span>
          </div>
          <div className="flex items-start gap-4 rounded-lg border border-border bg-card px-4 py-3">
            <span className="text-sm font-medium text-foreground w-28 shrink-0 pt-0.5">Submitted By</span>
            <span className="text-sm text-muted-foreground">The registrar or principal. Uses the <Inline>registrar</Inline> or <Inline>principal</Inline> role type.</span>
          </div>
        </div>
        <Callout variant="tip">
          Signatories only need to be configured once. After that, they'll appear in every form's dropdowns automatically.
        </Callout>

        <SectionHeading id="qs-form">Step 3 — Create a CAV form</SectionHeading>
        <P>From the home page, click <strong className="text-foreground">New Form</strong> and choose the appropriate type:</P>
        <div className="my-4 space-y-2">
          <div className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <Badge>Type 1</Badge>
            <div>
              <p className="text-sm font-medium text-foreground">CAV — JHS</p>
              <p className="text-xs text-muted-foreground mt-0.5">For Junior High School students. No LRN required.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3">
            <Badge>Type 2</Badge>
            <div>
              <p className="text-sm font-medium text-foreground">CAV — K-12</p>
              <p className="text-xs text-muted-foreground mt-0.5">For K-12 students. Requires a Learner Reference Number (LRN).</p>
            </div>
          </div>
        </div>
        <P>Fill in all required fields, then click <strong className="text-foreground">Preview PDF</strong> to validate and see the generated document.</P>

        <SectionHeading id="qs-submit">Step 4 — Submit</SectionHeading>
        <P>
          After reviewing the PDF preview, click <strong className="text-foreground">Confirm & Submit</strong>.
          A summary dialog will appear — confirm the details, and the record is saved to the database.
        </P>
        <P>You can download the final PDF from the record's view page (<Inline>/view/:id</Inline>) at any time.</P>

        <SectionHeading id="qs-next">What's next?</SectionHeading>
        <div className="my-4 space-y-2">
          {[
            { label: "CAV — JHS form reference",  id: "cav-jhs", desc: "Detailed field reference and PDF generation docs for Type 1 forms." },
            { label: "CAV — K-12 form reference", id: "cav-k12", desc: "All JHS fields plus the LRN field explained." },
            { label: "Understand PDF Preview",     id: "preview", desc: "How the live PDF is generated before submission." },
            { label: "Explore Audit Logs",         id: "audit",   desc: "See how every action in the system is recorded." },
          ].map(({ label, desc, id }) => (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className="w-full text-left flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      </>
    )

    // ── CAV JHS ───────────────────────────────────────────────────────────────
    case "cav-jhs": return (
      <>
        <PageBreadcrumb section="Forms" label="CAV — JHS" />
        <PageTitle subtitle="CAV form for Junior High School students. Accessible at /forms/cav-jhs.">
          CAV Form — JHS <Badge>Type 1</Badge>
        </PageTitle>

        <SectionHeading id="jhs-overview">Overview</SectionHeading>
        <P>
          The JHS CAV form processes Certification, Authentication & Verification documents for Junior High School students.
          It collects student identity, relevant dates, optional student status information, and two required signatories.
        </P>
        <P>
          Submitted records are stored in the <Inline>cav_forms</Inline> table with <Inline>form_type = 1</Inline>.
          A PDF is generated for printing and official filing.
        </P>

        <SectionHeading id="jhs-fields" level={3}>Form fields</SectionHeading>
        <FieldTable fields={JHS_FIELDS} />

        <SectionHeading id="jhs-status" level={3}>Student status section</SectionHeading>
        <P>
          The Student Status section contains optional fields for enrolled, completed, and graduated status.
          These are not required, but when filled in, the corresponding checkbox in the generated PDF is
          automatically checked.
        </P>
        <Callout variant="info">
          Only fill in the status fields that apply. Leaving all of them blank is perfectly valid and will produce a PDF with no checkboxes marked.
        </Callout>

        <SectionHeading id="jhs-flow" level={3}>Submission flow</SectionHeading>
        <StepList steps={SUBMISSION_STEPS} />

        <SectionHeading id="jhs-pdf" level={3}>PDF generation</SectionHeading>
        <P>Two utility files handle PDF generation for JHS forms:</P>
        <div className="my-4 space-y-2">
          {[
            { file: "generateCAVpreview.ts", desc: "Generates a blob URL used in the live <iframe> preview panel. Runs every time the form enters the previewing step. Does not save any data." },
            { file: "generateCAVpdf.ts",     desc: "Triggers a browser download of the finalized PDF. Called only after the record has been successfully saved to the database." },
          ].map(({ file, desc }) => (
            <div key={file} className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-mono text-foreground mb-1.5">{file}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
        <Callout>
          The preview PDF is generated entirely client-side from form state, not from the database. No partial record is ever saved during the preview step.
        </Callout>
      </>
    )

    // ── CAV K-12 ──────────────────────────────────────────────────────────────
    case "cav-k12": return (
      <>
        <PageBreadcrumb section="Forms" label="CAV — K-12" />
        <PageTitle subtitle="CAV form for K-12 students. Identical to the JHS form with one addition: a required LRN field. Accessible at /forms/cav-k12.">
          CAV Form — K-12 <Badge>Type 2</Badge>
        </PageTitle>

        <SectionHeading id="k12-overview">Overview</SectionHeading>
        <P>
          The K-12 CAV form is structurally identical to the JHS form with one addition: the <strong className="text-foreground">Learner Reference Number (LRN)</strong> field.
          Records are stored in <Inline>cav_forms</Inline> with <Inline>form_type = 2</Inline>.
        </P>

        <SectionHeading id="k12-lrn" level={3}>LRN field</SectionHeading>
        <P>
          The LRN is a 12-digit identifier assigned by DepEd to every K-12 learner. It is required on all
          K-12 CAV documents and is printed on the generated PDF.
        </P>
        <Callout variant="warning">
          The LRN must match the student's official DepEd records. Double-check the number before submitting — corrections require going to the edit page after submission.
        </Callout>

        <SectionHeading id="k12-fields" level={3}>Form fields</SectionHeading>
        <P>All JHS fields apply, plus the LRN field inserted after Control No.:</P>
        <FieldTable fields={K12_FIELDS} />

        <SectionHeading id="k12-flow" level={3}>Submission flow</SectionHeading>
        <P>The submission flow is identical to the JHS form.</P>
        <StepList steps={SUBMISSION_STEPS} />
      </>
    )

    // ── PDF Preview ───────────────────────────────────────────────────────────
    case "preview": return (
      <>
        <PageBreadcrumb section="Features" label="PDF Preview" />
        <PageTitle subtitle="See exactly what the printed document will look like before saving anything to the database.">
          PDF Preview
        </PageTitle>

        <SectionHeading id="preview-overview">Overview</SectionHeading>
        <P>
          The PDF preview is a live-rendered version of the CAV document, generated directly from the data in the form.
          It appears in the right panel of the form page when you click <strong className="text-foreground">Preview PDF</strong>.
        </P>
        <P>
          The preview renders in an <Inline>&lt;iframe&gt;</Inline> pointed at a blob URL generated client-side. Because it's
          created locally from form state, it renders instantly without any server round-trips or database access.
        </P>
        <Callout variant="info">
          No data is saved during the preview step. You can go back and edit, re-preview as many times as needed, and no records will be created until you confirm submission.
        </Callout>

        <SectionHeading id="preview-steps" level={3}>How it works</SectionHeading>
        <StepList steps={[
          { title: "Validation", description: "When you click Preview PDF, all required fields are checked. If anything is missing, the fields are highlighted in red and an error summary appears at the top. The preview will not generate until all required fields are complete." },
          { title: "Blob URL generation", description: "The appropriate utility is called — generateCAVpreview.ts for JHS, or generateCAVK12preview.ts for K-12. It builds the PDF document and returns a blob: URL pointing to the document in memory." },
          { title: "Iframe render", description: "The iframe's src is set to the blob URL with ?toolbar=0 appended to hide the browser's built-in PDF toolbar, keeping the preview clean and focused." },
          { title: "Edit or confirm", description: "Click 'Edit Form' to return to the form with all data preserved, or click 'Confirm & Submit' to save the record to the database." },
        ]} />

        <SectionHeading id="preview-errors" level={3}>Validation errors</SectionHeading>
        <P>If you click Preview PDF with missing required fields:</P>
        <div className="my-4 space-y-2">
          {[
            "The missing fields are highlighted with a red border.",
            "An error summary lists all missing fields at the top of the form.",
            "The PDF is not generated — errors must be resolved first.",
            "Once all required fields are filled, click Preview PDF again.",
          ].map((item, i) => (
            <div key={i} className="flex gap-3 text-sm text-muted-foreground items-start">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-muted-foreground shrink-0" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </>
    )

    // ── Edit Records ──────────────────────────────────────────────────────────
    case "edit": return (
      <>
        <PageBreadcrumb section="Features" label="Edit Records" />
        <PageTitle subtitle="Modify a submitted CAV form at any time. All changes are tracked and audit-logged on save.">
          Edit Records
        </PageTitle>

        <SectionHeading id="edit-overview">Overview</SectionHeading>
        <P>
          Any submitted CAV record can be edited by navigating to <Inline>/edit/:id</Inline>, where <Inline>:id</Inline> is
          the record's UUID. The edit page loads the existing data from Supabase and provides a live PDF preview
          that updates automatically as you change fields.
        </P>
        <Callout variant="info">
          The edit page requires authentication. You'll be redirected to <Inline>/login</Inline> if you're not signed in.
        </Callout>

        <SectionHeading id="edit-tracking" level={3}>Change tracking</SectionHeading>
        <P>
          Every input on the edit page uses a <Inline>DirtyInput</Inline> or <Inline>SmallDirtyInput</Inline> component.
          These compare the current value against the original database value and apply a subtle background highlight
          to any field that has been changed.
        </P>
        <P>
          This makes it easy to see at a glance exactly what you've modified before saving — useful for catching accidental changes.
        </P>

        <SectionHeading id="edit-unsaved" level={3}>Unsaved changes</SectionHeading>
        <P>
          If you have unsaved changes and try to navigate away, the browser will show a native warning asking if you're
          sure you want to leave. Changes are only persisted when you click <strong className="text-foreground">Save Changes</strong>.
        </P>
        <P>
          The page header shows an <strong className="text-foreground">Unsaved changes</strong> indicator whenever the form
          differs from the saved record. Click <strong className="text-foreground">Discard</strong> to reset all fields
          back to their original database values.
        </P>
        <Callout variant="warning">
          Saving writes the updated record to the database and logs an <Inline>updated</Inline> audit event with a full diff of what changed. This action cannot be undone from the UI.
        </Callout>
      </>
    )

    // ── Audit Logs ────────────────────────────────────────────────────────────
    case "audit": return (
      <>
        <PageBreadcrumb section="Features" label="Audit Logs" />
        <PageTitle subtitle="A complete, append-only history of every create, update, and delete action in the system.">
          Audit Logs
        </PageTitle>

        <SectionHeading id="audit-overview">Overview</SectionHeading>
        <P>
          Every meaningful action in CAV-RHS is recorded in the <Inline>audit_logs</Inline> table. The audit log is
          append-only — entries are never modified or deleted. You can view the full log at <Inline>/audit-logs</Inline>.
        </P>
        <P>
          Each entry captures the action type, a human-readable event description, the affected record's UUID,
          and a before/after snapshot of the data. This makes it possible to reconstruct the full history of any record.
        </P>

        <SectionHeading id="audit-events" level={3}>Event types</SectionHeading>
        <FieldTable fields={[
          { name: "created", type: "string", required: true,  description: "Fired when a new CAV form is successfully saved after the user confirms submission." },
          { name: "updated", type: "string", required: true,  description: "Fired when an existing record is edited and saved. Includes a full diff of changed fields in old_data and new_data." },
          { name: "deleted", type: "string", required: false, description: "Fired when a record is archived or permanently removed from the system." },
        ]} />

        <SectionHeading id="audit-usage" level={3}>Code usage</SectionHeading>
        <P>
          The <Inline>logAudit()</Inline> utility in <Inline>src/utils/audit-log.ts</Inline> is called after every
          successful database operation:
        </P>
        <CodeBlock language="typescript" code={`import { logAudit } from "@/utils/audit-log"

// After a new record is created
await logAudit({
  action: "created",
  event: \`Created CAV form for \${formData.full_legal_name}\`,
  recordId: created.id,
  newData: formData,
})

// After an existing record is updated
await logAudit({
  action: "updated",
  event: \`Updated CAV form for \${formData.full_legal_name}\`,
  recordId: record.id,
  oldData: originalData,
  newData: formData,
})`} />
        <Callout variant="tip">
          For update events, <Inline>getChangedFields.ts</Inline> diffs <Inline>originalData</Inline> against <Inline>formData</Inline> and records only the fields that actually changed, keeping audit entries clean and easy to read.
        </Callout>
      </>
    )

    // ── Signatories ───────────────────────────────────────────────────────────
    case "signatories": return (
      <>
        <PageBreadcrumb section="Features" label="Signatories" />
        <PageTitle subtitle="Staff members whose names and positions are printed on CAV documents. Managed at /signatories.">
          Signatories
        </PageTitle>

        <SectionHeading id="sig-overview">Overview</SectionHeading>
        <P>
          Every CAV form requires two signatories: one who <strong className="text-foreground">prepared</strong> the
          document and one who <strong className="text-foreground">submitted</strong> it. These are selected from
          dropdowns when filling out the form, and their full name and position are printed on the generated PDF.
        </P>
        <P>
          Signatories are managed separately at <Inline>/signatories</Inline> and must be added before they can
          be selected on a form.
        </P>

        <SectionHeading id="sig-roles" level={3}>Role types</SectionHeading>
        <P>Each signatory is assigned a <Inline>role_type</Inline> which controls which dropdown they appear in:</P>
        <div className="my-4 space-y-2">
          {[
            { role: "assistant_registrar", dropdown: "Prepared By",  desc: "The staff member who filled out and prepared the CAV form." },
            { role: "registrar",           dropdown: "Submitted By", desc: "The registrar who authorizes and submits the document to DepEd." },
            { role: "principal",           dropdown: "Submitted By", desc: "The school principal, also eligible to appear as the document submitter." },
          ].map(({ role, dropdown, desc }) => (
            <div key={role} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <Inline>{role}</Inline>
                <span className="text-xs text-muted-foreground">→ appears in <strong className="text-foreground">{dropdown}</strong> dropdown</span>
              </div>
              <p className="text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        <SectionHeading id="sig-manage" level={3}>Managing signatories</SectionHeading>
        <P>
          From <Inline>/signatories</Inline> you can add new signatories, edit existing names or positions,
          or remove signatories who are no longer active. Changes take effect immediately on all future forms.
        </P>
        <Callout variant="warning">
          Editing or deleting a signatory does not affect already-submitted forms. The signatory's name and position are embedded in each form record at the time of submission.
        </Callout>

        <SectionHeading id="sig-schema" level={3}>Database schema</SectionHeading>
        <FieldTable fields={DB_SIGNATORIES} />
      </>
    )

    // ── Archive ───────────────────────────────────────────────────────────────
    case "archive": return (
      <>
        <PageBreadcrumb section="Features" label="Archive" />
        <PageTitle subtitle="Remove records from the active list without permanently deleting them. Accessible at /archive.">
          Archive
        </PageTitle>

        <SectionHeading id="archive-overview">Overview</SectionHeading>
        <P>
          The Archive page lists all CAV records that have been removed from the home page's active list.
          Archiving is a soft operation — the record stays in the database and can still be viewed and referenced.
          It simply no longer appears in the main list.
        </P>

        <SectionHeading id="archive-vs-delete" level={3}>Archive vs. delete</SectionHeading>
        <div className="my-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground mb-3">Archive</p>
            <div className="space-y-2">
              {[
                "Record stays in the database",
                "Hidden from the home list",
                "Visible in the Archive page",
                "Audit trail is fully preserved",
                "Can be referenced by record ID",
              ].map(t => (
                <div key={t} className="flex gap-2 text-xs text-muted-foreground items-start">
                  <Check className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "var(--success)" }} />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <p className="text-sm font-semibold text-foreground mb-3">Hard Delete</p>
            <div className="space-y-2">
              {[
                "Record removed from database",
                "Cannot be recovered",
                "Audit trail entry remains",
                "PDF no longer accessible",
                "Not recommended for CAV records",
              ].map(t => (
                <div key={t} className="flex gap-2 text-xs text-muted-foreground items-start">
                  <span className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5 font-bold text-base leading-none">×</span>
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <Callout variant="tip">
          Always prefer archiving over deleting. Archived records preserve the full audit history and can still be retrieved if needed for official purposes.
        </Callout>
      </>
    )

    // ── Authentication ────────────────────────────────────────────────────────
    case "authentication": return (
      <>
        <PageBreadcrumb section="Getting Started" label="Authentication" />
        <PageTitle subtitle="CAV-RHS uses Supabase Auth. Every page except /login requires an active session.">
          Authentication
        </PageTitle>

        <SectionHeading id="auth-overview">Overview</SectionHeading>
        <P>
          Authentication is handled by Supabase Auth. When a user logs in, Supabase creates a session stored
          in the browser. This session is verified on every protected route before the page renders.
        </P>

        <SectionHeading id="auth-login" level={3}>Logging in</SectionHeading>
        <P>
          Navigate to <Inline>/login</Inline> and enter your credentials. On a successful login, you are redirected
          to the home page. If login fails, an error message is displayed.
        </P>
        <Callout variant="info">
          The Navbar and footer are hidden on the login page. They appear on all other pages once you're authenticated.
        </Callout>

        <SectionHeading id="auth-protected" level={3}>Protected routes</SectionHeading>
        <P>
          The <Inline>ProtectedRoute</Inline> component wraps every authenticated route. If no valid session exists,
          the user is immediately redirected to <Inline>/login</Inline>.
        </P>
        <CodeBlock language="tsx" code={`// All application routes are protected
<Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
<Route path="/edit/:id" element={<ProtectedRoute><EditPage /></ProtectedRoute>} />
<Route path="/view/:id" element={<ProtectedRoute><ViewPage /></ProtectedRoute>} />
<Route path="/signatories" element={<ProtectedRoute><SignatoriesPage /></ProtectedRoute>} />

// Public — no authentication required
<Route path="/login" element={<LoginPage />} />`} />
      </>
    )

    // ── Architecture ──────────────────────────────────────────────────────────
    case "architecture": return (
      <>
        <PageBreadcrumb section="Getting Started" label="Architecture" />
        <PageTitle subtitle="A single-page React application with client-side routing and a Supabase backend.">
          Architecture
        </PageTitle>

        <SectionHeading id="arch-overview">Overview</SectionHeading>
        <P>
          Auto-Form is a React SPA (Single Page Application) built with Vite. There is no server-side rendering —
          all routing happens client-side via React Router. The Supabase client handles database access and
          authentication directly from the browser.
        </P>
        <P>
          The app shell in <Inline>App.tsx</Inline> wraps all routes with a <Inline>Navbar</Inline> and a sticky
          <Inline>footer</Inline>. The login page hides both. The footer displays the app version, build date, and author credits.
        </P>

        <SectionHeading id="arch-folder" level={3}>Folder structure</SectionHeading>
        <CodeBlock language="text" code={`src/
├── App.tsx                      # App shell, routing, layout
├── components/
│   ├── ui/                      # shadcn/ui components
│   ├── theme-provider.tsx       # Dark/light mode provider
│   └── route/route.tsx          # ProtectedRoute component
├── pages/
│   ├── home/                    # Home page and form list
│   ├── view/                    # Read-only record view
│   ├── edit/                    # Record edit page
│   ├── archive/                 # Archived records
│   ├── docs/                    # This documentation
│   ├── navbar/                  # Navbar component
│   ├── LoginPage/               # Login page
│   ├── Signatories/             # Signatory management
│   └── Information/
│       ├── about.tsx            # About page
│       └── audit/               # Audit log viewer
└── utils/
    ├── audit-log.ts             # logAudit() helper
    ├── getChangedFields.ts      # Diff utility for edit page
    ├── formTypeUtils.ts         # form_type integer → label
    ├── generateCAVpreview.ts    # JHS preview blob URL
    ├── generateCAVpdf.ts        # JHS PDF download
    ├── generateCAVK12preview.ts # K-12 preview blob URL
    └── generateCAVK12pdf.ts     # K-12 PDF download`} />

        <SectionHeading id="arch-state" level={3}>Form state machine</SectionHeading>
        <P>Both form types (JHS and K-12) share the same three-state lifecycle:</P>
        <div className="my-4 flex items-center gap-2 text-sm overflow-x-auto pb-1">
          {["editing", "previewing", "submitted"].map((state, i, arr) => (
            <div key={state} className="flex items-center gap-2 shrink-0">
              <div className="rounded-lg border border-border bg-card px-4 py-2 text-center min-w-22.5">
                <p className="font-mono text-xs text-muted-foreground">{state}</p>
              </div>
              {i < arr.length - 1 && <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
            </div>
          ))}
        </div>
        <div className="my-4 space-y-2 text-sm">
          <P className="mb-1!"><strong className="text-foreground">editing</strong> — Default state. No PDF exists, no data is saved to the database.</P>
          <P className="mb-1!"><strong className="text-foreground">previewing</strong> — Form validated, live PDF rendered in the preview panel. Still fully reversible.</P>
          <P className="mb-0!"><strong className="text-foreground">submitted</strong> — Record written to Supabase, audit log created, PDF available for download.</P>
        </div>

        <SectionHeading id="arch-utils" level={3}>Utility files</SectionHeading>
        <div className="my-4 space-y-2">
          {[
            { file: "audit-log.ts",            desc: "Exports logAudit() — writes an entry to audit_logs after any create, update, or delete operation." },
            { file: "getChangedFields.ts",      desc: "Compares originalData and formData and returns only the fields that differ. Used to keep audit log entries minimal." },
            { file: "formTypeUtils.ts",         desc: "Maps the form_type integer (1 or 2) to a human-readable label such as 'CAV — JHS'." },
            { file: "generateCAVpreview.ts",    desc: "Builds a JHS CAV PDF and returns a blob: URL for the preview iframe. Runs client-side only." },
            { file: "generateCAVpdf.ts",        desc: "Generates the final JHS PDF and triggers a browser file download." },
            { file: "generateCAVK12preview.ts", desc: "Same as generateCAVpreview.ts for K-12 forms, including the LRN field." },
            { file: "generateCAVK12pdf.ts",     desc: "Same as generateCAVpdf.ts for K-12 forms." },
          ].map(({ file, desc }) => (
            <div key={file} className="rounded-lg border border-border bg-card p-4">
              <p className="text-xs font-mono text-foreground mb-1.5">{file}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </>
    )

    // ── Database ──────────────────────────────────────────────────────────────
    case "database": return (
      <>
        <PageBreadcrumb section="Reference" label="Database Schema" />
        <PageTitle subtitle="CAV-RHS uses Supabase (Postgres). All tables and their columns are documented below.">
          Database Schema
        </PageTitle>

        <SectionHeading id="db-overview">Overview</SectionHeading>
        <P>
          The database has three tables. <Inline>cav_forms</Inline> stores all submitted records,
          <Inline>signatories</Inline> stores the staff members who sign documents, and
          <Inline>audit_logs</Inline> is an append-only action history.
        </P>
        <div className="my-4 grid grid-cols-3 gap-3">
          {[
            { table: "cav_forms",   desc: "All submitted CAV records (JHS + K-12)" },
            { table: "signatories", desc: "Staff members who sign CAV documents" },
            { table: "audit_logs",  desc: "Append-only system action history" },
          ].map(({ table, desc }) => (
            <div key={table} className="rounded-lg border border-border bg-card p-3.5 text-center">
              <p className="text-xs font-mono text-foreground mb-1">{table}</p>
              <p className="text-[11px] text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        <SectionHeading id="db-cav">cav_forms</SectionHeading>
        <P>
          The main records table. Both JHS (Type 1) and K-12 (Type 2) records are stored here, distinguished by the
          <Inline>form_type</Inline> column. The <Inline>lrn</Inline> column is only populated for K-12 records.
        </P>
        <FieldTable fields={[
          { name: "id",                    type: "uuid",      required: true,  description: "Primary key. Auto-generated by Supabase on insert." },
          { name: "form_type",             type: "integer",   required: true,  description: "1 = JHS (Type 1), 2 = K-12 (Type 2)." },
          { name: "user_id",               type: "uuid",      required: true,  description: "The Supabase auth user ID of the person who submitted the form." },
          { name: "created_at",            type: "timestamp", required: true,  description: "Auto-set by Supabase on insert. Represents submission time." },
          { name: "full_legal_name",       type: "text",      required: true,  description: "Student's full legal name." },
          { name: "control_no",            type: "text",      required: true,  description: "Document control number (e.g. RHS-030426)." },
          { name: "lrn",                   type: "text",      required: false, description: "K-12 only. Learner Reference Number. Null for JHS records." },
          { name: "date_issued",           type: "date",      required: true,  description: "Date the CAV was officially issued." },
          { name: "date_of_application",   type: "date",      required: true,  description: "Date the student submitted their application." },
          { name: "date_of_transmission",  type: "date",      required: true,  description: "Date the document was transmitted to DepEd." },
          { name: "prepared_by",           type: "uuid",      required: true,  description: "Foreign key → signatories.id. The assistant registrar who prepared the form." },
          { name: "submitted_by",          type: "uuid",      required: true,  description: "Foreign key → signatories.id. The registrar or principal who submitted." },
          { name: "is_archived",           type: "boolean",   required: true,  description: "True if the record has been archived. Defaults to false." },
        ]} />

        <SectionHeading id="db-signatories">signatories</SectionHeading>
        <FieldTable fields={DB_SIGNATORIES} />

        <SectionHeading id="db-audit">audit_logs</SectionHeading>
        <P>Append-only. Entries are never modified or deleted.</P>
        <FieldTable fields={[
          { name: "id",         type: "uuid",      required: true,  description: "Primary key. Auto-generated by Supabase." },
          { name: "action",     type: "text",      required: true,  description: "One of: created | updated | deleted." },
          { name: "event",      type: "text",      required: true,  description: "Human-readable description, e.g. 'Created CAV form for Juan Dela Cruz'." },
          { name: "record_id",  type: "uuid",      required: true,  description: "UUID of the affected cav_forms row." },
          { name: "old_data",   type: "jsonb",     required: false, description: "Full data snapshot before the change. Populated on update and delete events." },
          { name: "new_data",   type: "jsonb",     required: false, description: "Full data snapshot after the change. Populated on create and update events." },
          { name: "created_at", type: "timestamp", required: true,  description: "Auto-set by Supabase. Timestamp of when the action occurred." },
        ]} />
      </>
    )

    // ── Route Reference ───────────────────────────────────────────────────────
    case "routes": return (
      <>
        <PageBreadcrumb section="Reference" label="Route Reference" />
        <PageTitle subtitle="A complete list of all application routes, their components, and protection status.">
          Route Reference
        </PageTitle>

        <SectionHeading id="routes-all">All routes</SectionHeading>
        <div className="my-5 rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted border-b border-border">
                {["Path", "Component", "Auth", "Description"].map(h => (
                  <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {[
                { path: "/",                   component: "Home",            p: true,  desc: "Active CAV records list. Main starting point." },
                { path: "/view/:id",           component: "ViewPage",        p: true,  desc: "Read-only record view with PDF download." },
                { path: "/edit/:id",           component: "EditPage",        p: true,  desc: "Edit a submitted record. Audit-logged on save." },
                { path: "/signatories",        component: "SignatoriesPage", p: true,  desc: "Add, edit, or remove document signatories." },
                { path: "/archive",            component: "ArchivePage",     p: true,  desc: "Archived (soft-deleted) CAV records." },
                { path: "/audit-logs",         component: "Audit",           p: true,  desc: "Full audit trail of all system actions." },
                { path: "/about",              component: "About",           p: true,  desc: "Application information and credits." },
                { path: "/docs",               component: "DocsPage",        p: true,  desc: "This documentation." },
                { path: "/forms/:formType",    component: "FormRouter",      p: true,  desc: "Routes to JHS or K-12 form based on the formType param." },
                { path: "/forms/cav/view/:id", component: "CAVPreview",      p: true,  desc: "Read-only PDF preview of a CAV record." },
                { path: "/login",              component: "LoginPage",       p: false, desc: "Public login page. Navbar and footer are hidden." },
              ].map((r) => (
                <tr key={r.path} className="bg-card hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-foreground whitespace-nowrap">{r.path}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground whitespace-nowrap">{r.component}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge color={r.p ? "green" : "default"}>{r.p ? "Protected" : "Public"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{r.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <SectionHeading id="routes-protected" level={3}>Protected routes</SectionHeading>
        <P>
          All routes except <Inline>/login</Inline> are wrapped in the <Inline>ProtectedRoute</Inline> component.
          Unauthenticated users are immediately redirected to <Inline>/login</Inline>.
        </P>

        <SectionHeading id="routes-public" level={3}>Public routes</SectionHeading>
        <P>
          Only <Inline>/login</Inline> is publicly accessible without authentication. The Navbar and footer are
          hidden on this page. After a successful login, the user is redirected to <Inline>/</Inline>.
        </P>
      </>
    )

    default: return null
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DocsPage() {
  const navigate = useNavigate()
  const { px } = useCollapse() 
  const [activeSection, setActiveSection] = useState("introduction")
  const [activeToc, setActiveToc] = useState("")
  const toc = TOC_FOR_PAGE[activeSection] ?? []

  useEffect(() => {
    setActiveToc(toc[0]?.id ?? "")
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActiveToc(entry.target.id)
        })
      },
      { rootMargin: "-10% 0% -70% 0%", threshold: 0 }
    )
    toc.forEach(({ id }) => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [activeSection, toc])

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" })
  }, [activeSection])

  return (
    <div className={`flex ${px} bg-background text-foreground items-start transition-all duration-300`}>

      <aside className="hidden md:flex flex-col w-60 shrink-0 self-start sticky top-16 py-6 pr-10">
        <div className="flex items-center gap-2 px-3 mb-6">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Documentation</span>
        </div>
        {NAV_SECTIONS.map((section) => (
          <div key={section.title} className="mb-5">
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {section.title}
            </p>
            <ul className="space-y-0.5">
              {section.items.map((item) => (
                <li key={item.id}>
                  <button
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full text-left flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      activeSection === item.id
                        ? "bg-muted text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0 text-muted-foreground">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </span>
                    {item.badge && (
                      <span className="text-[10px] font-medium border border-border bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full shrink-0">
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>

      <main className="flex-1 flex flex-col items-center">
        <div className="w-full max-w-200 px-10 py-12">
          <PageContent pageId={activeSection} onNavigate={setActiveSection} />
          <div className="mt-16 pt-6 border-t border-border flex items-center justify-between">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to app
            </button>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Internal use only</span>
            </div>
          </div>
        </div>
      </main>

      {toc.length > 0 && (
        <aside className="hidden xl:flex flex-col w-52 shrink-0 self-start sticky top-16 py-6 pl-6">
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">On This Page</p>
          <ul className="space-y-1">
            {toc.map(({ id, label }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className={`block text-sm py-0.5 transition-colors ${
                    activeToc === id ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  )
}