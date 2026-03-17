"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/dataTable/data-table-column-header"
import { DataTableRowActions } from "@/components/dataTable/data-table-row-actions"
import { getFormTypeShort } from "@/utils/formTypeUtils"
import type { AuditLog } from "@/types/audit"

const ACTION_STYLES: Record<string, string> = {
  created:     "bg-emerald-500/15 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20",
  updated:     "bg-blue-500/15 text-blue-400 border-blue-500/20 hover:bg-blue-500/20",
  archived:    "bg-amber-500/15 text-amber-500 border-amber-500/20 hover:bg-amber-500/20",
  restored:    "bg-cyan-500/15 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20",
  deleted:     "bg-rose-500/15 text-rose-500 border-rose-500/20 hover:bg-rose-500/20",
  deactivated: "bg-orange-500/15 text-orange-400 border-orange-500/20 hover:bg-orange-500/20",
  reactivated: "bg-violet-500/15 text-violet-400 border-violet-500/20 hover:bg-violet-500/20",
}

export const auditColumns: ColumnDef<AuditLog>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={table.getIsAllPageRowsSelected()}
        onCheckedChange={(value: any) =>
          table.toggleAllPageRowsSelected(!!value)
        }
        aria-label="Select all"
        className="translate-y-0.5"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value: any) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-0.5"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },

  {
    accessorKey: "audit_no",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Audit No" />
    ),
    cell: ({ row }) => (
      <div className="font-medium">
        {row.getValue("audit_no")}
      </div>
    ),
  },

  {
    accessorKey: "action",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Action" />
    ),
    cell: ({ row }) => {
      const action = row.getValue("action") as string
      const cls = ACTION_STYLES[action] ?? "bg-muted text-muted-foreground border-border"

      return (
        <Badge
          variant="outline"
          className={`border font-medium capitalize ${cls}`}
        >
          {action}
        </Badge>
      )
    },
    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id))
    },
  },

  {
    accessorKey: "user_email",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="User" />
    ),
  },

  {
    accessorKey: "event",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Event" />
    ),
    cell: ({ row }) => (
      <div className="max-w-100 truncate">
        {row.getValue("event")}
      </div>
    ),
  },

  // ── Form Type ──────────────────────────────────────────────
  {
    id: "form_type",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Form" />
    ),
    cell: ({ row }) => {
      const newData = row.original.new_data
      const formType = newData?.form_type ?? newData?.formType
      if (!formType) return <span className="text-muted-foreground/40 text-xs">—</span>
      return (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {getFormTypeShort(formType)}
        </Badge>
      )
    },
    enableSorting: false,
  },

  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Date & Time" />
    ),
    cell: ({ row }) => {
      const date = new Date(row.getValue("created_at"))
      return (
        <div className="text-muted-foreground">
          {date.toLocaleString()}
        </div>
      )
    },
  },

  {
    id: "actions",
    cell: ({ row }) => (
      <DataTableRowActions row={row} />
    ),
  },
]