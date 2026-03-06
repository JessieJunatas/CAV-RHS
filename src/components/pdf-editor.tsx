import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
interface TemplateFile { name: string; updatedAt: string }
interface Props { supabase?: SupabaseClient; bucketName?: string }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global { interface Window { pdfjsLib: any; PDFLib: any } }

// ── Constants ──────────────────────────────────────────────────────────────────
const SNAP_SIZE = 8;
const ZOOM_STEPS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const NUDGE = 1;
const HISTORY_LIMIT = 50;
const snap = (v: number) => Math.round(v / SNAP_SIZE) * SNAP_SIZE;

// ── Field definitions ──────────────────────────────────────────────────────────
const FIELD_GROUPS: FieldGroup[] = [
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

const ALL_FIELDS = FIELD_GROUPS.flatMap((g) => g.fields.map((f) => ({ ...f, group: g })));
const getGroupForField = (name: string) => FIELD_GROUPS.find((g) => g.fields.some((f) => f.name === name));

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
function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// ── Small UI atoms ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60 select-none">
      {children}
    </p>
  );
}

function Stepper({ value, min, max, step = 1, onChange }: {
  value: number; min: number; max: number; step?: number; onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center rounded-lg border border-border overflow-hidden h-7">
      <button
        onClick={() => onChange(Math.max(min, value - step))}
        className="w-7 h-full flex items-center justify-center bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground text-sm font-medium transition-colors select-none border-r border-border"
      >−</button>
      <span className="text-[11px] font-mono font-semibold tabular-nums w-9 text-center">{value}</span>
      <button
        onClick={() => onChange(Math.min(max, value + step))}
        className="w-7 h-full flex items-center justify-center bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground text-sm font-medium transition-colors select-none border-l border-border"
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
    <div className="flex rounded-lg border border-border overflow-hidden h-7">
      {opts.map(({ v, icon, label }, i) => (
        <Tooltip key={v}>
          <TooltipTrigger asChild>
            <button onClick={() => onChange(v)} aria-label={label}
              className={cn("flex-1 flex items-center justify-center transition-colors", i > 0 && "border-l border-border",
                value === v ? "bg-primary text-primary-foreground" : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground"
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

// ── Skeleton loader ────────────────────────────────────────────────────────────
function TemplateSkeleton() {
  return (
    <div className="px-2 space-y-1">
      {[1, 2, 3].map(i => (
        <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg">
          <div className="w-3.5 h-3.5 rounded bg-muted/60 animate-pulse shrink-0" />
          <div className="flex-1 h-2.5 rounded bg-muted/60 animate-pulse" style={{ width: `${55 + i * 12}%` }} />
        </div>
      ))}
    </div>
  );
}

// ── Dialogs ────────────────────────────────────────────────────────────────────
function UnsavedDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-80 space-y-5">
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
    </div>
  );
}

function NavGuardDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-80 space-y-5">
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
    </div>
  );
}

function RenameDialog({ current, onConfirm, onCancel }: { current: string; onConfirm: (n: string) => void; onCancel: () => void }) {
  const [val, setVal] = useState(current.replace(".pdf", ""));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 w-80 space-y-4">
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
    </div>
  );
}

function ShortcutsPanel({ onClose }: { onClose: () => void }) {
  const rows = [
    ["Esc", "Cancel placement / deselect"],
    ["Del / Backspace", "Remove selected field"],
    ["Tab", "Cycle through placed fields"],
    ["↑ ↓ ← →", "Nudge 1 px"],
    ["Shift + arrows", "Nudge 8 px"],
    ["Ctrl/⌘ Z", "Undo"],
    ["Ctrl/⌘ S", "Save template"],
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl p-5 w-80 space-y-4" onClick={e => e.stopPropagation()}>
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
        <div className="divide-y divide-border">
          {rows.map(([key, desc]) => (
            <div key={key} className="flex items-center justify-between py-2 gap-4">
              <span className="text-[11px] text-muted-foreground">{desc}</span>
              <kbd className="shrink-0 px-2 py-0.5 text-[10px] font-mono bg-muted rounded-md border border-border">{key}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Preview modal ──────────────────────────────────────────────────────────────
function PreviewModal({ pages, placedFields, onClose }: {
  pages: PageData[]; placedFields: PlacedField[]; onClose: () => void
}) {
  const [page, setPage] = useState(0);
  const currentPageFields = placedFields.filter(f => f.page === page);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden max-h-[90vh] max-w-[90vw]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <p className="text-sm font-semibold">Preview — page {page + 1} of {pages.length}</p>
          </div>
          <div className="flex items-center gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button disabled={page >= pages.length - 1} onClick={() => setPage(p => p + 1)}
              className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted disabled:opacity-30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
        <div className="overflow-auto p-6">
          {pages[page] && (
            <div className="relative" style={{ width: pages[page].width, height: pages[page].height, boxShadow: "0 4px 32px rgba(0,0,0,0.3)" }}>
              <img src={pages[page].dataUrl} style={{ width: pages[page].width, height: pages[page].height, display: "block" }} draggable={false} />
              {currentPageFields.map(field => {
                const group = getGroupForField(field.name);
                const fieldDef = ALL_FIELDS.find(f => f.name === field.name);
                return (
                  <div key={field.id} style={{
                    position: "absolute",
                    left: field.x + field.indentLeft, top: field.y + field.indentTop,
                    width: Math.max(10, field.width - field.indentLeft - field.indentRight),
                    height: Math.max(8, field.height - field.indentTop),
                    border: "1.5px solid",
                    borderColor: "rgba(99,102,241,0.5)",
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
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function PDFFieldEditor({ supabase, bucketName = "templates" }: Props) {
  const [templates, setTemplates] = useState<TemplateFile[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<string | null>(null);
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

  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfFileRef = useRef<File | null>(null);
  const newNameRef = useRef<HTMLInputElement>(null);
  const dragStartSnapshot = useRef<PlacedField[] | null>(null);
  const resizeStartSnapshot = useRef<PlacedField[] | null>(null);

  const zoom = ZOOM_STEPS[zoomIndex];
  const activeField = placedFields.find(f => f.id === activeFieldId);
  const canUndo = history.length > 0;
  const currentPageFields = placedFields.filter(f => f.page === currentPage);
  const currentPageData = pages[currentPage];
  const placedFieldNames = new Set(placedFields.map(f => f.name));
  const totalPlaced = placedFields.length;
  const totalFields = ALL_FIELDS.length;
  const progress = Math.round((totalPlaced / totalFields) * 100);

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

  // ── Nav guard: intercept clicks on anchor/nav links when dirty ────────────────
  useEffect(() => {
    if (!isDirty) return;
    const handler = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.includes("pdf-template")) return;
      e.preventDefault();
      e.stopPropagation();
      setNavGuardTarget(href);
      setShowNavGuard(true);
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [isDirty]);

  // ── Fetch templates ───────────────────────────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    if (!supabase) return;
    setTemplatesLoading(true);
    setTemplatesError(false);
    try {
      const { data, error } = await supabase.storage.from(bucketName).list("", { sortBy: { column: "updated_at", order: "desc" } });
      if (error) throw error;
      setTemplates((data ?? []).filter(f => f.name.endsWith(".pdf")).map(f => ({ name: f.name, updatedAt: f.updated_at ?? "" })));
    } catch {
      setTemplatesError(true);
    } finally { setTemplatesLoading(false); }
  }, [supabase, bucketName]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  // ── PDF render ────────────────────────────────────────────────────────────────
  const renderAllPages = useCallback(async (file: File) => {
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
    } finally { setLoading(false); }
  }, []);

  const resetEditor = () => {
    setPlacedFields([]); setHistory([]); setCurrentPage(0);
    setSaveStatus(null); setActiveFieldId(null); setSelectedField(null);
    setIsDirty(false); setLastSavedAt(null);
  };

  const guardedSwitch = (action: () => void) => {
    if (isDirty && placedFields.length > 0) setPendingSwitch(() => action);
    else action();
  };

  // ── Load template ─────────────────────────────────────────────────────────────
  const loadTemplate = useCallback(async (name: string) => {
    if (!supabase) return;
    setActiveTemplate(name); resetEditor(); setLoading(true);
    try {
      const { data: u } = supabase.storage.from(bucketName).getPublicUrl(name);
      const res = await fetch(`${u.publicUrl}?t=${Date.now()}`);
      const blob = await res.blob();
      const file = new File([blob], name, { type: "application/pdf" });
      pdfFileRef.current = file; setPdfFile(file);
      await renderAllPages(file);
    } catch (err) {
      console.error("Failed to load template:", err);
      setLoading(false);
    }
  }, [supabase, bucketName, renderAllPages]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    pdfFileRef.current = file; setPdfFile(file); resetEditor();
    await renderAllPages(file);
  };

  const deleteTemplate = async (name: string) => {
    if (!supabase) return;
    await supabase.storage.from(bucketName).remove([name]);
    if (activeTemplate === name) {
      setActiveTemplate(null); setPdfFile(null); setPages([]);
      pdfFileRef.current = null; resetEditor();
    }
    setDeleteConfirm(null); fetchTemplates();
  };

  const renameTemplate = async (oldName: string, newBase: string) => {
    if (!supabase) return;
    const newName = newBase.endsWith(".pdf") ? newBase : `${newBase}.pdf`;
    try {
      const { data: u } = supabase.storage.from(bucketName).getPublicUrl(oldName);
      const res = await fetch(`${u.publicUrl}?t=${Date.now()}`);
      const blob = await res.blob();
      await supabase.storage.from(bucketName).upload(newName, blob, { upsert: false, contentType: "application/pdf" });
      await supabase.storage.from(bucketName).remove([oldName]);
      if (activeTemplate === oldName) setActiveTemplate(newName);
    } catch (err) {
      console.error("Rename failed:", err);
    } finally {
      setRenameTarget(null); fetchTemplates();
    }
  };

  const confirmNewTemplate = () => {
    const name = newTemplateName.trim(); if (!name) return;
    const finalName = name.endsWith(".pdf") ? name : `${name}.pdf`;
    guardedSwitch(() => {
      setActiveTemplate(finalName); setPdfFile(null); setPages([]);
      pdfFileRef.current = null; resetEditor();
      setCreatingNew(false); setNewTemplateName("");
    });
  };

  // ── Zoom to fit ───────────────────────────────────────────────────────────────
  const zoomToPage = useCallback((newIndex: number) => {
    const prev = ZOOM_STEPS[zoomIndex];
    const next = ZOOM_STEPS[newIndex];
    setZoomIndex(newIndex);
    // Re-center scroll after zoom change
    setTimeout(() => {
      const el = canvasScrollRef.current;
      if (!el) return;
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
    if (!selectedField) { setActiveFieldId(null); return; }
    const { x, y } = screenToPdf(e.clientX, e.clientY);
    setFieldsWithHistory(prev => [...prev, {
      id: `${selectedField}_${Date.now()}`, name: selectedField, page: currentPage,
      x, y, width: snapEnabled ? snap(120) : 120, height: snapEnabled ? snap(18) : 18,
      fontSize: globalFontSize, indentLeft: 0, indentRight: 0,
      indentTop: 0, textAlign: globalTextAlign,
    }]);
    setSelectedField(null);
  };

  const handleFieldMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); setActiveFieldId(id);
    dragStartSnapshot.current = placedFields;
    const f = placedFields.find(f => f.id === id); if (!f) return;
    setDragging({ id, startX: e.clientX, startY: e.clientY, origX: f.x, origY: f.y });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    resizeStartSnapshot.current = placedFields;
    const f = placedFields.find(f => f.id === id); if (!f) return;
    setResizing({ id, startX: e.clientX, startY: e.clientY, origW: f.width, origH: f.height });
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
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

  // ── Jump to first incomplete page ─────────────────────────────────────────────
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
      const blob = new Blob([await pdfDoc.save()], { type: "application/pdf" });
      if (supabase) {
        const { error } = await supabase.storage.from(bucketName).upload(activeTemplate, blob, { upsert: true, contentType: "application/pdf" });
        if (error) throw error;
        const now = new Date();
        setSaveStatus({ type: "success", message: `Saved successfully.` });
        setLastSavedAt(now);
        setIsDirty(false); fetchTemplates();
      } else {
        Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: activeTemplate }).click();
        setSaveStatus({ type: "success", message: "Downloaded!" }); setIsDirty(false);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unknown error occurred";
      setSaveStatus({ type: "error", message });
    } finally { setSaving(false); }
  }, [activeTemplate, pages, pageDimensions, placedFields, supabase, bucketName, fetchTemplates]);

  // ── Auto-dismiss save status ───────────────────────────────────────────────────
  useEffect(() => {
    if (!saveStatus) return;
    const t = setTimeout(() => setSaveStatus(null), 4000);
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

      // Tab — cycle through placed fields on current page
      if (e.key === "Tab" && !e.shiftKey) {
        e.preventDefault();
        const pageFields = placedFieldsRef.current.filter(f => f.page === currentPageRef.current);
        if (!pageFields.length) return;
        const idx = pageFields.findIndex(f => f.id === activeFieldIdRef.current);
        const next = pageFields[(idx + 1) % pageFields.length];
        setActiveFieldId(next.id);
        return;
      }
      if (e.key === "Tab" && e.shiftKey) {
        e.preventDefault();
        const pageFields = placedFieldsRef.current.filter(f => f.page === currentPageRef.current);
        if (!pageFields.length) return;
        const idx = pageFields.findIndex(f => f.id === activeFieldIdRef.current);
        const prev = pageFields[(idx - 1 + pageFields.length) % pageFields.length];
        setActiveFieldId(prev.id);
        return;
      }

      if (e.key === "Escape") {
        if (selectedFieldRef.current) { setSelectedField(null); return; }
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

  // ── Sidebar width ─────────────────────────────────────────────────────────────
  const SIDEBAR_W = sidebarOpen ? 280 : 0;

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-full relative text-foreground select-none overflow-hidden"
        style={{
          background: "repeating-linear-gradient(0deg, transparent, transparent 23px, hsl(var(--border)/0.35) 23px, hsl(var(--border)/0.35) 24px), repeating-linear-gradient(90deg, transparent, transparent 23px, hsl(var(--border)/0.35) 23px, hsl(var(--border)/0.35) 24px), hsl(var(--muted)/0.25)",
        }}
        onClick={() => { if (!selectedField) setActiveFieldId(null); }}
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
          <PreviewModal pages={pages} placedFields={placedFields} onClose={() => setShowPreview(false)} />
        )}
        {renameTarget && (
          <RenameDialog
            current={renameTarget}
            onConfirm={(n) => renameTemplate(renameTarget, n)}
            onCancel={() => setRenameTarget(null)}
          />
        )}

        {/* ══ SIDEBAR TOGGLE (always visible) ══════════════════════════════════ */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={e => { e.stopPropagation(); setSidebarOpen(o => !o); }}
              className="absolute top-6 left-6 z-40 w-8 h-8 rounded-xl bg-background/95 backdrop-blur-md border border-border/80 shadow-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto min-h-0 py-3 space-y-4">

            {/* Templates */}
            <div>
              <button
                onClick={() => setTemplatesPanelOpen(o => !o)}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-muted/50 rounded-md transition-colors mb-1"
              >
                <SectionLabel>Templates</SectionLabel>
                <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground/60 transition-transform duration-200 mr-1", !templatesPanelOpen && "-rotate-90")} />
              </button>

              {templatesPanelOpen && (
                <div className="px-2 space-y-0.5">
                  {!creatingNew ? (
                    <button
                      onClick={() => { setCreatingNew(true); setTimeout(() => newNameRef.current?.focus(), 50); }}
                      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-dashed border-border/60 hover:border-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <Plus className="w-3.5 h-3.5" /><span>New template…</span>
                    </button>
                  ) : (
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
                  )}

                  {/* Loading skeleton */}
                  {templatesLoading && <TemplateSkeleton />}

                  {/* Error state */}
                  {!templatesLoading && templatesError && (
                    <div className="px-3 py-3 rounded-lg bg-destructive/8 border border-destructive/20 space-y-1.5">
                      <div className="flex items-center gap-2 text-destructive">
                        <WifiOff className="w-3.5 h-3.5 shrink-0" />
                        <p className="text-[11px] font-medium">Could not load templates</p>
                      </div>
                      <button onClick={fetchTemplates} className="text-[10px] text-primary hover:underline">Retry</button>
                    </div>
                  )}

                  {!templatesLoading && !templatesError && templates.length === 0 && (
                    <p className="px-3 py-2 text-[11px] text-muted-foreground italic">No templates yet</p>
                  )}

                  {!templatesLoading && !templatesError && templates.map(t => (
                    <div
                      key={t.name}
                      className={cn("group flex items-center gap-2 rounded-lg px-3 py-2 cursor-pointer transition-all",
                        activeTemplate === t.name ? "bg-primary/10 text-primary" : "hover:bg-muted text-foreground"
                      )}
                      onClick={() => guardedSwitch(() => loadTemplate(t.name))}
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0 opacity-60" />
                      <span className="flex-1 text-[11px] font-medium truncate">{t.name.replace(".pdf", "")}</span>
                      {activeTemplate === t.name && isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" title="Unsaved changes" />}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Rename */}
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
                </div>
              )}
            </div>

            {/* PDF Source */}
            {activeTemplate && (
              <div className="px-2 space-y-1.5">
                <div className="px-1"><SectionLabel>PDF Source</SectionLabel></div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={cn("w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[11px] font-medium border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    pdfFile ? "bg-muted/40 border-border text-foreground hover:bg-muted" : "bg-primary/5 border-dashed border-primary/40 text-primary hover:bg-primary/10"
                  )}>
                  <Upload className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate text-left">{pdfFile ? pdfFile.name : "Upload blank PDF…"}</span>
                </button>
                <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleFileUpload} />

                {/* Extra pages notice */}
                {pages.length > FIELD_GROUPS.length && (
                  <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-500/8 border border-amber-500/20 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <p className="text-[10px] leading-snug">
                      PDF has {pages.length} pages but only {FIELD_GROUPS.length} field groups are defined. Extra pages are shown but cannot have fields placed on them.
                    </p>
                  </div>
                )}
              </div>
            )}

            {!activeTemplate && (
              <div className="mx-2 rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-center space-y-2">
                <FolderOpen className="w-6 h-6 text-muted-foreground/40 mx-auto" />
                <p className="text-[11px] text-muted-foreground">Select or create a template to begin</p>
              </div>
            )}

            {/* Placement callout */}
            {selectedField && (
              <div className="mx-2 rounded-xl bg-primary text-primary-foreground p-3 flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Crosshair className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] font-bold uppercase tracking-widest opacity-70 mb-0.5">Placement mode</p>
                  <p className="text-[12px] font-semibold leading-tight truncate">{ALL_FIELDS.find(f => f.name === selectedField)?.label}</p>
                  <p className="text-[10px] opacity-60 mt-0.5">Click on the canvas to place</p>
                </div>
                <button onClick={() => setSelectedField(null)} className="w-6 h-6 rounded-md bg-white/15 hover:bg-white/25 flex items-center justify-center shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Field inspector — collapses field list when active to reduce clutter */}
            {activeField && !selectedField && (
              <div className="mx-2 space-y-0">
                <div className="flex items-center gap-2 px-1 mb-2">
                  <SectionLabel>Inspector</SectionLabel>
                  <div className="flex-1" />
                  <button onClick={() => removeField(activeField.id)} className="w-6 h-6 rounded-md bg-destructive/10 hover:bg-destructive/20 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                  <button onClick={() => setActiveFieldId(null)} className="w-6 h-6 rounded-md hover:bg-muted flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                    <X className="w-3 h-3 text-muted-foreground" />
                  </button>
                </div>
                <div className="px-3 py-2 rounded-t-lg bg-muted/50 border border-border border-b-0">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-widest font-semibold mb-0.5">Field</p>
                  <p className="text-[12px] font-semibold truncate">{ALL_FIELDS.find(f => f.name === activeField.name)?.label ?? activeField.name}</p>
                  <p className="text-[9px] text-muted-foreground mt-0.5">Page {activeField.page + 1} · Tab to cycle fields</p>
                </div>
                <div className="px-3 py-2.5 rounded-b-lg bg-muted/20 border border-border space-y-2.5">
                  <InspectorRow label="Font size">
                    <Stepper value={activeField.fontSize} min={6} max={24} onChange={v => updateField(activeField.id, { fontSize: v })} />
                  </InspectorRow>
                  <InspectorRow label="Text align">
                    <AlignButtons value={activeField.textAlign} onChange={v => updateField(activeField.id, { textAlign: v })} />
                  </InspectorRow>
                </div>
              </div>
            )}

            {/* Global defaults — only when no field is selected */}
            {activeTemplate && pdfFile && !activeField && !selectedField && (
              <div className="mx-2">
                <div className="px-1 mb-2"><SectionLabel>Defaults for new fields</SectionLabel></div>
                <div className="px-3 py-2.5 rounded-lg bg-muted/20 border border-border space-y-2.5">
                  <InspectorRow label="Font size">
                    <Stepper value={globalFontSize} min={6} max={24} onChange={setGlobalFontSize} />
                  </InspectorRow>
                  <InspectorRow label="Text align">
                    <AlignButtons value={globalTextAlign} onChange={setGlobalTextAlign} />
                  </InspectorRow>
                </div>
              </div>
            )}

            {/* Fields by page */}
            <div className="space-y-1 px-2">
              <div className="flex items-center gap-1 px-1 mb-1">
                <div className="flex-1"><SectionLabel>Fields by page</SectionLabel></div>
                {progress < 100 && totalPlaced > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button onClick={jumpToIncomplete}
                        className="flex items-center gap-1 text-[9px] text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
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
                // Collapse other groups when inspector is open to save space
                const showFields = isExpanded && !activeField;
                return (
                  <div key={gi} className={cn("rounded-lg border overflow-hidden transition-all", isCurrent ? "border-border shadow-sm" : "border-border/60")}>
                    <button
                      onClick={() => {
                        setExpandedGroups(prev => ({ ...prev, [gi]: !isExpanded }));
                        setCurrentPage(gi);
                      }}
                      className={cn("w-full flex items-center gap-2.5 px-3 py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset", isCurrent ? "bg-muted/60" : "bg-muted/30 hover:bg-muted/50")}
                    >
                      <div className={cn("w-2 h-2 rounded-full shrink-0", group.dot)} />
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
                          return (
                            <button
                              key={field.name}
                              onClick={() => {
                                if (isPlaced && instance) { setActiveFieldId(instance.id); setCurrentPage(instance.page); }
                                else { if (!pdfFile) return; setSelectedField(isSelecting ? null : field.name); }
                              }}
                              className={cn("w-full flex items-center gap-2 px-3 py-2 text-[11px] text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                                isPlaced && isActiveInCanvas ? "bg-primary/10 text-primary font-medium"
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
          <div className="shrink-0 border-t border-border/60 bg-background px-3 py-3 space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-muted-foreground">Completion</span>
                <div className="flex items-center gap-2">
                  {lastSavedAt && (
                    <span className="flex items-center gap-1 text-muted-foreground/60">
                      <Clock className="w-2.5 h-2.5" />
                      Saved {formatTime(lastSavedAt)}
                    </span>
                  )}
                  <span className={cn("font-mono font-bold tabular-nums", progress === 100 ? "text-emerald-500" : "text-foreground")}>{progress}%</span>
                </div>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div className={cn("h-full rounded-full transition-all duration-500", progress === 100 ? "bg-emerald-500" : "bg-primary")} style={{ width: `${progress}%` }} />
              </div>
              <p className="text-[10px] text-muted-foreground tabular-nums">{totalPlaced} of {totalFields} fields placed</p>
            </div>
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 shrink-0 focus-visible:ring-2 focus-visible:ring-primary" disabled={!canUndo} onClick={undo}>
                    <Undo2 className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Undo (Ctrl+Z){canUndo ? ` · ${history.length} step${history.length !== 1 ? "s" : ""}` : ""}</TooltipContent>
              </Tooltip>
              <Button
                className={cn("flex-1 h-9 text-xs font-semibold gap-1.5 focus-visible:ring-2 focus-visible:ring-primary", isDirty && "ring-2 ring-amber-400/50 ring-offset-1")}
                disabled={placedFields.length === 0 || saving || !activeTemplate}
                onClick={handleSave}
              >
                {saving ? <><Loader2 className="w-3.5 h-3.5 animate-spin" />Saving…</> : <><Save className="w-3.5 h-3.5" />{isDirty ? "Save changes" : "Saved"}</>}
              </Button>
            </div>
            {saveStatus && (
              <Alert className={cn("py-2", saveStatus.type === "success" ? "border-emerald-500/30 bg-emerald-500/8 text-emerald-700 dark:text-emerald-400" : "border-destructive/30 bg-destructive/8 text-destructive")}>
                <AlertDescription className="text-[11px]">{saveStatus.message}</AlertDescription>
              </Alert>
            )}
          </div>
        </aside>

        {/* ══ FLOATING TOOLBAR PILLS ════════════════════════════════════════════ */}

        {/* Page tabs — top center (offset so they don't overlap the sidebar toggle) */}
        {pages.length > 0 && (
          <div className="absolute top-6 z-30 flex items-center gap-1 bg-background/95 backdrop-blur-md border border-border/80 rounded-xl px-1.5 py-1 shadow-lg"
            style={{ left: "50%", transform: "translateX(-50%)" }}
            onClick={e => e.stopPropagation()}>
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
                  <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", done ? "bg-emerald-500" : group.dot)} />
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

        {/* Controls — top right */}
        <div className="absolute top-6 right-6 z-30 flex items-center gap-1 bg-background/95 backdrop-blur-md border border-border/80 rounded-xl px-1.5 py-1 shadow-lg"
          onClick={e => e.stopPropagation()}>
          {/* Preview */}
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
            <TooltipContent side="bottom">{snapEnabled ? "Snap ON (8 px grid)" : "Snap OFF"}</TooltipContent>
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
                className="px-1.5 text-[10px] font-mono font-bold text-muted-foreground hover:text-primary transition-colors tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">
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
            <TooltipContent side="bottom">Clear this page</TooltipContent>
          </Tooltip>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={() => setShowShortcuts(true)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <Keyboard className="w-3.5 h-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Shortcuts</TooltipContent>
          </Tooltip>
        </div>

        {/* ══ PDF CANVAS ════════════════════════════════════════════════════════ */}
        <div className="absolute inset-0 flex pointer-events-none">
          {/* Sidebar gutter */}
          <div style={{ width: SIDEBAR_W + 48, transition: "width 0.2s ease" }} className="shrink-0" />
          {/* Canvas — truly centered in remaining space */}
          <div
            ref={canvasScrollRef}
            className="flex-1 overflow-auto flex items-center justify-center pt-16 pb-6 pr-6 pointer-events-auto"
            onClick={() => { if (!selectedField) setActiveFieldId(null); }}
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
              <div className="flex flex-col items-center gap-4 text-center">
                <div className="w-20 h-20 rounded-3xl bg-background border-2 border-dashed border-border flex items-center justify-center">
                  <FolderOpen className="w-9 h-9 text-muted-foreground/40" />
                </div>
                <div>
                  <p className="text-sm font-semibold">No template selected</p>
                  <p className="text-xs text-muted-foreground mt-1">Create or select a template in the sidebar</p>
                </div>
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
                  <p className="text-xs text-muted-foreground mt-1">for <span className="text-primary font-medium">{activeTemplate.replace(".pdf", "")}</span></p>
                  <p className="text-xs text-muted-foreground mt-1 opacity-60">Click anywhere above to browse</p>
                </div>
              </div>
            )}

            {currentPageData && !loading && (
              <div className="flex items-start justify-center w-full h-full">
                <div style={{ transform: `scale(${zoom})`, transformOrigin: "top center", marginBottom: `${(zoom - 1) * currentPageData.height}px` }}
                  onClick={e => e.stopPropagation()}>
                  <div className="relative" style={{ width: currentPageData.width, height: currentPageData.height, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 20px 60px -10px rgba(0,0,0,0.2)" }}>
                    {snapEnabled && (
                      <div className="absolute inset-0 pointer-events-none z-10" style={{
                        opacity: 0.04,
                        backgroundImage: `repeating-linear-gradient(0deg,transparent,transparent ${SNAP_SIZE-1}px,currentColor ${SNAP_SIZE-1}px,currentColor ${SNAP_SIZE}px),repeating-linear-gradient(90deg,transparent,transparent ${SNAP_SIZE-1}px,currentColor ${SNAP_SIZE-1}px,currentColor ${SNAP_SIZE}px)`,
                      }} />
                    )}
                    <img src={currentPageData.dataUrl} alt={`Page ${currentPage + 1}`}
                      style={{ width: currentPageData.width, height: currentPageData.height, display: "block" }} draggable={false} />
                    <div ref={overlayRef}
                      className={cn("absolute inset-0 z-20", selectedField ? "cursor-crosshair" : "cursor-default")}
                      onClick={handleCanvasClick}
                      tabIndex={-1}
                    >
                      {selectedField && <div className="absolute inset-0 bg-primary/4 ring-2 ring-primary/30 ring-inset pointer-events-none" />}
                      {currentPageFields.map(field => {
                        const group = getGroupForField(field.name);
                        const fieldDef = ALL_FIELDS.find(f => f.name === field.name);
                        const isActive = field.id === activeFieldId;
                        const labelVisible = zoom >= 0.75;
                        return (
                          <div key={field.id}
                            role="button"
                            tabIndex={0}
                            aria-label={`${fieldDef?.label ?? field.name} field — press Enter to select`}
                            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setActiveFieldId(field.id); } }}
                            className={cn("absolute group/field",
                              isActive ? "border-2 border-primary z-30"
                              : cn("border border-dashed hover:border-solid hover:border-2 hover:z-20", group?.borderColor ?? "border-zinc-400")
                            )}
                            style={{
                              left: field.x + field.indentLeft, top: field.y + field.indentTop,
                              width: Math.max(10, field.width - field.indentLeft - field.indentRight),
                              height: Math.max(8, field.height - field.indentTop),
                              cursor: "move",
                              backgroundColor: isActive ? "hsl(var(--primary)/0.05)" : "transparent",
                              boxShadow: isActive ? "0 0 0 4px hsl(var(--primary)/0.15)" : undefined,
                              borderRadius: 1,
                              outline: isActive ? "none" : undefined,
                            }}
                            onMouseDown={e => handleFieldMouseDown(e, field.id)}
                            onFocus={() => setActiveFieldId(field.id)}
                          >
                            {/* Label tooltip — only visible at sufficient zoom */}
                            {labelVisible && (
                              <div className={cn(
                                "absolute -top-5 left-0 px-1.5 py-0.5 text-[8px] font-bold rounded-t whitespace-nowrap pointer-events-none text-white shadow-sm transition-opacity flex items-center gap-1",
                                group?.color ?? "bg-zinc-500",
                                isActive ? "opacity-100" : "opacity-0 group-hover/field:opacity-100"
                              )}>
                                {fieldDef?.label ?? field.name}
                                <span className="opacity-70">{field.fontSize}pt</span>
                                {field.textAlign !== "left" && <span className="opacity-70">{field.textAlign === "center" ? "C" : "R"}</span>}
                              </div>
                            )}
                            <div className={cn("absolute inset-0 flex items-center overflow-hidden pointer-events-none px-0.5",
                              field.textAlign === "center" ? "justify-center" : field.textAlign === "right" ? "justify-end" : "justify-start")}>
                              {/* Always show label dot at low zoom; show text at higher zoom */}
                              {labelVisible ? (
                                <span className="truncate select-none" style={{ fontSize: Math.max(7, field.fontSize), lineHeight: 1, color: "rgba(0,0,0,0.45)", fontFamily: "Georgia, serif", fontStyle: "italic" }}>
                                  {fieldDef?.label ?? field.name}
                                </span>
                              ) : (
                                <div className={cn("w-1.5 h-1.5 rounded-full mx-auto", group?.dot ?? "bg-zinc-400")} />
                              )}
                            </div>
                            <button
                              className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover/field:opacity-100 transition-all scale-75 group-hover/field:scale-100 z-30 shadow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                              onMouseDown={e => e.stopPropagation()}
                              onClick={e => { e.stopPropagation(); removeField(field.id); }}
                              aria-label={`Remove ${fieldDef?.label ?? field.name}`}
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                            <div
                              className={cn("absolute bottom-0 right-0 w-3 h-3 cursor-se-resize opacity-0 group-hover/field:opacity-60 hover:opacity-100! transition-opacity", group?.color ?? "bg-zinc-500")}
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
      </div>
    </TooltipProvider>
  );
}