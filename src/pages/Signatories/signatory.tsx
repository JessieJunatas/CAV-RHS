"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { type Signatory } from "@/types/signatory"
import { logAudit } from "@/utils/audit-log"

// ─── cn utility ──────────────────────────────────────────────────────────────
function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(" ")
}

// ─── Icons ────────────────────────────────────────────────────────────────────
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
  </svg>
)
const PencilIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 2.828L11.828 15.828a2 2 0 01-1.415.586H9v-2a2 2 0 01.586-1.414z" />
  </svg>
)
const ArchiveIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
  </svg>
)
const XIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
)
const SpinnerIcon = () => (
  <svg className="w-5 h-5 animate-spin text-slate-400" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
  </svg>
)
const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
  </svg>
)
const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)
const WarningIcon = () => (
  <svg className="w-9 h-9 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
  </svg>
)

// ─── Confirm Dialog ───────────────────────────────────────────────────────────
function ConfirmDialog({
  open,
  name,
  onConfirm,
  onCancel,
}: {
  open: boolean
  name: string
  onConfirm: () => void
  onCancel: () => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative z-10 bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-sm overflow-hidden">
        <div className="px-6 pt-8 pb-5 text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-50 mb-4">
            <WarningIcon />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-1.5">Deactivate Signatory?</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-700">{name}</span> will be marked
            inactive and hidden from CAV form selectors.
          </p>
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 h-9 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-9 rounded-lg bg-amber-500 text-sm font-medium text-white hover:bg-amber-600 transition-colors shadow-sm"
          >
            Yes, Deactivate
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────
type Toast = { id: number; message: string; type: "success" | "error" | "info" }

function ToastList({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            "flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-sm font-medium pointer-events-auto min-w-[220px]",
            t.type === "success" && "bg-slate-900 text-white",
            t.type === "error" && "bg-red-600 text-white",
            t.type === "info" && "bg-sky-600 text-white"
          )}
        >
          <span className="text-base leading-none">
            {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "ℹ"}
          </span>
          {t.message}
        </div>
      ))}
    </div>
  )
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase()

  // deterministic color from name
  const colors = [
    "bg-indigo-600",
    "bg-violet-600",
    "bg-teal-600",
    "bg-rose-600",
    "bg-amber-600",
    "bg-cyan-600",
  ]
  const color = colors[name.charCodeAt(0) % colors.length]

  return (
    <div
      className={cn(
        "w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0",
        color
      )}
    >
      {initials || "?"}
    </div>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: number
  icon: React.ReactNode
  accent: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-3.5">
      <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", accent)}>
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold text-slate-900 leading-none">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5 font-medium">{label}</p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SignatoriesPage() {
  const [signatories, setSignatories] = useState<Signatory[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const [fullName, setFullName] = useState("")
  const [position, setPosition] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [errors, setErrors] = useState<{ fullName?: string; position?: string }>({})

  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  // ── Toast helper ────────────────────────────────────────────────────────────
  const addToast = (message: string, type: Toast["type"] = "success") => {
    const id = Date.now()
    setToasts((p) => [...p, { id, message, type }])
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 3500)
  }

  // ── Fetch ────────────────────────────────────────────────────────────────────
  const fetchSignatories = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("signatories")
      .select("*")
      .order("created_at", { ascending: false })

    if (!error && data) setSignatories(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchSignatories()
  }, [])

  // ── Validate ─────────────────────────────────────────────────────────────────
  const validate = () => {
    const e: typeof errors = {}
    if (!fullName.trim()) e.fullName = "Full name is required."
    if (!position.trim()) e.position = "Position is required."
    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)

    if (editingId) {
      await supabase
        .from("signatories")
        .update({ full_name: fullName, position: position })
        .eq("id", editingId)
      setEditingId(null)
      addToast("Signatory updated successfully")
    } else {
      await supabase.from("signatories").insert({
        full_name: fullName,
        position: position,
      })
      addToast("Signatory added successfully")
    }

    try {
      await logAudit({
        action: editingId ? "updated" : "created",
        event: `${editingId ? "Updated" : "Added"} signatory: ${fullName} (${position})`,
        recordId: editingId || "new",
        tableName: "signatories",
      })
    } catch (err: any) {
      console.error("Audit log failed:", err)
    }

    setFullName("")
    setPosition("")
    setErrors({})
    setSubmitting(false)
    fetchSignatories()
  }

  // ── Delete / Deactivate ───────────────────────────────────────────────────────
  const handleDeleteConfirmed = async () => {
    if (!confirmId) return
    const signatory = signatories.find((s) => s.id === confirmId)

    await supabase.from("signatories").update({ is_active: false }).eq("id", confirmId)

    try {
      await logAudit({
        action: "archived",
        event: `Deactivated signatory: ${signatory?.full_name} (${signatory?.position})`,
        recordId: confirmId,
        tableName: "signatories",
      })
    } catch (err: any) {
      console.error("Audit log failed:", err)
    }

    setConfirmId(null)
    addToast(`${signatory?.full_name} deactivated`, "info")
    fetchSignatories()
  }

  // ── Edit ──────────────────────────────────────────────────────────────────────
  const handleEdit = (signatory: Signatory) => {
    setEditingId(signatory.id)
    setFullName(signatory.full_name)
    setPosition(signatory.position)
    setErrors({})

    try {
      logAudit({
        action: "updated",
        event: `Editing signatory: ${signatory.full_name} (${signatory.position})`,
        recordId: signatory.id,
        tableName: "signatories",
      })
    } catch (err: any) {
      console.error("Audit log failed:", err)
    }

    // scroll form into view smoothly
    setTimeout(() => {
      document.getElementById("signatory-form")?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 50)
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setFullName("")
    setPosition("")
    setErrors({})
  }

  // ── Derived stats ─────────────────────────────────────────────────────────────
  const activeCount = signatories.filter((s) => s.is_active).length
  const inactiveCount = signatories.filter((s) => !s.is_active).length
  const confirmTarget = signatories.find((s) => s.id === confirmId)

  return (
    <>
      {/* ── Google Font ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap');
        .font-display { font-family: 'Lora', Georgia, serif; }
        .font-body { font-family: 'DM Sans', system-ui, sans-serif; }
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .anim-in { animation: fadeSlideIn 0.25s ease both; }
      `}</style>

      <div className="font-body min-h-screen bg-[#F5F4F0] p-6 lg:p-8">
        <div className="max-w-3xl mx-auto space-y-7">

          {/* ── Page Header ─────────────────────────────────────────────────── */}
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">
                Records Management
              </p>
              <h1 className="font-display text-3xl font-bold text-slate-900 leading-tight">
                Signatories
              </h1>
            </div>
            {/* Decorative rule */}
            <div className="hidden sm:block flex-1 h-px bg-gradient-to-r from-slate-200 to-transparent mb-1" />
          </div>

          {/* ── Stats Row ───────────────────────────────────────────────────── */}
          <div className="grid grid-cols-3 gap-3 anim-in">
            <StatCard
              label="Total"
              value={signatories.length}
              icon={<UsersIcon />}
              accent="bg-slate-100 text-slate-500"
            />
            <StatCard
              label="Active"
              value={activeCount}
              icon={<CheckIcon />}
              accent="bg-teal-50 text-teal-600"
            />
            <StatCard
              label="Inactive"
              value={inactiveCount}
              icon={<ArchiveIcon />}
              accent="bg-slate-100 text-slate-400"
            />
          </div>

          {/* ── Form Card ───────────────────────────────────────────────────── */}
          <div
            id="signatory-form"
            className={cn(
              "bg-white rounded-2xl border shadow-sm overflow-hidden anim-in transition-all duration-300",
              editingId
                ? "border-indigo-200 ring-2 ring-indigo-100"
                : "border-slate-100"
            )}
          >
            {/* Card header */}
            <div
              className={cn(
                "flex items-center justify-between px-6 py-4 border-b",
                editingId
                  ? "bg-indigo-50 border-indigo-100"
                  : "bg-slate-50 border-slate-100"
              )}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center",
                    editingId ? "bg-indigo-600 text-white" : "bg-slate-900 text-white"
                  )}
                >
                  {editingId ? <PencilIcon /> : <PlusIcon />}
                </div>
                <h2 className="font-display text-sm font-semibold text-slate-800">
                  {editingId ? "Edit Signatory" : "Add New Signatory"}
                </h2>
              </div>
              {editingId && (
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-slate-100"
                >
                  <XIcon />
                  Cancel
                </button>
              )}
            </div>

            {/* Form body */}
            <form onSubmit={handleSubmit} className="px-6 py-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">

                {/* Full Name */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="fullName"
                    className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Full Name
                  </label>
                  <input
                    id="fullName"
                    type="text"
                    placeholder="e.g. JUAN DELA CRUZ"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value)
                      setErrors((p) => ({ ...p, fullName: undefined }))
                    }}
                    className={cn(
                      "h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all",
                      errors.fullName
                        ? "border-red-400 focus:ring-red-300"
                        : "border-slate-200 hover:border-slate-300 focus:ring-indigo-300"
                    )}
                  />
                  {errors.fullName && (
                    <p className="text-xs text-red-500">{errors.fullName}</p>
                  )}
                </div>

                {/* Position */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="position"
                    className="block text-xs font-semibold uppercase tracking-wide text-slate-500"
                  >
                    Position / Title
                  </label>
                  <input
                    id="position"
                    type="text"
                    placeholder="e.g. Registrar"
                    value={position}
                    onChange={(e) => {
                      setPosition(e.target.value)
                      setErrors((p) => ({ ...p, position: undefined }))
                    }}
                    className={cn(
                      "h-10 w-full rounded-lg border bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all",
                      errors.position
                        ? "border-red-400 focus:ring-red-300"
                        : "border-slate-200 hover:border-slate-300 focus:ring-indigo-300"
                    )}
                  />
                  {errors.position && (
                    <p className="text-xs text-red-500">{errors.position}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className={cn(
                    "inline-flex items-center gap-2 h-9 px-5 rounded-lg text-sm font-semibold text-white shadow-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-60 disabled:pointer-events-none",
                    editingId
                      ? "bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-400"
                      : "bg-slate-900 hover:bg-slate-700 focus:ring-slate-400"
                  )}
                >
                  {submitting ? (
                    <SpinnerIcon />
                  ) : editingId ? (
                    <PencilIcon />
                  ) : (
                    <PlusIcon />
                  )}
                  {submitting ? "Saving…" : editingId ? "Save Changes" : "Add Signatory"}
                </button>
              </div>
            </form>
          </div>

          {/* ── Table Card ──────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden anim-in">

            {/* Table header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
              <h2 className="font-display text-sm font-semibold text-slate-800">
                All Signatories
              </h2>
              {!loading && (
                <span className="text-xs text-slate-400 font-medium">
                  {signatories.length} record{signatories.length !== 1 ? "s" : ""}
                </span>
              )}
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                <SpinnerIcon />
                <p className="text-sm">Loading signatories…</p>
              </div>
            ) : signatories.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2 text-slate-400">
                <UsersIcon />
                <p className="text-sm font-medium">No signatories yet</p>
                <p className="text-xs">Add one using the form above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Signatory
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Position
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Status
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-slate-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {signatories.map((s) => (
                      <tr
                        key={s.id}
                        className={cn(
                          "group transition-colors",
                          editingId === s.id
                            ? "bg-indigo-50/60"
                            : "hover:bg-slate-50/70",
                          !s.is_active && "opacity-50"
                        )}
                      >
                        {/* Name + avatar */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <Avatar name={s.full_name} />
                            <span className={cn("font-semibold text-slate-900", !s.is_active && "line-through decoration-slate-400")}>
                              {s.full_name}
                            </span>
                          </div>
                        </td>

                        {/* Position */}
                        <td className="px-4 py-3.5 text-slate-500 text-sm">
                          {s.position}
                        </td>

                        {/* Status badge */}
                        <td className="px-4 py-3.5">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
                              s.is_active
                                ? "bg-teal-50 text-teal-700 border-teal-200"
                                : "bg-slate-100 text-slate-400 border-slate-200"
                            )}
                          >
                            <span
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                s.is_active ? "bg-teal-500" : "bg-slate-300"
                              )}
                            />
                            {s.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => handleEdit(s)}
                              className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:border-indigo-300 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                            >
                              <PencilIcon />
                              Edit
                            </button>

                            {s.is_active && (
                              <button
                                onClick={() => setConfirmId(s.id)}
                                className="inline-flex items-center gap-1.5 h-7 px-3 rounded-md border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:border-amber-300 hover:text-amber-600 hover:bg-amber-50 transition-all"
                              >
                                <ArchiveIcon />
                                Deactivate
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer */}
            {!loading && signatories.length > 0 && (
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/60">
                <p className="text-xs text-slate-400">
                  <span className="font-semibold text-slate-600">{activeCount}</span> active ·{" "}
                  <span className="font-semibold text-slate-600">{inactiveCount}</span> inactive
                </p>
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Confirm Deactivate Dialog ────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!confirmId}
        name={confirmTarget?.full_name ?? ""}
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmId(null)}
      />

      {/* ── Toasts ──────────────────────────────────────────────────────────── */}
      <ToastList toasts={toasts} />
    </>
  )
}