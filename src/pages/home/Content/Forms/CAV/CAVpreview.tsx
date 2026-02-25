import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { generateCavPDF } from "@/utils/generateCAVpdf"

function CAVPreview() {
  const { id } = useParams()
  const [form, setForm] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    const fetchForm = async () => {
      if (!id) {
        setErrorMsg("Invalid form ID.")
        setLoading(false)
        return
      }

      const { data, error } = await supabase
        .from("cav_forms")
        .select("*")
        .eq("id", id)
        .maybeSingle()

      if (error) {
        console.error("Preview fetch error:", error)
        setErrorMsg(error.message)
        setLoading(false)
        return
      }

      if (!data) {
        setErrorMsg("Form not found.")
        setLoading(false)
        return
      }

      setForm(data)
      setLoading(false)
    }

    fetchForm()
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center">
        Loading form...
      </div>
    )
  }

  if (errorMsg) {
    return (
      <div className="flex items-center justify-center text-red-500">
        {errorMsg}
      </div>
    )
  }

  return (
    <div className="p-16">
      <div className="max-w-4xl mx-auto border p-12">

        <h1 className="text-center font-bold text-xl mb-8">
          CERTIFICATION, AUTHENTICATION AND VERIFICATION
        </h1>

        <p>This is to certify that <b>{form.full_legal_name}</b>...</p>

        <p>Date Issued: {form.date_issued}</p>
        <p>School Name: {form.school_name}</p>
        <p>Date of Transmission: {form.date_of_transmission}</p>
        <p>School Year Completed: {form.school_year_completed}</p>
        <p>Date of Application: {form.date_of_application}</p>
        <p>School Year Graduated: {form.school_year_graduated}</p>
        <p>School Address: {form.school_address}</p>
        <p>Control No: {form.control_no}</p>
        
        <div className="mt-12 flex justify-end print:hidden">
          <button onClick={() => generateCavPDF(form)}
            className="bg-black text-white px-6 py-2 rounded"
          >
            Generate PDF
          </button>
        </div>

      </div>
    </div>
  )
}

export default CAVPreview