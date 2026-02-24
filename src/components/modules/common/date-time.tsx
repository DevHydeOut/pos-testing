"use client";

import { useState } from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type DateTimePickerProps = {
  value: { date: Date | null; time: string | null };
  onChange: (value: { date: Date | null; time: string | null }) => void;
  placeholder?: string;
  slots?: string[];
};

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Select date & time",
  slots = [],
}: DateTimePickerProps) {
  const [open, setOpen] = useState(false);

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      // Reset time to null when date changes
      onChange({ date, time: null });
    }
  };

  const handleTimeChange = (time: string) => {
    if (value.date) {
      // Don't close popover immediately, let user see the selection
      onChange({ date: value.date, time });
      // Close popover after a brief delay
      setTimeout(() => setOpen(false), 100);
    }
  };

  const formattedLabel =
    value.date && value.time
      ? `${format(value.date, "PPP")}, ${value.time}`
      : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="w-full justify-between"
          aria-label="Select date and time"
          type="button" // ✅ Prevent form submission
        >
          {formattedLabel}
          <CalendarIcon className="ml-2 h-5 w-5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[420px] p-0" align="start">
        <div className="flex rounded-md border bg-background p-4">
          <Calendar
            mode="single"
            selected={value.date ?? undefined}
            onSelect={handleDateChange}
            disabled={[{ before: new Date() }]}
            className="max-w-[280px]"
          />
          <div className="flex flex-col flex-1 ml-4 max-h-[320px]">
            <div className="flex justify-end mb-3">
              <p className="text-sm font-medium text-muted-foreground">
                {value.date ? format(value.date, "EEEE, d MMMM") : "Select a date"}
              </p>
            </div>
            {value.date && slots.length > 0 && (
              <ScrollArea className="flex-1 overflow-y-auto">
                <div className="flex flex-col space-y-2">
                  {slots.map((slot) => (
                    <Button
                      key={slot}
                      type="button" // ✅ Prevent form submission
                      variant={value.time === slot ? "default" : "outline"}
                      size="sm"
                      className="w-full text-center"
                      onClick={(e) => {
                        e.preventDefault(); // ✅ Prevent any default behavior
                        e.stopPropagation(); // ✅ Stop event bubbling
                        handleTimeChange(slot);
                      }}
                    >
                      {slot}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            )}
            {value.date && slots.length === 0 && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No slots available</p>
              </div>
            )}
            {!value.date && (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-sm text-muted-foreground">Select a date first</p>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}