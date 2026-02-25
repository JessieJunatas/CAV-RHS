import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { DataTable } from "@/components/dataTable/data-table"
import { auditColumns } from "@/components/audit-comp/audit-columns"
import type { AuditLog } from "@/types/audit"

export default function Audit() {
  const [data, setData] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAuditLogs = async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })

      if (!error && data) {
        setData(data)
      }

      setLoading(false)
    }

    fetchAuditLogs()
  }, [])

  if (loading) {
    return <div className="p-6">Loading audit logs...</div>
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">
        Audit Logs
      </h1>

      <DataTable
        columns={auditColumns}
        data={data}
      />
    </div>
  )
}