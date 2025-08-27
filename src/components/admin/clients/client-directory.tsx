"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Client {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: "CLIENT" | "ADMIN";
  createdAt: string;
  emailVerified: string | null;
  appointments: {
    id: string;
    dateTime: string;
    status: string;
    service: {
      title: string;
    };
  }[];
  _count: {
    appointments: number;
  };
}

export function ClientDirectory() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "created" | "appointments">(
    "name"
  );
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  useEffect(() => {
    async function fetchClients() {
      try {
        setLoading(true);
        const params = new URLSearchParams();

        if (searchTerm) {
          params.append("search", searchTerm);
        }

        params.append("sortBy", sortBy);

        const response = await fetch(`/api/admin/clients?${params}`);
        if (response.ok) {
          const data = await response.json();
          setClients(data.clients);
        }
      } catch (error) {
        console.error("Failed to fetch clients:", error);
      } finally {
        setLoading(false);
      }
    }

    const timeoutId = setTimeout(fetchClients, 300); // Debounce search
    return () => clearTimeout(timeoutId);
  }, [searchTerm, sortBy]);

  const getRecentAppointment = (client: Client) => {
    if (client.appointments.length === 0) return null;

    return client.appointments.reduce((latest, current) => {
      return new Date(current.dateTime) > new Date(latest.dateTime)
        ? current
        : latest;
    });
  };

  const getUpcomingAppointment = (client: Client) => {
    const now = new Date();
    const upcoming = client.appointments.filter(
      apt => new Date(apt.dateTime) > now
    );

    if (upcoming.length === 0) return null;

    return upcoming.reduce((earliest, current) => {
      return new Date(current.dateTime) < new Date(earliest.dateTime)
        ? current
        : earliest;
    });
  };

  const filteredClients = clients.filter(client => client.role === "CLIENT");

  return (
    <div className="bg-card border border-border rounded-lg">
      {/* Search and Filter Controls */}
      <div className="p-4 border-b border-border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search clients by name or email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          <div>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="name">Sort by Name</option>
              <option value="created">Sort by Date Added</option>
              <option value="appointments">Sort by Appointments</option>
            </select>
          </div>
        </div>
      </div>

      {/* Client Cards/List */}
      <div className="p-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="mt-2 text-muted-foreground">Loading clients...</p>
          </div>
        ) : filteredClients.length === 0 ? (
          <div className="text-center py-8">
            <svg
              className="w-12 h-12 text-muted-foreground mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            <p className="text-muted-foreground">No clients found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredClients.map(client => {
              const recentAppointment = getRecentAppointment(client);
              const upcomingAppointment = getUpcomingAppointment(client);

              return (
                <div
                  key={client.id}
                  className="border border-border rounded-lg p-4 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-medium text-foreground">
                            {client.name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {client.email}
                          </p>
                          {client.phone && (
                            <p className="text-sm text-muted-foreground">
                              {client.phone}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">
                            Total Appointments
                          </p>
                          <p className="font-medium text-foreground">
                            {client._count.appointments}
                          </p>
                        </div>

                        {recentAppointment && (
                          <div>
                            <p className="text-muted-foreground">
                              Recent Appointment
                            </p>
                            <p className="font-medium text-foreground">
                              {new Date(
                                recentAppointment.dateTime
                              ).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {recentAppointment.service.title}
                            </p>
                          </div>
                        )}

                        {upcomingAppointment && (
                          <div>
                            <p className="text-muted-foreground">
                              Next Appointment
                            </p>
                            <p className="font-medium text-foreground">
                              {new Date(
                                upcomingAppointment.dateTime
                              ).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {upcomingAppointment.service.title}
                            </p>
                          </div>
                        )}

                        <div>
                          <p className="text-muted-foreground">Client Since</p>
                          <p className="font-medium text-foreground">
                            {new Date(client.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {client.emailVerified ? "Verified" : "Unverified"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedClient(client)}
                        className="text-primary hover:text-primary/80 text-sm font-medium"
                      >
                        View Details
                      </button>
                      <Link
                        href={`/admin/appointments?clientId=${client.id}`}
                        className="text-muted-foreground hover:text-foreground text-sm font-medium"
                      >
                        Appointments
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Client Detail Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-card rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="font-serif text-2xl font-light text-foreground">
                  Client Details
                </h2>
                <button
                  onClick={() => setSelectedClient(null)}
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
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-2xl font-semibold">
                    {selectedClient.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-medium text-foreground">
                      {selectedClient.name}
                    </h3>
                    <p className="text-muted-foreground">
                      {selectedClient.email}
                    </p>
                    {selectedClient.phone && (
                      <p className="text-muted-foreground">
                        {selectedClient.phone}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Account Status
                    </label>
                    <p className="text-foreground">
                      {selectedClient.emailVerified ? "Verified" : "Unverified"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Member Since
                    </label>
                    <p className="text-foreground">
                      {new Date(selectedClient.createdAt).toLocaleDateString(
                        "en-US",
                        {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        }
                      )}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Appointment History
                  </label>
                  <p className="text-foreground mb-2">
                    {selectedClient._count.appointments} total appointments
                  </p>

                  {selectedClient.appointments.length > 0 && (
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {selectedClient.appointments
                        .sort(
                          (a, b) =>
                            new Date(b.dateTime).getTime() -
                            new Date(a.dateTime).getTime()
                        )
                        .slice(0, 5)
                        .map(appointment => (
                          <div
                            key={appointment.id}
                            className="flex justify-between items-center p-2 bg-muted/30 rounded"
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {appointment.service.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(
                                  appointment.dateTime
                                ).toLocaleDateString()}
                              </p>
                            </div>
                            <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                              {appointment.status.toLowerCase()}
                            </span>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4">
                  <Link
                    href={`/admin/appointments?clientId=${selectedClient.id}`}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                  >
                    View All Appointments
                  </Link>
                  <button
                    onClick={() => setSelectedClient(null)}
                    className="px-4 py-2 text-muted-foreground border border-border rounded-lg hover:bg-muted/50"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
