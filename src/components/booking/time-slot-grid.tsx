"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface TimeSlot {
  dateTime: Date;
  available: boolean;
  reason?: string;
}

interface TimeSlotGridProps {
  selectedService: {
    id: string;
    title: string;
    duration: number;
    price: number;
  };
  selectedDate: Date;
  selectedTime?: Date | undefined;
  onTimeSelect: (dateTime: Date) => void;
  onBack: () => void;
}

export default function TimeSlotGrid({
  selectedService,
  selectedDate,
  selectedTime,
  onTimeSelect,
  onBack,
}: TimeSlotGridProps) {
  const [selectedSlot, setSelectedSlot] = useState<Date | undefined>(
    selectedTime
  );

  const dateStr = selectedDate.toISOString().split("T")[0];

  // Fetch available time slots
  const {
    data: slotsData,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["available-slots", dateStr, selectedService.id],
    queryFn: async () => {
      const response = await fetch(
        `/api/appointments/available?date=${dateStr}&serviceId=${selectedService.id}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch time slots");
      }

      const data = await response.json();

      // Convert string dates back to Date objects
      const slots =
        data.slots?.map(
          (slot: {
            dateTime: string;
            available: boolean;
            reason?: string;
          }) => ({
            ...slot,
            dateTime: new Date(slot.dateTime),
          })
        ) || [];

      return { slots };
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
  });

  const timeSlots = slotsData?.slots || [];
  const availableSlots = timeSlots.filter((slot: TimeSlot) => slot.available);

  const handleSlotSelect = (slot: TimeSlot) => {
    if (!slot.available) return;

    setSelectedSlot(slot.dateTime);
  };

  const handleContinue = () => {
    if (selectedSlot) {
      onTimeSelect(selectedSlot);
    }
  };

  // Group time slots by time periods
  const groupSlotsByPeriod = (slots: TimeSlot[]) => {
    const periods = {
      morning: [] as TimeSlot[],
      afternoon: [] as TimeSlot[],
      evening: [] as TimeSlot[],
    };

    slots.forEach(slot => {
      const hour = slot.dateTime.getHours();
      if (hour < 12) {
        periods.morning.push(slot);
      } else if (hour < 17) {
        periods.afternoon.push(slot);
      } else {
        periods.evening.push(slot);
      }
    });

    return periods;
  };

  const periods = groupSlotsByPeriod(timeSlots);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl font-light mb-2">
              Select a Time
            </h2>
            <p className="text-muted-foreground">
              Loading available times for{" "}
              {format(selectedDate, "EEEE, MMMM d, yyyy")}...
            </p>
          </div>
          <button
            onClick={onBack}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary hover:text-background transition-colors"
          >
            ← Back to Calendar
          </button>
        </div>

        <div className="bg-background border border-border rounded-lg p-6">
          <div className="animate-pulse space-y-6">
            <div className="space-y-4">
              <div className="h-6 bg-muted rounded w-32" />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-12 bg-muted rounded" />
                ))}
              </div>
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
              Select a Time
            </h2>
          </div>
          <button
            onClick={onBack}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary hover:text-background transition-colors"
          >
            ← Back to Calendar
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
            Unable to Load Time Slots
          </h3>
          <p className="text-muted-foreground mb-4">
            {error instanceof Error
              ? error.message
              : "Failed to load available times"}
          </p>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-4 py-2 border border-primary text-primary hover:bg-primary hover:text-background rounded-md transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const TimeSlotButton = ({ slot }: { slot: TimeSlot }) => {
    const isSelected = selectedSlot?.getTime() === slot.dateTime.getTime();
    const timeStr = format(slot.dateTime, "h:mm a");

    return (
      <button
        onClick={() => handleSlotSelect(slot)}
        disabled={!slot.available}
        className={`
          relative p-3 rounded-lg text-sm font-medium transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
          ${
            slot.available
              ? isSelected
                ? "bg-accent text-background hover:bg-accent/90"
                : "bg-background border border-border text-foreground hover:border-primary hover:text-primary"
              : "bg-muted/50 text-muted-foreground cursor-not-allowed opacity-60"
          }
        `}
        title={
          slot.available ? `Select ${timeStr}` : slot.reason || "Unavailable"
        }
        aria-label={`${timeStr} ${slot.available ? "available" : "unavailable"}`}
      >
        <div className="flex flex-col items-center space-y-1">
          <span className="font-medium">{timeStr}</span>
          {!slot.available && (
            <span className="text-xs text-muted-foreground">
              {slot.reason === "Time slot unavailable"
                ? "Booked"
                : slot.reason === "Outside business hours"
                  ? "Closed"
                  : slot.reason === "Insufficient advance notice"
                    ? "Too soon"
                    : "Unavailable"}
            </span>
          )}
        </div>

        {isSelected && (
          <div className="absolute -top-1 -right-1 w-4 h-4 bg-primary rounded-full flex items-center justify-center">
            <svg
              className="w-2.5 h-2.5 text-background"
              fill="currentColor"
              viewBox="0 0 8 8"
            >
              <path d="M6.564.75l-3.59 3.612-1.538-1.55L0 4.26l2.974 2.99L8 2.193z" />
            </svg>
          </div>
        )}
      </button>
    );
  };

  const PeriodSection = ({
    title,
    slots,
    icon,
  }: {
    title: string;
    slots: TimeSlot[];
    icon: string;
  }) => {
    if (slots.length === 0) return null;

    const availableCount = slots.filter(slot => slot.available).length;

    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{icon}</span>
          <h3 className="font-medium text-foreground">{title}</h3>
          <span className="text-sm text-muted-foreground">
            ({availableCount} available)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {slots.map(slot => (
            <TimeSlotButton key={slot.dateTime.toISOString()} slot={slot} />
          ))}
        </div>
      </div>
    );
  };

  if (timeSlots.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-2xl font-light mb-2">
              Select a Time
            </h2>
            <p className="text-muted-foreground">
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </p>
          </div>
          <button
            onClick={onBack}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary hover:text-background transition-colors"
          >
            ← Back to Calendar
          </button>
        </div>

        <div className="text-center py-12 bg-background border border-border rounded-lg">
          <h3 className="text-lg font-medium text-foreground mb-2">
            No Time Slots Available
          </h3>
          <p className="text-muted-foreground">
            There are no available appointment times for this date. Please
            select a different date.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-light mb-2">Select a Time</h2>
          <p className="text-muted-foreground">
            Available appointments for{" "}
            {format(selectedDate, "EEEE, MMMM d, yyyy")}
          </p>
        </div>
        <button
          onClick={onBack}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary hover:text-background transition-colors"
        >
          ← Back to Calendar
        </button>
      </div>

      <div className="bg-background border border-border rounded-lg p-6 space-y-8">
        <PeriodSection title="Morning" slots={periods.morning} icon="🌅" />

        <PeriodSection title="Afternoon" slots={periods.afternoon} icon="☀️" />

        <PeriodSection title="Evening" slots={periods.evening} icon="🌆" />

        {availableSlots.length === 0 && (
          <div className="text-center py-8">
            <h3 className="text-lg font-medium text-foreground mb-2">
              No Available Times
            </h3>
            <p className="text-muted-foreground">
              All appointment slots for this date are currently booked. Please
              select a different date.
            </p>
          </div>
        )}
      </div>

      {selectedSlot && (
        <div className="flex items-center justify-between bg-accent/10 border border-accent rounded-lg p-4">
          <div>
            <p className="font-medium text-foreground">
              Selected Time: {format(selectedSlot, "h:mm a")}
            </p>
            <p className="text-sm text-muted-foreground">
              {selectedService.duration} minute session
            </p>
          </div>
          <button
            onClick={handleContinue}
            className="inline-flex items-center px-6 py-2 bg-primary text-background rounded-md hover:bg-primary/90 transition-colors font-medium"
          >
            Continue →
          </button>
        </div>
      )}

      {availableSlots.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          <p>
            {availableSlots.length} available time slot
            {availableSlots.length === 1 ? "" : "s"} • Sessions include a
            15-minute buffer between appointments
          </p>
        </div>
      )}
    </div>
  );
}
