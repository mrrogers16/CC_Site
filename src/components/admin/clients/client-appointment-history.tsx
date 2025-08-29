"use client";

import Link from "next/link";

interface Appointment {
  id: string;
  dateTime: string;
  status: string;
  notes?: string;
  adminNotes?: string;
  clientNotes?: string;
  cancellationReason?: string;
  reminderSent?: string;
  confirmationSent?: string;
  service: {
    id: string;
    title: string;
    duration: number;
    price: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface ClientAppointmentHistoryProps {
  appointments: Appointment[];
}

export function ClientAppointmentHistory({ appointments }: ClientAppointmentHistoryProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "CONFIRMED":
        return "bg-blue-100 text-blue-800";
      case "CANCELLED":
        return "bg-red-100 text-red-800";
      case "NO_SHOW":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-yellow-100 text-yellow-800";
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }
    return `${mins}m`;
  };

  if (appointments.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-8">
        <div className="text-center">
          <svg
            className="w-12 h-12 mx-auto text-muted-foreground mb-4"
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
          <h3 className="text-lg font-medium text-foreground mb-2">No appointments found</h3>
          <p className="text-muted-foreground">
            This client has not scheduled any appointments yet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-medium text-foreground">
          Appointment History ({appointments.length})
        </h3>
      </div>
      
      <div className="divide-y divide-border">
        {appointments.map((appointment) => (
          <div key={appointment.id} className="p-6 hover:bg-muted/30 transition-colors">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Appointment Info */}
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-2">
                  <h4 className="font-medium text-foreground">
                    {appointment.service.title}
                  </h4>
                  <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(appointment.status)} w-fit`}>
                    {appointment.status}
                  </span>
                </div>
                
                <div className="text-sm text-muted-foreground space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                    <span>
                      📅 {new Date(appointment.dateTime).toLocaleDateString()} at{" "}
                      {new Date(appointment.dateTime).toLocaleTimeString([], { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </span>
                    <span>
                      ⏱️ {formatDuration(appointment.service.duration)}
                    </span>
                    <span>
                      💰 {formatCurrency(appointment.service.price)}
                    </span>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4">
                    <span>
                      📝 Booked: {new Date(appointment.createdAt).toLocaleDateString()}
                    </span>
                    {appointment.reminderSent && (
                      <span>
                        🔔 Reminder sent: {new Date(appointment.reminderSent).toLocaleDateString()}
                      </span>
                    )}
                    {appointment.confirmationSent && (
                      <span>
                        ✉️ Confirmed: {new Date(appointment.confirmationSent).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Notes */}
                {(appointment.notes || appointment.clientNotes || appointment.adminNotes || appointment.cancellationReason) && (
                  <div className="mt-3 space-y-2">
                    {appointment.notes && (
                      <div className="text-sm">
                        <span className="font-medium text-foreground">General Notes:</span>
                        <p className="text-muted-foreground mt-1">{appointment.notes}</p>
                      </div>
                    )}
                    {appointment.clientNotes && (
                      <div className="text-sm">
                        <span className="font-medium text-foreground">Client Notes:</span>
                        <p className="text-muted-foreground mt-1">{appointment.clientNotes}</p>
                      </div>
                    )}
                    {appointment.adminNotes && (
                      <div className="text-sm">
                        <span className="font-medium text-foreground">Admin Notes:</span>
                        <p className="text-muted-foreground mt-1">{appointment.adminNotes}</p>
                      </div>
                    )}
                    {appointment.cancellationReason && (
                      <div className="text-sm">
                        <span className="font-medium text-foreground">Cancellation Reason:</span>
                        <p className="text-muted-foreground mt-1">{appointment.cancellationReason}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 lg:flex-col lg:items-end">
                <Link
                  href={`/admin/appointments/${appointment.id}`}
                  className="px-3 py-1 text-sm border border-border text-muted-foreground hover:text-foreground hover:border-foreground rounded-md transition-colors"
                >
                  View Details
                </Link>
                
                {appointment.status !== "CANCELLED" && appointment.status !== "COMPLETED" && (
                  <Link
                    href={`/admin/appointments/${appointment.id}?action=edit`}
                    className="px-3 py-1 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-md transition-colors"
                  >
                    Edit
                  </Link>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}