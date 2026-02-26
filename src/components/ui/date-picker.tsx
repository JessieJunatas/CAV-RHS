import { useState, useEffect } from "react"
import { format, parseISO, getDaysInMonth, setMonth, setYear } from "date-fns"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"

interface DatePickerProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  className?: string
  placeholder?: string
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

type View = "days" | "months" | "years"

export function DatePicker({
  value,
  onChange,
  disabled,
  className,
  placeholder = "Pick a date",
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<View>("days")

  const parsed = value ? parseISO(value) : null
  const today = new Date()

  const [cursor, setCursor] = useState<Date>(parsed ?? today)

  // Sync cursor when value changes externally
  useEffect(() => {
    if (parsed) setCursor(parsed)
  }, [value])

  const cursorYear = cursor.getFullYear()
  const cursorMonth = cursor.getMonth()

  // Year range for year picker
  const yearStart = Math.floor(cursorYear / 12) * 12
  const years = Array.from({ length: 12 }, (_, i) => yearStart + i)

  // Build calendar days
  const firstDayOfMonth = new Date(cursorYear, cursorMonth, 1).getDay()
  const daysInMonth = getDaysInMonth(cursor)
  const daysInPrevMonth = getDaysInMonth(new Date(cursorYear, cursorMonth - 1))
  const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7

  const cells: { date: Date; current: boolean }[] = []
  for (let i = 0; i < totalCells; i++) {
    if (i < firstDayOfMonth) {
      cells.push({ date: new Date(cursorYear, cursorMonth - 1, daysInPrevMonth - firstDayOfMonth + i + 1), current: false })
    } else if (i < firstDayOfMonth + daysInMonth) {
      cells.push({ date: new Date(cursorYear, cursorMonth, i - firstDayOfMonth + 1), current: true })
    } else {
      cells.push({ date: new Date(cursorYear, cursorMonth + 1, i - firstDayOfMonth - daysInMonth + 1), current: false })
    }
  }

  const isSelected = (date: Date) =>
    parsed &&
    date.getFullYear() === parsed.getFullYear() &&
    date.getMonth() === parsed.getMonth() &&
    date.getDate() === parsed.getDate()

  const isToday = (date: Date) =>
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()

  const selectDay = (date: Date) => {
    onChange(format(date, "yyyy-MM-dd"))
    setOpen(false)
    setView("days")
  }

  const prevMonth = () => setCursor(new Date(cursorYear, cursorMonth - 1, 1))
  const nextMonth = () => setCursor(new Date(cursorYear, cursorMonth + 1, 1))
  const prevYearRange = () => setCursor(new Date(yearStart - 12, cursorMonth, 1))
  const nextYearRange = () => setCursor(new Date(yearStart + 12, cursorMonth, 1))

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setView("days") }}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 w-full justify-start text-left font-normal rounded-lg border-border/60 bg-background text-sm",
            !parsed && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="h-3.5 w-3.5 mr-2 opacity-50 shrink-0" />
          {parsed ? format(parsed, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-0 rounded-xl overflow-hidden shadow-xl" align="start">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50 bg-muted/30">
          {view === "days" && (
            <>
              <button onClick={prevMonth} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setView("months")}
                  className="text-sm font-semibold px-2 py-0.5 rounded-md hover:bg-accent transition-colors"
                >
                  {MONTHS[cursorMonth]}
                </button>
                <button
                  onClick={() => setView("years")}
                  className="text-sm font-semibold px-2 py-0.5 rounded-md hover:bg-accent transition-colors"
                >
                  {cursorYear}
                </button>
              </div>
              <button onClick={nextMonth} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          {view === "months" && (
            <>
              <div />
              <button
                onClick={() => setView("years")}
                className="text-sm font-semibold px-2 py-0.5 rounded-md hover:bg-accent transition-colors"
              >
                {cursorYear}
              </button>
              <button
                onClick={() => setView("days")}
                className="text-xs text-muted-foreground px-2 py-0.5 rounded-md hover:bg-accent transition-colors"
              >
                ✕
              </button>
            </>
          )}

          {view === "years" && (
            <>
              <button onClick={prevYearRange} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold">{yearStart} – {yearStart + 11}</span>
              <button onClick={nextYearRange} className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-accent transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}
        </div>

        {/* ── Day view ── */}
        {view === "days" && (
          <div className="p-3">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS.map(d => (
                <div key={d} className="h-8 flex items-center justify-center text-[11px] font-medium text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-y-0.5">
              {cells.map(({ date, current }, i) => {
                const selected = isSelected(date)
                const todayCell = isToday(date)
                return (
                  <button
                    key={i}
                    onClick={() => selectDay(date)}
                    className={cn(
                      "h-8 w-full rounded-md text-xs font-medium transition-colors",
                      !current && "text-muted-foreground/40",
                      current && !selected && !todayCell && "hover:bg-accent",
                      todayCell && !selected && "text-primary font-bold",
                      selected && "bg-primary text-primary-foreground hover:bg-primary/90",
                    )}
                  >
                    {date.getDate()}
                  </button>
                )
              })}
            </div>

            {/* Today shortcut */}
            <div className="mt-2 pt-2 border-t border-border/40">
              <button
                onClick={() => selectDay(today)}
                className="w-full text-xs text-muted-foreground hover:text-foreground py-1 rounded-md hover:bg-accent transition-colors"
              >
                Today — {format(today, "MMM d, yyyy")}
              </button>
            </div>
          </div>
        )}

        {/* ── Month view ── */}
        {view === "months" && (
          <div className="p-3 grid grid-cols-3 gap-1.5">
            {MONTHS.map((month, i) => {
              const isCurrentMonth = parsed && parsed.getMonth() === i && parsed.getFullYear() === cursorYear
              return (
                <button
                  key={month}
                  onClick={() => {
                    setCursor(setMonth(cursor, i))
                    setView("days")
                  }}
                  className={cn(
                    "py-2 rounded-lg text-xs font-medium transition-colors",
                    isCurrentMonth
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-accent text-foreground"
                  )}
                >
                  {month.slice(0, 3)}
                </button>
              )
            })}
          </div>
        )}

        {/* ── Year view ── */}
        {view === "years" && (
          <div className="p-3 grid grid-cols-3 gap-1.5">
            {years.map((year) => {
              const isCurrentYear = parsed && parsed.getFullYear() === year
              const isCursorYear = cursorYear === year
              return (
                <button
                  key={year}
                  onClick={() => {
                    setCursor(setYear(cursor, year))
                    setView("months")
                  }}
                  className={cn(
                    "py-2 rounded-lg text-xs font-medium transition-colors",
                    isCurrentYear
                      ? "bg-primary text-primary-foreground"
                      : isCursorYear
                      ? "bg-accent"
                      : "hover:bg-accent text-foreground"
                  )}
                >
                  {year}
                </button>
              )
            })}
          </div>
        )}

      </PopoverContent>
    </Popover>
  )
}