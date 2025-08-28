"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Appointment {
  id: string;
  dateTime: string;
  status: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  notes?: string;
  service: {
    id: string;
    title: string;
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

interface AppointmentListProps {
  filter?: {
    status?: string;
    dateRange?: {
      start: string;
      end: string;
    };
    serviceId?: string;
  };
}

export function AppointmentList({ filter }: AppointmentListProps) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedAppointment, setSelectedAppointment] =
    useState<Appointment | null>(null);

  useEffect(() => {
    async function fetchAppointments() {
      try {
        setLoading(true);
        const params = new URLSearchParams();

        if (filter?.status && filter.status !== "all") {
          params.append("status", filter.status);
        } else if (selectedStatus !== "all") {
          params.append("status", selectedStatus);
        }

        if (filter?.dateRange) {
          params.append("startDate", filter.dateRange.start);
          params.append("endDate", filter.dateRange.end);
        }

        if (filter?.serviceId) {
          params.append("serviceId", filter.serviceId);
        }

        const response = await fetch(`/api/admin/appointments?${params}`);
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
  }, [filter, selectedStatus]);

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
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    };
  };

  const updateAppointmentStatus = async (
    appointmentId: string,
    newStatus: string
  ) => {
    try {
      const response = await fetch(`/api/admin/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        setAppointments(prev =>
          prev.map(apt =>
            apt.id === appointmentId
              ? { ...apt, status: newStatus as Appointment["status"] }
              : apt
          )
        );
      }
    } catch (error) {
      console.error("Failed to update appointment status:", error);
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg">
      {/* Filter Controls */}
      <div className="p-4 border-b border-border">
        <div className="flex gap-2">
          {[
            "all",
            "pending",
            "confirmed",
            "completed",
            "cancelled",
            "no_show",
          ].map(status => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                selectedStatus === status
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {status.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {/* Appointments Table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="mt-2 text-muted-foreground">
              Loading appointments...
            </p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">No appointments found.</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="text-left py-3 px-4 font-medium text-foreground">
                  Client
                </th>
                <th className="text-left py-3 px-4 font-medium text-foreground">
                  Service
                </th>
                <th className="text-left py-3 px-4 font-medium text-foreground">
                  Date & Time
                </th>
                <th className="text-left py-3 px-4 font-medium text-foreground">
                  Status
                </th>
                <th className="text-left py-3 px-4 font-medium text-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {appointments.map(appointment => {
                const { date, time } = formatDateTime(appointment.dateTime);
                return (
                  <tr
                    key={appointment.id}
                    className="border-b border-border hover:bg-muted/20"
                  >
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-foreground">
                          {appointment.user.name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {appointment.user.email}
                        </p>
                        {appointment.user.phone && (
                          <p className="text-sm text-muted-foreground">
                            {appointment.user.phone}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-foreground">
                          {appointment.service.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {appointment.service.duration} min • $
                          {appointment.service.price}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-foreground">{date}</p>
                        <p className="text-sm text-muted-foreground">{time}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}
                      >
                        {appointment.status.toLowerCase().replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <Link
                          href={`/admin/appointments/${appointment.id}`}
                          className="text-primary hover:text-primary/80 text-sm font-medium"
                        >
                          View
                        </Link>
                        {appointment.status === "PENDING" && (
                          <button
                            onClick={() =>
                              updateAppointmentStatus(
                                appointment.id,
                                "CONFIRMED"
                              )
                            }
                            className="text-green-600 hover:text-green-700 text-sm font-medium"
                          >
                            Confirm
                          </button>
                        )}
                        {(appointment.status === "PENDING" ||
                          appointment.status === "CONFIRMED") && (
                          <button
                            onClick={() =>
                              updateAppointmentStatus(
                                appointment.id,
                                "CANCELLED"
                              )
                            }
                            className="text-red-600 hover:text-red-700 text-sm font-medium"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Appointment Detail Modal */}
      {selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="font-serif text-2xl font-light text-foreground">
                  Appointment Details
                </h2>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <svg
                    className="w-6 h-6"
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

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Client
                  </label>
                  <p className="text-foreground">
                    {selectedAppointment.user.name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedAppointment.user.email}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Service
                  </label>
                  <p className="text-foreground">
                    {selectedAppointment.service.title}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedAppointment.service.duration} minutes • $
                    {selectedAppointment.service.price}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Date & Time
                  </label>
                  <p className="text-foreground">
                    {formatDateTime(selectedAppointment.dateTime).date} at{" "}
                    {formatDateTime(selectedAppointment.dateTime).time}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Status
                  </label>
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedAppointment.status)}`}
                  >
                    {selectedAppointment.status.toLowerCase().replace("_", " ")}
                  </span>
                </div>

                {selectedAppointment.notes && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Notes
                    </label>
                    <div className="bg-muted/30 rounded-lg p-4 mt-1">
                      <p className="text-foreground">
                        {selectedAppointment.notes}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
