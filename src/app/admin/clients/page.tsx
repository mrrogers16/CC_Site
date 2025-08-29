"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/admin/layout/admin-layout";
import { ClientList } from "@/components/admin/clients/client-list";
import { ClientSearchFilters } from "@/components/admin/clients/client-search-filters";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

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

interface PaginationInfo {
  page: number;
  totalPages: number;
  total: number;
  hasNext: boolean;
  hasPrev: boolean;
  limit: number;
}

interface ClientsData {
  clients: Client[];
  pagination: PaginationInfo;
}

export default function AdminClientsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  const [clientsData, setClientsData] = useState<ClientsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter state
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [limit] = useState(10);

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

  // Fetch clients data
  const fetchClients = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
        sortBy,
        sortOrder,
        ...(search && { search }),
        ...(statusFilter && { status: statusFilter }),
        ...(dateFrom && { dateFrom }),
        ...(dateTo && { dateTo }),
      });

      const response = await fetch(`/api/admin/clients?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || "Failed to fetch clients");
      }
      
      setClientsData(result.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(errorMessage);
      console.error("Failed to fetch clients:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch clients when filters change
  useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      fetchClients();
    }
  }, [
    status,
    session,
    currentPage,
    search,
    sortBy,
    sortOrder,
    statusFilter,
    dateFrom,
    dateTo,
  ]);

  // Handle search with debouncing
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      setCurrentPage(1); // Reset to first page when searching
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [search]);

  // Handle filter changes
  const handleSearchChange = (value: string) => {
    setSearch(value);
  };

  const handleSortChange = (field: string) => {
    if (field === sortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleDateRangeChange = (from: string, to: string) => {
    setDateFrom(from);
    setDateTo(to);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const clearFilters = () => {
    setSearch("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setStatusFilter("");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

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
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-serif text-3xl font-light text-foreground">
              Client Management
            </h1>
            <p className="text-muted-foreground mt-2">
              View and manage all client profiles and their activity
            </p>
          </div>
          
          {clientsData && (
            <div className="text-right">
              <div className="text-2xl font-light text-foreground">
                {clientsData.pagination.total}
              </div>
              <div className="text-sm text-muted-foreground">
                Total Clients
              </div>
            </div>
          )}
        </div>

        {/* Search and Filters */}
        <ClientSearchFilters
          search={search}
          onSearchChange={handleSearchChange}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateRangeChange={handleDateRangeChange}
          onClearFilters={clearFilters}
        />

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
              Error loading clients
            </div>
            <p className="text-muted-foreground mb-4">{error}</p>
            <button
              onClick={fetchClients}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : clientsData ? (
          <ClientList
            clients={clientsData.clients}
            pagination={clientsData.pagination}
            onPageChange={handlePageChange}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
          />
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            No client data available
          </div>
        )}
      </div>
    </AdminLayout>
  );
}