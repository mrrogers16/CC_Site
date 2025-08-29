"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface MetricsData {
  totalClients: number;
  appointmentsToday: number;
  pendingAppointments: number;
  unreadMessages: number;
  thisMonthRevenue: number;
  completedAppointments: number;
  // New analytics metrics
  revenueChange: number;
  lastMonthRevenue: number;
  utilizationRate: number;
  availableSlots: number;
  bookedSlotsThisWeek: number;
  newClientsThisMonth: number;
  returningClientsThisMonth: number;
  clientRatio: number;
  // Client management metrics
  newClientsLast30Days: number;
  activeClients: number;
  inactiveClients: number;
  recentClientRegistrations: Array<{
    id: string;
    name: string;
    email: string;
    createdAt: string;
  }>;
}

export function MetricsWidgets() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await fetch("/api/admin/dashboard-metrics");
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
      changeValue: metrics?.revenueChange,
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
      isAnalytics: true,
    },
    {
      title: "Appointment Utilization",
      subtitle: "This Week",
      value: metrics?.utilizationRate ?? 0,
      formatValue: (value: number) => `${value.toFixed(1)}%`,
      description: `${metrics?.bookedSlotsThisWeek ?? 0} of ${metrics?.availableSlots ?? 0} slots filled`,
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
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
          />
        </svg>
      ),
      color: "text-purple-600",
      bgColor: "bg-purple-100",
      isAnalytics: true,
    },
    {
      title: "New vs Returning",
      subtitle: "This Month",
      value: metrics?.clientRatio ?? 0,
      formatValue: (value: number) => {
        if (value === Infinity) return "All New";
        if (value === 0) return "All Returning";
        return `${value.toFixed(1)}:1`;
      },
      description: `${metrics?.newClientsThisMonth ?? 0} new, ${metrics?.returningClientsThisMonth ?? 0} returning`,
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
            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
          />
        </svg>
      ),
      color: "text-orange-600",
      bgColor: "bg-orange-100",
      isAnalytics: true,
    },
    {
      title: "Client Activity",
      subtitle: "Last 30 Days",
      value: `${metrics?.activeClients ?? 0}/${metrics?.totalClients ?? 0}`,
      formatValue: (value: string) => value,
      description: `${metrics?.newClientsLast30Days ?? 0} new clients, ${metrics?.inactiveClients ?? 0} inactive`,
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
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
      color: "text-indigo-600",
      bgColor: "bg-indigo-100",
      isAnalytics: true,
      href: "/admin/clients",
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

  const renderChangeIndicator = (changeValue?: number) => {
    if (changeValue === undefined || changeValue === null) return null;

    const isPositive = changeValue >= 0;
    const Icon = isPositive ? (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L10 4.414 4.707 9.707a1 1 0 01-1.414 0z"
          clipRule="evenodd"
        />
      </svg>
    ) : (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 011.414-1.414L10 15.586l5.293-5.293a1 1 0 011.414 0z"
          clipRule="evenodd"
        />
      </svg>
    );

    return (
      <div
        className={`flex items-center mt-2 text-sm ${
          isPositive ? "text-green-600" : "text-red-600"
        }`}
      >
        {Icon}
        <span className="ml-1">
          {Math.abs(changeValue).toFixed(1)}% vs last month
        </span>
      </div>
    );
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-serif text-2xl font-light text-foreground">
          Practice Overview
        </h2>
        <Link
          href="/admin/analytics"
          className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
        >
          View Detailed Analytics →
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metricCards.map((card, _index) => {
          const CardWrapper = (card as any).href ? Link : 'div';
          const cardProps = (card as any).href 
            ? { href: (card as any).href }
            : {};
          
          return (
            <CardWrapper
              key={card.title}
              {...cardProps}
              className={`bg-card border border-border rounded-lg p-6 transition-all ${
                (card as any).href 
                  ? "hover:shadow-md hover:border-primary/30 cursor-pointer" 
                  : "hover:shadow-sm"
              } ${
                (card as any).isAnalytics ? "ring-1 ring-primary/20" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-medium text-muted-foreground">
                      {card.title}
                    </p>
                    {(card as any).subtitle && (
                      <span className="text-xs bg-muted px-2 py-1 rounded-full">
                        {(card as any).subtitle}
                      </span>
                    )}
                  </div>
                  <p className="text-2xl font-semibold text-foreground">
                    {loading ? (
                      <span className="animate-pulse bg-muted h-8 w-16 rounded inline-block" />
                    ) : (
                      (card.formatValue?.(card.value) ??
                      card.value.toLocaleString())
                    )}
                  </p>

                  {(card as any).changeValue !== undefined &&
                    renderChangeIndicator((card as any).changeValue)}

                  {(card as any).description && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {(card as any).description}
                    </p>
                  )}
                </div>
                <div className={`p-3 rounded-lg ${card.bgColor} flex-shrink-0`}>
                  <div className={card.color}>{card.icon}</div>
                </div>
              </div>
            </CardWrapper>
          );
        })}
      </div>
    </section>
  );
}
