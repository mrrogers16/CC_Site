"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { AdminLayout } from "@/components/admin/layout/admin-layout";
import { ClientDetailView } from "@/components/admin/clients/client-detail-view";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

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

export default function AdminClientDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const clientId = params?.id as string;
  
  const [client, setClient] = useState<ClientData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if not admin
  useEffect(() => {
    if (status === "loading") return;
    
    if (!session) {
      router.push("/admin/login");
      return;
    }
    
    if (session.user?.role !== "ADMIN") {
      router.push("/");
      return;
    }
  }, [session, status, router]);

  // Fetch client data
  useEffect(() => {
    async function fetchClient() {
      if (!clientId || status !== "authenticated" || session?.user?.role !== "ADMIN") {
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch(`/api/admin/clients/${clientId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Client not found");
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || "Failed to fetch client");
        }
        
        setClient(result.data);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
        setError(errorMessage);
        console.error("Failed to fetch client:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchClient();
  }, [clientId, session, status]);

  // Show loading while checking authentication
  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Don't render anything if not authenticated (redirect in progress)
  if (!session || session.user?.role !== "ADMIN") {
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Link
            href="/admin/dashboard"
            className="hover:text-foreground transition-colors"
          >
            Dashboard
          </Link>
          <span>&gt;</span>
          <Link
            href="/admin/clients"
            className="hover:text-foreground transition-colors"
          >
            Clients
          </Link>
          <span>&gt;</span>
          <span className="text-foreground">
            {client ? client.name : "Client Details"}
          </span>
        </nav>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-light text-foreground">
              {loading ? "Loading..." : client?.name || "Client Details"}
            </h1>
            {client && (
              <p className="text-muted-foreground mt-2">
                Client since {new Date(client.createdAt).toLocaleDateString()}
              </p>
            )}
          </div>
          
          {client && (
            <div className="flex gap-2">
              <Link
                href={`/admin/appointments?client=${client.id}`}
                className="px-4 py-2 border border-border text-muted-foreground hover:text-foreground hover:border-foreground rounded-md transition-colors"
              >
                View Appointments
              </Link>
              <Link
                href={`mailto:${client.email}`}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Contact Client
              </Link>
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-red-600 mb-4">
              <svg
                className="w-12 h-12 mx-auto mb-4"
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
              {error === "Client not found" ? "Client Not Found" : "Error loading client"}
            </div>
            <p className="text-muted-foreground mb-4">{error}</p>
            <div className="flex gap-2 justify-center">
              <Link
                href="/admin/clients"
                className="px-4 py-2 border border-border text-muted-foreground hover:text-foreground hover:border-foreground rounded-md transition-colors"
              >
                Back to Clients
              </Link>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        ) : client ? (
          <ClientDetailView client={client} />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No client data available
          </div>
        )}
      </div>
    </AdminLayout>
  );
}