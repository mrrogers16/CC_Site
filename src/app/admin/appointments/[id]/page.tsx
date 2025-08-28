"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface Appointment {
  id: string;
  dateTime: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  notes?: string;
  adminNotes?: string;
  clientNotes?: string;
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

export default function AppointmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [updatedAppointment, setUpdatedAppointment] = useState<
    Partial<Appointment>
  >({});
  const [saving, setSaving] = useState(false);

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
      setUpdatedAppointment(data.appointment);
    } catch (err) {
      console.error("Failed to fetch appointment:", err);
      setError("Failed to load appointment");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!appointment) return;

    try {
      setSaving(true);
      const response = await fetch(
        `/api/admin/appointments/${appointment.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: updatedAppointment.status,
            adminNotes: updatedAppointment.adminNotes,
            clientNotes: updatedAppointment.clientNotes,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAppointment(data.appointment);
        setIsEditing(false);
      } else {
        setError("Failed to update appointment");
      }
    } catch (err) {
      console.error("Failed to update appointment:", err);
      setError("Failed to update appointment");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = (newStatus: string) => {
    setUpdatedAppointment(prev => ({
      ...prev,
      status: newStatus as Appointment["status"],
    }));
  };

  const getStatusColor = (status: Appointment["status"]) => {
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

  const { date, time } = formatDateTime(appointment.dateTime);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
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
              Appointment Details
            </h1>
            <p className="text-muted-foreground">
              Manage appointment information and status
            </p>
          </div>

          <div className="flex gap-3">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Edit Appointment
                </button>
                <button
                  onClick={() => window.print()}
                  className="border border-border px-4 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  Print
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleSaveChanges}
                  disabled={saving}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setUpdatedAppointment(appointment);
                  }}
                  className="border border-border px-4 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  Cancel
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Main Details */}
          <div className="md:col-span-2 space-y-6">
            {/* Appointment Information */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="font-serif text-xl font-light text-foreground mb-4">
                Appointment Information
              </h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Date
                  </label>
                  <p className="text-foreground font-medium">{date}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Time
                  </label>
                  <p className="text-foreground font-medium">{time}</p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Status
                  </label>
                  {isEditing ? (
                    <select
                      value={updatedAppointment.status}
                      onChange={e => handleStatusChange(e.target.value)}
                      className="mt-1 block w-full border border-border rounded-lg px-3 py-2"
                    >
                      <option value="PENDING">Pending</option>
                      <option value="CONFIRMED">Confirmed</option>
                      <option value="CANCELLED">Cancelled</option>
                      <option value="COMPLETED">Completed</option>
                      <option value="NO_SHOW">No Show</option>
                    </select>
                  ) : (
                    <div className="mt-1">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}
                      >
                        {appointment.status.toLowerCase().replace("_", " ")}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Duration
                  </label>
                  <p className="text-foreground font-medium">
                    {appointment.service.duration} minutes
                  </p>
                </div>
              </div>
            </div>

            {/* Service Details */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="font-serif text-xl font-light text-foreground mb-4">
                Service Details
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Service
                  </label>
                  <p className="text-foreground font-medium">
                    {appointment.service.title}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Description
                  </label>
                  <p className="text-foreground">
                    {appointment.service.description}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Price
                  </label>
                  <p className="text-foreground font-medium">
                    ${appointment.service.price}
                  </p>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="font-serif text-xl font-light text-foreground mb-4">
                Notes
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Admin Notes (Internal)
                  </label>
                  {isEditing ? (
                    <textarea
                      value={updatedAppointment.adminNotes || ""}
                      onChange={e =>
                        setUpdatedAppointment(prev => ({
                          ...prev,
                          adminNotes: e.target.value,
                        }))
                      }
                      className="mt-1 block w-full border border-border rounded-lg px-3 py-2 h-24"
                      placeholder="Internal notes for practice use..."
                    />
                  ) : (
                    <div className="mt-1 bg-muted/30 rounded-lg p-3 min-h-[3rem]">
                      <p className="text-foreground">
                        {appointment.adminNotes || "No admin notes"}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Client Notes (Visible to Client)
                  </label>
                  {isEditing ? (
                    <textarea
                      value={updatedAppointment.clientNotes || ""}
                      onChange={e =>
                        setUpdatedAppointment(prev => ({
                          ...prev,
                          clientNotes: e.target.value,
                        }))
                      }
                      className="mt-1 block w-full border border-border rounded-lg px-3 py-2 h-24"
                      placeholder="Notes visible to the client..."
                    />
                  ) : (
                    <div className="mt-1 bg-muted/30 rounded-lg p-3 min-h-[3rem]">
                      <p className="text-foreground">
                        {appointment.clientNotes || "No client notes"}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Client Information */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="font-serif text-xl font-light text-foreground mb-4">
                Client Information
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Name
                  </label>
                  <p className="text-foreground font-medium">
                    {appointment.user.name}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Email
                  </label>
                  <p className="text-foreground">
                    <a
                      href={`mailto:${appointment.user.email}`}
                      className="text-primary hover:text-primary/80 underline"
                    >
                      {appointment.user.email}
                    </a>
                  </p>
                </div>

                {appointment.user.phone && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Phone
                    </label>
                    <p className="text-foreground">
                      <a
                        href={`tel:${appointment.user.phone}`}
                        className="text-primary hover:text-primary/80 underline"
                      >
                        {appointment.user.phone}
                      </a>
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h2 className="font-serif text-xl font-light text-foreground mb-4">
                Quick Actions
              </h2>

              <div className="space-y-3">
                <button
                  onClick={() =>
                    window.open(`mailto:${appointment.user.email}`)
                  }
                  className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Email Client
                </button>

                {appointment.user.phone && (
                  <button
                    onClick={() => window.open(`tel:${appointment.user.phone}`)}
                    className="w-full border border-border px-4 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    Call Client
                  </button>
                )}

                <button
                  onClick={() => router.push("/admin/appointments")}
                  className="w-full border border-border px-4 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  View All Appointments
                </button>

                <Link
                  href="/admin/clients"
                  className="block w-full text-center border border-border px-4 py-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  View Client History
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
