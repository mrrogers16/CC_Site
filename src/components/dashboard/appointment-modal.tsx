"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

interface AppointmentService {
  title: string;
  duration: number;
  price: string;
}

interface AppointmentDetails {
  id: string;
  dateTime: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  notes?: string;
  cancellationReason?: string;
  service: AppointmentService;
  createdAt: string;
  updatedAt: string;
}

interface AppointmentModalProps {
  appointmentId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onCancelClick?: (appointmentId: string) => void;
  onRescheduleClick?: (appointmentId: string) => void;
}

export function AppointmentModal({
  appointmentId,
  isOpen,
  onClose,
  onCancelClick,
  onRescheduleClick,
}: AppointmentModalProps) {
  const { data: session } = useSession();
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !appointmentId) {
      setAppointment(null);
      setError(null);
      return;
    }

    const fetchAppointmentDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/appointments/${appointmentId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch appointment details");
        }

        const data = await response.json();

        if (data.success && data.data) {
          setAppointment(data.data);
        } else {
          throw new Error("Appointment not found");
        }
      } catch (err) {
        console.error("Error fetching appointment details:", err);
        setError("Unable to load appointment details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointmentDetails();
  }, [appointmentId, isOpen]);

  // Close modal when clicking backdrop or pressing escape
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return `Today at ${date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })}`;
    } else if (diffDays === 1) {
      return `Tomorrow at ${date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })}`;
    } else {
      return date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
  };

  const getStatusBadge = (status: AppointmentDetails["status"]) => {
    const baseClasses =
      "inline-flex items-center px-3 py-1 rounded-full text-sm font-medium";

    switch (status) {
      case "PENDING":
        return (
          <span className={`${baseClasses} bg-yellow-100 text-yellow-800`}>
            <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2" />
            Pending Confirmation
          </span>
        );
      case "CONFIRMED":
        return (
          <span className={`${baseClasses} bg-green-100 text-green-800`}>
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2" />
            Confirmed
          </span>
        );
      case "COMPLETED":
        return (
          <span className={`${baseClasses} bg-blue-100 text-blue-800`}>
            <div className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
            Completed
          </span>
        );
      case "CANCELLED":
        return (
          <span className={`${baseClasses} bg-red-100 text-red-800`}>
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
            Cancelled
          </span>
        );
      case "NO_SHOW":
        return (
          <span className={`${baseClasses} bg-gray-100 text-gray-800`}>
            <div className="w-2 h-2 bg-gray-500 rounded-full mr-2" />
            No Show
          </span>
        );
      default:
        return null;
    }
  };

  const canModifyAppointment = (status: AppointmentDetails["status"]) => {
    return status === "PENDING" || status === "CONFIRMED";
  };

  const calculateHoursUntilAppointment = (dateTime: string) => {
    const appointmentDate = new Date(dateTime);
    const now = new Date();
    return Math.ceil(
      (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60)
    );
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={e => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-border"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-serif text-2xl font-light text-foreground">
            Appointment Details
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted/50 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">
                Loading appointment details...
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2 text-red-800">
                <svg
                  className="w-5 h-5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {appointment && (
            <div className="space-y-6">
              {/* Service Information */}
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-serif text-xl font-light text-foreground mb-2">
                      {appointment.service.title}
                    </h3>
                    {getStatusBadge(appointment.status)}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-light text-primary">
                      ${appointment.service.price}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {appointment.service.duration} minutes
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 text-foreground">
                  <svg
                    className="w-5 h-5 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  <span className="text-lg">
                    {formatDate(appointment.dateTime)}
                  </span>
                </div>
              </div>

              {/* User Information */}
              <div>
                <h4 className="font-medium text-foreground mb-3">
                  Client Information
                </h4>
                <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Name:</span>
                    <span className="text-foreground font-medium">
                      {session?.user?.name || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Email:</span>
                    <span className="text-foreground">
                      {session?.user?.email || "N/A"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      Appointment ID:
                    </span>
                    <span className="text-foreground font-mono text-sm">
                      {appointment.id}
                    </span>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              {appointment.notes && (
                <div>
                  <h4 className="font-medium text-foreground mb-3">
                    Appointment Notes
                  </h4>
                  <div className="bg-muted/30 rounded-lg p-4">
                    <p className="text-foreground">{appointment.notes}</p>
                  </div>
                </div>
              )}

              {/* Cancellation Reason (if cancelled) */}
              {appointment.status === "CANCELLED" &&
                appointment.cancellationReason && (
                  <div>
                    <h4 className="font-medium text-foreground mb-3">
                      Cancellation Reason
                    </h4>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <p className="text-red-800">
                        {appointment.cancellationReason}
                      </p>
                    </div>
                  </div>
                )}

              {/* Important Information */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <svg
                    className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div className="text-blue-800">
                    <h5 className="font-medium mb-1">Important Reminders</h5>
                    <ul className="text-sm space-y-1">
                      <li>
                        • Please arrive 10 minutes early for your appointment
                      </li>
                      <li>
                        • Bring a valid photo ID and insurance information
                      </li>
                      <li>
                        • Cancel at least 24 hours in advance to avoid fees
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        {appointment && canModifyAppointment(appointment.status) && (
          <div className="flex items-center justify-between p-6 border-t border-border bg-muted/30">
            <div className="text-sm text-muted-foreground">
              {calculateHoursUntilAppointment(appointment.dateTime) > 24
                ? "You can reschedule or cancel this appointment"
                : "Cancellation fees may apply for appointments within 24 hours"}
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => onRescheduleClick?.(appointment.id)}
                className="px-4 py-2 text-primary hover:text-primary/80 border border-primary hover:border-primary/80 rounded-lg transition-colors"
              >
                Reschedule
              </button>
              <button
                onClick={() => onCancelClick?.(appointment.id)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Cancel Appointment
              </button>
            </div>
          </div>
        )}

        {appointment && !canModifyAppointment(appointment.status) && (
          <div className="p-6 border-t border-border bg-muted/30">
            <div className="text-center text-muted-foreground">
              This appointment cannot be modified due to its current status.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
