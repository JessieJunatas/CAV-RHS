import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { useNavigate } from "react-router-dom"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/animate-ui/components/buttons/button"

function Archive() {
  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const fetchArchived = async () => {
      const { data, error } = await supabase
        .from("cav_forms")
        .select("*")
        .eq("is_archived", true)
        .order("created_at", { ascending: false })

      if (!error && data) {
        setRecords(data)
      }

      setLoading(false)
    }

    fetchArchived()
  }, [])

  const handleRestore = async (id: number) => {
    const { error } = await supabase
      .from("cav_forms")
      .update({ is_archived: false })
      .eq("id", id)

    if (error) {
      alert("Restore failed: " + error.message)
      return
    }

    alert("Record restored!")
    setRecords(records.filter(r => r.id !== id))
  }

  if (loading) return <div className="p-10">Loading...</div>

  return (
    <div className="min-h-screen bg-zinc-100 p-10">
      <h1 className="text-2xl font-bold mb-6">Archived Records</h1>

      {records.length === 0 && (
        <p>No archived records.</p>
      )}

      <div className="space-y-4">
        {records.map((record) => (
          <Card key={record.id} className="p-6 flex justify-between items-center">
            <div>
              <p className="font-semibold">{record.full_legal_name}</p>
              <p className="text-sm text-muted-foreground">
                Control No: {record.control_no}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={() => navigate(`/view/${record.id}`)}
              >
                View
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRestore(record.id)}
              >
                Restore
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

export default Archive