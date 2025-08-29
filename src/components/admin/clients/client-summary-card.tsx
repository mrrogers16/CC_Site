"use client";

import Link from "next/link";

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  appointmentCount: number;
  lastAppointment?: string;
  contactSubmissions: number;
}

interface ClientSummaryCardProps {
  client: Client;
}

export function ClientSummaryCard({ client }: ClientSummaryCardProps) {
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const lastAppointmentDate = client.lastAppointment ? new Date(client.lastAppointment) : null;
  const isNewClient = new Date(client.createdAt) > thirtyDaysAgo;
  const isActiveClient = client.appointmentCount > 0 && (!lastAppointmentDate || lastAppointmentDate > thirtyDaysAgo);
  
  const getStatusBadge = () => {
    if (isNewClient) {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
          New Client
        </span>
      );
    } else if (isActiveClient) {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
          Active
        </span>
      );
    } else if (client.appointmentCount === 0) {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
          No Appointments
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
          Inactive
        </span>
      );
    }
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="font-medium text-foreground mb-1">{client.name}</h3>
          <p className="text-sm text-muted-foreground mb-2">{client.email}</p>
          {client.phone && (
            <p className="text-sm text-muted-foreground">{client.phone}</p>
          )}
        </div>
        <div className="ml-4">
          {getStatusBadge()}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="text-sm text-muted-foreground">Appointments</div>
          <div className="text-lg font-medium text-foreground">
            {client.appointmentCount}
          </div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Contact Inquiries</div>
          <div className="text-lg font-medium text-foreground">
            {client.contactSubmissions}
          </div>
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Last Visit:</span>
          <span className="text-foreground">
            {lastAppointmentDate
              ? lastAppointmentDate.toLocaleDateString()
              : "Never"}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Client Since:</span>
          <span className="text-foreground">
            {new Date(client.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          href={`/admin/clients/${client.id}`}
          className="flex-1 px-3 py-2 bg-primary text-primary-foreground text-sm font-medium text-center rounded-md hover:bg-primary/90 transition-colors"
        >
          View Profile
        </Link>
        <Link
          href={`/admin/appointments?client=${client.id}`}
          className="px-3 py-2 border border-border text-muted-foreground text-sm font-medium rounded-md hover:text-foreground hover:border-foreground transition-colors"
          title="View appointments"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </Link>
      </div>
    </div>
  );
}