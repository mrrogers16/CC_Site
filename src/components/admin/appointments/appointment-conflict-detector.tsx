"use client";

import { useState, useEffect } from "react";
import { AlertTriangleIcon, ClockIcon, CalendarIcon } from "lucide-react";

interface ConflictingAppointment {
  id: string;
  dateTime: string;
  status: string;
  service: {
    title: string;
    duration: number;
  };
  user: {
    name: string;
  };
}

interface ConflictDetection {
  hasConflict: boolean;
  conflictType: "appointment" | "blocked" | "outside_hours" | null;
  conflictingAppointments: ConflictingAppointment[];
  reason: string;
  suggestedAlternatives: Array<{
    dateTime: string;
    displayTime: string;
  }>;
}

interface AppointmentConflictDetectorProps {
  dateTime: Date;
  serviceId: string;
  serviceDuration: number;
  excludeAppointmentId?: string;
  onConflictDetected: (conflict: ConflictDetection) => void;
}

export function AppointmentConflictDetector({
  dateTime,
  serviceId,
  serviceDuration,
  excludeAppointmentId,
  onConflictDetected,
}: AppointmentConflictDetectorProps) {
  const [checking, setChecking] = useState(false);
  const [conflict, setConflict] = useState<ConflictDetection | null>(null);

  useEffect(() => {
    if (dateTime && serviceId) {
      checkForConflicts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateTime, serviceId, excludeAppointmentId]);

  const checkForConflicts = async () => {
    setChecking(true);
    try {
      const response = await fetch("/api/admin/appointments/conflicts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateTime: dateTime.toISOString(),
          serviceId,
          serviceDuration,
          excludeAppointmentId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to check for conflicts");
      }

      const conflictData: ConflictDetection = await response.json();
      setConflict(conflictData);
      onConflictDetected(conflictData);
    } catch (error) {
      console.error("Failed to check for conflicts:", error);
      const errorConflict: ConflictDetection = {
        hasConflict: true,
        conflictType: null,
        conflictingAppointments: [],
        reason: "Failed to check for conflicts. Please try again.",
        suggestedAlternatives: [],
      };
      setConflict(errorConflict);
      onConflictDetected(errorConflict);
    } finally {
      setChecking(false);
    }
  };

  const formatDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return {
      date: date.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    };
  };

  if (checking) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
          <span className="text-blue-700 text-sm">
            Checking for conflicts...
          </span>
        </div>
      </div>
    );
  }

  if (!conflict) {
    return null;
  }

  if (!conflict.hasConflict) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-full bg-green-500" />
          <span className="text-green-700 text-sm">
            No conflicts detected. Time slot is available.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <AlertTriangleIcon className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
        <div className="flex-1">
          <h4 className="font-medium text-red-800 mb-2">Conflict Detected</h4>

          <p className="text-red-700 text-sm mb-3">{conflict.reason}</p>

          {/* Conflicting Appointments */}
          {conflict.conflictingAppointments.length > 0 && (
            <div className="mb-4">
              <h5 className="font-medium text-red-800 text-sm mb-2">
                Conflicting Appointments:
              </h5>
              <div className="space-y-2">
                {conflict.conflictingAppointments.map(appointment => {
                  const { date, time } = formatDateTime(appointment.dateTime);
                  return (
                    <div
                      key={appointment.id}
                      className="bg-white rounded-md p-3 border border-red-200"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-red-900 text-sm">
                            {appointment.user.name}
                          </p>
                          <p className="text-red-700 text-sm">
                            {appointment.service.title}
                          </p>
                          <div className="flex items-center gap-4 mt-1 text-xs text-red-600">
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="h-3 w-3" />
                              <span>{date}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <ClockIcon className="h-3 w-3" />
                              <span>{time}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-red-600">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              appointment.status === "CONFIRMED"
                                ? "bg-green-100 text-green-700"
                                : appointment.status === "PENDING"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {appointment.status.toLowerCase()}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Suggested Alternatives */}
          {conflict.suggestedAlternatives.length > 0 && (
            <div>
              <h5 className="font-medium text-red-800 text-sm mb-2">
                Suggested Alternative Times:
              </h5>
              <div className="flex flex-wrap gap-2">
                {conflict.suggestedAlternatives
                  .slice(0, 6)
                  .map((alternative, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        const newDateTime = new Date(alternative.dateTime);
                        // Trigger parent component to handle the alternative selection
                        window.dispatchEvent(
                          new CustomEvent("selectAlternativeTime", {
                            detail: { dateTime: newDateTime },
                          })
                        );
                      }}
                      className="bg-white border border-red-200 rounded-md px-3 py-1 text-xs text-red-700 hover:bg-red-50 transition-colors"
                    >
                      {alternative.displayTime}
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
