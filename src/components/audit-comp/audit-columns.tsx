"use client"

import type { ColumnDef } from "@tanstack/react-table"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { DataTableColumnHeader } from "@/components/dataTable/data-table-column-header"
import { DataTableRowActions } from "@/components/dataTable/data-table-row-actions" 
import type { AuditLog } from "@/types/audit"

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
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value: any) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
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

      const variant =
        action === "created"
          ? "default"
          : action === "updated"
          ? "secondary"
          : action === "archived"
          ? "outline"
          : action === "deleted"
          ? "destructive"
          : "outline"

      return (
        <Badge variant={variant}>
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
      <div className="max-w-[400px] truncate">
        {row.getValue("event")}
      </div>
    ),
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
