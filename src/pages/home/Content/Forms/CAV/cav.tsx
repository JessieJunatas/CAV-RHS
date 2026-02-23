import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { createForm } from "../../CRUD"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/animate-ui/components/buttons/button"
import { Input } from "@/components/ui/input"

type CavFormData = {
  full_legal_name: string
  date_issued: string
  school_name: string
  date_of_transmission: string
  school_year_completed: string
  school_address: string
  date_of_application: string
  school_year_graduated: string
  control_no: string
}

function CAV() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [savedFormId, setSavedFormId] = useState<string | null>(null)

  const [formData, setFormData] = useState<CavFormData>({
    full_legal_name: "",
    date_issued: "",
    school_name: "",
    date_of_transmission: "",
    school_year_completed: "",
    school_address: "",
    date_of_application: "",
    school_year_graduated: "",
    control_no: "",
  })

  const fields: {
    label: string
    name: keyof CavFormData
    type?: string
    colSpan?: string
  }[] = [
    { label: "Complete Name", name: "full_legal_name" },
    { label: "Date Issued", name: "date_issued", type: "date" },
    { label: "Name of School", name: "school_name", colSpan: "col-span-2" },
    { label: "School Year Completed", name: "school_year_completed" },
    { label: "School Address", name: "school_address", colSpan: "col-span-2" },
    { label: "Date of Transmission", name: "date_of_transmission", type: "date" },
    { label: "Date of Application", name: "date_of_application", type: "date" },
    { label: "School Year Graduated", name: "school_year_graduated", type: "date" },
    { label: "Control No.", name: "control_no" },
  ]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)
      const { data: userData } = await supabase.auth.getUser()
      if (!userData.user) return

      const created = await createForm({
        table: "cav_forms",
        data: formData,
        formType: 1,
        userId: userData.user.id,
        userEmail: userData.user.email!,
        label: "CAV Form",
      })

      if (!created?.id) {
        throw new Error("Form creation failed")
      }

      setSavedFormId(created.id)
      alert("Form successfully saved!")

    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center p-16">
      <div className="w-full max-w-6xl grid grid-cols-2 gap-12">

        {/* LEFT FORM CARD */}
        <Card className="p-10 rounded-2xl bg-card">
          <div className="grid grid-cols-2 gap-6">

            {fields.map((field) => (
              <div key={field.name} className={field.colSpan ?? ""}>
                <label className="text-sm text-muted-foreground">
                  {field.label}
                </label>
                <Input
                  type={field.type ?? "text"}
                  name={field.name}
                  value={formData[field.name]}
                  onChange={handleChange}
                  className="mt-1"
                />
              </div>
            ))}

            <div className="col-span-2 flex justify-end pt-6">
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "Submitting..." : "Submit"}
              </Button>
            </div>

          </div>
        </Card>

        {/* RIGHT PREVIEW CARD */}
        <Card
          onClick={() => {
            if (!savedFormId) {
              alert("Please submit the form first.")
              return
            }
            navigate(`/forms/cav/view/${savedFormId}`)
          }}
          className={`flex flex-col items-center justify-center p-10 rounded-2xl bg-card cursor-pointer transition ${
            savedFormId
              ? "hover:shadow-lg"
              : "opacity-50 cursor-not-allowed"
          }`}
        >

          <div className="w-[300px] h-[160px] rounded-xl overflow-hidden bg-gradient-to-r from-purple-600 via-pink-500 to-blue-600 flex items-center justify-center">
            <span className="text-white font-semibold">
              PREVIEW
            </span>
          </div>

          <div className="flex gap-4 mt-6">
            <div className="w-4 h-4 rounded-full bg-muted-foreground/40" />
            <div className="w-4 h-4 rounded-full bg-muted-foreground/20" />
            <div className="w-4 h-4 rounded-full bg-muted-foreground/20" />
            <div className="w-4 h-4 rounded-full bg-muted-foreground/20" />
          </div>

        </Card>

      </div>
    </div>
  )
}

export default CAV
