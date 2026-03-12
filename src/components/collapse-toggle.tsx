// src/components/collapse-toggle.tsx
import { PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { useCollapse } from "@/context/collapse-provider"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export function CollapseToggle() {
  const { collapsed, toggle } = useCollapse()

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
            aria-label={collapsed ? "Expand layout" : "Collapse layout"}
          >
            {collapsed
              ? <PanelLeftOpen className="h-4 w-4" />
              : <PanelLeftClose className="h-4 w-4" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {collapsed ? "Expand layout" : "Collapse layout"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}