"use client"

import * as React from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import {
  Command,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Search, ArrowRight, Clock, FileText, Hash } from "lucide-react"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Button } from "./animate-ui/components/buttons/button"

const RECENT_KEY = "search_recent"

function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") }
  catch { return [] }
}
function saveRecent(query: string) {
  const prev = getRecent().filter((q) => q !== query)
  localStorage.setItem(RECENT_KEY, JSON.stringify([query, ...prev].slice(0, 5)))
}

interface SuggestedRecord {
  id: number
  full_legal_name: string
  control_no: string
  form_type: number
}

function getFormLabel(type: number) {
  switch (type) {
    case 1: return "CAV"
    case 2: return "SF10"
    default: return "Form"
  }
}

export default function SearchCommand() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [recent, setRecent] = React.useState<string[]>([])
  const [suggestions, setSuggestions] = React.useState<SuggestedRecord[]>([])
  const [fetching, setFetching] = React.useState(false)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const navigate = useNavigate()

  React.useEffect(() => {
    if (open) setRecent(getRecent())
  }, [open])

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement).isContentEditable) return

      if (e.key === "/") {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  // Debounced live fetch
  React.useEffect(() => {
    const trimmed = query.trim()
    if (!trimmed) {
      setSuggestions([])
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setFetching(true)
      const { data } = await supabase
        .from("cav_forms")
        .select("id, full_legal_name, control_no, form_type")
        .eq("is_archived", false)
        .ilike("full_legal_name", `%${trimmed}%`)
        .limit(5)
      setSuggestions(data ?? [])
      setFetching(false)
    }, 250)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  const handleSearch = (q?: string) => {
    const term = (q ?? query).trim()
    if (!term) return
    saveRecent(term)
    navigate(`/?search=${encodeURIComponent(term)}`, { replace: false })
    setOpen(false)
    setQuery("")
    setSuggestions([])
  }

  const handleSelectRecord = (record: SuggestedRecord) => {
    saveRecent(record.full_legal_name)
    navigate(`/?search=${encodeURIComponent(record.full_legal_name)}`, { replace: false })
    setOpen(false)
    setQuery("")
    setSuggestions([])
  }

  const trimmed = query.trim()

  return (
    <>
      {/* Trigger */}
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="flex w-full max-w-3xl items-center justify-between rounded-xl border border-border/60 bg-background/80 px-4 py-2.5 text-sm text-muted-foreground shadow-sm backdrop-blur transition-all hover:border-border hover:bg-accent hover:shadow-md group"
      >
        <div className="flex items-center gap-2.5">
          <Search className="h-4 w-4 text-muted-foreground/60 group-hover:text-foreground transition-colors" />
          <span>Search student documents...</span>
        </div>
    <kbd className="inline-flex h-5 items-center gap-0.5 rounded border border-border bg-muted px-1.5 text-[10px] font-medium text-muted-foreground">
      /
    </kbd>
      </Button>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setQuery(""); setSuggestions([]) } }}>
        <DialogContent className="max-w-2xl w-full p-0 overflow-hidden gap-0 shadow-2xl border-border/80">
          <VisuallyHidden>
            <DialogTitle>Search</DialogTitle>
            <DialogDescription>Search student documents.</DialogDescription>
          </VisuallyHidden>

          <Command className="flex h-full flex-col rounded-xl" shouldFilter={false}>

            {/* Input row */}
            <div className="flex items-center border-b border-border/60 px-2">
              <CommandInput
                placeholder="Search by student name..."
                className="h-14 flex-1 text-[15px]"
                value={query}
                onValueChange={setQuery}
                onKeyDown={(e) => { if (e.key === "Enter") handleSearch() }}
                autoFocus
              />
            </div>

            <CommandList className="max-h-80 overflow-y-auto">

              {/* Live autocomplete results */}
              {trimmed && suggestions.length > 0 && (
                <CommandGroup heading="Students">
                  {suggestions.map((record) => (
                    <CommandItem
                      key={record.id}
                      onSelect={() => handleSelectRecord(record)}
                      className="flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg mx-1 my-0.5"
                    >
                      {/* Avatar */}
                      <img
                        src={`https://avatar.vercel.sh/${encodeURIComponent(record.full_legal_name)}`}
                        alt={record.full_legal_name}
                        className="h-10 w-10 shrink-0 rounded-lg object-cover"
                      />

                      {/* Details */}
                      <div className="flex flex-1 flex-col min-w-0">
                        <span className="text-sm font-medium truncate">{record.full_legal_name}</span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                            <Hash className="h-2.5 w-2.5" />
                            {record.control_no}
                          </span>
                          <span className="flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                            <FileText className="h-2.5 w-2.5" />
                            {getFormLabel(record.form_type)}
                          </span>
                        </div>
                      </div>

                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Fetching indicator */}
              {trimmed && fetching && suggestions.length === 0 && (
                <div className="flex items-center justify-center py-8">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}

              {/* No results */}
              {trimmed && !fetching && suggestions.length === 0 && (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <p className="text-sm text-muted-foreground">No students found for "<span className="font-medium text-foreground">{trimmed}</span>"</p>
                  <button
                    onClick={() => handleSearch()}
                    className="mt-2 text-xs text-primary hover:underline"
                  >
                    Search all records anyway →
                  </button>
                </div>
              )}

              {/* Recent searches (shown when input is empty) */}
              {!trimmed && recent.length > 0 && (
                <CommandGroup heading="Recent searches">
                  {recent.map((r) => (
                    <CommandItem
                      key={r}
                      onSelect={() => handleSearch(r)}
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer rounded-lg mx-1"
                    >
                      <Clock className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                      <span className="flex-1 text-sm text-muted-foreground">{r}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30" />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {/* Empty state */}
              {!trimmed && recent.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Search className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Search student documents</p>
                  <p className="mt-1 text-xs text-muted-foreground/60">Type a student name to see suggestions</p>
                </div>
              )}

            </CommandList>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-border/40 px-4 py-2">
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
                <kbd className="rounded border border-border bg-muted px-1 text-md">↵</kbd>
                to search
              </span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground/50">
                <kbd className="rounded border border-border bg-muted px-1 text-md">esc</kbd>
                to close
              </span>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}