"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { AdminSidebar } from "@/components/admin/layout/admin-sidebar";

interface AnalyticsData {
  dateRange: {
    startDate: string;
    endDate: string;
  };
  revenue: {
    currentTotal: number;
    previousTotal: number;
    percentageChange: number;
    avgSessionValue: number;
    totalSessions: number;
  };
  appointments: {
    totalAppointments: number;
    utilizationRate: number;
    cancellationRate: number;
    statusBreakdown: {
      completed: number;
      cancelled: number;
      pending: number;
      confirmed: number;
      noShow: number;
    };
    availableSlots: number;
    bookedSlots: number;
  };
  clients: {
    newClients: number;
    returningClients: number;
    totalUniqueClients: number;
    newVsReturningRatio: number;
    avgSessionsPerClient: number;
  };
  services: {
    totalServices: number;
    mostPopularService: {
      id: string;
      title: string;
      bookingCount: number;
      revenue: number;
    } | null;
    serviceBreakdown: Array<{
      id: string;
      title: string;
      bookingCount: number;
      revenue: number;
      avgDuration: number;
    }>;
    totalServiceRevenue: number;
  };
}

export default function AdminAnalyticsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [selectedPeriod, setSelectedPeriod] = useState<
    "week" | "month" | "quarter" | "year"
  >("month");

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user?.role !== "ADMIN") {
      router.push("/admin/login");
    }
  }, [session, status, router]);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (dateRange.startDate) params.set("startDate", dateRange.startDate);
      if (dateRange.endDate) params.set("endDate", dateRange.endDate);
      params.set("period", selectedPeriod);

      const response = await fetch(`/api/admin/analytics?${params}`);
      const data = await response.json();

      if (data.success) {
        setAnalytics(data.analytics);
      } else {
        setError(data.message || "Failed to fetch analytics");
      }
    } catch (err) {
      setError("Error fetching analytics data");
      console.error("Error fetching analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [dateRange, selectedPeriod]);

  useEffect(() => {
    if (session?.user?.role === "ADMIN") {
      fetchAnalytics();
    }
  }, [session, dateRange, selectedPeriod, fetchAnalytics]);

  // Handle period selection
  const handlePeriodChange = (
    period: "week" | "month" | "quarter" | "year"
  ) => {
    setSelectedPeriod(period);
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case "week":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "quarter":
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    setDateRange({
      startDate: startDate.toISOString().split("T")[0],
      endDate: now.toISOString().split("T")[0],
    });
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  // Format percentage
  const formatPercentage = (value: number, decimals: number = 1) => {
    return `${value.toFixed(decimals)}%`;
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session || session.user?.role !== "ADMIN") {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="flex pt-16">
        <AdminSidebar isOpen={sidebarOpen} onToggle={setSidebarOpen} />

        <main
          className={`flex-1 transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-16"}`}
        >
          <div className="p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="font-serif text-3xl font-light text-foreground">
                  Practice Analytics
                </h1>
                <p className="text-muted-foreground mt-2">
                  Comprehensive insights into your practice performance and
                  trends.
                </p>
              </div>

              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Toggle sidebar"
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
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
            </div>

            {/* Date Range and Period Controls */}
            <div className="mb-8 p-6 bg-card border border-border rounded-lg">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={dateRange.startDate}
                      onChange={e =>
                        setDateRange(prev => ({
                          ...prev,
                          startDate: e.target.value,
                        }))
                      }
                      className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={dateRange.endDate}
                      onChange={e =>
                        setDateRange(prev => ({
                          ...prev,
                          endDate: e.target.value,
                        }))
                      }
                      className="px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  {["week", "month", "quarter", "year"].map(period => (
                    <button
                      key={period}
                      onClick={() => handlePeriodChange(period as any)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedPeriod === period
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80"
                      }`}
                    >
                      {period.charAt(0).toUpperCase() + period.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Error State */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            {/* Loading State */}
            {loading && (
              <div className="mb-6 text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Loading analytics data...
                </p>
              </div>
            )}

            {/* Analytics Content */}
            {!loading && analytics && (
              <div className="space-y-8">
                {/* Revenue Analytics */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <h2 className="font-serif text-2xl font-light mb-6">
                    Revenue Analytics
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="text-center">
                      <p className="text-3xl font-semibold text-primary">
                        {formatCurrency(analytics.revenue.currentTotal)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Current Period Revenue
                      </p>
                      <div
                        className={`flex items-center justify-center mt-2 text-sm ${
                          analytics.revenue.percentageChange >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {analytics.revenue.percentageChange >= 0 ? "↑" : "↓"}
                        <span className="ml-1">
                          {formatPercentage(
                            Math.abs(analytics.revenue.percentageChange)
                          )}{" "}
                          vs previous period
                        </span>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-foreground">
                        {formatCurrency(analytics.revenue.avgSessionValue)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Avg Session Value
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-foreground">
                        {analytics.revenue.totalSessions}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Total Sessions
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-foreground">
                        {formatCurrency(analytics.revenue.previousTotal)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Previous Period
                      </p>
                    </div>
                  </div>
                </div>

                {/* Appointment Analytics */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <h2 className="font-serif text-2xl font-light mb-6">
                    Appointment Analytics
                  </h2>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                      <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="text-center">
                          <p className="text-3xl font-semibold text-purple-600">
                            {formatPercentage(
                              analytics.appointments.utilizationRate
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Utilization Rate
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-semibold text-orange-600">
                            {formatPercentage(
                              analytics.appointments.cancellationRate
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Cancellation Rate
                          </p>
                        </div>
                      </div>
                      <div className="text-center">
                        <p className="text-xl text-muted-foreground">
                          {analytics.appointments.bookedSlots} of{" "}
                          {analytics.appointments.availableSlots} slots filled
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-medium mb-4">
                        Appointment Status Breakdown
                      </h3>
                      <div className="space-y-3">
                        {Object.entries(
                          analytics.appointments.statusBreakdown
                        ).map(([status, count]) => (
                          <div
                            key={status}
                            className="flex justify-between items-center"
                          >
                            <span className="capitalize text-sm">
                              {status.replace(/([A-Z])/g, " $1").toLowerCase()}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-32 bg-muted rounded-full h-2">
                                <div
                                  className="bg-primary h-2 rounded-full"
                                  style={{
                                    width: `${
                                      analytics.appointments.totalAppointments >
                                      0
                                        ? (count /
                                            analytics.appointments
                                              .totalAppointments) *
                                          100
                                        : 0
                                    }%`,
                                  }}
                                />
                              </div>
                              <span className="text-sm font-medium w-8">
                                {count}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Client Analytics */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <h2 className="font-serif text-2xl font-light mb-6">
                    Client Analytics
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-green-600">
                        {analytics.clients.newClients}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        New Clients
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-blue-600">
                        {analytics.clients.returningClients}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Returning Clients
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-purple-600">
                        {analytics.clients.totalUniqueClients}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Total Unique
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-orange-600">
                        {analytics.clients.newVsReturningRatio === Infinity
                          ? "All New"
                          : analytics.clients.newVsReturningRatio === 0
                            ? "All Returning"
                            : `${analytics.clients.newVsReturningRatio.toFixed(1)}:1`}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        New:Returning
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-primary">
                        {analytics.clients.avgSessionsPerClient.toFixed(1)}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Avg Sessions/Client
                      </p>
                    </div>
                  </div>
                </div>

                {/* Service Performance */}
                <div className="bg-card border border-border rounded-lg p-6">
                  <h2 className="font-serif text-2xl font-light mb-6">
                    Service Performance
                  </h2>
                  {analytics.services.mostPopularService && (
                    <div className="mb-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                      <h3 className="font-medium text-primary mb-2">
                        Most Popular Service
                      </h3>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-semibold">
                            {analytics.services.mostPopularService.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {analytics.services.mostPopularService.bookingCount}{" "}
                            bookings
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary">
                            {formatCurrency(
                              analytics.services.mostPopularService.revenue
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Total Revenue
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {analytics.services.serviceBreakdown.length > 0 && (
                    <div>
                      <h3 className="font-medium mb-4">
                        All Services Performance
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-3 px-4">Service</th>
                              <th className="text-right py-3 px-4">Bookings</th>
                              <th className="text-right py-3 px-4">Revenue</th>
                              <th className="text-right py-3 px-4">
                                Avg Duration
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {analytics.services.serviceBreakdown.map(
                              service => (
                                <tr
                                  key={service.id}
                                  className="border-b border-border/50"
                                >
                                  <td className="py-3 px-4 font-medium">
                                    {service.title}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    {service.bookingCount}
                                  </td>
                                  <td className="py-3 px-4 text-right font-medium">
                                    {formatCurrency(service.revenue)}
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    {service.avgDuration}min
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
