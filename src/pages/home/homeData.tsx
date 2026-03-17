// src/pages/home/homeData.tsx
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { useSearchParams, useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import HeroSection from "./hero"
import DataCard, { DataCardSkeleton } from "./data"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { X, ChevronLeft, ChevronRight, FileText, TriangleAlert, CheckCircle2 } from "lucide-react"
import { getFormTypeLabel } from "@/utils/formTypeUtils"
import { useCollapse } from "@/context/collapse-provider"
import { Button } from "@/components/animate-ui/components/buttons/button"

interface CavForm {
  id: number
  full_legal_name: string
  control_no: string
  form_type: number
  is_archived: boolean
  created_at: string
  updated_at?: string
}

const TABS = [
  { label: "All",  value: 0 },
  { label: "JHS",  value: 1 },
  { label: "K-12", value: 2 },
] as const

type TabValue = (typeof TABS)[number]["value"]
type Toast = { id: number; type: "error" | "success"; title: string; message: string }

const PAGE_SIZE = 4

const Home: React.FC = () => {
  const { px } = useCollapse()
  const [forms, setForms]         = useState<CavForm[]>([])
  const [loading, setLoading]     = useState(true)
  const [activeTab, setActiveTab] = useState<TabValue>(0)
  const [page, setPage]           = useState(1)
  const [toasts, setToasts]       = useState<Toast[]>([])
  const [searchParams]            = useSearchParams()
  const navigate                  = useNavigate()
  const searchQuery               = searchParams.get("search") ?? ""

  const pushToast = (type: Toast["type"], title: string, message: string) => {
    const id = Date.now()
    setToasts(p => [...p, { id, type, title, message }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 5000)
  }

  useEffect(() => {
    const fetchForms = async () => {
      setLoading(true)

      let query = supabase
        .from("cav_forms")
        .select("*")
        .eq("is_archived", false)
        .order("created_at", { ascending: false })

      if (searchQuery.trim()) {
        query = query.ilike("full_legal_name", `%${searchQuery.trim()}%`)
      }

      const { data, error } = await query

      if (error) {
        console.error("Fetch error:", error)
        setForms([])
      } else {
        setForms(data || [])
      }

      setLoading(false)
    }

    fetchForms()
  }, [searchQuery])

  // Called on successful archive — fires toast BEFORE removing from list
  const handleArchived = (id: number, name: string) => {
    pushToast("success", "Record archived", `"${name}" has been moved to the archive.`)
    setForms(prev => prev.filter(f => f.id !== id))
  }

  const handleArchiveError = (message: string) => {
    pushToast("error", "Archive failed", message)
  }

  // Filter by active tab
  const filtered = activeTab === 0
    ? forms
    : forms.filter(f => f.form_type === activeTab)

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage   = Math.min(page, totalPages)
  const paginated  = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  // Tab counts
  const countAll = forms.length
  const countJHS = forms.filter(f => f.form_type === 1).length
  const countK12 = forms.filter(f => f.form_type === 2).length
  const tabCounts: Record<TabValue, number> = { 0: countAll, 1: countJHS, 2: countK12 }

  return (
    <div>
      <HeroSection />

      <div className={`${px} py-6 flex flex-col gap-5 transition-all duration-300`}>

        {/* ── Search result banner ── */}
        {searchQuery && (
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/40 px-4 py-2.5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Results for</span>
              <span className="font-semibold text-foreground">"{searchQuery}"</span>
              {!loading && (
                <span className="text-xs text-muted-foreground/60">
                  — {filtered.length} record{filtered.length !== 1 ? "s" : ""} found
                </span>
              )}
            </div>
            <button
              onClick={() => { navigate("/"); setPage(1) }}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>
        )}

        {/* ── Tabs + record count ── */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 rounded-xl border border-border bg-muted/40 p-1">
            {TABS.map(tab => {
              const isActive = activeTab === tab.value
              const count    = loading ? null : tabCounts[tab.value]
              return (
                <button
                  key={tab.value}
                  onClick={() => { setActiveTab(tab.value); setPage(1) }}
                  className={`flex items-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-background text-foreground shadow-sm border border-border/60"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  }`}
                >
                  {tab.label}
                  {count !== null && (
                    <span className={`text-xs tabular-nums rounded-md px-1.5 py-0.5 font-semibold transition-colors ${
                      isActive
                        ? "bg-foreground/8 text-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {!loading && filtered.length > 0 && (
            <p className="text-xs text-muted-foreground tabular-nums shrink-0">
              Showing{" "}
              <span className="font-semibold text-foreground">
                {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">{filtered.length}</span>
            </p>
          )}
        </div>

        {/* ── Cards grid ── */}
        <div className="grid md:grid-cols-2 gap-5">
          {loading && (
            <>
              <DataCardSkeleton />
              <DataCardSkeleton />
              <DataCardSkeleton />
              <DataCardSkeleton />
            </>
          )}

          {!loading && filtered.length === 0 && (
            <div className="col-span-2 flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                <FileText className="h-5 w-5 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {searchQuery ? `No records matching "${searchQuery}"` : "No records found"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {searchQuery
                    ? "Try a different search term."
                    : activeTab !== 0
                    ? `No ${TABS.find(t => t.value === activeTab)?.label} records yet.`
                    : "Records you create will appear here."}
                </p>
              </div>
              {searchQuery && (
                <button
                  onClick={() => { navigate("/"); setPage(1) }}
                  className="text-xs text-primary hover:underline"
                >
                  Clear search and show all
                </button>
              )}
            </div>
          )}

          {!loading && paginated.map(form => (
            <DataCard
              key={form.id}
              id={form.id}
              title={getFormTypeLabel(form.form_type)}
              value={form.full_legal_name}
              description={`Control No: ${form.control_no}`}
              modifiedAt={form.updated_at ?? form.created_at}
              onArchived={handleArchived}
              onError={handleArchiveError}
            />
          ))}
        </div>

        {/* ── Pagination ── */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between gap-4 pt-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="h-8 gap-1.5 px-3 text-xs rounded-lg"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Previous
            </Button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                const show               = p === 1 || p === totalPages || Math.abs(p - safePage) <= 1
                const showEllipsisBefore = p === safePage - 2 && safePage > 3
                const showEllipsisAfter  = p === safePage + 2 && safePage < totalPages - 2

                if (showEllipsisBefore || showEllipsisAfter) {
                  return (
                    <span key={`ellipsis-${p}`} className="px-1 text-xs text-muted-foreground">
                      …
                    </span>
                  )
                }

                if (!show) return null

                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-8 min-w-8 px-2.5 rounded-lg text-xs font-medium transition-all ${
                      p === safePage
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    {p}
                  </button>
                )
              })}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="h-8 gap-1.5 px-3 text-xs rounded-lg"
            >
              Next
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* ══ TOAST NOTIFICATIONS — portalled to document.body ═════════════════ */}
      {createPortal(
        <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
          {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto animate-in slide-in-from-bottom-3 fade-in duration-200">
              {t.type === "error" ? (
                <Alert variant="destructive" className="w-80 shadow-lg">
                  <TriangleAlert className="h-4 w-4" />
                  <AlertTitle className="text-sm font-semibold">{t.title}</AlertTitle>
                  <AlertDescription className="text-sm">{t.message}</AlertDescription>
                </Alert>
              ) : (
                <Alert variant="success" className="w-80 shadow-lg">
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertTitle className="text-sm font-semibold">{t.title}</AlertTitle>
                  <AlertDescription className="text-sm">{t.message}</AlertDescription>
                </Alert>
              )}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  )
}

export default Home