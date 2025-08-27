"use client";

import { useState, useEffect } from "react";

interface MetricsData {
  totalClients: number;
  appointmentsToday: number;
  pendingAppointments: number;
  unreadMessages: number;
  thisMonthRevenue: number;
  completedAppointments: number;
}

export function MetricsWidgets() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await fetch("/api/admin/metrics");
        if (response.ok) {
          const data = await response.json();
          setMetrics(data.metrics);
        }
      } catch (error) {
        console.error("Failed to fetch metrics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, []);

  const metricCards = [
    {
      title: "Total Clients",
      value: metrics?.totalClients ?? 0,
      icon: (
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
            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
          />
        </svg>
      ),
      color: "text-blue-600",
      bgColor: "bg-blue-100",
    },
    {
      title: "Appointments Today",
      value: metrics?.appointmentsToday ?? 0,
      icon: (
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
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
    {
      title: "Pending Appointments",
      value: metrics?.pendingAppointments ?? 0,
      icon: (
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
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: "text-yellow-600",
      bgColor: "bg-yellow-100",
    },
    {
      title: "Unread Messages",
      value: metrics?.unreadMessages ?? 0,
      icon: (
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
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      ),
      color: "text-red-600",
      bgColor: "bg-red-100",
    },
    {
      title: "This Month Revenue",
      value: metrics?.thisMonthRevenue ?? 0,
      formatValue: (value: number) => `$${value.toLocaleString()}`,
      icon: (
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
            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
          />
        </svg>
      ),
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Completed Sessions",
      value: metrics?.completedAppointments ?? 0,
      icon: (
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
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
      color: "text-green-600",
      bgColor: "bg-green-100",
    },
  ];

  return (
    <section>
      <h2 className="font-serif text-2xl font-light text-foreground mb-6">
        Practice Overview
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metricCards.map((card, _index) => (
          <div
            key={card.title}
            className="bg-card border border-border rounded-lg p-6 hover:shadow-sm transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </p>
                <p className="text-2xl font-semibold text-foreground mt-2">
                  {loading ? (
                    <span className="animate-pulse bg-muted h-8 w-16 rounded inline-block" />
                  ) : (
                    (card.formatValue?.(card.value) ??
                    card.value.toLocaleString())
                  )}
                </p>
              </div>
              <div className={`p-3 rounded-lg ${card.bgColor}`}>
                <div className={card.color}>{card.icon}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
