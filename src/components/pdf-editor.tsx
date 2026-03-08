import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Upload, Save, ChevronLeft, ChevronRight,
  MousePointer, CheckSquare, Loader2,
  FileText, X, RotateCcw, ZoomIn, ZoomOut,
  Grid3x3, Plus, PanelLeftClose, PanelLeftOpen,
  FolderOpen, Pencil, Trash2, ChevronDown, Check,
  Undo2, AlertTriangle, Keyboard, Crosshair,
  LayoutTemplate, ChevronRight as Chevron,
  Clock, WifiOff, Eye, ArrowRight,
  AlignLeft, AlignCenter, AlignRight,
  Sparkles, Filter, BookOpen, GraduationCap,
  Info, Move,
} from "lucide-react";
import { SupabaseClient } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────────
interface FieldDef { name: string; label: string }
interface FieldGroup {
  label: string; shortLabel: string;
  color: string; dot: string; pill: string;
  borderColor: string; hoverBg: string; activeBg: string; activeText: string;
  fields: FieldDef[];
}
type TextAlign = "left" | "center" | "right";
type TemplateType = "jhs" | "k12";
interface PlacedField {
  id: string; name: string; page: number;
  x: number; y: number; width: number; height: number;
  fontSize: number;
  indentLeft: number; indentRight: number; indentTop: number;
  textAlign: TextAlign;
}
interface PageData { dataUrl: string; width: number; height: number }
interface PageDimension { width: number; height: number }
interface DragState { id: string; startX: number; startY: number; origX: number; origY: number }
interface ResizeState { id: string; startX: number; startY: number; origW: number; origH: number }
interface SaveStatus { type: "success" | "error"; message: string }
interface TemplateFile { name: string; updatedAt: string; templateType: TemplateType }
interface Props { supabase?: SupabaseClient; bucketName?: string }
interface GhostPos { x: number; y: number }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global { interface Window { pdfjsLib: any; PDFLib: any } }

const SNAP_SIZE = 8;
const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const NUDGE = 1;
const HISTORY_LIMIT = 50;
const snap = (v: number) => Math.round(v / SNAP_SIZE) * SNAP_SIZE;

const TYPE_PREFIX: Record<TemplateType, string> = { jhs: "jhs/", k12: "k12/" };
const detectTemplateType = (name: string): TemplateType =>
  name.startsWith("k12/") ? "k12" : "jhs";
const stripPrefix = (name: string) =>
  name.replace(/^(jhs\/|k12\/)/, "");
const applyPrefix = (type: TemplateType, name: string): string => {
  const base = name.replace(/^(jhs__|k12__)/, "").replace(/\.pdf$/, "");
  return `${TYPE_PREFIX[type]}${base}.pdf`;
};

// ── JHS Field definitions ──────────────────────────────────────────────────────
const JHS_FIELD_GROUPS: FieldGroup[] = [
  {
    label: "Transmittal", shortLabel: "P1",
    color: "bg-sky-500", dot: "bg-sky-500",
    pill: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    borderColor: "border-sky-400",
    hoverBg: "hover:bg-sky-50 dark:hover:bg-sky-950/40",
    activeBg: "bg-sky-50 dark:bg-sky-950/40",
    activeText: "text-sky-700 dark:text-sky-300",
    fields: [
      { name: "control_no", label: "Control No." },
      { name: "student_name", label: "Student Name" },
      { name: "date_of_application", label: "Date of Application" },
      { name: "date_of_transmittal", label: "Date of Transmittal" },
      { name: "prepared_by_name", label: "Prepared By – Name" },
      { name: "prepared_by_position", label: "Prepared By – Position" },
      { name: "submitted_by_name", label: "Submitted By – Name" },
      { name: "submitted_by_position", label: "Submitted By – Position" },
    ],
  },
  {
    label: "Indorsement", shortLabel: "P2",
    color: "bg-violet-500", dot: "bg-violet-500",
    pill: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    borderColor: "border-violet-400",
    hoverBg: "hover:bg-violet-50 dark:hover:bg-violet-950/40",
    activeBg: "bg-violet-50 dark:bg-violet-950/40",
    activeText: "text-violet-700 dark:text-violet-300",
    fields: [
      { name: "p2_date", label: "Date" },
      { name: "p2_student_name", label: "Student Name" },
      { name: "p2_submitted_by_name", label: "Submitted By – Name" },
      { name: "p2_submitted_by_position", label: "Submitted By – Position" },
    ],
  },
  {
    label: "CAV Form 4", shortLabel: "P3",
    color: "bg-emerald-500", dot: "bg-emerald-500",
    pill: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    borderColor: "border-emerald-400",
    hoverBg: "hover:bg-emerald-50 dark:hover:bg-emerald-950/40",
    activeBg: "bg-emerald-50 dark:bg-emerald-950/40",
    activeText: "text-emerald-700 dark:text-emerald-300",
    fields: [
      { name: "p3_student_name", label: "Student Name" },
      { name: "p3_check_enrolled", label: "Check – Enrolled" },
      { name: "p3_enrolled_grade", label: "Enrolled Grade" },
      { name: "p3_enrolled_sy", label: "Enrolled School Year" },
      { name: "p3_check_completed", label: "Check – Completed" },
      { name: "p3_completed_grade", label: "Completed Grade" },
      { name: "p3_completed_sy", label: "Completed School Year" },
      { name: "p3_check_graduated", label: "Check – Graduated" },
      { name: "p3_graduated_sy", label: "Graduated School Year" },
      { name: "p3_day", label: "Day (ordinal)" },
      { name: "p3_month", label: "Month" },
      { name: "p3_year", label: "Year" },
      { name: "p3_request_name", label: "Requestor Name" },
      { name: "p3_submitted_by_name", label: "Submitted By – Name" },
      { name: "p3_submitted_by_position", label: "Submitted By – Position" },
    ],
  },
  {
    label: "CAV Form 17", shortLabel: "P4",
    color: "bg-amber-500", dot: "bg-amber-500",
    pill: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    borderColor: "border-amber-400",
    hoverBg: "hover:bg-amber-50 dark:hover:bg-amber-950/40",
    activeBg: "bg-amber-50 dark:bg-amber-950/40",
    activeText: "text-amber-700 dark:text-amber-300",
    fields: [
      { name: "p4_student_name", label: "Student Name" },
      { name: "p4_sy_completed", label: "School Year Completed" },
      { name: "p4_sy_graduated", label: "School Year Graduated" },
      { name: "p4_day", label: "Day (ordinal)" },
      { name: "p4_month", label: "Month" },
      { name: "p4_year", label: "Year" },
      { name: "p4_submitted_by_name", label: "Submitted By – Name" },
      { name: "p4_submitted_by_position", label: "Submitted By – Position" },
    ],
  },
];

// ── K-12 Field definitions ─────────────────────────────────────────────────────
const K12_FIELD_GROUPS: FieldGroup[] = [
  {
    label: "Transmittal", shortLabel: "P1",
    color: "bg-sky-500", dot: "bg-sky-500",
    pill: "bg-sky-500/15 text-sky-600 dark:text-sky-400",
    borderColor: "border-sky-400",
    hoverBg: "hover:bg-sky-50 dark:hover:bg-sky-950/40",
    activeBg: "bg-sky-50 dark:bg-sky-950/40",
    activeText: "text-sky-700 dark:text-sky-300",
    fields: [
      { name: "control_no", label: "Control No." },
      { name: "student_name", label: "Student Name" },
      { name: "lrn", label: "LRN" },
      { name: "date_of_application", label: "Date of Application" },
      { name: "date_of_transmittal", label: "Date of Transmittal" },
      { name: "prepared_by_name", label: "Prepared By – Name" },
      { name: "prepared_by_position", label: "Prepared By – Position" },
      { name: "submitted_by_name", label: "Submitted By – Name" },
      { name: "submitted_by_position", label: "Submitted By – Position" },
    ],
  },
  {
    label: "Indorsement", shortLabel: "P2",
    color: "bg-violet-500", dot: "bg-violet-500",
    pill: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
    borderColor: "border-violet-400",
    hoverBg: "hover:bg-violet-50 dark:hover:bg-violet-950/40",
    activeBg: "bg-violet-50 dark:bg-violet-950/40",
    activeText: "text-violet-700 dark:text-violet-300",
    fields: [
      { name: "p2_date", label: "Date" },
      { name: "p2_student_name", label: "Student Name" },
      { name: "p2_lrn", label: "LRN" },
      { name: "p2_submitted_by_name", label: "Submitted By – Name" },
      { name: "p2_submitted_by_position", label: "Submitted By – Position" },
    ],
  },
  {
    label: "CAV Form 4", shortLabel: "P3",
    color: "bg-emerald-500", dot: "bg-emerald-500",
    pill: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    borderColor: "border-emerald-400",
    hoverBg: "hover:bg-emerald-50 dark:hover:bg-emerald-950/40",
    activeBg: "bg-emerald-50 dark:bg-emerald-950/40",
    activeText: "text-emerald-700 dark:text-emerald-300",
    fields: [
      { name: "p3_student_name", label: "Student Name" },
      { name: "p3_lrn", label: "LRN" },
      { name: "p3_check_enrolled", label: "Check – Enrolled" },
      { name: "p3_enrolled_grade", label: "Enrolled Grade" },
      { name: "p3_enrolled_sy", label: "Enrolled School Year" },
      { name: "p3_check_completed", label: "Check – Completed" },
      { name: "p3_completed_grade", label: "Completed Grade" },
      { name: "p3_completed_sy", label: "Completed School Year" },
      { name: "p3_check_graduated", label: "Check – Graduated" },
      { name: "p3_graduated_sy", label: "Graduated School Year" },
      { name: "p3_day", label: "Day (ordinal)" },
      { name: "p3_month", label: "Month" },
      { name: "p3_year", label: "Year" },
      { name: "p3_request_name", label: "Requestor Name" },
      { name: "p3_submitted_by_name", label: "Submitted By – Name" },
      { name: "p3_submitted_by_position", label: "Submitted By – Position" },
    ],
  },
  {
    label: "CAV Form 17", shortLabel: "P4",
    color: "bg-amber-500", dot: "bg-amber-500",
    pill: "bg-amber-500/15 text-amber-600 dark:text-amber-400",
    borderColor: "border-amber-400",
    hoverBg: "hover:bg-amber-50 dark:hover:bg-amber-950/40",
    activeBg: "bg-amber-50 dark:bg-amber-950/40",
    activeText: "text-amber-700 dark:text-amber-300",
    fields: [
      { name: "p4_student_name", label: "Student Name" },
      { name: "p4_lrn", label: "LRN" },
      { name: "p4_sy_completed", label: "School Year Completed" },
      { name: "p4_sy_graduated", label: "School Year Graduated" },
      { name: "p4_day", label: "Day (ordinal)" },
      { name: "p4_month", label: "Month" },
      { name: "p4_year", label: "Year" },
      { name: "p4_submitted_by_name", label: "Submitted By – Name" },
      { name: "p4_submitted_by_position", label: "Submitted By – Position" },
    ],
  },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function loadScript(src: string): Promise<void> {
  return new Promise((resolve) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement("script");
    s.src = src; s.onload = () => resolve();
    document.head.appendChild(s);
  });
}
function waitForLib(check: () => boolean): Promise<void> {
  return new Promise((resolve) => { const p = () => check() ? resolve() : setTimeout(p, 80); p(); });
}
function formatRelativeTime(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const diffMs = Date.now() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── Small UI atoms ─────────────────────────────────────────────────────────────
function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("px-1 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 select-none", className)}>
      {children}
    </p>
  );
}

