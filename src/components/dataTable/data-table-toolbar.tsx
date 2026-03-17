"use client"

import type { Table } from "@tanstack/react-table"
import { Button } from "@/components/animate-ui/components/buttons/button"
import { DataTableFacetedFilter } from "./data-table-faceted-filter"
import { DataTableViewOptions } from "./data-table-view-options"
import { Search, X } from "lucide-react"

interface DataTableToolbarProps<TData> {
  table: Table<TData>
}

const actionOptions = [
  { label: "Created",  value: "created"  },
  { label: "Updated",  value: "updated"  },
  { label: "Archived", value: "archived" },
  { label: "Deleted",  value: "deleted"  },
]

export function DataTableToolbar<TData>({ table }: DataTableToolbarProps<TData>) {
  const isFiltered =
    table.getState().columnFilters.length > 0 ||
    !!table.getState().globalFilter

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 items-center gap-2">

        {/* Search bar */}
        <div className="group flex items-center gap-2 h-9 w-50 lg:w-75 rounded-md border border-input bg-background px-3 ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 transition-all">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground/60 group-focus-within:text-foreground transition-colors" />
          <input
            placeholder="Search audit no..."
            value={(table.getState().globalFilter as string) ?? ""}
            onChange={(e) => table.setGlobalFilter(e.target.value)}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 min-w-0"
          />
        </div>

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
            onClick={() => {
              table.resetColumnFilters()
              table.setGlobalFilter("")
            }}
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