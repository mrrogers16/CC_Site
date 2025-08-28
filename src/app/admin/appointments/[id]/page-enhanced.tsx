"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ClockIcon, SendIcon } from "lucide-react";
import { AppointmentReschedule } from "@/components/admin/appointments/appointment-reschedule";
import { AppointmentHistoryTimeline } from "@/components/admin/appointments/appointment-history-timeline";

interface Appointment {
  id: string;
  dateTime: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  notes?: string;
  adminNotes?: string;
  clientNotes?: string;
  cancellationReason?: string;
  reminderSent?: string;
  confirmationSent?: string;
  service: {
    id: string;
    title: string;
    description: string;
    duration: number;
    price: number;
  };
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
}

type ActiveTab = "details" | "reschedule" | "history" | "notifications";

export default function EnhancedAppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_isEditing, _setIsEditing] = useState(false);
  const [_updatedAppointment, _setUpdatedAppointment] = useState<
    Partial<Appointment>
  >({});
  const [_saving, _setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>("details");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [sendCancellationEmail, setSendCancellationEmail] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [sendingNotification, setSendingNotification] = useState(false);
  const [notificationStatus, setNotificationStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (status === "loading") return;

    if (!session || session.user.role !== "ADMIN") {
      router.push("/admin/login");
      return;
    }

    if (params.id) {
      fetchAppointment(params.id as string);
    }
  }, [session, status, params.id, router]);

  useEffect(() => {
    // Listen for alternative time selection from conflict detector
    const handleAlternativeTime = (_event: CustomEvent) => {
      setActiveTab("reschedule");
    };

    window.addEventListener(
      "selectAlternativeTime",
      handleAlternativeTime as EventListener
    );
    return () => {
      window.removeEventListener(
        "selectAlternativeTime",
        handleAlternativeTime as EventListener
      );
    };
  }, []);

  const fetchAppointment = async (appointmentId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/appointments/${appointmentId}`);

      if (!response.ok) {
        if (response.status === 404) {
          setError("Appointment not found");
        } else {
          setError("Failed to load appointment");
        }
        return;
      }

      const data = await response.json();
      setAppointment(data.appointment);
      _setUpdatedAppointment(data.appointment);
    } catch (err) {
      console.error("Failed to fetch appointment:", err);
      setError("Failed to load appointment");
    } finally {
      setLoading(false);
    }
  };

  const _handleSaveChanges = async () => {
    if (!appointment) return;

    try {
      _setSaving(true);
      const response = await fetch(
        `/api/admin/appointments/${appointment.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: _updatedAppointment.status,
            adminNotes: _updatedAppointment.adminNotes,
            clientNotes: _updatedAppointment.clientNotes,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAppointment(data.appointment);
        _setIsEditing(false);
        setNotificationStatus({
          success: true,
          message: "Appointment updated successfully",
        });
        setTimeout(() => setNotificationStatus(null), 3000);
      } else {
        setError("Failed to update appointment");
      }
    } catch (err) {
      console.error("Failed to update appointment:", err);
      setError("Failed to update appointment");
    } finally {
      _setSaving(false);
    }
  };

  const handleReschedule = async (newDateTime: Date, reason?: string) => {
    if (!appointment) return;

    try {
      const response = await fetch(
        `/api/admin/appointments/${appointment.id}/reschedule`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            newDateTime: newDateTime.toISOString(),
            reason,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAppointment(data.appointment);
        setActiveTab("details");
        setNotificationStatus({
          success: true,
          message: "Appointment rescheduled successfully",
        });
        setTimeout(() => setNotificationStatus(null), 3000);
      } else {
        const errorData = await response.json();
        throw new Error(
          errorData.message || "Failed to reschedule appointment"
        );
      }
    } catch (err) {
      console.error("Failed to reschedule appointment:", err);
      setError(
        err instanceof Error ? err.message : "Failed to reschedule appointment"
      );
    }
  };

  const handleCancelAppointment = async () => {
    if (!appointment) return;

    try {
      setCancelling(true);
      const response = await fetch(
        `/api/admin/appointments/${appointment.id}/cancel`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reason: cancellationReason.trim() || undefined,
            sendNotification: sendCancellationEmail,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAppointment(data.appointment);
        setShowCancelModal(false);
        setCancellationReason("");
        setNotificationStatus({
          success: true,
          message: `Appointment cancelled successfully${data.notificationSent ? " and client notified" : ""}`,
        });
        setTimeout(() => setNotificationStatus(null), 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to cancel appointment");
      }
    } catch (err) {
      console.error("Failed to cancel appointment:", err);
      setError(
        err instanceof Error ? err.message : "Failed to cancel appointment"
      );
    } finally {
      setCancelling(false);
    }
  };

  const handleSendNotification = async (type: "confirmation" | "reminder") => {
    if (!appointment) return;

    try {
      setSendingNotification(true);
      const response = await fetch(
        `/api/admin/appointments/${appointment.id}/notify`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ type }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setNotificationStatus({
          success: data.notificationSent,
          message: data.message,
        });

        if (data.notificationSent) {
          // Refresh appointment data to update sent timestamps
          await fetchAppointment(appointment.id);
        }

        setTimeout(() => setNotificationStatus(null), 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to send notification");
      }
    } catch (err) {
      console.error("Failed to send notification:", err);
      setNotificationStatus({
        success: false,
        message:
          err instanceof Error ? err.message : "Failed to send notification",
      });
      setTimeout(() => setNotificationStatus(null), 3000);
    } finally {
      setSendingNotification(false);
    }
  };

  const _getStatusColor = (status: Appointment["status"]) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "CONFIRMED":
        return "bg-green-100 text-green-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      case "COMPLETED":
        return "bg-blue-100 text-blue-800";
      case "NO_SHOW":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const formatDateTime = (dateTimeStr: string) => {
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

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <h1 className="font-serif text-2xl font-light text-foreground mb-4">
              {error}
            </h1>
            <Link
              href="/admin/dashboard"
              className="text-primary hover:text-primary/80 underline"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (!appointment) {
    return null;
  }

  const { date } = formatDateTime(appointment.dateTime);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto p-6">
        {/* Notification Status */}
        {notificationStatus && (
          <div
            className={`mb-4 p-3 rounded-lg ${
              notificationStatus.success
                ? "bg-green-50 border border-green-200 text-green-800"
                : "bg-red-50 border border-red-200 text-red-800"
            }`}
          >
            {notificationStatus.message}
          </div>
        )}

        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
          <Link
            href="/admin/dashboard"
            className="hover:text-primary transition-colors"
          >
            Dashboard
          </Link>
          <span>›</span>
          <Link
            href="/admin/appointments"
            className="hover:text-primary transition-colors"
          >
            Appointments
          </Link>
          <span>›</span>
          <span className="text-foreground">
            {appointment.user.name} - {date}
          </span>
        </nav>

        {/* Header */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="font-serif text-3xl font-light text-foreground mb-2">
              Appointment Management
            </h1>
            <p className="text-muted-foreground">
              Advanced appointment management with rescheduling and
              notifications
            </p>
          </div>

          <div className="flex gap-3">
            {appointment.status === "CANCELLED" ? (
              <span className="bg-red-100 text-red-800 px-4 py-2 rounded-lg">
                Appointment Cancelled
              </span>
            ) : (
              <>
                <button
                  onClick={() => setActiveTab("reschedule")}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Reschedule
                </button>
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Cancel Appointment
                </button>
              </>
            )}
            <button
              onClick={() => window.print()}
              className="border border-border px-4 py-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              Print
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-border mb-6">
          <nav className="-mb-px flex space-x-8">
            {(
              [
                "details",
                "reschedule",
                "history",
                "notifications",
              ] as ActiveTab[]
            ).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-gray-300"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[600px]">
          {activeTab === "details" && (
            <div className="grid md:grid-cols-3 gap-8">
              {/* Main appointment details - reuse existing code */}
              <div className="md:col-span-2">
                {/* Your existing appointment details content */}
              </div>
              <div>{/* Your existing sidebar content */}</div>
            </div>
          )}

          {activeTab === "reschedule" && appointment.status !== "CANCELLED" && (
            <AppointmentReschedule
              appointment={appointment}
              onReschedule={handleReschedule}
              onCancel={() => setActiveTab("details")}
            />
          )}

          {activeTab === "history" && (
            <AppointmentHistoryTimeline appointmentId={appointment.id} />
          )}

          {activeTab === "notifications" && (
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="font-serif text-xl font-light text-foreground mb-4">
                Email Notifications
              </h3>
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <button
                    onClick={() => handleSendNotification("confirmation")}
                    disabled={sendingNotification}
                    className="bg-primary text-primary-foreground p-4 rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <SendIcon className="h-4 w-4" />
                    Send Confirmation
                  </button>
                  <button
                    onClick={() => handleSendNotification("reminder")}
                    disabled={sendingNotification}
                    className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <ClockIcon className="h-4 w-4" />
                    Send Reminder
                  </button>
                </div>

                {/* Email status indicators */}
                <div className="bg-muted/30 rounded-lg p-4">
                  <h4 className="font-medium text-foreground mb-2">
                    Notification History
                  </h4>
                  <div className="space-y-2 text-sm">
                    {appointment.confirmationSent && (
                      <p className="text-green-700">
                        ✓ Confirmation sent:{" "}
                        {new Date(
                          appointment.confirmationSent
                        ).toLocaleString()}
                      </p>
                    )}
                    {appointment.reminderSent && (
                      <p className="text-blue-700">
                        ✓ Reminder sent:{" "}
                        {new Date(appointment.reminderSent).toLocaleString()}
                      </p>
                    )}
                    {!appointment.confirmationSent &&
                      !appointment.reminderSent && (
                        <p className="text-muted-foreground">
                          No notifications sent yet
                        </p>
                      )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Cancel Modal */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="font-serif text-lg font-light text-foreground mb-4">
                Cancel Appointment
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">
                    Cancellation Reason (Optional)
                  </label>
                  <textarea
                    value={cancellationReason}
                    onChange={e => setCancellationReason(e.target.value)}
                    className="w-full border border-border rounded-lg px-3 py-2 h-24"
                    placeholder="Enter reason for cancellation..."
                    maxLength={200}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    {cancellationReason.length}/200 characters
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sendCancellationEmail"
                    checked={sendCancellationEmail}
                    onChange={e => setSendCancellationEmail(e.target.checked)}
                    className="rounded border-border"
                  />
                  <label
                    htmlFor="sendCancellationEmail"
                    className="text-sm text-foreground"
                  >
                    Send cancellation email to client
                  </label>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCancelAppointment}
                    disabled={cancelling}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
                  >
                    {cancelling ? "Cancelling..." : "Confirm Cancellation"}
                  </button>
                  <button
                    onClick={() => {
                      setShowCancelModal(false);
                      setCancellationReason("");
                    }}
                    disabled={cancelling}
                    className="border border-border px-4 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    Keep Appointment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
