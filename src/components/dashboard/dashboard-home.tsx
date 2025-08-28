"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

interface NextAppointment {
  id: string;
  dateTime: string;
  service: {
    title: string;
    duration: number;
  };
}

interface DashboardStats {
  totalAppointments: number;
  upcomingCount: number;
  completedCount: number;
  lastAppointmentDate: string | null;
}

export function DashboardHome() {
  const { data: session } = useSession();
  const [nextAppointment, setNextAppointment] =
    useState<NextAppointment | null>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalAppointments: 0,
    upcomingCount: 0,
    completedCount: 0,
    lastAppointmentDate: null,
  });
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  const fetchNextAppointment = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/appointments?upcoming=true&limit=1");

      if (!response.ok) {
        throw new Error("Failed to fetch appointment data");
      }

      const data = await response.json();

      if (data.success && data.data.appointments.length > 0) {
        setNextAppointment(data.data.appointments[0]);
      } else {
        setNextAppointment(null);
      }
    } catch (err) {
      console.error("Error fetching next appointment:", err);
      setError("Unable to load appointment information");
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id]);

  const fetchDashboardStats = useCallback(async () => {
    if (!session?.user?.id) return;

    try {
      setStatsLoading(true);

      // Fetch upcoming appointments count
      const upcomingResponse = await fetch("/api/appointments?upcoming=true");
      const pastResponse = await fetch("/api/appointments?upcoming=false");

      if (upcomingResponse.ok && pastResponse.ok) {
        const upcomingData = await upcomingResponse.json();
        const pastData = await pastResponse.json();

        const upcomingCount = upcomingData.success
          ? upcomingData.data.pagination?.total || 0
          : 0;
        const pastCount = pastData.success
          ? pastData.data.pagination?.total || 0
          : 0;

        // Get completed count from past appointments
        const completedCount = pastData.success
          ? pastData.data.appointments?.filter(
              (apt: any) => apt.status === "COMPLETED"
            ).length || 0
          : 0;

        // Get last appointment date from past appointments
        let lastAppointmentDate = null;
        if (pastData.success && pastData.data.appointments?.length > 0) {
          const sortedPast = pastData.data.appointments.sort(
            (a: any, b: any) =>
              new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()
          );
          lastAppointmentDate = sortedPast[0]?.dateTime || null;
        }

        setStats({
          totalAppointments: upcomingCount + pastCount,
          upcomingCount,
          completedCount,
          lastAppointmentDate,
        });
      }
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
    } finally {
      setStatsLoading(false);
    }
  }, [session?.user?.id]);

  // Handle hydration - ensure consistent server/client rendering
  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient) {
      fetchNextAppointment();
      fetchDashboardStats();
    }
  }, [fetchNextAppointment, fetchDashboardStats, isClient]);

  const formatAppointmentDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const timeString = date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    const dateStringFormatted = date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    if (diffDays === 0) {
      return `Today at ${timeString}`;
    } else if (diffDays === 1) {
      return `Tomorrow at ${timeString}`;
    } else if (diffDays <= 7) {
      return `${dateStringFormatted} at ${timeString}`;
    } else {
      return `${dateStringFormatted} at ${timeString}`;
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
  };

  return (
    <div className="p-6 lg:p-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-2">
          {getGreeting()}, {session?.user?.name?.split(" ")[0] || "there"}
        </h1>
        <p className="text-lg text-muted-foreground">
          Welcome to your personal dashboard for Healing Pathways Counseling
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="mb-8">
        <h2 className="font-serif text-xl font-light text-foreground mb-4">
          Your Journey
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Appointments */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <div className="text-2xl font-light text-foreground">
                  {!isClient || statsLoading ? (
                    <div className="h-7 w-8 bg-muted rounded animate-pulse" />
                  ) : (
                    stats.totalAppointments
                  )}
                </div>
              </div>
              <div className="bg-primary/10 p-3 rounded-lg">
                <svg
                  className="w-6 h-6 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Upcoming Appointments */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Upcoming</p>
                <div className="text-2xl font-light text-foreground">
                  {!isClient || statsLoading ? (
                    <div className="h-7 w-8 bg-muted rounded animate-pulse" />
                  ) : (
                    stats.upcomingCount
                  )}
                </div>
              </div>
              <div className="bg-green-100 p-3 rounded-lg">
                <svg
                  className="w-6 h-6 text-green-600"
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
              </div>
            </div>
          </div>

          {/* Completed Sessions */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Completed</p>
                <div className="text-2xl font-light text-foreground">
                  {!isClient || statsLoading ? (
                    <div className="h-7 w-8 bg-muted rounded animate-pulse" />
                  ) : (
                    stats.completedCount
                  )}
                </div>
              </div>
              <div className="bg-blue-100 p-3 rounded-lg">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          {/* Last Session */}
          <div className="bg-card border border-border rounded-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Last Session</p>
                <div className="text-sm font-light text-foreground">
                  {!isClient || statsLoading ? (
                    <div className="h-5 w-16 bg-muted rounded animate-pulse" />
                  ) : stats.lastAppointmentDate ? (
                    new Date(stats.lastAppointmentDate).toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                      }
                    )
                  ) : (
                    "None yet"
                  )}
                </div>
              </div>
              <div className="bg-purple-100 p-3 rounded-lg">
                <svg
                  className="w-6 h-6 text-purple-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Next Appointment Card */}
      <div className="mb-8">
        <h2 className="font-serif text-xl font-light text-foreground mb-4">
          Your Next Appointment
        </h2>

        {!isClient || loading ? (
          <div className="bg-muted/30 rounded-lg p-6 border border-border">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-3/4 mb-3" />
              <div className="h-3 bg-muted rounded w-1/2 mb-2" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </div>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
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
              <span className="font-medium">{error}</span>
            </div>
          </div>
        ) : nextAppointment ? (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
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
                  <h3 className="font-semibold text-foreground">
                    {nextAppointment.service.title}
                  </h3>
                </div>
                <p className="text-muted-foreground">
                  {formatAppointmentDate(nextAppointment.dateTime)}
                </p>
                <p className="text-sm text-muted-foreground">
                  Duration: {nextAppointment.service.duration} minutes
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-light text-primary">
                  {new Date(nextAppointment.dateTime).toLocaleDateString(
                    "en-US",
                    {
                      month: "short",
                      day: "numeric",
                    }
                  )}
                </div>
                <div className="text-sm text-muted-foreground">
                  {new Date(nextAppointment.dateTime).toLocaleDateString(
                    "en-US",
                    {
                      year: "numeric",
                    }
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-muted/30 border border-border rounded-lg p-6 text-center">
            <svg
              className="w-12 h-12 text-muted-foreground mx-auto mb-3"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-muted-foreground mb-2">
              No upcoming appointments scheduled
            </p>
            <p className="text-sm text-muted-foreground">
              Book your next session to continue your healing journey
            </p>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="mb-8">
        <h2 className="font-serif text-xl font-light text-foreground mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Book New Appointment */}
          <Link
            href="/book"
            className="group bg-primary text-primary-foreground p-6 rounded-lg hover:bg-primary/90 transition-all duration-200 hover:shadow-md"
          >
            <div className="flex items-center space-x-3">
              <div className="bg-primary-foreground/20 p-3 rounded-lg group-hover:bg-primary-foreground/30 transition-colors">
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
                    d="M12 4v16m8-8H4"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold">Book Appointment</h3>
                <p className="text-sm opacity-90">Schedule your next session</p>
              </div>
            </div>
          </Link>

          {/* View All Appointments */}
          <button
            className="group bg-card border border-border p-6 rounded-lg hover:bg-muted/50 transition-all duration-200 hover:shadow-md text-left"
            onClick={() => {
              // This will be handled by parent component state in Phase 2
              console.log("View all appointments clicked");
            }}
          >
            <div className="flex items-center space-x-3">
              <div className="bg-muted p-3 rounded-lg group-hover:bg-muted/80 transition-colors">
                <svg
                  className="w-6 h-6 text-foreground"
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
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  All Appointments
                </h3>
                <p className="text-sm text-muted-foreground">
                  Manage your sessions
                </p>
              </div>
            </div>
          </button>

          {/* Contact Support */}
          <Link
            href="/contact"
            className="group bg-card border border-border p-6 rounded-lg hover:bg-muted/50 transition-all duration-200 hover:shadow-md"
          >
            <div className="flex items-center space-x-3">
              <div className="bg-muted p-3 rounded-lg group-hover:bg-muted/80 transition-colors">
                <svg
                  className="w-6 h-6 text-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  Contact Support
                </h3>
                <p className="text-sm text-muted-foreground">
                  Get help when you need it
                </p>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div>
        <h2 className="font-serif text-xl font-light text-foreground mb-4">
          Recent Activity
        </h2>
        <div className="bg-muted/30 border border-border rounded-lg p-6 text-center">
          <svg
            className="w-12 h-12 text-muted-foreground mx-auto mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          <p className="text-muted-foreground mb-2">No recent activity</p>
          <p className="text-sm text-muted-foreground">
            Your recent appointments and updates will appear here
          </p>
        </div>
      </div>
    </div>
  );
}
