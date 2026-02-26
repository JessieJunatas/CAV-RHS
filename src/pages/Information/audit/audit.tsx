import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { DataTable } from "@/components/dataTable/data-table"
import { auditColumns } from "@/components/audit-comp/audit-columns"
import type { AuditLog } from "@/types/audit"
import { DataTableLoading } from "@/components/dataTable/data-table-skeleton"
import { ScrollText } from "lucide-react"

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
    return (
      <div className="">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
            <ScrollText className="h-5 w-5 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">
            Audit Logs
          </h1>
        </div>
      <div className="pt-3">
        <DataTableLoading
          columnCount={1}
        />
      </div>
      </div>
    )
  }

  return (
    <div className="px-5 pt-5">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
          <ScrollText className="h-5 w-5 text-muted-foreground" />
        </div>
        <h1 className="text-xl font-bold tracking-tight">
          Audit Logs
        </h1>
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