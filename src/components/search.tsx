"use client"

import * as React from "react"
import { useNavigate } from "react-router-dom"
import {
  Command,
  CommandInput,
} from "@/components/ui/command"

import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"

import { Badge } from "@/components/ui/badge"
import { Search } from "lucide-react"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Button } from "./animate-ui/components/buttons/button"

export default function SearchCommand() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const navigate = useNavigate()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const handleSearch = () => {
    if (!query.trim()) return

    navigate(`/?search=${encodeURIComponent(query.trim())}`)
    setOpen(false)
    setQuery("")
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="flex w-full max-w-3xl items-center justify-between rounded-2xl border bg-background px-6 py-5 text-base text-muted-foreground shadow-sm transition hover:bg-accent"
      >
        <div className="flex items-center gap-3">
          <Search className="h-5 w-5" />
          <span>Search students for their documents...</span>
        </div>
        <Badge variant="secondary">Ctrl K</Badge>
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl w-full h-[200px] p-0 overflow-hidden">
          <VisuallyHidden>
            <DialogTitle>Search</DialogTitle>
            <DialogDescription>
              Search student documents.
            </DialogDescription>
          </VisuallyHidden>

          <Command className="flex h-full flex-col rounded-lg border shadow-md">
            <div className="border-b">
              <CommandInput
                placeholder="Type student name and press Enter..."
                className="h-16 text-[1rem]"
                value={query}
                onValueChange={setQuery}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch()
                  }
                }}
                autoFocus
              />
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}