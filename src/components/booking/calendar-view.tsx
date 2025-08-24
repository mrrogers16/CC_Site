"use client";

import { useState, useEffect, useMemo } from "react";
import { DayPicker } from "react-day-picker";
// DateRange type not used in this component currently
import { BUSINESS_RULES } from "@/lib/validations/appointments";
import "react-day-picker/style.css";
import "@/styles/calendar.css";

interface CalendarViewProps {
  selectedService: {
    id: string;
    title: string;
    duration: number;
    price: number;
  };
  selectedDate?: Date | undefined;
  onDateSelect: (date: Date) => void;
  onBack: () => void;
}

export default function CalendarView({
  selectedService,
  selectedDate,
  onDateSelect,
  onBack,
}: CalendarViewProps) {
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate date boundaries
  const today = useMemo(() => new Date(), []);
  const minDate = new Date(
    today.getTime() + BUSINESS_RULES.MIN_ADVANCE_HOURS * 60 * 60 * 1000
  );
  const maxDate = new Date(
    today.getTime() + BUSINESS_RULES.MAX_ADVANCE_DAYS * 24 * 60 * 60 * 1000
  );

  useEffect(() => {
    let isMounted = true;

    const fetchAvailableDates = async () => {
      if (!selectedService?.id) return;

      try {
        if (isMounted) {
          setLoading(true);
          setError(null);
        }

        // Fetch available dates for the next 30 days
        const dates: Date[] = [];
        const promises: Promise<Response>[] = [];

        for (let i = 1; i <= BUSINESS_RULES.MAX_ADVANCE_DAYS; i++) {
          const checkDate = new Date(today);
          checkDate.setDate(today.getDate() + i);
          checkDate.setHours(0, 0, 0, 0);

          // Skip weekends (Saturday = 6, Sunday = 0)
          if (checkDate.getDay() === 0 || checkDate.getDay() === 6) {
            continue;
          }

          const dateStr = checkDate.toISOString().split("T")[0];
          promises.push(
            fetch(
              `/api/appointments/available?date=${dateStr}&serviceId=${selectedService.id}`
            )
          );
          dates.push(checkDate);
        }

        const responses = await Promise.all(promises);
        const availableDatesSet = new Set<string>();

        for (let i = 0; i < responses.length; i++) {
          const response = responses[i];
          if (response?.ok) {
            const data = await response.json();
            if (data.slots && data.slots.length > 0) {
              // Check if any slots are available
              const hasAvailableSlots = data.slots.some(
                (slot: { available: boolean }) => slot.available
              );
              if (hasAvailableSlots && dates[i]) {
                const dateStr = dates[i]?.toISOString().split("T")[0];
                if (dateStr) {
                  availableDatesSet.add(dateStr);
                }
              }
            }
          }
        }

        const availableDatesArray = dates.filter(date => {
          const dateStr = date?.toISOString().split("T")[0];
          return dateStr && availableDatesSet.has(dateStr);
        });

        if (isMounted) {
          setAvailableDates(availableDatesArray);
        }
      } catch (error) {
        if (isMounted) {
          setError("Failed to load available dates. Please try again.");
          console.error("Error fetching available dates:", error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchAvailableDates();

    return () => {
      isMounted = false;
    };
  }, [selectedService?.id, today]);

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;

    // Ensure we're selecting a valid date
    const selectedDateStr = date.toISOString().split("T")[0];
    const isAvailable = availableDates.some(
      availableDate =>
        availableDate.toISOString().split("T")[0] === selectedDateStr
    );

    if (isAvailable) {
      onDateSelect(date);
    }
  };

  const modifiers = {
    available: availableDates,
    weekend: (date: Date) => date.getDay() === 0 || date.getDay() === 6,
  };

  const disabledDays = (date: Date) => {
    // Disable past dates
    if (date < minDate) return true;
    // Disable dates beyond booking window
    if (date > maxDate) return true;
    // Disable weekends
    if (date.getDay() === 0 || date.getDay() === 6) return true;
    // Disable dates without available slots
    const dateStr = date.toISOString().split("T")[0];
    return !availableDates.some(
      availableDate => availableDate.toISOString().split("T")[0] === dateStr
    );
  };

  const modifiersClassNames = {
    available: "rdp-day_available",
    weekend: "rdp-day_weekend",
    selected: "rdp-day_selected",
    today: "rdp-day_today",
    disabled: "rdp-day_disabled",
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl font-light mb-2">
              Select a Date
            </h2>
            <p className="text-muted-foreground">Loading available dates...</p>
          </div>
          <button
            onClick={onBack}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary hover:text-background transition-colors"
          >
            ← Back to Services
          </button>
        </div>
        <div
          className="bg-background border border-border rounded-lg p-8"
          data-testid="calendar-loading"
        >
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-48 mx-auto" />
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 42 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl font-light mb-2">
              Select a Date
            </h2>
          </div>
          <button
            onClick={onBack}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary hover:text-background transition-colors"
          >
            ← Back to Services
          </button>
        </div>
        <div className="text-center py-12 bg-background border border-border rounded-lg">
          <div className="mb-4">
            <svg
              className="mx-auto h-12 w-12 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">
            Unable to Load Calendar
          </h3>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center px-4 py-2 border border-primary text-primary hover:bg-primary hover:text-background rounded-md transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-light mb-2">Select a Date</h2>
          <p className="text-muted-foreground">
            Choose an available date for your {selectedService.title} session.
          </p>
        </div>
        <button
          onClick={onBack}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary hover:text-background transition-colors"
        >
          ← Back to Services
        </button>
      </div>

      <div className="bg-background border border-border rounded-lg p-6">
        <DayPicker
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          fromDate={minDate}
          toDate={maxDate}
          disabled={disabledDays}
          showOutsideDays={false}
          fixedWeeks={true}
          className="rdp"
          classNames={{
            nav: "rdp-nav",
            nav_button: "rdp-nav_button",
            nav_button_previous: "rdp-nav_button rdp-nav_button_previous",
            nav_button_next: "rdp-nav_button rdp-nav_button_next",
            table: "rdp-table",
            head_cell: "rdp-head_cell",
            cell: "rdp-cell",
            button: "rdp-button rdp-button_reset",
            day: "rdp-day",
            day_selected: "rdp-day_selected",
            day_today: "rdp-day_today",
            day_outside: "rdp-day_outside",
            day_disabled: "rdp-day_disabled",
            day_hidden: "rdp-day_hidden",
            caption: "rdp-caption",
            caption_label: "rdp-caption_label",
            months: "rdp-months",
            month: "rdp-month",
          }}
          labels={{
            labelPrevious: () => "Go to previous month",
            labelNext: () => "Go to next month",
          }}
        />

        {availableDates.length === 0 && !loading && !error && (
          <div className="text-center py-8">
            <h3 className="text-lg font-medium text-foreground mb-2">
              No Available Dates
            </h3>
            <p className="text-muted-foreground">
              There are currently no available appointment slots for this
              service. Please contact us directly or try a different service.
            </p>
          </div>
        )}

        {/* Legend */}
        <div className="rdp-legend">
          <div className="rdp-legend-item">
            <div className="rdp-legend-dot rdp-legend-dot--available" />
            <span>Available</span>
          </div>
          <div className="rdp-legend-item">
            <div className="rdp-legend-dot rdp-legend-dot--selected" />
            <span>Selected</span>
          </div>
          <div className="rdp-legend-item">
            <div className="rdp-legend-dot rdp-legend-dot--today" />
            <span>Today</span>
          </div>
          <div className="rdp-legend-item">
            <div className="rdp-legend-dot rdp-legend-dot--unavailable" />
            <span>Unavailable</span>
          </div>
        </div>
      </div>

      {availableDates.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          <p>
            Showing {availableDates.length} available date
            {availableDates.length === 1 ? "" : "s"} for your selection.
          </p>
          <p className="mt-1">
            Appointments must be booked at least{" "}
            {BUSINESS_RULES.MIN_ADVANCE_HOURS} hours in advance.
          </p>
        </div>
      )}
    </div>
  );
}
