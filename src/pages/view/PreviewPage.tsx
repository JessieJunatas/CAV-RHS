import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { generateCavPDF } from "@/utils/generateCAVpdf"
import { Button } from "@/components/animate-ui/components/buttons/button"

function ViewPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [form, setForm] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchForm = async () => {
      if (!id) {
        setError("Invalid ID")
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("cav_forms")
        .select("*")
        .eq("id", id)
        .single()

      if (error) {
        setError(error.message)
      } else {
        setForm(data)
      }

      setLoading(false)
    }

    fetchForm()
  }, [id])

  if (loading)
    return <div className="p-6 text-foreground">Loading...</div>

  if (error)
    return <div className="p-6 text-destructive">Error: {error}</div>

  if (!form)
    return <div className="p-6 text-foreground">No record found.</div>

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-4xl mx-auto">

        <div className="flex justify-between items-center mb-6">
          <Button variant="outline" onClick={() => navigate("/")}>
            Back
          </Button>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              onClick={() => navigate(`/edit/${id}`)}
            >
              Edit
            </Button>

            <Button
              onClick={() => generateCavPDF(form)}
            >
              Preview / Print
            </Button>
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-6">
          Student Document View
        </h1>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Full Name" value={form.full_legal_name} />
          <Field label="Control No" value={form.control_no} />
          <Field label="Date Issued" value={form.date_issued} />
          <Field label="School Name" value={form.school_name} />
          <Field label="School Address" value={form.school_address} />
          <Field label="School Year Completed" value={form.school_year_completed} />
          <Field label="School Year Graduated" value={form.school_year_graduated} />
          <Field label="Date of Application" value={form.date_of_application} />
          <Field label="Date of Transmission" value={form.date_of_transmission} />
        </div>

      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border rounded p-3 bg-card">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium">{value || "-"}</p>
    </div>
  )
}

export default ViewPage