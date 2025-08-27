"use client";

import { useState, useEffect } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";

interface Appointment {
  id: string;
  dateTime: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  service: {
    title: string;
    duration: number;
  };
  user: {
    name: string;
    email: string;
  };
}

interface AppointmentCalendarProps {
  onDateSelect?: (date: Date, appointments: Appointment[]) => void;
}

export function AppointmentCalendar({
  onDateSelect,
}: AppointmentCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    new Date()
  );
  const [appointments, setAppointments] = useState<
    Record<string, Appointment[]>
  >({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAppointments() {
      try {
        setLoading(true);
        const response = await fetch("/api/admin/appointments/calendar");
        if (response.ok) {
          const data = await response.json();
          setAppointments(data.appointments);
        }
      } catch (error) {
        console.error("Failed to fetch appointments:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAppointments();
  }, []);

  const handleDateSelect = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date && onDateSelect) {
      const dateKey = date.toISOString().split("T")[0];
      const dayAppointments = appointments[dateKey] || [];
      onDateSelect(date, dayAppointments);
    }
  };

  const getAppointmentDates = () => {
    return Object.keys(appointments).map(dateStr => new Date(dateStr));
  };

  const getSelectedDateAppointments = () => {
    if (!selectedDate) return [];
    const dateKey = selectedDate.toISOString().split("T")[0];
    return appointments[dateKey] || [];
  };

  const getStatusColor = (status: Appointment["status"]) => {
    switch (status) {
      case "PENDING":
        return "text-yellow-600";
      case "CONFIRMED":
        return "text-green-600";
      case "CANCELLED":
        return "text-red-600";
      case "COMPLETED":
        return "text-blue-600";
      case "NO_SHOW":
        return "text-gray-600";
      default:
        return "text-muted-foreground";
    }
  };

  const formatTime = (dateTimeStr: string) => {
    return new Date(dateTimeStr).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3" />
          <div className="h-64 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Calendar */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="font-medium text-foreground mb-4">Calendar View</h3>
        <div className="flex justify-center">
          <DayPicker
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            modifiers={{
              hasAppointments: getAppointmentDates(),
            }}
            modifiersClassNames={{
              hasAppointments: "bg-primary/20 text-primary font-semibold",
            }}
            labels={{
              labelPrevious: () => "Previous month",
              labelNext: () => "Next month",
            }}
            className="rdp-custom"
          />
        </div>
      </div>

      {/* Selected Date Details */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="font-medium text-foreground mb-4">
          {selectedDate ? (
            <>
              Appointments for{" "}
              {selectedDate.toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </>
          ) : (
            "Select a Date"
          )}
        </h3>

        <div className="space-y-3 max-h-64 overflow-y-auto">
          {getSelectedDateAppointments().length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No appointments scheduled
            </p>
          ) : (
            getSelectedDateAppointments()
              .sort(
                (a, b) =>
                  new Date(a.dateTime).getTime() -
                  new Date(b.dateTime).getTime()
              )
              .map(appointment => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {formatTime(appointment.dateTime)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {appointment.user.name} - {appointment.service.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {appointment.service.duration} minutes
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full border ${getStatusColor(appointment.status)}`}
                  >
                    {appointment.status.toLowerCase().replace("_", " ")}
                  </span>
                </div>
              ))
          )}
        </div>
      </div>
    </div>
  );
}
