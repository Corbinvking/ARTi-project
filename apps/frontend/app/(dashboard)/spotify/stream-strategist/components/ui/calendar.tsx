import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";
import { buttonVariants } from "./button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

export type CalendarProps = React.ComponentProps<typeof DayPicker> & {
  fromYear?: number;
  toYear?: number;
};

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  fromYear = new Date().getFullYear() - 10,
  toYear = new Date().getFullYear() + 5,
  ...props
}: CalendarProps) {
  const [month, setMonth] = React.useState(props.defaultMonth || new Date());

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const years = React.useMemo(() => {
    const yearList = [];
    for (let year = fromYear; year <= toYear; year++) {
      yearList.push(year);
    }
    return yearList;
  }, [fromYear, toYear]);

  const handleMonthChange = (newMonth: string) => {
    const monthIndex = months.indexOf(newMonth);
    const newDate = new Date(month);
    newDate.setMonth(monthIndex);
    setMonth(newDate);
  };

  const handleYearChange = (newYear: string) => {
    const newDate = new Date(month);
    newDate.setFullYear(parseInt(newYear));
    setMonth(newDate);
  };

  return (
    <div className={cn("p-4 pointer-events-auto bg-background/95 backdrop-blur-sm border border-border/50 rounded-xl shadow-xl z-50", className)}>
      {/* Month/Year Navigation Header */}
      <div className="flex items-center justify-between mb-4 gap-2">
        <button
          type="button"
          onClick={() => {
            const newDate = new Date(month);
            newDate.setMonth(newDate.getMonth() - 1);
            setMonth(newDate);
          }}
          className={cn(
            buttonVariants({ variant: "outline", size: "icon" }),
            "h-9 w-9 p-0 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
          )}
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-2 flex-1 justify-center">
          <Select value={months[month.getMonth()]} onValueChange={handleMonthChange}>
            <SelectTrigger className="w-[130px] h-9 text-sm font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {m}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={month.getFullYear().toString()} onValueChange={handleYearChange}>
            <SelectTrigger className="w-[90px] h-9 text-sm font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[200px]">
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <button
          type="button"
          onClick={() => {
            const newDate = new Date(month);
            newDate.setMonth(newDate.getMonth() + 1);
            setMonth(newDate);
          }}
          className={cn(
            buttonVariants({ variant: "outline", size: "icon" }),
            "h-9 w-9 p-0 hover:bg-primary/10 hover:text-primary hover:border-primary/30"
          )}
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Quick Navigation - Today button */}
      <div className="flex justify-center mb-3">
        <button
          type="button"
          onClick={() => setMonth(new Date())}
          className="text-xs text-muted-foreground hover:text-primary transition-colors underline-offset-2 hover:underline"
        >
          Go to Today
        </button>
      </div>

      <DayPicker
        showOutsideDays={showOutsideDays}
        month={month}
        onMonthChange={setMonth}
        className="p-0"
        classNames={{
          months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
          month: "space-y-3",
          caption: "hidden", // Hide default caption since we have custom navigation
          caption_label: "sr-only",
          nav: "hidden", // Hide default nav
          table: "w-full border-collapse",
          head_row: "flex",
          head_cell:
            "text-muted-foreground rounded-md w-10 font-medium text-[0.75rem] uppercase tracking-wide text-center",
          row: "flex w-full mt-1",
          cell: "h-10 w-10 text-center text-sm p-0.5 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-primary/10 [&:has([aria-selected])]:bg-primary/10 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
          day: cn(
            buttonVariants({ variant: "ghost" }),
            "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-primary/10 hover:text-primary transition-all rounded-lg text-sm"
          ),
          day_range_end: "day-range-end",
          day_selected:
            "bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground rounded-lg font-medium shadow-sm",
          day_today: "bg-accent text-accent-foreground font-semibold ring-2 ring-accent ring-offset-1 ring-offset-background rounded-lg",
          day_outside:
            "day-outside text-muted-foreground/40 opacity-50 aria-selected:bg-primary/10 aria-selected:text-muted-foreground aria-selected:opacity-40",
          day_disabled: "text-muted-foreground/30 opacity-30 cursor-not-allowed",
          day_range_middle:
            "aria-selected:bg-primary/10 aria-selected:text-accent-foreground",
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
