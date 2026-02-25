import { useEffect, useState } from "react"
import { useSearchParams, useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import HeroSection from "./hero"
import DataCard, { DataCardSkeleton } from "./data"
import { X } from "lucide-react"

interface CavForm {
  id: number
  full_legal_name: string
  control_no: string
  form_type: number
  is_archived: boolean
  created_at: string
  updated_at?: string
}

const Home: React.FC = () => {
  const [forms, setForms] = useState<CavForm[]>([])
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const searchQuery = searchParams.get("search") ?? ""

  const getFormTitle = (type: number) => {
    switch (type) {
      case 1: return "Certification, Authentication, and Verification (CAV)"
      case 2: return "SF10 Form"
      default: return "Unknown Form"
    }
  }

  useEffect(() => {
    const fetchForms = async () => {
      setLoading(true)

      let queryBuilder = supabase
        .from("cav_forms")
        .select("*")
        .eq("is_archived", false)
        .order("created_at", { ascending: false })

      if (searchQuery.trim()) {
        queryBuilder = queryBuilder.ilike("full_legal_name", `%${searchQuery.trim()}%`)
      }

      const { data, error } = await queryBuilder

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

  return (
    <div>
      <HeroSection />

      <div className="px-6 py-4 flex flex-col gap-5">

        {/* Search result banner */}
        {searchQuery && (
          <div className="flex items-center justify-between rounded-xl border border-border/60 bg-muted/40 px-4 py-2.5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Results for</span>
              <span className="font-semibold text-foreground">"{searchQuery}"</span>
              {!loading && (
                <span className="text-xs text-muted-foreground/60">
                  — {forms.length} record{forms.length !== 1 ? "s" : ""} found
                </span>
              )}
            </div>
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>
        )}

        {/* Cards grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-5">

          {/* Loading skeletons */}
          {loading && (
            <>
              <DataCardSkeleton />
              <DataCardSkeleton />
              <DataCardSkeleton />
              <DataCardSkeleton />
            </>
          )}

          {/* Empty state */}
          {!loading && forms.length === 0 && (
            <div className="col-span-2 flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
              <p className="text-sm font-medium text-muted-foreground">
                {searchQuery ? `No records matching "${searchQuery}"` : "No student records found."}
              </p>
              {searchQuery && (
                <button
                  onClick={() => navigate("/")}
                  className="mt-3 text-xs text-primary hover:underline"
                >
                  Clear search and show all
                </button>
              )}
            </div>
          )}

          {!loading && forms.map((form) => (
            <DataCard
              key={form.id}
              id={form.id}
              title={getFormTitle(form.form_type)}
              value={form.full_legal_name}
              description={`Control No: ${form.control_no}`}
              modifiedAt={form.updated_at ?? form.created_at}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

export default Home