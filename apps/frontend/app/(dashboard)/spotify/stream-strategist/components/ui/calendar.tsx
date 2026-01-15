import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  fromYear?: number;
  toYear?: number;
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  fromYear = new Date().getFullYear() - 5,
  toYear = new Date().getFullYear() + 2,
  ...props
}: CalendarProps) {
  const [month, setMonth] = React.useState(props.defaultMonth || props.selected as Date || new Date());

  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];

  const years = React.useMemo(() => {
    const yearList = [];
    for (let year = fromYear; year <= toYear; year++) {
      yearList.push(year);
    }
    return yearList;
  }, [fromYear, toYear]);

  const handleGoToToday = () => {
    const today = new Date();
    setMonth(today);
    // If onSelect is provided (single mode), select today
    if (props.mode === 'single' && props.onSelect) {
      (props.onSelect as (date: Date | undefined) => void)(today);
    }
  };

  return (
    <div className={cn("p-4 bg-popover border rounded-lg shadow-lg min-w-[280px]", className)}>
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() => {
            const newDate = new Date(month);
            newDate.setMonth(newDate.getMonth() - 1);
            setMonth(newDate);
          }}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "h-8 w-8 p-0"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2">
          <select
            value={month.getMonth()}
            onChange={(e) => {
              const newDate = new Date(month);
              newDate.setMonth(parseInt(e.target.value));
              setMonth(newDate);
            }}
            className="text-sm font-semibold bg-muted/50 border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            {months.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>

          <select
            value={month.getFullYear()}
            onChange={(e) => {
              const newDate = new Date(month);
              newDate.setFullYear(parseInt(e.target.value));
              setMonth(newDate);
            }}
            className="text-sm font-semibold bg-muted/50 border border-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
          >
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleGoToToday}
            className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            Today
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            const newDate = new Date(month);
            newDate.setMonth(newDate.getMonth() + 1);
            setMonth(newDate);
          }}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "h-8 w-8 p-0"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <DayPicker
        showOutsideDays={showOutsideDays}
        month={month}
        onMonthChange={setMonth}
        className="p-0"
        classNames={{
          months: "flex flex-col",
          month: "space-y-3",
          caption: "hidden",
          caption_label: "sr-only",
          nav: "hidden",
          table: "w-full border-collapse",
          head_row: "grid grid-cols-7 gap-1 mb-1",
          head_cell: "text-muted-foreground font-medium text-xs text-center py-1",
          row: "grid grid-cols-7 gap-1",
          cell: "h-9 w-9 text-center text-sm p-0 relative focus-within:relative focus-within:z-20",
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-9 w-9 p-0 font-normal hover:bg-muted transition-colors rounded-md text-sm"
          ),
          day_range_end: "day-range-end",
          day_selected: "bg-primary text-primary-foreground hover:bg-primary/90 font-medium",
          day_today: "ring-2 ring-primary text-primary font-semibold",
          day_outside: "text-muted-foreground/40 opacity-50",
          day_disabled: "text-muted-foreground/30 opacity-30 cursor-not-allowed",
          day_range_middle: "aria-selected:bg-primary/10",
          day_hidden: "invisible",
          ...classNames,
        }}
        {...props}
      />
    </div>
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
