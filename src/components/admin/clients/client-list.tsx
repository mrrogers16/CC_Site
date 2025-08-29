"use client";

import { useState } from "react";
import Link from "next/link";
import { ClientSummaryCard } from "./client-summary-card";

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

interface ClientListProps {
  clients: Client[];
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  sortBy: string;
  sortOrder: string;
  onSortChange: (field: string) => void;
}

export function ClientList({
  clients,
  pagination,
  onPageChange,
  sortBy,
  sortOrder,
  onSortChange,
}: ClientListProps) {
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards");

  if (clients.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="w-12 h-12 mx-auto text-muted-foreground mb-4"
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
        <h3 className="text-lg font-medium text-foreground mb-2">No clients found</h3>
        <p className="text-muted-foreground">
          No clients match your current search criteria.
        </p>
      </div>
    );
  }

  const getSortIcon = (field: string) => {
    if (sortBy !== field) {
      return (
        <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
      );
    }
    return (
      <svg
        className={`w-4 h-4 text-primary transform transition-transform ${
          sortOrder === "desc" ? "rotate-180" : ""
        }`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
      </svg>
    );
  };

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-muted-foreground">
          Showing {((pagination.page - 1) * pagination.limit) + 1} to{" "}
          {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} clients
        </div>
        
        <div className="flex border border-border rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode("cards")}
            className={`px-3 py-1 text-sm transition-colors ${
              viewMode === "cards"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
            Cards
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`px-3 py-1 text-sm transition-colors ${
              viewMode === "table"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <svg className="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
            Table
          </button>
        </div>
      </div>

      {/* Content */}
      {viewMode === "cards" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((client) => (
            <ClientSummaryCard key={client.id} client={client} />
          ))}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => onSortChange("name")}
                      className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors"
                    >
                      Name
                      {getSortIcon("name")}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => onSortChange("email")}
                      className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors"
                    >
                      Email
                      {getSortIcon("email")}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left hidden sm:table-cell">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => onSortChange("appointmentCount")}
                      className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors"
                    >
                      Appointments
                      {getSortIcon("appointmentCount")}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">
                    <button
                      onClick={() => onSortChange("lastAppointment")}
                      className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors"
                    >
                      Last Visit
                      {getSortIcon("lastAppointment")}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button
                      onClick={() => onSortChange("createdAt")}
                      className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors"
                    >
                      Registered
                      {getSortIcon("createdAt")}
                    </button>
                  </th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-foreground">{client.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-muted-foreground">{client.email}</div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <div className="text-muted-foreground">
                        {client.phone || "—"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-foreground">{client.appointmentCount}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="text-muted-foreground">
                        {client.lastAppointment
                          ? new Date(client.lastAppointment).toLocaleDateString()
                          : "Never"}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-muted-foreground">
                        {new Date(client.createdAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/clients/${client.id}`}
                        className="text-primary hover:text-primary/80 text-sm font-medium transition-colors"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {pagination.page} of {pagination.totalPages}
          </div>
          
          <div className="flex gap-1">
            <button
              onClick={() => onPageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className="px-3 py-1 text-sm border border-border rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            >
              Previous
            </button>
            
            {/* Page numbers */}
            {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
              const pageNum = Math.max(1, pagination.page - 2) + i;
              if (pageNum > pagination.totalPages) return null;
              
              return (
                <button
                  key={pageNum}
                  onClick={() => onPageChange(pageNum)}
                  className={`px-3 py-1 text-sm border rounded-md transition-colors ${
                    pageNum === pagination.page
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:text-foreground hover:border-foreground"
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
            
            <button
              onClick={() => onPageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
              className="px-3 py-1 text-sm border border-border rounded-md disabled:opacity-50 disabled:cursor-not-allowed text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}