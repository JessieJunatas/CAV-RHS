// src/pages/Information/audit/audit.tsx
import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { DataTable } from "@/components/dataTable/data-table"
import { auditColumns } from "@/components/audit-comp/audit-columns"
import type { AuditLog } from "@/types/audit"
import { DataTableLoading } from "@/components/dataTable/data-table-skeleton"
import { ScrollText } from "lucide-react"
import { useCollapse } from "@/context/collapse-provider"

export default function Audit() {
  const { px } = useCollapse()   // ← NEW
  const [data, setData] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAuditLogs = async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })

      if (!error && data) setData(data)
      setLoading(false)
    }

    fetchAuditLogs()
  }, [])

  if (loading) {
    return (
      <div className={`${px} pt-5 transition-all duration-300`}>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center bg-secondary justify-center rounded-xl">
            <ScrollText className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Audit Logs</h1>
        </div>
        <div className="pt-3">
          <DataTableLoading columnCount={1} />
        </div>
      </div>
    )
  }

  return (
    <div className={`${px} pt-5 transition-all duration-300`}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center bg-primary justify-center rounded-xl">
          <ScrollText className="h-5 w-5 text-secondary" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">Audit Logs</h1>
      </div>
      <div className="pt-3">
        <DataTable
          columns={auditColumns}
          data={data}
        />
      </div>
    </div>
  )
}