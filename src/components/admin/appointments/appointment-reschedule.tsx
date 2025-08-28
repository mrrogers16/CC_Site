"use client";

import { useState } from "react";
import { CalendarIcon, ClockIcon } from "lucide-react";

interface Appointment {
  id: string;
  dateTime: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  service: {
    id: string;
    title: string;
    duration: number;
  };
  user: {
    name: string;
  };
}

interface TimeSlot {
  dateTime: string;
  available: boolean;
  reason?: string;
  displayTime: string;
}

interface AppointmentRescheduleProps {
  appointment: Appointment;
  onReschedule: (newDateTime: Date, reason?: string) => Promise<void>;
  onCancel: () => void;
}

export function AppointmentReschedule({
  appointment,
  onReschedule,
  onCancel,
}: AppointmentRescheduleProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingSlots, setFetchingSlots] = useState(false);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatCurrentDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return {
      date: date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    };
  };

  const handleDateSelect = async (date: Date) => {
    setSelectedDate(date);
    setSelectedTimeSlot(null);
    setConflictMessage(null);
    setFetchingSlots(true);

    try {
      const dateStr = date.toISOString().split("T")[0];
      const response = await fetch(
        `/api/appointments/available?date=${dateStr}&serviceId=${appointment.service.id}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch available slots");
      }

      const data = await response.json();
      setAvailableSlots(data.slots || []);

      if (data.availableSlots === 0) {
        setConflictMessage("No available time slots for this date.");
      }
    } catch (error) {
      console.error("Failed to fetch available slots:", error);
      setConflictMessage("Failed to load available times. Please try again.");
      setAvailableSlots([]);
    } finally {
      setFetchingSlots(false);
    }
  };

  const handleTimeSlotSelect = (slot: TimeSlot) => {
    if (slot.available) {
      setSelectedTimeSlot(slot.dateTime);
      setConflictMessage(null);
    } else {
      setConflictMessage(slot.reason || "Time slot not available");
    }
  };

  const handleConfirmReschedule = async () => {
    if (!selectedTimeSlot) return;

    setLoading(true);
    try {
      await onReschedule(
        new Date(selectedTimeSlot),
        reason.trim() || undefined
      );
    } catch (error) {
      console.error("Failed to reschedule appointment:", error);
    } finally {
      setLoading(false);
    }
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30); // 30 days from now
    return maxDate.toISOString().split("T")[0];
  };

  const currentDateTime = formatCurrentDateTime(appointment.dateTime);

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="font-serif text-xl font-light text-foreground mb-4">
        Reschedule Appointment
      </h3>

      {/* Current Appointment Info */}
      <div className="bg-muted/30 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-foreground mb-2">
          Current Appointment
        </h4>
        <div className="text-sm text-muted-foreground">
          <div className="flex items-center gap-2 mb-1">
            <CalendarIcon className="h-4 w-4" />
            <span>{currentDateTime.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <ClockIcon className="h-4 w-4" />
            <span>{currentDateTime.time}</span>
          </div>
          <div className="mt-2">
            <span className="font-medium">{appointment.service.title}</span>
            <span className="text-muted-foreground">
              {" "}
              ({appointment.service.duration} minutes)
            </span>
          </div>
        </div>
      </div>

      {/* Date Selection */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Select New Date
          </label>
          <input
            type="date"
            min={getMinDate()}
            max={getMaxDate()}
            onChange={e =>
              e.target.value ? handleDateSelect(new Date(e.target.value)) : null
            }
            className="w-full border border-border rounded-lg px-3 py-2"
          />
          {selectedDate && (
            <p className="text-sm text-muted-foreground mt-1">
              Selected: {formatDate(selectedDate)}
            </p>
          )}
        </div>

        {/* Time Slot Selection */}
        {selectedDate && (
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Select New Time
            </label>
            {fetchingSlots ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : availableSlots.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                {availableSlots.map(slot => (
                  <button
                    key={slot.dateTime}
                    onClick={() => handleTimeSlotSelect(slot)}
                    disabled={!slot.available}
                    className={`p-2 text-sm rounded-lg border transition-colors ${
                      selectedTimeSlot === slot.dateTime
                        ? "bg-primary text-primary-foreground border-primary"
                        : slot.available
                          ? "bg-card border-border hover:bg-muted/50 text-foreground"
                          : "bg-muted/50 border-muted text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    {slot.displayTime}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No available time slots for this date
              </div>
            )}
          </div>
        )}

        {/* Conflict Message */}
        {conflictMessage && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 text-sm">{conflictMessage}</p>
          </div>
        )}

        {/* Reason Input */}
        <div>
          <label className="block text-sm font-medium text-muted-foreground mb-2">
            Reason for Rescheduling (Optional)
          </label>
          <textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Enter reason for rescheduling..."
            className="w-full border border-border rounded-lg px-3 py-2 h-24"
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {reason.length}/200 characters
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleConfirmReschedule}
            disabled={!selectedTimeSlot || loading}
            className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Rescheduling..." : "Confirm Reschedule"}
          </button>
          <button
            onClick={onCancel}
            disabled={loading}
            className="border border-border px-4 py-2 rounded-lg hover:bg-muted/50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
