import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import HeroSection from "./hero"
import DataCard from "./data"

interface CavForm {
  id: number
  full_legal_name: string
  control_no: string
  form_type: number
  is_archived: boolean
  created_at: string
}

const Home: React.FC = () => {
  const [forms, setForms] = useState<CavForm[]>([])
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const searchQuery = searchParams.get("search")
  console.log("SearchQuery:", searchQuery)

  const getFormTitle = (type: number) => {
    switch (type) {
      case 1:
        return "Certification, Authentication, and Verification (CAV)"
      case 2:
        return "SF10 Form"
      default:
        return "Unknown Form"
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

    if (searchQuery && searchQuery.trim() !== "") {
      queryBuilder = queryBuilder.ilike(
        "full_legal_name",
        `%${searchQuery}%`
      )
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

      <div className="grid md:grid-cols-2 lg:grid-cols-2 gap-5 p-6">
        {loading && <p>Loading...</p>}

        {!loading && forms.length === 0 && (
          <p>No student records found.</p>
        )}

        {forms.map((form) => (
          <DataCard
            key={form.id}
            id={form.id}
            title={getFormTitle(form.form_type)}
            value={form.full_legal_name}
            description={`Control No: ${form.control_no}`}
          />
        ))}
      </div>
    </div>
  )
}

export default Home
