"use client";

import { useState } from "react";
import { ClientAppointmentHistory } from "./client-appointment-history";
import { ClientContactHistory } from "./client-contact-history";

interface ClientData {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: string;
  emailVerified?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emailNotifications?: boolean;
  smsReminders?: boolean;
  reminderTime?: string;
  statistics: {
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    upcomingAppointments: number;
    totalContactSubmissions: number;
    totalSpent: number;
    lastAppointmentDate?: string;
  };
  recentAppointments: any[];
  contactSubmissions: any[];
  activityTimeline: any[];
}

interface ClientDetailViewProps {
  client: ClientData;
}

export function ClientDetailView({ client }: ClientDetailViewProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "appointments" | "contact" | "activity">("overview");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getStatusInfo = () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const lastAppointmentDate = client.statistics.lastAppointmentDate 
      ? new Date(client.statistics.lastAppointmentDate) 
      : null;
    const isNewClient = new Date(client.createdAt) > thirtyDaysAgo;
    
    if (isNewClient) {
      return { status: "New Client", className: "bg-blue-100 text-blue-800" };
    } else if (client.statistics.totalAppointments === 0) {
      return { status: "No Appointments", className: "bg-gray-100 text-gray-600" };
    } else if (!lastAppointmentDate || lastAppointmentDate <= thirtyDaysAgo) {
      return { status: "Inactive", className: "bg-orange-100 text-orange-800" };
    } else {
      return { status: "Active", className: "bg-green-100 text-green-800" };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="space-y-6">
      {/* Client Info Card */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Basic Information */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-foreground">{client.name}</h2>
                <p className="text-muted-foreground">{client.email}</p>
                {client.phone && (
                  <p className="text-muted-foreground">{client.phone}</p>
                )}
              </div>
              <span className={`inline-flex items-center px-3 py-1 text-sm font-medium rounded-full ${statusInfo.className}`}>
                {statusInfo.status}
              </span>
            </div>

            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-foreground mb-2">Client Information</h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Email Verified:</dt>
                    <dd className="text-foreground">
                      {client.emailVerified ? "Yes" : "No"}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Member Since:</dt>
                    <dd className="text-foreground">
                      {new Date(client.createdAt).toLocaleDateString()}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Emergency Contact & Preferences */}
              {(client.emergencyContactName || client.emailNotifications !== null) && (
                <div>
                  <h3 className="text-sm font-medium text-foreground mb-2">Contact Preferences</h3>
                  <dl className="space-y-2 text-sm">
                    {client.emergencyContactName && (
                      <>
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Emergency Contact:</dt>
                          <dd className="text-foreground">{client.emergencyContactName}</dd>
                        </div>
                        {client.emergencyContactPhone && (
                          <div className="flex justify-between">
                            <dt className="text-muted-foreground">Emergency Phone:</dt>
                            <dd className="text-foreground">{client.emergencyContactPhone}</dd>
                          </div>
                        )}
                      </>
                    )}
                    {client.emailNotifications !== null && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Email Notifications:</dt>
                        <dd className="text-foreground">
                          {client.emailNotifications ? "Enabled" : "Disabled"}
                        </dd>
                      </div>
                    )}
                    {client.smsReminders !== null && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">SMS Reminders:</dt>
                        <dd className="text-foreground">
                          {client.smsReminders ? "Enabled" : "Disabled"}
                        </dd>
                      </div>
                    )}
                    {client.reminderTime && (
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Reminder Timing:</dt>
                        <dd className="text-foreground">{client.reminderTime} hours before</dd>
                      </div>
                    )}
                  </dl>
                </div>
              )}
            </div>
          </div>

          {/* Statistics */}
          <div className="lg:w-80">
            <h3 className="text-sm font-medium text-foreground mb-4">Client Statistics</h3>
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="text-2xl font-light text-foreground">
                  {client.statistics.totalAppointments}
                </div>
                <div className="text-sm text-muted-foreground">Total Appointments</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="text-2xl font-light text-foreground">
                  {client.statistics.completedAppointments}
                </div>
                <div className="text-sm text-muted-foreground">Completed Sessions</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="text-2xl font-light text-foreground">
                  {client.statistics.upcomingAppointments}
                </div>
                <div className="text-sm text-muted-foreground">Upcoming</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="text-2xl font-light text-foreground">
                  {formatCurrency(client.statistics.totalSpent)}
                </div>
                <div className="text-sm text-muted-foreground">Total Spent</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="text-2xl font-light text-foreground">
                  {client.statistics.totalContactSubmissions}
                </div>
                <div className="text-sm text-muted-foreground">Contact Inquiries</div>
              </div>
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="text-lg font-light text-foreground">
                  {client.statistics.lastAppointmentDate
                    ? new Date(client.statistics.lastAppointmentDate).toLocaleDateString()
                    : "Never"}
                </div>
                <div className="text-sm text-muted-foreground">Last Visit</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-border">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "overview", label: "Overview", count: null },
            { id: "appointments", label: "Appointments", count: client.recentAppointments.length },
            { id: "contact", label: "Contact History", count: client.contactSubmissions.length },
            { id: "activity", label: "Activity Timeline", count: client.activityTimeline.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground"
              }`}
            >
              {tab.label}
              {tab.count !== null && (
                <span className="ml-2 px-2 py-1 text-xs bg-muted text-muted-foreground rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Appointments Preview */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-medium text-foreground mb-4">Recent Appointments</h3>
              {client.recentAppointments.length > 0 ? (
                <div className="space-y-3">
                  {client.recentAppointments.slice(0, 3).map((appointment) => (
                    <div key={appointment.id} className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-foreground">
                          {appointment.service.title}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(appointment.dateTime).toLocaleDateString()} at{" "}
                          {new Date(appointment.dateTime).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${
                        appointment.status === "COMPLETED" 
                          ? "bg-green-100 text-green-800"
                          : appointment.status === "CONFIRMED"
                          ? "bg-blue-100 text-blue-800"
                          : appointment.status === "CANCELLED"
                          ? "bg-red-100 text-red-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {appointment.status}
                      </span>
                    </div>
                  ))}
                  {client.recentAppointments.length > 3 && (
                    <button
                      onClick={() => setActiveTab("appointments")}
                      className="text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      View all {client.recentAppointments.length} appointments →
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No appointments yet</p>
              )}
            </div>

            {/* Recent Contact Submissions Preview */}
            <div className="bg-card border border-border rounded-lg p-6">
              <h3 className="text-lg font-medium text-foreground mb-4">Recent Inquiries</h3>
              {client.contactSubmissions.length > 0 ? (
                <div className="space-y-3">
                  {client.contactSubmissions.slice(0, 3).map((submission) => (
                    <div key={submission.id} className="border-b border-border last:border-0 pb-3 last:pb-0">
                      <div className="flex justify-between items-start mb-1">
                        <div className="font-medium text-foreground text-sm">
                          {submission.subject}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(submission.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {submission.message}
                      </p>
                    </div>
                  ))}
                  {client.contactSubmissions.length > 3 && (
                    <button
                      onClick={() => setActiveTab("contact")}
                      className="text-sm text-primary hover:text-primary/80 transition-colors"
                    >
                      View all {client.contactSubmissions.length} inquiries →
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No contact inquiries</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "appointments" && (
          <ClientAppointmentHistory appointments={client.recentAppointments} />
        )}

        {activeTab === "contact" && (
          <ClientContactHistory contactSubmissions={client.contactSubmissions} />
        )}

        {activeTab === "activity" && (
          <div className="bg-card border border-border rounded-lg p-6">
            <h3 className="text-lg font-medium text-foreground mb-4">Activity Timeline</h3>
            {client.activityTimeline.length > 0 ? (
              <div className="space-y-4">
                {client.activityTimeline.map((activity, index) => (
                  <div key={activity.id} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-muted rounded-full flex items-center justify-center">
                      {activity.type === "contact_submission" ? (
                        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2 2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">
                        {activity.type === "contact_submission" 
                          ? `Submitted inquiry: ${activity.subject}`
                          : `Appointment ${activity.action?.toLowerCase()}: ${activity.serviceTitle}`
                        }
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(activity.createdAt).toLocaleString()}
                      </div>
                      {activity.type === "contact_submission" && activity.message && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {activity.message}
                        </p>
                      )}
                      {activity.reason && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Reason: {activity.reason}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No activity recorded</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}