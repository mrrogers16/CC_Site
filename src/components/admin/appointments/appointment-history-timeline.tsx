"use client";

import { useState, useEffect } from "react";
import {
  ClockIcon,
  CalendarIcon,
  UserIcon,
  FileTextIcon,
  XCircleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  AlertCircleIcon,
} from "lucide-react";

interface HistoryRecord {
  id: string;
  action:
    | "CREATED"
    | "UPDATED"
    | "RESCHEDULED"
    | "CANCELLED"
    | "COMPLETED"
    | "NO_SHOW"
    | "STATUS_CHANGED"
    | "NOTES_UPDATED";
  oldDateTime?: string;
  newDateTime?: string;
  oldStatus?: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  newStatus?: "PENDING" | "CONFIRMED" | "CANCELLED" | "COMPLETED" | "NO_SHOW";
  reason?: string;
  adminName: string;
  createdAt: string;
}

interface AppointmentHistoryTimelineProps {
  appointmentId: string;
}

export function AppointmentHistoryTimeline({
  appointmentId,
}: AppointmentHistoryTimelineProps) {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (appointmentId) {
      fetchHistory();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/appointments/${appointmentId}/history`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch appointment history");
      }

      const data = await response.json();
      setHistory(data.history || []);
    } catch (err) {
      console.error("Failed to fetch history:", err);
      setError("Failed to load appointment history");
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: HistoryRecord["action"]) => {
    switch (action) {
      case "CREATED":
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case "RESCHEDULED":
        return <CalendarIcon className="h-5 w-5 text-blue-600" />;
      case "CANCELLED":
        return <XCircleIcon className="h-5 w-5 text-red-600" />;
      case "COMPLETED":
        return <CheckCircleIcon className="h-5 w-5 text-green-600" />;
      case "NO_SHOW":
        return <AlertCircleIcon className="h-5 w-5 text-orange-600" />;
      case "STATUS_CHANGED":
        return <ArrowRightIcon className="h-5 w-5 text-blue-600" />;
      case "NOTES_UPDATED":
        return <FileTextIcon className="h-5 w-5 text-gray-600" />;
      case "UPDATED":
      default:
        return <ClockIcon className="h-5 w-5 text-gray-600" />;
    }
  };

  const getActionTitle = (record: HistoryRecord) => {
    switch (record.action) {
      case "CREATED":
        return "Appointment Created";
      case "RESCHEDULED":
        return "Appointment Rescheduled";
      case "CANCELLED":
        return "Appointment Cancelled";
      case "COMPLETED":
        return "Appointment Completed";
      case "NO_SHOW":
        return "Marked as No-Show";
      case "STATUS_CHANGED":
        return `Status Changed: ${record.oldStatus?.toLowerCase()} → ${record.newStatus?.toLowerCase()}`;
      case "NOTES_UPDATED":
        return "Notes Updated";
      case "UPDATED":
      default:
        return "Appointment Updated";
    }
  };

  const getActionDescription = (record: HistoryRecord) => {
    const descriptions: string[] = [];

    if (
      record.action === "RESCHEDULED" &&
      record.oldDateTime &&
      record.newDateTime
    ) {
      const oldDate = new Date(record.oldDateTime);
      const newDate = new Date(record.newDateTime);

      descriptions.push(
        `Moved from ${oldDate.toLocaleDateString("en-US")} at ${oldDate.toLocaleTimeString(
          "en-US",
          {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }
        )} to ${newDate.toLocaleDateString("en-US")} at ${newDate.toLocaleTimeString(
          "en-US",
          {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }
        )}`
      );
    }

    if (record.reason) {
      descriptions.push(`Reason: ${record.reason}`);
    }

    return descriptions.length > 0 ? descriptions.join(". ") : null;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - date.getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) {
      return "Just now";
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "PENDING":
        return "text-yellow-700 bg-yellow-50 border-yellow-200";
      case "CONFIRMED":
        return "text-green-700 bg-green-50 border-green-200";
      case "CANCELLED":
        return "text-red-700 bg-red-50 border-red-200";
      case "COMPLETED":
        return "text-blue-700 bg-blue-50 border-blue-200";
      case "NO_SHOW":
        return "text-gray-700 bg-gray-50 border-gray-200";
      default:
        return "text-gray-700 bg-gray-50 border-gray-200";
    }
  };

  if (loading) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="font-serif text-xl font-light text-foreground mb-4">
          Appointment History
        </h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="font-serif text-xl font-light text-foreground mb-4">
          Appointment History
        </h3>
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchHistory}
            className="text-primary hover:text-primary/80 underline"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="font-serif text-xl font-light text-foreground mb-4">
        Appointment History
      </h3>

      {history.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FileTextIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No history records found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((record, index) => (
            <div key={record.id} className="relative">
              {/* Timeline line */}
              {index !== history.length - 1 && (
                <div className="absolute left-6 top-12 w-0.5 h-full bg-border" />
              )}

              <div className="flex gap-4">
                {/* Icon */}
                <div className="flex-shrink-0 bg-background border border-border rounded-full p-2">
                  {getActionIcon(record.action)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-foreground">
                        {getActionTitle(record)}
                      </h4>

                      {getActionDescription(record) && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {getActionDescription(record)}
                        </p>
                      )}

                      {/* Status changes display */}
                      {record.action === "STATUS_CHANGED" &&
                        record.oldStatus &&
                        record.newStatus && (
                          <div className="flex items-center gap-2 mt-2">
                            <span
                              className={`px-2 py-1 rounded-md border text-xs font-medium ${getStatusColor(record.oldStatus)}`}
                            >
                              {record.oldStatus.toLowerCase().replace("_", " ")}
                            </span>
                            <ArrowRightIcon className="h-3 w-3 text-muted-foreground" />
                            <span
                              className={`px-2 py-1 rounded-md border text-xs font-medium ${getStatusColor(record.newStatus)}`}
                            >
                              {record.newStatus.toLowerCase().replace("_", " ")}
                            </span>
                          </div>
                        )}

                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <UserIcon className="h-3 w-3" />
                          <span>{record.adminName}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <ClockIcon className="h-3 w-3" />
                          <span>{formatTimestamp(record.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
