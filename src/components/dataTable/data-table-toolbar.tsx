"use client"

import type { Table } from "@tanstack/react-table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DataTableFacetedFilter } from "./data-table-faceted-filter"
import { DataTableViewOptions } from "./data-table-view-options"
import { X } from "lucide-react"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

const actionOptions = [
  { label: "Created", value: "created" },
  { label: "Updated", value: "updated" },
  { label: "Archived", value: "archived" },
  { label: "Deleted", value: "deleted" },
]

export function DataTableToolbar<TData>({
  table,
}: DataTableToolbarProps<TData>) {

  const isFiltered = table.getState().columnFilters.length > 0

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

      <div className="flex flex-1 items-center gap-2">

        <Input
          placeholder="Search audit no or user..."
          value={
            (table.getColumn("audit_no")?.getFilterValue() as string) ?? ""
          }
          onChange={(event) =>
            table.setGlobalFilter(event.target.value)
          }
          className="h-9 w-[200px] lg:w-[300px]"
        />

        {table.getColumn("action") && (
          <DataTableFacetedFilter
            column={table.getColumn("action")}
            title="Action"
            options={actionOptions}
          />
        )}

        {isFiltered && (
          <Button
            variant="ghost"
            onClick={() => table.resetColumnFilters()}
            className="h-9 px-3"
          >
            Reset
            <X className="ml-2 h-4 w-4" />
          </Button>
        )}

      </div>

      <DataTableViewOptions table={table} />

    </div>
  )
}