function Stepper({ value, min, max, step = 1, onChange, compact }: {
  value: number; min: number; max: number; step?: number; onChange: (v: number) => void; compact?: boolean;
}) {
  return (
    <div className={cn("flex items-center rounded-lg border border-border overflow-hidden", compact ? "h-6" : "h-7")}>
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        className={cn("flex items-center justify-center bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground text-sm font-medium transition-colors select-none border-r border-border active:bg-muted", compact ? "w-5 h-full" : "w-7 h-full")}
      >−</button>
      <span className={cn("font-mono font-semibold tabular-nums text-center", compact ? "text-[10px] w-7" : "text-[11px] w-9")}>{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + step))}
        className={cn("flex items-center justify-center bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground text-sm font-medium transition-colors select-none border-l border-border active:bg-muted", compact ? "w-5 h-full" : "w-7 h-full")}
      >+</button>
    </div>
  );
}

function AlignButtons({ value, onChange }: { value: TextAlign; onChange: (v: TextAlign) => void }) {
  const opts: { v: TextAlign; icon: React.ReactNode; label: string }[] = [
    { v: "left",   label: "Align left",   icon: <AlignLeft   className="w-3.5 h-3.5" /> },
    { v: "center", label: "Align center", icon: <AlignCenter className="w-3.5 h-3.5" /> },
    { v: "right",  label: "Align right",  icon: <AlignRight  className="w-3.5 h-3.5" /> },
  ];
  return (
    <div className="flex items-center gap-1">
      {opts.map(({ v, icon, label }) => (
        <Tooltip key={v}>
          <TooltipTrigger asChild>
            <button onClick={() => onChange(v)} aria-label={label}
              className={cn("w-7 h-7 rounded-md flex items-center justify-center border transition-all",
                value === v
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border-border"
              )}>{icon}</button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{label}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}

function InspectorRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
      {children}
    </div>
  );
}

// ── Template type toggle ─────────────────────────────────────────────────────────
function TemplateTypeToggle({ value, onChange }: { value: TemplateType; onChange: (v: TemplateType) => void }) {
  return (
    <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-xl border border-border">
      {(["jhs", "k12"] as TemplateType[]).map(t => (
        <button
          key={t}
          onClick={() => onChange(t)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-[11px] font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            value === t
              ? "bg-background text-foreground shadow-sm border border-border"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {t === "jhs"
            ? <><BookOpen className="w-3 h-3" />JHS</>
            : <><GraduationCap className="w-3 h-3" />K–12</>
          }
        </button>
      ))}
    </div>
  );
}

// ── Type badge chip ────────────────────────────────────────────────────────────
function TypeBadge({ type }: { type: TemplateType }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[8px] font-bold uppercase tracking-wide border shrink-0",
      type === "jhs"
        ? "bg-sky-500/10 text-sky-600 border-sky-500/20 dark:text-sky-400"
        : "bg-violet-500/10 text-violet-600 border-violet-500/20 dark:text-violet-400"
    )}>
      {type === "jhs" ? "JHS" : "K-12"}
    </span>
  );
}

// ── Skeleton loader ────────────────────────────────────────────────────────────
function TemplateSkeleton() {
  return (
    <div className="px-1 space-y-1">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-2 px-3 py-2.5 rounded-lg">
          <div className="w-3.5 h-3.5 rounded bg-muted/60 animate-pulse shrink-0" />
          <div className="flex-1 h-2.5 rounded bg-muted/60 animate-pulse" style={{ width: `${55 + i * 12}%` }} />
          <div className="w-8 h-4 rounded-md bg-muted/60 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

// ── Toast notification ─────────────────────────────────────────────────────────
function Toast({ status, onDismiss }: { status: SaveStatus; onDismiss: () => void }) {
  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg backdrop-blur-md",
        "animate-in slide-in-from-bottom-2 fade-in duration-300",
        status.type === "success"
          ? "bg-emerald-50 dark:bg-emerald-950/80 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
          : "bg-red-50 dark:bg-red-950/80 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200"
      )}
    >
      <div className={cn("w-5 h-5 rounded-full flex items-center justify-center shrink-0",
        status.type === "success" ? "bg-emerald-500" : "bg-red-500")}>
        {status.type === "success"
          ? <Check className="w-3 h-3 text-white" />
          : <X className="w-3 h-3 text-white" />}
      </div>
      <p className="text-[12px] font-medium">{status.message}</p>
      <button onClick={onDismiss} className="ml-1 w-5 h-5 rounded flex items-center justify-center opacity-50 hover:opacity-100 transition-opacity">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── Dialogs ────────────────────────────────────────────────────────────────────
function DialogShell({ children, onBackdropClick }: { children: React.ReactNode; onBackdropClick?: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onBackdropClick}
    >
      <div
        className="bg-card border border-border rounded-2xl shadow-2xl animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

function UnsavedDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <DialogShell onBackdropClick={onCancel}>
      <div className="p-6 w-80 space-y-5">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-semibold">Unsaved changes</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Switching templates will discard your unsaved field placements.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 h-9 text-xs" onClick={onCancel}>Keep editing</Button>
          <Button variant="destructive" className="flex-1 h-9 text-xs" onClick={onConfirm}>Discard & switch</Button>
        </div>
      </div>
    </DialogShell>
  );
}

function NavGuardDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <DialogShell onBackdropClick={onCancel}>
      <div className="p-6 w-80 space-y-5">
        <div className="flex gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <p className="text-sm font-semibold">Leave without saving?</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">You have unsaved changes. Navigating away will discard them.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 h-9 text-xs" onClick={onCancel}>Stay here</Button>
          <Button variant="destructive" className="flex-1 h-9 text-xs" onClick={onConfirm}>Leave anyway</Button>
        </div>
      </div>
    </DialogShell>
  );
}

function RenameDialog({ current, onConfirm, onCancel }: { current: string; onConfirm: (n: string) => void; onCancel: () => void }) {
  const [val, setVal] = useState(stripPrefix(current).replace(".pdf", ""));
  return (
    <DialogShell onBackdropClick={onCancel}>
      <div className="p-6 w-80 space-y-4">
        <p className="text-sm font-semibold">Rename template</p>
        <input
          autoFocus value={val} onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && val.trim()) onConfirm(val.trim()); if (e.key === "Escape") onCancel(); }}
          className="w-full text-sm bg-muted/40 border border-border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/40 text-foreground"
          placeholder="template-name"
        />
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1 h-9 text-xs" onClick={onCancel}>Cancel</Button>
          <Button className="flex-1 h-9 text-xs" disabled={!val.trim()} onClick={() => onConfirm(val.trim())}>Rename</Button>
        </div>
      </div>
    </DialogShell>
  );
}

