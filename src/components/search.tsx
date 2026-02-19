"use client"

import * as React from "react"
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { CornerDownLeft, ArrowUp, ArrowDown, Search } from "lucide-react"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"
import { Button } from "./animate-ui/components/buttons/button"

export default function SearchCommand() {
  const [open, setOpen] = React.useState(false)

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

  const handleSelect = (value: string) => {
    console.log("Selected:", value)
    setOpen(false)
  }

  return (
    <>
    <Button
        onClick={() => setOpen(true)}
        className="
            group
            flex w-full max-w-3xl items-center justify-between
            rounded-2xl border bg-background
            px-6 py-5
            text-base text-muted-foreground
            shadow-sm
            transition
            hover:bg-accent
            focus-visible:ring-2 focus-visible:ring-ring
        "
        >
        <div className="flex items-center gap-3">
            <Search className="h-5 w-5" />
            <span className="text-base">
            Search students for their documents...
            </span>
        </div>

        <Badge
            variant="secondary"
            className="font-mono text-sm px-2 py-1"
        >
            Ctrl K
        </Badge>
    </Button>
    <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
            className="
                max-w-4xl
                w-250
                h-100
                p-0
                overflow-hidden
            "
            >
            <VisuallyHidden>
            <DialogTitle>Search</DialogTitle>
            <DialogDescription>
                Search and navigate using the command palette.
            </DialogDescription>
            </VisuallyHidden>

            <Command className="flex h-full flex-col rounded-lg border shadow-md">
            <div className="border-b">
                <CommandInput
                placeholder="Search forms, students, documents…"
                className="h-16 text-[1rem]"
                autoFocus
                />
            </div>

            <CommandList className="flex-1 overflow-y-auto">
                <CommandEmpty>No results found.</CommandEmpty>

                <CommandGroup heading="Student Data">
                    <CommandItem value="student-1" onSelect={handleSelect}>
                        Nothing yet ^v^
                    </CommandItem>
                    <CommandItem value="student-2" onSelect={handleSelect}>
                        Nothing yet ^v^
                    </CommandItem>
                    <CommandItem value="student-3" onSelect={handleSelect}>
                        Nothing yet ^v^
                    </CommandItem>
                    <CommandItem value="student-4" onSelect={handleSelect}>
                        Nothing yet ^v^
                    </CommandItem>
                    <CommandItem value="student-5" onSelect={handleSelect}>
                        Nothing yet ^v^
                    </CommandItem>
                    <CommandItem value="student-6" onSelect={handleSelect}>
                        Nothing yet ^v^
                    </CommandItem>
                    <CommandItem value="student-7" onSelect={handleSelect}>
                        Nothing yet ^v^
                    </CommandItem>
                    <CommandItem value="student-8" onSelect={handleSelect}>
                        Nothing yet ^v^
                    </CommandItem>
                    <CommandItem value="student-9" onSelect={handleSelect}>
                        Nothing yet ^v^
                    </CommandItem>
                </CommandGroup>
            </CommandList>

            <div className="border-t px-6 py-4 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                <div className="flex gap-3">
                    <Badge variant="outline" className="flex items-center gap-1">
                    <CornerDownLeft className="h-4 w-4" />
                    Open
                    </Badge>

                    <Badge variant="outline" className="flex items-center gap-1">
                    <ArrowUp className="h-4 w-4" />
                    <ArrowDown className="h-4 w-4" />
                    Navigate
                    </Badge>
                </div>
                <span>Esc to close</span>
                </div>
            </div>
            </Command>

        </DialogContent>
    </Dialog>
    </>
  )
}
