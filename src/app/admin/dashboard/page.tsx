"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { AdminSidebar } from "@/components/admin/layout/admin-sidebar";
import { MetricsWidgets } from "@/components/admin/dashboard/metrics-widgets";
import { RecentActivity } from "@/components/admin/dashboard/recent-activity";
import { QuickActions } from "@/components/admin/dashboard/quick-actions";

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (status === "loading") return;
    if (!session || session.user?.role !== "ADMIN") {
      router.push("/admin/login");
    }
  }, [session, status, router]);

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
        {/* Sidebar */}
        <AdminSidebar isOpen={sidebarOpen} onToggle={setSidebarOpen} />

        {/* Main Content */}
        <main
          className={`flex-1 transition-all duration-300 ${sidebarOpen ? "lg:ml-64" : "lg:ml-16"}`}
        >
          <div className="p-6 lg:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="font-serif text-3xl font-light text-foreground">
                  Admin Dashboard
                </h1>
                <p className="text-muted-foreground mt-2">
                  Welcome back! Here&apos;s an overview of your practice.
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

            {/* Dashboard Content */}
            <div className="space-y-8">
              {/* Quick Actions */}
              <QuickActions />

              {/* Metrics */}
              <MetricsWidgets />

              {/* Recent Activity */}
              <RecentActivity />
            </div>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