function ShortcutsPanel({ onClose }: { onClose: () => void }) {
  const sections = [
    {
      title: "Navigation",
      rows: [
        ["Tab / Shift+Tab", "Cycle through fields on page"],
        ["Esc", "Cancel placement / deselect"],
      ]
    },
    {
      title: "Editing",
      rows: [
        ["Del / Backspace", "Remove selected field"],
        ["↑ ↓ ← →", "Nudge selected field 1 px"],
        ["Shift + arrows", "Nudge 8 px (snap unit)"],
      ]
    },
    {
      title: "Actions",
      rows: [
        ["Ctrl/⌘ Z", "Undo last action"],
        ["Ctrl/⌘ S", "Save template to storage"],
      ]
    }
  ];

  return (
    <DialogShell onBackdropClick={onClose}>
      <div className="p-5 w-85 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
              <Keyboard className="w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold">Keyboard shortcuts</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
        <div className="space-y-3">
          {sections.map(section => (
            <div key={section.title}>
              <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/50 mb-1.5 px-0.5">{section.title}</p>
              <div className="rounded-lg border border-border overflow-hidden">
                {section.rows.map(([key, desc], i) => (
                  <div key={key} className={cn("flex items-center justify-between px-3 py-2 gap-4", i > 0 && "border-t border-border/50")}>
                    <span className="text-[11px] text-muted-foreground">{desc}</span>
                    <kbd className="shrink-0 px-2 py-0.5 text-[10px] font-mono bg-muted rounded-md border border-border whitespace-nowrap">{key}</kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground/50 text-center">Click anywhere outside to close</p>
      </div>
    </DialogShell>
  );
}

// ── Preview modal ──────────────────────────────────────────────────────────────
function PreviewModal({ pages, placedFields, fieldGroups, onClose }: {
  pages: PageData[]; placedFields: PlacedField[]; fieldGroups: FieldGroup[]; onClose: () => void
}) {
  const allFields = fieldGroups.flatMap(g => g.fields.map(f => ({ ...f, group: g })));
  const getGroupForField = (name: string) => fieldGroups.find(g => g.fields.some(f => f.name === name));

  const [page, setPage] = useState(0);
  const currentPageFields = placedFields.filter(f => f.page === page);
  return (
    <DialogShell onBackdropClick={onClose}>
      <div className="flex flex-col overflow-hidden max-h-[90vh] max-w-[90vw] min-w-100">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Preview</p>
            <span className="text-xs text-muted-foreground">— page {page + 1} of {pages.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {pages.map((_, i) => (
              <button key={i} onClick={() => setPage(i)}
                className={cn("w-5 h-5 rounded-md text-[10px] font-bold transition-all",
                  i === page ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
                {i + 1}
              </button>
            ))}
            <button disabled={page >= pages.length - 1} onClick={() => setPage(p => p + 1)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        <div className="overflow-auto p-6 bg-muted/30">
          {pages[page] && (
            <div className="relative mx-auto" style={{ width: pages[page].width, height: pages[page].height, boxShadow: "0 4px 32px rgba(0,0,0,0.3)" }}>
              <img src={pages[page].dataUrl} style={{ width: pages[page].width, height: pages[page].height, display: "block" }} draggable={false} />
              {currentPageFields.map(field => {
                const group = getGroupForField(field.name);
                const fieldDef = allFields.find(f => f.name === field.name);
                return (
                  <div key={field.id} style={{
                    position: "absolute",
                    left: field.x + field.indentLeft, top: field.y + field.indentTop,
                    width: Math.max(10, field.width - field.indentLeft - field.indentRight),
                    height: Math.max(8, field.height - field.indentTop),
                    border: "1.5px solid rgba(99,102,241,0.5)",
                    backgroundColor: "rgba(99,102,241,0.07)",
                    borderRadius: 2,
                    display: "flex", alignItems: "center",
                    justifyContent: field.textAlign === "center" ? "center" : field.textAlign === "right" ? "flex-end" : "flex-start",
                    overflow: "hidden", padding: "0 2px",
                  }}>
                    <span style={{ fontSize: Math.max(7, field.fontSize), fontFamily: "Georgia, serif", fontStyle: "italic", color: "rgba(99,102,241,0.7)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {fieldDef?.label ?? field.name}
                    </span>
                    <div className={cn("absolute -top-4 left-0 px-1 py-0.5 text-[7px] font-bold rounded whitespace-nowrap text-white pointer-events-none", group?.color ?? "bg-zinc-500")}>
                      {fieldDef?.label ?? field.name}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        <div className="px-4 py-2.5 border-t border-border bg-background/60 flex items-center justify-between shrink-0">
          <p className="text-[11px] text-muted-foreground">
            {currentPageFields.length} field{currentPageFields.length !== 1 ? "s" : ""} on this page
          </p>
          <div className="flex items-center gap-1">
            {fieldGroups.map((g, i) => {
              if (i >= pages.length) return null;
              const placed = placedFields.filter(f => f.page === i).length;
              const done = placed === g.fields.length;
              return (
                <div key={i} className={cn("flex items-center gap-1 px-2 py-1 rounded-md text-[9px] font-bold transition-colors cursor-pointer",
                  i === page ? "bg-muted" : "hover:bg-muted/50")} onClick={() => setPage(i)}>
                  <span className={cn("w-1.5 h-1.5 rounded-full", done ? "bg-emerald-500" : g.dot)} />
                  {g.shortLabel}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DialogShell>
  );
}

// ── Field Inspector Popover ────────────────────────────────────────────────────
function FieldInspectorPopover({ instance, anchorRect, sidebarOpen, onUpdate, onRemove, onClose }: {
  instance: PlacedField;
  anchorRect: DOMRect | null;
  sidebarOpen: boolean;
  onUpdate: (patch: Partial<PlacedField>) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);

  // When anchored to a sidebar row: appear just to the right of the sidebar
  // When no anchor (canvas click): appear at a fixed top-right-ish position
  const SIDEBAR_RIGHT = sidebarOpen ? 24 + 256 + 8 + 8 : 48 + 16;
  const POPOVER_WIDTH = 208; // w-52

  const top = anchorRect
    ? Math.min(Math.max(16, anchorRect.top + anchorRect.height / 2 - 90), window.innerHeight - 240)
    : 80; // fallback: near top

  const left = anchorRect
    ? SIDEBAR_RIGHT
    : (sidebarOpen ? SIDEBAR_RIGHT : 64);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const t = setTimeout(() => document.addEventListener("mousedown", handler), 120);
    return () => { clearTimeout(t); document.removeEventListener("mousedown", handler); };
  }, [onClose]);

  return (
    <div
      ref={popoverRef}
      className="fixed z-60 bg-background/95 backdrop-blur-md border border-border rounded-xl shadow-2xl overflow-visible animate-in fade-in slide-in-from-left-1 duration-150"
      style={{ left, top, width: POPOVER_WIDTH }}
      onClick={e => e.stopPropagation()}
    >
      {/* Arrow pointing left — only when anchored to sidebar */}
      {anchorRect && (
        <div
          className="absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-background border-l border-b border-border rotate-45"
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40 rounded-t-xl">
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
          <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Field inspector</span>
        </div>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onRemove}
                className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-destructive/15 transition-colors"
                aria-label="Remove field"
              >
                <Trash2 className="w-3 h-3 text-destructive/60" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Remove field (Del)</TooltipContent>
          </Tooltip>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Close inspector"
          >
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="px-3 py-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground shrink-0">Font size</span>
          <Stepper compact value={instance.fontSize} min={6} max={12} onChange={v => onUpdate({ fontSize: v })} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[10px] text-muted-foreground shrink-0">Align</span>
          <AlignButtons value={instance.textAlign} onChange={v => onUpdate({ textAlign: v })} />
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground">Pad L / R</span>
          <div className="flex items-center gap-5 w-full">
            <Stepper compact value={instance.indentLeft} min={0} max={40} onChange={v => onUpdate({ indentLeft: v })} />
            <span className="text-muted-foreground/40 text-[10px] shrink-0">/</span>
            <Stepper compact value={instance.indentRight} min={0} max={40} onChange={v => onUpdate({ indentRight: v })} />
          </div>
        </div>
        {/* Coords */}
        <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-1.5 border-t border-border/50">
          {[
            ["x", Math.round(instance.x)],
            ["y", Math.round(instance.y)],
            ["w", Math.round(instance.width)],
            ["h", Math.round(instance.height)],
          ].map(([label, val]) => (
            <div key={String(label)} className="flex items-center justify-between">
              <span className="text-[9px] font-mono text-muted-foreground/40 uppercase">{label}</span>
              <span className="text-[9px] font-mono text-muted-foreground/60 tabular-nums">{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Cross-type mismatch warning ────────────────────────────────────────────────
function TypeMismatchBanner({ currentType, fileType, onDismiss }: {
  currentType: TemplateType; fileType: TemplateType; onDismiss: () => void;
}) {
  return (
    <div className="mx-2 mb-2 flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-700 dark:text-amber-400 animate-in slide-in-from-top-1 duration-200">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold leading-snug">Template type mismatch</p>
        <p className="text-[9px] opacity-80 mt-0.5">
          This file belongs to <strong>{fileType.toUpperCase()}</strong> but you're in <strong>{currentType.toUpperCase()}</strong> mode. Fields may not match.
        </p>
      </div>
      <button onClick={onDismiss} className="w-4 h-4 rounded flex items-center justify-center opacity-60 hover:opacity-100">
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function PDFFieldEditor({ supabase, bucketName = "templates" }: Props) {
  const [templateType, setTemplateType] = useState<TemplateType>("jhs");

  // Derived field groups based on current template type
  const FIELD_GROUPS = templateType === "jhs" ? JHS_FIELD_GROUPS : K12_FIELD_GROUPS;
  const ALL_FIELDS = FIELD_GROUPS.flatMap((g) => g.fields.map((f) => ({ ...f, group: g })));
  const getGroupForField = (name: string) => FIELD_GROUPS.find((g) => g.fields.some((f) => f.name === name));

  // All templates from storage, then filtered by current type for display
  const [allTemplates, setAllTemplates] = useState<TemplateFile[]>([]);
  const filteredTemplates = allTemplates.filter(t => t.templateType === templateType);

  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
  const [activeTemplateType, setActiveTemplateType] = useState<TemplateType | null>(null);
  const [templatesPanelOpen, setTemplatesPanelOpen] = useState(true);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [creatingNew, setCreatingNew] = useState(false);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templatesError, setTemplatesError] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [pendingSwitch, setPendingSwitch] = useState<null | (() => void)>(null);
  const [showNavGuard, setShowNavGuard] = useState(false);
  const [navGuardTarget, setNavGuardTarget] = useState<string | null>(null);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hoveredFieldName, setHoveredFieldName] = useState<string | null>(null);
  const [hoveredCanvasFieldId, setHoveredCanvasFieldId] = useState<string | null>(null);
  const [typeMismatchDismissed, setTypeMismatchDismissed] = useState(false);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pages, setPages] = useState<PageData[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [placedFields, setPlacedFields] = useState<PlacedField[]>([]);
  const [history, setHistory] = useState<PlacedField[][]>([]);
  const [selectedField, setSelectedField] = useState<string | null>(null);
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);
  const [dragging, setDragging] = useState<DragState | null>(null);
  const [resizing, setResizing] = useState<ResizeState | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageDimensions, setPageDimensions] = useState<PageDimension[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({ 0: true, 1: true, 2: true, 3: true });
  const [zoomIndex, setZoomIndex] = useState(2);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [globalFontSize, setGlobalFontSize] = useState(10);
  const [globalTextAlign, setGlobalTextAlign] = useState<TextAlign>("left");
  const [isDirty, setIsDirty] = useState(false);
  const [ghostPos, setGhostPos] = useState<GhostPos | null>(null);
  const [isInteractingWithField, setIsInteractingWithField] = useState(false);
  const [inspectorAnchorRect, setInspectorAnchorRect] = useState<DOMRect | null>(null);

  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasScrollRef = useRef<HTMLDivElement>(null);
  const sidebarBodyRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfFileRef = useRef<File | null>(null);
  const newNameRef = useRef<HTMLInputElement>(null);
  const dragStartSnapshot = useRef<PlacedField[] | null>(null);
  const resizeStartSnapshot = useRef<PlacedField[] | null>(null);

  const zoom = ZOOM_STEPS[zoomIndex];
  const canUndo = history.length > 0;
  const currentPageFields = placedFields.filter(f => f.page === currentPage);
  const currentPageData = pages[currentPage];
  const placedFieldNames = new Set(placedFields.map(f => f.name));
  const totalPlaced = placedFields.length;
  const totalFields = ALL_FIELDS.length;
  const progress = Math.round((totalPlaced / totalFields) * 100);

  // Type mismatch detection
  const showTypeMismatch = !typeMismatchDismissed &&
    activeTemplateType !== null &&
    activeTemplateType !== templateType;

  // ── When template type changes, reset placed fields & clear selection ─────────
  const handleTemplateTypeChange = (newType: TemplateType) => {
    if (newType === templateType) return;
    const doChange = () => {
      setTemplateType(newType);
      setPlacedFields([]);
      setHistory([]);
      setActiveFieldId(null);
      setSelectedField(null);
      setGhostPos(null);
      setIsDirty(false);
      // Clear active template if it belongs to a different type
      if (activeTemplate && detectTemplateType(activeTemplate) !== newType) {
        setActiveTemplate(null);
        setActiveTemplateType(null);
        setPdfFile(null);
        setPages([]);
        pdfFileRef.current = null;
      }
      setTypeMismatchDismissed(false);
    };
    if (isDirty && placedFields.length > 0) {
      setPendingSwitch(() => doChange);
    } else {
      doChange();
    }
  };

  // ── History ───────────────────────────────────────────────────────────────────
  const pushHistory = useCallback((snapshot: PlacedField[]) => {
    setHistory(h => [...h.slice(-HISTORY_LIMIT), snapshot]);
  }, []);

  const setFieldsWithHistory = useCallback((updater: PlacedField[] | ((prev: PlacedField[]) => PlacedField[])) => {
    setPlacedFields(prev => {
      pushHistory(prev);
      setIsDirty(true);
      return typeof updater === "function" ? updater(prev) : updater;
    });
  }, [pushHistory]);

  const undo = useCallback(() => {
    setHistory(h => {
      if (!h.length) return h;
      setPlacedFields(h[h.length - 1]);
      setActiveFieldId(null);
      setIsDirty(true);
      return h.slice(0, -1);
    });
  }, []);

  // ── Scripts ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js")
      .then(() => waitForLib(() => !!window.pdfjsLib))
      .then(() => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc =
          "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      });
    loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js");
  }, []);

  // ── Nav guard ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.includes("pdf-template")) return;
      e.preventDefault(); e.stopPropagation();
      setNavGuardTarget(href); setShowNavGuard(true);
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [isDirty]);

  // ── Fetch templates ───────────────────────────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    if (!supabase) return;
    setTemplatesLoading(true); setTemplatesError(false);
    try {
      const [jhsRes, k12Res] = await Promise.all([
        supabase.storage.from(bucketName).list("jhs", { sortBy: { column: "updated_at", order: "desc" } }),
        supabase.storage.from(bucketName).list("k12", { sortBy: { column: "updated_at", order: "desc" } }),
      ]);
      if (jhsRes.error) throw jhsRes.error;
      if (k12Res.error) throw k12Res.error;
      const data = [
        ...(jhsRes.data ?? []).map(f => ({ ...f, name: `jhs/${f.name}` })),
        ...(k12Res.data ?? []).map(f => ({ ...f, name: `k12/${f.name}` })),
      ];
      setAllTemplates(
        (data ?? [])
          .filter(f => f.name.endsWith(".pdf"))
          .map(f => ({
            name: f.name,
            updatedAt: f.updated_at ?? "",
            templateType: detectTemplateType(f.name),
          }))
      );
    } catch { setTemplatesError(true); }
    finally { setTemplatesLoading(false); }
  }, [supabase, bucketName]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  // ── PDF render ────────────────────────────────────────────────────────────────
  const renderAllPages = useCallback(async (file: File): Promise<{ dims: PageDimension[]; rendered: PageData[] }> => {
    setLoading(true);
    try {
      await waitForLib(() => !!(window.pdfjsLib?.GlobalWorkerOptions?.workerSrc));
      const doc = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
      const rendered: PageData[] = [], dims: PageDimension[] = [];
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const vp = page.getViewport({ scale: 1.5 });
        const canvas = document.createElement("canvas");
        canvas.width = vp.width; canvas.height = vp.height;
        await page.render({ canvasContext: canvas.getContext("2d")!, viewport: vp }).promise;
        rendered.push({ dataUrl: canvas.toDataURL(), width: vp.width, height: vp.height });
        const vp1 = page.getViewport({ scale: 1 });
        dims.push({ width: vp1.width, height: vp1.height });
      }
      setPages(rendered); setPageDimensions(dims);
      return { dims, rendered };
    } finally { setLoading(false); }
  }, []);

  const resetEditor = () => {
    setPlacedFields([]); setHistory([]); setCurrentPage(0);
    setSaveStatus(null); setActiveFieldId(null); setSelectedField(null);
    setIsDirty(false); setLastSavedAt(null); setTypeMismatchDismissed(false);
    setInspectorAnchorRect(null);
  };

  const guardedSwitch = (action: () => void) => {
    if (isDirty && placedFields.length > 0) setPendingSwitch(() => action);
    else action();
  };

  // ── Fetch PDF via signed URL ──────────────────────────────────────────────────
  const fetchTemplateBytes = useCallback(async (name: string): Promise<ArrayBuffer> => {
    if (!supabase) throw new Error("No supabase client");
    const { data: signedData, error: signedError } = await supabase.storage
      .from(bucketName)
      .createSignedUrl(name, 60);
    if (signedError || !signedData?.signedUrl) {
      throw new Error("Could not generate signed URL: " + signedError?.message);
    }
    return fetch(signedData.signedUrl).then(res => res.arrayBuffer());
  }, [supabase, bucketName]);

  // ── Load template ─────────────────────────────────────────────────────────────
  const loadTemplate = useCallback(async (name: string) => {
    if (!supabase) return;
    const detectedType = detectTemplateType(name);
    setActiveTemplate(name);
    setActiveTemplateType(detectedType);
    resetEditor();
    setLoading(true);
    try {
      const bytes = await fetchTemplateBytes(name);
      const file = new File([bytes], name, { type: "application/pdf" });
      pdfFileRef.current = file; setPdfFile(file);

      const { dims, rendered } = await renderAllPages(file);

      await waitForLib(() => !!window.PDFLib);
      try {
        const { PDFDocument } = window.PDFLib;
        const existingDoc = await PDFDocument.load(bytes);
        const existingForm = existingDoc.getForm();
        const existingPdfPages = existingDoc.getPages();
        const fields = existingForm.getFields();

        let restoredFromMetadata = false;
        try {
          const keywords = existingDoc.getKeywords();
          if (keywords) {
            const stored = JSON.parse(keywords) as PlacedField[];
            if (Array.isArray(stored) && stored.length > 0) {
              setPlacedFields(stored);
              setIsDirty(false);
              restoredFromMetadata = true;
            }
          }
        } catch { /* fall through */ }

        if (!restoredFromMetadata && fields.length > 0) {
          const reconstructed: PlacedField[] = [];
          for (const field of fields) {
            try {
              const fieldName = field.getName();
              const widgets = field.acroField.getWidgets();
              if (!widgets.length) continue;
              const widget = widgets[0];
              const rect = widget.getRectangle();

              let pageIndex = 0;
              try {
                const widgetPageRef = widget.P();
                pageIndex = existingPdfPages.findIndex(
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (p: any) => p.ref === widgetPageRef
                );
                if (pageIndex < 0) pageIndex = 0;
              } catch { pageIndex = 0; }

              const dim = dims[pageIndex];
              const rd = rendered[pageIndex];
              if (!dim || !rd) continue;

              const sx = rd.width  / dim.width;
              const sy = rd.height / dim.height;
              const canvasX = rect.x * sx;
              const canvasY = (dim.height - rect.y - rect.height) * sy;
              const canvasW = rect.width  * sx;
              const canvasH = rect.height * sy;

              let fontSize = 10;
              try {
                const da = field.acroField.getDefaultAppearance?.() ?? "";
                const fsMatch = da.match(/(\d+(?:\.\d+)?)\s+Tf/);
                if (fsMatch) fontSize = parseFloat(fsMatch[1]);
              } catch { /* use default */ }

              let textAlign: TextAlign = "left";
              try {
                const qVal = field.acroField.dict.get(window.PDFLib.PDFName.of("Q"))
                          ?? widget.dict.get(window.PDFLib.PDFName.of("Q"));
                if (qVal) {
                  const q = (qVal as { asNumber?: () => number }).asNumber?.() ?? 0;
                  textAlign = q === 1 ? "center" : q === 2 ? "right" : "left";
                }
              } catch { /* use default */ }

              reconstructed.push({
                id: `${fieldName}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                name: fieldName,
                page: pageIndex,
                x: canvasX, y: canvasY,
                width: canvasW, height: canvasH,
                fontSize,
                indentLeft: 0, indentRight: 0, indentTop: 0,
                textAlign,
              });
            } catch (fieldErr) {
              console.warn("Could not reconstruct field:", fieldErr);
            }
          }
          if (reconstructed.length > 0) {
            setPlacedFields(reconstructed);
            setIsDirty(false);
          }
        }
      } catch (parseErr) {
        console.warn("Could not parse existing AcroForm fields:", parseErr);
      }
    } catch (err) {
      console.error("Failed to load template:", err);
      setLoading(false);
    }
  }, [supabase, renderAllPages, fetchTemplateBytes]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    pdfFileRef.current = file; setPdfFile(file); resetEditor();
    if (supabase && activeTemplate) {
      const { error: uploadError } = await supabase.storage.from(bucketName).upload(activeTemplate, file, { upsert: true, contentType: "application/pdf" });
      if (uploadError) {
        setSaveStatus({ type: "error", message: `Upload failed: ${uploadError.message}` });
      } else { fetchTemplates(); }
    }
    await renderAllPages(file);
  };

  const deleteTemplate = async (name: string) => {
    if (!supabase) return;
    await supabase.storage.from(bucketName).remove([name]);
    if (activeTemplate === name) { setActiveTemplate(null); setActiveTemplateType(null); setPdfFile(null); setPages([]); pdfFileRef.current = null; resetEditor(); }
    setDeleteConfirm(null); fetchTemplates();
  };

  const renameTemplate = async (oldName: string, newBase: string) => {
    if (!supabase) return;
    const type = detectTemplateType(oldName);
    const newName = applyPrefix(type, newBase);
    try {
      const bytes = await fetchTemplateBytes(oldName);
      await supabase.storage.from(bucketName).upload(newName, bytes, { upsert: false, contentType: "application/pdf" });
      await supabase.storage.from(bucketName).remove([oldName]);
      if (activeTemplate === oldName) { setActiveTemplate(newName); setActiveTemplateType(type); }
    } catch (err) { console.error("Rename failed:", err); }
    finally { setRenameTarget(null); fetchTemplates(); }
  };

  const confirmNewTemplate = () => {
    const name = newTemplateName.trim(); if (!name) return;
    const finalName = applyPrefix(templateType, name);
    guardedSwitch(() => {
      setActiveTemplate(finalName);
      setActiveTemplateType(templateType);
      setPdfFile(null); setPages([]);
      pdfFileRef.current = null; resetEditor();
      setCreatingNew(false); setNewTemplateName("");
    });
  };

  // ── Zoom ──────────────────────────────────────────────────────────────────────
  const zoomToPage = useCallback((newIndex: number) => {
    const prev = ZOOM_STEPS[zoomIndex], next = ZOOM_STEPS[newIndex];
    setZoomIndex(newIndex);
    setTimeout(() => {
      const el = canvasScrollRef.current; if (!el) return;
      el.scrollLeft = el.scrollLeft * (next / prev);
      el.scrollTop = el.scrollTop * (next / prev);
    }, 0);
  }, [zoomIndex]);

  // ── Placement ─────────────────────────────────────────────────────────────────
  const screenToPdf = useCallback((sx: number, sy: number) => {
    if (!overlayRef.current) return { x: 0, y: 0 };
    const rect = overlayRef.current.getBoundingClientRect();
    const x = (sx - rect.left) / zoom, y = (sy - rect.top) / zoom;
    return snapEnabled ? { x: snap(x), y: snap(y) } : { x, y };
  }, [zoom, snapEnabled]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedField) return;
    const { x, y } = screenToPdf(e.clientX, e.clientY);
    setFieldsWithHistory(prev => [...prev, {
      id: `${selectedField}_${Date.now()}`, name: selectedField, page: currentPage,
      x, y, width: snapEnabled ? snap(120) : 120, height: snapEnabled ? snap(18) : 18,
      fontSize: globalFontSize, indentLeft: 0, indentRight: 0,
      indentTop: 0, textAlign: globalTextAlign,
    }]);
    setSelectedField(null);
    setGhostPos(null);
  };

  const handleOverlayMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedField) { if (ghostPos) setGhostPos(null); return; }
    const { x, y } = screenToPdf(e.clientX, e.clientY);
    setGhostPos({ x, y });
  };

  const handleOverlayMouseLeave = () => { setGhostPos(null); };

  const pendingDragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const DRAG_THRESHOLD = 4;

  const handleFieldMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setIsInteractingWithField(true);
    setActiveFieldId(id);
    setInspectorAnchorRect(null); // clear sidebar-based anchor; popover won't show for canvas clicks
    const f = placedFields.find(f => f.id === id); if (!f) return;
    dragStartSnapshot.current = placedFields;
    pendingDragRef.current = { id, startX: e.clientX, startY: e.clientY, origX: f.x, origY: f.y };
  };

  const handleResizeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setIsInteractingWithField(true);
    resizeStartSnapshot.current = placedFields;
    const f = placedFields.find(f => f.id === id); if (!f) return;
    setResizing({ id, startX: e.clientX, startY: e.clientY, origW: f.width, origH: f.height });
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (pendingDragRef.current && !dragging) {
        const pd = pendingDragRef.current;
        if (Math.hypot(e.clientX - pd.startX, e.clientY - pd.startY) > DRAG_THRESHOLD) {
          setDragging({ id: pd.id, startX: pd.startX, startY: pd.startY, origX: pd.origX, origY: pd.origY });
          pendingDragRef.current = null;
        }
      }
      if (dragging) {
        const dx = (e.clientX - dragging.startX) / zoom, dy = (e.clientY - dragging.startY) / zoom;
        setPlacedFields(prev => prev.map(f => f.id === dragging.id ? {
          ...f,
          x: snapEnabled ? snap(dragging.origX + dx) : dragging.origX + dx,
          y: snapEnabled ? snap(dragging.origY + dy) : dragging.origY + dy,
        } : f));
      }
      if (resizing) {
        const dw = (e.clientX - resizing.startX) / zoom, dh = (e.clientY - resizing.startY) / zoom;
        setPlacedFields(prev => prev.map(f => f.id === resizing.id ? {
          ...f,
          width: snapEnabled ? snap(Math.max(40, resizing.origW + dw)) : Math.max(40, resizing.origW + dw),
          height: snapEnabled ? snap(Math.max(12, resizing.origH + dh)) : Math.max(12, resizing.origH + dh),
        } : f));
      }
    };
    const onUp = () => {
      pendingDragRef.current = null;
      setIsInteractingWithField(false);
      if (dragging && dragStartSnapshot.current) { pushHistory(dragStartSnapshot.current); setIsDirty(true); dragStartSnapshot.current = null; }
      if (resizing && resizeStartSnapshot.current) { pushHistory(resizeStartSnapshot.current); setIsDirty(true); resizeStartSnapshot.current = null; }
      setDragging(null); setResizing(null);
    };
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging, resizing, zoom, snapEnabled, pushHistory]);

  const updateField = (id: string, patch: Partial<PlacedField>) => {
    pushHistory(placedFields);
    setPlacedFields(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
    setIsDirty(true);
  };

  const removeField = (id: string) => {
    setFieldsWithHistory(prev => prev.filter(f => f.id !== id));
    if (activeFieldId === id) setActiveFieldId(null);
  };

  const resetPage = () => {
    setFieldsWithHistory(prev => prev.filter(f => f.page !== currentPage));
    setActiveFieldId(null);
  };

  const jumpToIncomplete = () => {
    for (let i = 0; i < FIELD_GROUPS.length; i++) {
      const group = FIELD_GROUPS[i];
      const placed = group.fields.filter(f => placedFieldNames.has(f.name)).length;
      if (placed < group.fields.length) { setCurrentPage(i); return; }
    }
  };

  // ── Save ──────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    const file = pdfFileRef.current; if (!file || !activeTemplate) return;
    await waitForLib(() => !!window.PDFLib);
    setSaving(true); setSaveStatus(null);
    try {
      const { PDFDocument, rgb } = window.PDFLib;
      const pdfDoc = await PDFDocument.load(await file.arrayBuffer());
      const pdfPages = pdfDoc.getPages(), form = pdfDoc.getForm();

      try {
        const existingFields = form.getFields();
        for (const f of existingFields) {
          try { form.removeField(f); } catch { /* ignore */ }
        }
      } catch { /* no fields yet */ }

      for (const field of placedFields) {
        const page = pdfPages[field.page], pd = pages[field.page];
        if (!page || !pd) continue;
        const sx = pageDimensions[field.page].width / pd.width, sy = pageDimensions[field.page].height / pd.height;
        try {
          const tf = form.createTextField(field.name);
          tf.addToPage(page, {
            x: (field.x + field.indentLeft) * sx,
            y: pageDimensions[field.page].height - (field.y + field.height) * sy,
            width: Math.max(10, field.width - field.indentLeft - field.indentRight) * sx,
            height: field.height * sy,
            borderWidth: 0, backgroundColor: rgb(1, 1, 1), textColor: rgb(0, 0, 0),
          });
          tf.setFontSize(field.fontSize);
          try {
            const alignMap: Record<string, number> = { left: 0, center: 1, right: 2 };
            tf.acroField.dict.set(window.PDFLib.PDFName.of("Q"), pdfDoc.context.obj(alignMap[field.textAlign] ?? 0));
          } catch { /* alignment optional */ }
          try {
            const w = tf.acroField.getWidgets()[0];
            if (w) w.dict.set(window.PDFLib.PDFName.of("MK"), pdfDoc.context.obj({}));
          } catch { /* appearance optional */ }
        } catch (fieldErr) { console.warn("Could not create field:", fieldErr); }
      }
      pdfDoc.setKeywords([JSON.stringify(placedFields)]);

      const blob = new Blob([await pdfDoc.save()], { type: "application/pdf" });
      if (supabase) {
        const { error } = await supabase.storage.from(bucketName).upload(activeTemplate, blob, { upsert: true, contentType: "application/pdf" });
        if (error) throw error;
        const now = new Date();
        setSaveStatus({ type: "success", message: "Template saved successfully." });
        setLastSavedAt(now); setIsDirty(false); fetchTemplates();
      } else {
        Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: activeTemplate }).click();
        setSaveStatus({ type: "success", message: "Downloaded!" }); setIsDirty(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred";
      setSaveStatus({ type: "error", message });
    } finally { setSaving(false); }
  }, [activeTemplate, pages, pageDimensions, placedFields, supabase, bucketName, fetchTemplates]);

  // ── Auto-dismiss save status ──────────────────────────────────────────────────
  useEffect(() => {
    if (!saveStatus) return;
    const t = setTimeout(() => setSaveStatus(null), 5000);
    return () => clearTimeout(t);
  }, [saveStatus]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────
  const placedFieldsRef = useRef(placedFields);
  const activeFieldIdRef = useRef(activeFieldId);
  const selectedFieldRef = useRef(selectedField);
  const activeTemplateRef = useRef(activeTemplate);
  const currentPageRef = useRef(currentPage);
  useEffect(() => { placedFieldsRef.current = placedFields; }, [placedFields]);
  useEffect(() => { activeFieldIdRef.current = activeFieldId; }, [activeFieldId]);
  useEffect(() => { selectedFieldRef.current = selectedField; }, [selectedField]);
  useEffect(() => { activeTemplateRef.current = activeTemplate; }, [activeTemplate]);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        const pageFields = placedFieldsRef.current.filter(f => f.page === currentPageRef.current);
        if (!pageFields.length) return;
        const idx = pageFields.findIndex(f => f.id === activeFieldIdRef.current);
        const next = pageFields[(idx + 1) % pageFields.length];
        setActiveFieldId(next.id); return;
      }
      if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        const pageFields = placedFieldsRef.current.filter(f => f.page === currentPageRef.current);
        if (!pageFields.length) return;
        const idx = pageFields.findIndex(f => f.id === activeFieldIdRef.current);
        const prev = pageFields[(idx - 1 + pageFields.length) % pageFields.length];
        setActiveFieldId(prev.id); return;
      }
      if (e.key === "Escape") {
        if (selectedFieldRef.current) { setSelectedField(null); setGhostPos(null); return; }
        if (activeFieldIdRef.current) { setActiveFieldId(null); return; }
      }
      if ((e.key === "Delete" || e.key === "Backspace") && activeFieldIdRef.current) {
        e.preventDefault();
        const id = activeFieldIdRef.current;
        setFieldsWithHistory(prev => prev.filter(f => f.id !== id));
        setActiveFieldId(null); return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "z") { e.preventDefault(); undo(); return; }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (placedFieldsRef.current.length > 0 && activeTemplateRef.current) handleSave();
        return;
      }
      if (activeFieldIdRef.current && ["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) {
        e.preventDefault();
        const dist = e.shiftKey ? NUDGE * 8 : NUDGE;
        const dx = e.key === "ArrowLeft" ? -dist : e.key === "ArrowRight" ? dist : 0;
        const dy = e.key === "ArrowUp" ? -dist : e.key === "ArrowDown" ? dist : 0;
        const id = activeFieldIdRef.current;
        setFieldsWithHistory(prev => prev.map(f => f.id === id ? { ...f, x: f.x + dx, y: f.y + dy } : f));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, setFieldsWithHistory, handleSave]);

  // ── Auto-scroll sidebar to active field ──────────────────────────────────────
  useEffect(() => {
    if (!activeFieldId) return;
    const field = placedFields.find(f => f.id === activeFieldId);
    if (!field || !sidebarBodyRef.current) return;
    const row = sidebarBodyRef.current.querySelector<HTMLElement>(`[data-field-name="${field.name}"]`);
    if (row) row.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [activeFieldId]); // eslint-disable-line react-hooks/exhaustive-deps

  const SIDEBAR_W = sidebarOpen ? 280 : 0;

  const ghostWidth = snapEnabled ? snap(120) : 120;
  const ghostHeight = snapEnabled ? snap(18) : 18;
  const ghostGroup = selectedField ? getGroupForField(selectedField) : null;
  const ghostFieldDef = selectedField ? ALL_FIELDS.find(f => f.name === selectedField) : null;

  const saveButtonLabel = () => {
    if (saving) return <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</>;
    if (placedFields.length === 0) return <><Save className="w-3.5 h-3.5" />Save</>;
    if (isDirty) return <><Save className="w-3.5 h-3.5" />Save changes</>;
    return <><Check className="w-3.5 h-3.5 text-emerald-500" />Up to date</>;
  };

  const canvasHoveredFieldName = hoveredCanvasFieldId
    ? (placedFields.find(f => f.id === hoveredCanvasFieldId)?.name ?? null)
    : null;

  // Displayed name for active template (strip prefix)
  const activeTemplateDisplayName = activeTemplate ? stripPrefix(activeTemplate).replace(".pdf", "") : null;

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className="h-full relative text-foreground select-none overflow-hidden"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 23px, hsl(var(--border)/0.35) 23px, hsl(var(--border)/0.35) 24px), repeating-linear-gradient(90deg, transparent, transparent 23px, hsl(var(--border)/0.35) 23px, hsl(var(--border)/0.35) 24px), hsl(var(--muted)/0.25)",
        }}
        onClick={() => { if (!selectedField && !isInteractingWithField) setActiveFieldId(null); }}
      >
        {/* ── Modals ───────────────────────────────────────────────────────── */}
        {pendingSwitch && (
          <UnsavedDialog
            onConfirm={() => { const fn = pendingSwitch!; setPendingSwitch(null); fn(); }}
            onCancel={() => setPendingSwitch(null)}
          />
        )}
        {showNavGuard && (
          <NavGuardDialog
            onConfirm={() => { setShowNavGuard(false); setIsDirty(false); if (navGuardTarget) window.location.href = navGuardTarget; }}
            onCancel={() => { setShowNavGuard(false); setNavGuardTarget(null); }}
          />
        )}
        {showShortcuts && <ShortcutsPanel onClose={() => setShowShortcuts(false)} />}
        {showPreview && pages.length > 0 && (
          <PreviewModal pages={pages} placedFields={placedFields} fieldGroups={FIELD_GROUPS} onClose={() => setShowPreview(false)} />
        )}
        {renameTarget && (
          <RenameDialog
            current={renameTarget}
            onConfirm={(n) => renameTemplate(renameTarget, n)}
            onCancel={() => setRenameTarget(null)}
          />
        )}

        {saveStatus && <Toast status={saveStatus} onDismiss={() => setSaveStatus(null)} />}

        {/* ══ SIDEBAR TOGGLE ═══════════════════════════════════════════════════ */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={e => { e.stopPropagation(); setSidebarOpen(o => !o); }}
              className="absolute top-6 z-40 w-8 h-8 rounded-xl bg-background/95 backdrop-blur-md border border-border/80 shadow-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              style={{ left: sidebarOpen ? "calc(24px + 264px + 8px)" : "24px", transition: "left 0.2s ease" }}
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">{sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}</TooltipContent>
        </Tooltip>

        {/* ══ FLOATING SIDEBAR ══════════════════════════════════════════════════ */}
        <aside
          className={cn(
            "absolute top-6 left-6 bottom-6 z-30 w-64 flex flex-col bg-background/95 backdrop-blur-md border border-border/80 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200",
            sidebarOpen ? "opacity-100 pointer-events-auto translate-x-0" : "opacity-0 pointer-events-none -translate-x-4"
          )}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/60 shrink-0">
            <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center shrink-0">
              <LayoutTemplate className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold leading-tight">Template Fields</p>
              <p className="text-[10px] text-muted-foreground">CAV Builder</p>
            </div>
            {totalPlaced > 0 && (
              <div className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tabular-nums border transition-all",
                progress === 100
                  ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-muted border-border text-muted-foreground"
              )}>
                {progress === 100 && <Sparkles className="w-2.5 h-2.5" />}
                {progress}%
              </div>
            )}
          </div>

          {/* Scrollable body */}
          <div ref={sidebarBodyRef} className="flex-1 overflow-y-auto min-h-0 py-3 space-y-4">

            {/* ── Template Type Toggle ── */}
            <div className="px-3">
              <SectionLabel>Template Type</SectionLabel>
              <TemplateTypeToggle value={templateType} onChange={handleTemplateTypeChange} />
              <p className="mt-1.5 text-[10px] text-muted-foreground/60 flex items-center gap-1">
                <Filter className="w-2.5 h-2.5 shrink-0" />
                {templateType === "jhs"
                  ? "Showing JHS templates only"
                  : "Showing K–12 templates (includes LRN)"}
              </p>
            </div>

            {/* ── Type mismatch warning ── */}
            {showTypeMismatch && (
              <TypeMismatchBanner
                currentType={templateType}
                fileType={activeTemplateType!}
                onDismiss={() => setTypeMismatchDismissed(true)}
              />
            )}

            {/* Templates section */}
            <div>
              <button
                onClick={() => setTemplatesPanelOpen(o => !o)}
                className="w-full flex items-center justify-between px-3 py-1 hover:bg-muted/50 rounded-md transition-colors mb-1"
              >
                <SectionLabel className="mb-0">
                  Templates
                  {filteredTemplates.length > 0 && (
                    <span className="ml-1.5 text-muted-foreground/80 normal-case tracking-normal font-normal">
                      ({filteredTemplates.length})
                    </span>
                  )}
                </SectionLabel>
                <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground/60 transition-transform duration-200 mr-1", !templatesPanelOpen && "-rotate-90")} />
              </button>

              {templatesPanelOpen && (
                <div className="px-2 space-y-0.5">
                  {!creatingNew ? (
                    <button
                      onClick={() => { setCreatingNew(true); setTimeout(() => newNameRef.current?.focus(), 50); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-dashed border-border/60 hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New {templateType.toUpperCase()} template…</span>
                      <TypeBadge type={templateType} />
                    </button>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-muted/30 border border-border">
                        <TypeBadge type={templateType} />
                        <span className="text-[9px] text-muted-foreground">prefix auto-applied</span>
                      </div>
                      <div className="flex items-center gap-1 p-1 bg-muted/40 rounded-lg border border-border">
                        <input
                          ref={newNameRef} value={newTemplateName}
                          onChange={e => setNewTemplateName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") confirmNewTemplate();
                            if (e.key === "Escape") { setCreatingNew(false); setNewTemplateName(""); }
                          }}
                          placeholder="template-name" autoFocus
                          className="flex-1 text-[11px] bg-transparent px-2 py-1 outline-none min-w-0 text-foreground placeholder:text-muted-foreground"
                        />
                        <button onClick={confirmNewTemplate} className="w-6 h-6 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        </button>
                        <button onClick={() => { setCreatingNew(false); setNewTemplateName(""); }} className="w-6 h-6 rounded-md hover:bg-muted flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  )}

                  {templatesLoading && <TemplateSkeleton />}

                  {!templatesLoading && templatesError && (
                    <div className="px-3 py-3 rounded-lg bg-destructive/8 border border-destructive/20 space-y-1.5">
                      <div className="flex items-center gap-2 text-destructive">
                        <WifiOff className="w-3.5 h-3.5 shrink-0" />
                        <p className="text-[11px] font-medium">Could not load templates</p>
                      </div>
                      <button onClick={fetchTemplates} className="text-[10px] text-primary hover:underline">Retry</button>
                    </div>
                  )}

                  {!templatesLoading && !templatesError && filteredTemplates.length === 0 && (
                    <div className="px-3 py-4 rounded-lg border border-dashed border-border/50 text-center space-y-1.5">
                      <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center mx-auto">
                        {templateType === "jhs" ? <BookOpen className="w-4 h-4 text-muted-foreground/40" /> : <GraduationCap className="w-4 h-4 text-muted-foreground/40" />}
                      </div>
                      <p className="text-[10px] text-muted-foreground">No {templateType.toUpperCase()} templates yet</p>
                      <p className="text-[9px] text-muted-foreground/50">Create one using the button above</p>
                    </div>
                  )}

                  {!templatesLoading && !templatesError && filteredTemplates.map(t => (
                    <div
                      key={t.name}
                      className={cn("group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-all",
                        activeTemplate === t.name ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                      )}
                      onClick={() => guardedSwitch(() => loadTemplate(t.name))}
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0 opacity-60" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium truncate">{stripPrefix(t.name).replace(".pdf", "")}</p>
                        {t.updatedAt && (
                          <p className="text-[9px] text-muted-foreground/60">{formatRelativeTime(t.updatedAt)}</p>
                        )}
                      </div>
                      {activeTemplate === t.name && isDirty && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 animate-pulse" />
                          </TooltipTrigger>
                          <TooltipContent side="right">Unsaved changes</TooltipContent>
                        </Tooltip>
                      )}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button onClick={e => { e.stopPropagation(); setRenameTarget(t.name); }}
                              className="w-6 h-6 rounded flex items-center justify-center hover:bg-background/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                              <Pencil className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="right">Rename</TooltipContent>
                        </Tooltip>
                        {deleteConfirm === t.name ? (
                          <>
                            <button onClick={e => { e.stopPropagation(); deleteTemplate(t.name); }}
                              className="w-6 h-6 rounded flex items-center justify-center bg-destructive/15 hover:bg-destructive/25 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                              <Check className="w-3 h-3 text-destructive" />
                            </button>
                            <button onClick={e => { e.stopPropagation(); setDeleteConfirm(null); }}
                              className="w-6 h-6 rounded flex items-center justify-center hover:bg-background/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                              <X className="w-3 h-3 text-muted-foreground" />
                            </button>
                          </>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button onClick={e => { e.stopPropagation(); setDeleteConfirm(t.name); }}
                                className="w-6 h-6 rounded flex items-center justify-center hover:bg-destructive/15 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                                <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="right">Delete</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Show count of templates from other type if any exist */}
                  {!templatesLoading && !templatesError && (() => {
                    const otherType: TemplateType = templateType === "jhs" ? "k12" : "jhs";
                    const otherCount = allTemplates.filter(t => t.templateType === otherType).length;
                    if (otherCount === 0) return null;
                    return (
                      <button
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                        onClick={() => handleTemplateTypeChange(otherType)}
                      >
                        <Info className="w-3 h-3 shrink-0" />
                        {otherCount} {otherType.toUpperCase()} template{otherCount !== 1 ? "s" : ""} hidden — switch to view
                      </button>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* PDF Source */}
            {activeTemplate && (
              <div className="px-3 space-y-1.5">
                <SectionLabel>PDF Source</SectionLabel>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={cn("w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[11px] font-medium border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    pdfFile ? "bg-muted/40 border-border text-foreground hover:bg-muted" : "bg-primary/5 border-dashed border-primary/40 text-primary hover:bg-primary/10"
                  )}>
                  <Upload className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate text-left">{pdfFile ? pdfFile.name : "Upload blank PDF…"}</span>
                </button>
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />
                {pages.length > FIELD_GROUPS.length && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <p className="text-[10px] leading-snug">
                      PDF has {pages.length} pages but only {FIELD_GROUPS.length} field groups are defined.
                    </p>
                  </div>
                )}
              </div>
            )}

            {!activeTemplate && (
              <div className="mx-3 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center space-y-2">
                <FolderOpen className="w-6 h-6 text-muted-foreground/40 mx-auto" />
                <p className="text-[11px] text-muted-foreground">Select or create a template to begin</p>
              </div>
            )}

            {/* ── Placement mode callout ── */}
            {selectedField && (
              <div className="mx-3 rounded-xl bg-primary text-primary-foreground p-3 flex items-start gap-3 shadow-lg shadow-primary/20">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Crosshair className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-widest opacity-70 mb-0.5">Placement mode</p>
                  <p className="text-[12px] font-semibold leading-tight truncate">{ALL_FIELDS.find(f => f.name === selectedField)?.label}</p>
                  <p className="text-[10px] opacity-60 mt-0.5">Click on the canvas · Esc to cancel</p>
                </div>
                <button
                  onClick={() => { setSelectedField(null); setGhostPos(null); }}
                  className="w-6 h-6 rounded-md bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Global defaults */}
            {activeTemplate && pdfFile && !selectedField && (
              <div className="px-3">
                <SectionLabel>Defaults for new fields</SectionLabel>
                <div className="px-3 py-2.5 rounded-lg bg-muted/20 border border-border space-y-2.5">
                  <InspectorRow label="Font size">
                    <Stepper value={globalFontSize} min={6} max={12} onChange={setGlobalFontSize} />
                  </InspectorRow>
                  <InspectorRow label="Text align">
                    <AlignButtons value={globalTextAlign} onChange={setGlobalTextAlign} />
                  </InspectorRow>
                </div>
              </div>
            )}

            {/* Fields by page */}
            <div className="space-y-1 px-3">
              <div className="flex items-center gap-1 mb-1">
                <div className="flex-1"><SectionLabel className="mb-0">Fields by page</SectionLabel></div>
                {progress < 100 && totalPlaced > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={jumpToIncomplete}
                        className="flex items-center gap-1 text-[9px] text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                      >
                        <ArrowRight className="w-3 h-3" />Next incomplete
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Jump to next page with missing fields</TooltipContent>
                  </Tooltip>
                )}
              </div>
              {FIELD_GROUPS.map((group, gi) => {
                const isExpanded = expandedGroups[gi] !== false;
                const placedCount = group.fields.filter(f => placedFieldNames.has(f.name)).length;
                const isComplete = placedCount === group.fields.length;
                const isCurrent = gi === currentPage;
                const showFields = isExpanded;
                return (
                  <div key={gi} className={cn("rounded-lg border overflow-hidden transition-all", isCurrent ? "border-border shadow-sm" : "border-border/60")}>
                    <button
                      onClick={() => {
                        setExpandedGroups(prev => ({ ...prev, [gi]: !isExpanded }));
                        setCurrentPage(gi);
                      }}
                      className={cn("w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset", isCurrent ? "bg-muted/60" : "bg-muted/30 hover:bg-muted/50")}
                    >
                      <div className={cn("w-2 h-2 rounded-full shrink-0 transition-colors", isComplete ? "bg-emerald-500" : group.dot)} />
                      <div className="flex-1 min-w-0 text-left">
                        <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wider">Page {gi + 1}</span>
                        <p className="text-[11px] font-semibold leading-tight">{group.label}</p>
                      </div>
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 tabular-nums",
                        isComplete ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : group.pill)}>
                        {placedCount}/{group.fields.length}
                      </span>
                      <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-200 shrink-0", !isExpanded && "-rotate-90")} />
                    </button>
                    {showFields && (
                      <div className="py-1 divide-y divide-border/40">
                        {group.fields.map(field => {
                          const isPlaced = placedFieldNames.has(field.name);
                          const isSelecting = selectedField === field.name;
                          const instance = placedFields.find(f => f.name === field.name);
                          const isActiveInCanvas = instance?.id === activeFieldId;
                          const isHovered = hoveredFieldName === field.name || canvasHoveredFieldName === field.name;
                          return (
                            <div key={field.name} data-field-name={field.name}>
                              <button
                                onMouseEnter={() => setHoveredFieldName(field.name)}
                                onMouseLeave={() => setHoveredFieldName(null)}
                                onClick={(e) => {
                                  if (isPlaced && instance) {
                                    if (isActiveInCanvas) {
                                      setActiveFieldId(null);
                                      setInspectorAnchorRect(null);
                                    } else {
                                      setActiveFieldId(instance.id);
                                      setCurrentPage(instance.page);
                                      setInspectorAnchorRect((e.currentTarget as HTMLElement).getBoundingClientRect());
                                    }
                                  } else {
                                    if (!pdfFile) return;
                                    setSelectedField(isSelecting ? null : field.name);
                                  }
                                }}
                                className={cn("w-full flex items-center gap-2 px-3 py-2 text-[11px] text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                                  isPlaced && isActiveInCanvas ? "bg-primary/10 text-primary font-medium"
                                  : isPlaced && isHovered ? cn("text-foreground", group.hoverBg)
                                  : isPlaced ? cn("text-muted-foreground", group.hoverBg)
                                  : isSelecting ? cn("font-medium", group.activeBg, group.activeText)
                                  : !pdfFile ? "opacity-30 cursor-not-allowed text-muted-foreground"
                                  : cn("text-foreground", group.hoverBg)
                                )}
                              >
                                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 transition-colors",
                                  isPlaced ? "bg-emerald-500" : isSelecting ? group.dot : "bg-muted-foreground/30")} />
                                <span className="flex-1 truncate">{field.label}</span>
                                {isPlaced && <CheckSquare className={cn("w-3.5 h-3.5 shrink-0", isActiveInCanvas ? "text-primary" : "text-emerald-500/70")} />}
                                {isSelecting && !isPlaced && <MousePointer className={cn("w-3.5 h-3.5 shrink-0", group.activeText)} />}
                                {!isPlaced && !isSelecting && pdfFile && <Chevron className="w-3 h-3 shrink-0 text-muted-foreground/30" />}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sidebar footer */}
          <div className="shrink-0 border-t border-border/60 bg-background px-3 py-3 space-y-2.5">
            {/* Active template display */}
            {activeTemplate && (
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/30 border border-border/50">
                <FileText className="w-3 h-3 text-muted-foreground/50 shrink-0" />
                <span className="flex-1 text-[10px] text-muted-foreground truncate min-w-0">{activeTemplateDisplayName}</span>
                <TypeBadge type={activeTemplateType ?? templateType} />
                {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />}
              </div>
            )}

            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground tabular-nums">{totalPlaced} / {totalFields} fields</span>
                <div className="flex items-center gap-2">
                  {lastSavedAt && (
                    <span className="flex items-center gap-1 text-muted-foreground/60">
                      <Clock className="w-2.5 h-2.5" />
                      {formatTime(lastSavedAt)}
                    </span>
                  )}
                  <span className={cn("font-mono font-bold tabular-nums", progress === 100 ? "text-emerald-500" : "text-foreground")}>{progress}%</span>
                </div>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", progress === 100 ? "bg-emerald-500" : "bg-primary")}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline" size="icon"
                    className="h-9 w-9 shrink-0 focus-visible:ring-2 focus-visible:ring-primary"
                    disabled={!canUndo}
                    onClick={undo}
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Undo (Ctrl+Z){canUndo ? ` · ${history.length} step${history.length !== 1 ? "s" : ""}` : ""}</TooltipContent>
              </Tooltip>
              <Button
                className={cn(
                  "flex-1 h-9 text-xs font-semibold gap-1.5 focus-visible:ring-2 focus-visible:ring-primary transition-all",
                  isDirty && placedFields.length > 0 && !saving && "ring-2 ring-amber-400/50 ring-offset-1 ring-offset-background"
                )}
                disabled={placedFields.length === 0 || saving || !activeTemplate}
                onClick={handleSave}
              >
                {saveButtonLabel()}
              </Button>
            </div>
          </div>
        </aside>

        {/* ══ PAGE TABS ════════════════════════════════════════════════════════ */}
        {pages.length > 0 && (
          <div
            className="absolute top-6 z-30 flex items-center gap-1 bg-background/95 backdrop-blur-md border border-border/80 rounded-xl px-1.5 py-1 shadow-lg"
            style={{ left: "50%", transform: "translateX(-50%)" }}
            onClick={e => e.stopPropagation()}
          >
            <button
              className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage(p => p - 1)}
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            {FIELD_GROUPS.map((group, i) => {
              if (i >= pages.length) return null;
              const placed = placedFields.filter(f => f.page === i).length;
              const total = group.fields.length;
              const done = placed === total;
              const active = i === currentPage;
              return (
                <button key={i} onClick={() => setCurrentPage(i)}
                  className={cn("flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    active ? "bg-muted border border-border text-foreground" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  )}>
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0 transition-colors", done ? "bg-emerald-500" : group.dot)} />
                  <span>{group.shortLabel}</span>
                  <span className={cn("text-[9px] font-bold tabular-nums", done ? "text-emerald-500" : "text-muted-foreground/70")}>{placed}/{total}</span>
                </button>
              );
            })}
            <button
              className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              disabled={currentPage >= pages.length - 1}
              onClick={() => setCurrentPage(p => p + 1)}
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ══ CONTROLS — top right ══════════════════════════════════════════════ */}
        <div
          className="absolute top-6 right-6 z-30 flex items-center gap-1 bg-background/95 backdrop-blur-md border border-border/80 rounded-xl px-1.5 py-1 shadow-lg"
          onClick={e => e.stopPropagation()}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => setShowPreview(true)} disabled={pages.length === 0}
                className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <Eye className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Preview placement</TooltipContent>
          </Tooltip>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => setSnapEnabled(s => !s)}
                className={cn("w-7 h-7 rounded-md flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  snapEnabled ? "text-primary bg-primary/10" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                <Grid3x3 className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">{snapEnabled ? "Snap ON — 8 px grid" : "Snap OFF — free position"}</TooltipContent>
          </Tooltip>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => zoomToPage(Math.max(0, zoomIndex - 1))} disabled={zoomIndex === 0}
                className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Zoom out</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => zoomToPage(2)}
                className="px-1.5 text-[10px] font-mono font-bold text-muted-foreground hover:text-primary transition-colors tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded min-w-9 text-center">
                {Math.round(zoom * 100)}%
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Reset to 100%</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => zoomToPage(Math.min(ZOOM_STEPS.length - 1, zoomIndex + 1))} disabled={zoomIndex === ZOOM_STEPS.length - 1}
                className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Zoom in</TooltipContent>
          </Tooltip>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={resetPage} disabled={currentPageFields.length === 0}
                className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Clear this page's fields</TooltipContent>
          </Tooltip>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => setShowShortcuts(true)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <Keyboard className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Keyboard shortcuts (?)</TooltipContent>
          </Tooltip>
        </div>

        {/* ══ PDF CANVAS ════════════════════════════════════════════════════════ */}
        <div className="absolute inset-0 flex pointer-events-none">
          <div style={{ width: SIDEBAR_W + 48, transition: "width 0.2s ease" }} className="shrink-0" />
          <div
            ref={canvasScrollRef}
            className="flex-1 overflow-auto flex items-center justify-center pt-16 pb-6 pr-6 pointer-events-auto"
            onClick={() => { if (!selectedField && !isInteractingWithField) setActiveFieldId(null); }}
          >
            {loading && (
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-14 h-14 rounded-2xl bg-background border border-border shadow flex items-center justify-center">
                  <Loader2 className="w-7 h-7 animate-spin text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">Loading PDF…</p>
              </div>
            )}

            {!activeTemplate && !loading && (
              <div className="flex flex-col items-center gap-5 text-center max-w-sm">
                <div className="w-20 h-20 rounded-3xl bg-background border-2 border-dashed border-border flex items-center justify-center">
                  <FolderOpen className="w-9 h-9 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="text-sm font-semibold">No template selected</p>
                  <p className="text-xs text-muted-foreground mt-1">Create or select a {templateType.toUpperCase()} template in the sidebar to get started</p>
                </div>
                {allTemplates.length > 0 && filteredTemplates.length === 0 && (
                  <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-amber-500/8 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-left">
                    <Info className="w-4 h-4 shrink-0 mt-0.5" />
                    <p className="text-xs">
                      You have {allTemplates.filter(t => t.templateType !== templateType).length} templates for {templateType === "jhs" ? "K–12" : "JHS"}.
                      Switch the template type in the sidebar to access them.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTemplate && !pdfFile && !loading && (
              <div className="flex flex-col items-center gap-5 cursor-pointer group"
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                <div className="w-32 h-32 rounded-3xl bg-background border-2 border-dashed border-border group-hover:border-primary group-hover:bg-primary/5 flex items-center justify-center transition-all duration-200">
                  <Upload className="w-12 h-12 text-muted-foreground/30 group-hover:text-primary/60 transition-colors" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold">Upload a blank PDF</p>
                  <p className="text-xs text-muted-foreground mt-1">for <span className="text-primary font-medium">{activeTemplateDisplayName}</span></p>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <TypeBadge type={activeTemplateType ?? templateType} />
                    <p className="text-xs text-muted-foreground opacity-60">Click anywhere above to browse</p>
                  </div>
                </div>
              </div>
            )}

            {currentPageData && !loading && (
              <div className="flex items-start justify-center w-full h-full">
                <div
                  style={{
                    transform: `scale(${zoom})`,
                    transformOrigin: "top center",
                    marginBottom: `${(zoom - 1) * currentPageData.height}px`,
                  }}
                  onClick={e => e.stopPropagation()}
                >
                  <div
                    className="relative"
                    style={{
                      width: currentPageData.width,
                      height: currentPageData.height,
                      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 20px 60px -10px rgba(0,0,0,0.2)",
                    }}
                  >
                    {snapEnabled && (
                      <div className="absolute inset-0 pointer-events-none z-10" style={{
                        opacity: 0.04,
                        backgroundImage: `repeating-linear-gradient(0deg,transparent,transparent ${SNAP_SIZE-1}px,currentColor ${SNAP_SIZE-1}px,currentColor ${SNAP_SIZE}px),repeating-linear-gradient(90deg,transparent,transparent ${SNAP_SIZE-1}px,currentColor ${SNAP_SIZE-1}px,currentColor ${SNAP_SIZE}px)`,
                      }} />
                    )}
                    <img
                      src={currentPageData.dataUrl}
                      alt={`Page ${currentPage + 1}`}
                      style={{ width: currentPageData.width, height: currentPageData.height, display: "block" }}
                      draggable={false}
                    />
                    <div
                      ref={overlayRef}
                      className={cn("absolute inset-0 z-20", selectedField ? "cursor-crosshair" : "cursor-default")}
                      onClick={handleCanvasClick}
                      onMouseMove={handleOverlayMouseMove}
                      onMouseLeave={handleOverlayMouseLeave}
                      tabIndex={-1}
                    >
                      {selectedField && (
                        <div className="absolute inset-0 bg-primary/4 ring-2 ring-primary/30 ring-inset pointer-events-none" />
                      )}

                      {/* Ghost field preview */}
                      {selectedField && ghostPos && (
                        <div
                          className="pointer-events-none absolute z-40"
                          style={{ left: ghostPos.x, top: ghostPos.y, width: ghostWidth, height: ghostHeight }}
                        >
                          <div
                            className={cn("absolute inset-0 border-2 border-dashed rounded-sm opacity-80", ghostGroup?.borderColor ?? "border-zinc-400")}
                            style={{ backgroundColor: "rgba(99,102,241,0.08)" }}
                          />
                          {snapEnabled && (
                            <>
                              <div className="absolute top-1/2 -translate-y-px left-full w-3 h-px bg-primary/20 pointer-events-none" />
                              <div className="absolute top-1/2 -translate-y-px right-full w-3 h-px bg-primary/20 pointer-events-none" />
                              <div className="absolute left-1/2 -translate-x-px top-full h-3 w-px bg-primary/20 pointer-events-none" />
                              <div className="absolute left-1/2 -translate-x-px bottom-full h-3 w-px bg-primary/20 pointer-events-none" />
                            </>
                          )}
                          {ghostFieldDef && (
                            <div className={cn(
                              "absolute -top-5 left-0 px-1.5 py-0.5 text-[8px] font-bold rounded-t whitespace-nowrap text-white shadow-sm flex items-center gap-1",
                              ghostGroup?.color ?? "bg-zinc-500"
                            )}>
                              {ghostFieldDef.label}
                              <span className="opacity-60">↓ click</span>
                            </div>
                          )}
                          <div className="absolute top-full left-0 mt-1 px-1.5 py-0.5 text-[8px] font-mono bg-black/70 text-white rounded whitespace-nowrap pointer-events-none">
                            {Math.round(ghostPos.x)}, {Math.round(ghostPos.y)}
                          </div>
                        </div>
                      )}

                      {/* Placed fields */}
                      {currentPageFields.map(field => {
                        const group = getGroupForField(field.name);
                        const fieldDef = ALL_FIELDS.find(f => f.name === field.name);
                        const isActive = field.id === activeFieldId;
                        const isHoveredFromSidebar = hoveredFieldName === field.name;
                        const labelVisible = zoom >= 0.75;
                        return (
                          <div
                            key={field.id}
                            role="button"
                            tabIndex={0}
                            aria-label={`${fieldDef?.label ?? field.name} field — press Enter to select`}
                            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveFieldId(field.id); } }}
                            onMouseEnter={() => setHoveredCanvasFieldId(field.id)}
                            onMouseLeave={() => setHoveredCanvasFieldId(null)}
                            className={cn("absolute group/field transition-shadow",
                              isActive
                                ? "border-2 border-primary z-30"
                                : isHoveredFromSidebar
                                  ? cn("border-2 border-solid z-20", group?.borderColor ?? "border-zinc-400")
                                  : cn("border border-dashed hover:border-solid hover:border-2 hover:z-20", group?.borderColor ?? "border-zinc-400")
                            )}
                            style={{
                              left: field.x + field.indentLeft,
                              top: field.y + field.indentTop,
                              width: Math.max(10, field.width - field.indentLeft - field.indentRight),
                              height: Math.max(8, field.height - field.indentTop),
                              cursor: dragging?.id === field.id ? "grabbing" : "grab",
                              backgroundColor: isActive
                                ? "hsl(var(--primary)/0.05)"
                                : isHoveredFromSidebar
                                  ? "rgba(99,102,241,0.06)"
                                  : "transparent",
                              boxShadow: isActive
                                ? "0 0 0 4px hsl(var(--primary)/0.15)"
                                : isHoveredFromSidebar
                                  ? "0 0 0 3px hsl(var(--primary)/0.10)"
                                  : undefined,
                              borderRadius: 1,
                              outline: isActive ? "none" : undefined,
                            }}
                            onMouseDown={e => handleFieldMouseDown(e, field.id)}
                            onClick={e => e.stopPropagation()}
                            onFocus={() => setActiveFieldId(field.id)}
                          >
                            {labelVisible && (
                              <div className={cn(
                                "absolute -top-5 left-0 px-1.5 py-0.5 text-[8px] font-bold rounded-t whitespace-nowrap pointer-events-none text-white shadow-sm transition-opacity flex items-center gap-1",
                                group?.color ?? "bg-zinc-500",
                                isActive || isHoveredFromSidebar ? "opacity-100" : "opacity-0 group-hover/field:opacity-100"
                              )}>
                                {fieldDef?.label ?? field.name}
                                <span className="opacity-70">{field.fontSize}pt</span>
                                {field.textAlign !== "left" && <span className="opacity-70">{field.textAlign === "center" ? "C" : "R"}</span>}
                              </div>
                            )}

                            <div className={cn("absolute inset-0 flex items-center overflow-hidden pointer-events-none px-0.5",
                              field.textAlign === "center" ? "justify-center" : field.textAlign === "right" ? "justify-end" : "justify-start")}>
                              {labelVisible ? (
                                <span className="truncate select-none" style={{ fontSize: Math.max(7, field.fontSize), lineHeight: 1, color: "rgba(0,0,0,0.45)", fontFamily: "Georgia, serif", fontStyle: "italic" }}>
                                  {fieldDef?.label ?? field.name}
                                </span>
                              ) : (
                                <div className={cn("w-1.5 h-1.5 rounded-full mx-auto", group?.dot ?? "bg-zinc-400")} />
                              )}
                            </div>

                            {/* Drag handle hint on active */}
                            {isActive && (
                              <div className="absolute top-0.5 left-1/2 -translate-x-1/2 pointer-events-none opacity-30">
                                <Move className="w-2.5 h-2.5 text-primary" />
                              </div>
                            )}

                            <button
                              className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover/field:opacity-100 transition-all scale-75 group-hover/field:scale-100 z-30 shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              onMouseDown={e => e.stopPropagation()}
                              onClick={e => { e.stopPropagation(); removeField(field.id); }}
                              aria-label={`Remove ${fieldDef?.label ?? field.name}`}
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>

                            <div
                              className={cn("absolute bottom-0 right-0 w-3 h-3 opacity-0 group-hover/field:opacity-60 hover:opacity-100! transition-opacity", group?.color ?? "bg-zinc-500")}
                              style={{ cursor: "se-resize" }}
                              onMouseDown={e => handleResizeMouseDown(e, field.id)}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {dragging && (
          <div className="fixed inset-0 z-50 pointer-events-none" style={{ cursor: "grabbing" }} />
        )}

        {/* ── Floating field inspector popover ─────────────────────────────── */}
        {(() => {
          const activeInstance = activeFieldId ? placedFields.find(f => f.id === activeFieldId) : null;
          if (!activeInstance) return null;
          return (
            <FieldInspectorPopover
              instance={activeInstance}
              anchorRect={inspectorAnchorRect}
              sidebarOpen={sidebarOpen}
              onUpdate={(patch) => updateField(activeInstance.id, patch)}
              onRemove={() => { removeField(activeInstance.id); setInspectorAnchorRect(null); }}
              onClose={() => { setActiveFieldId(null); setInspectorAnchorRect(null); }}
            />
          );
        })()}
      </div>
    </TooltipProvider>
  );
}