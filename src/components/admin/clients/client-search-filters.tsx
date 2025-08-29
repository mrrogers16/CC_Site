"use client";

import { useState } from "react";

interface ClientSearchFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  sortBy: string;
  sortOrder: string;
  onSortChange: (field: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  dateFrom: string;
  dateTo: string;
  onDateRangeChange: (from: string, to: string) => void;
  onClearFilters: () => void;
}

export function ClientSearchFilters({
  search,
  onSearchChange,
  sortBy,
  sortOrder,
  onSortChange,
  statusFilter,
  onStatusFilterChange,
  dateFrom,
  dateTo,
  onDateRangeChange,
  onClearFilters,
}: ClientSearchFiltersProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const handleDateFromChange = (value: string) => {
    onDateRangeChange(value, dateTo);
  };

  const handleDateToChange = (value: string) => {
    onDateRangeChange(dateFrom, value);
  };

  const hasActiveFilters = search || statusFilter || dateFrom || dateTo || sortBy !== "createdAt" || sortOrder !== "desc";

  return (
    <div className="space-y-4">
      {/* Primary Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search clients by name, email, or phone..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-border rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
            {search && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
              showAdvancedFilters || hasActiveFilters
                ? "border-primary text-primary bg-primary/10"
                : "border-border text-muted-foreground hover:text-foreground hover:border-foreground"
            }`}
          >
            <svg
              className={`w-4 h-4 inline-block mr-2 transform transition-transform ${
                showAdvancedFilters ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.414A1 1 0 013 6.586V4z"
              />
            </svg>
            Filters
            {hasActiveFilters && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
                Active
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <button
              onClick={onClearFilters}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Quick Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onStatusFilterChange("")}
          className={`px-3 py-1 text-sm rounded-full border transition-colors ${
            statusFilter === ""
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:text-foreground hover:border-foreground"
          }`}
        >
          All Clients
        </button>
        <button
          onClick={() => onStatusFilterChange("active")}
          className={`px-3 py-1 text-sm rounded-full border transition-colors ${
            statusFilter === "active"
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:text-foreground hover:border-foreground"
          }`}
        >
          Active
        </button>
        <button
          onClick={() => onStatusFilterChange("new")}
          className={`px-3 py-1 text-sm rounded-full border transition-colors ${
            statusFilter === "new"
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:text-foreground hover:border-foreground"
          }`}
        >
          New Clients
        </button>
        <button
          onClick={() => onStatusFilterChange("inactive")}
          className={`px-3 py-1 text-sm rounded-full border transition-colors ${
            statusFilter === "inactive"
              ? "bg-primary text-primary-foreground border-primary"
              : "border-border text-muted-foreground hover:text-foreground hover:border-foreground"
          }`}
        >
          Inactive
        </button>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="p-4 border border-border rounded-lg bg-muted/30 space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Sort Options */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-2">
                Sort by
              </label>
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => onSortChange(e.target.value)}
                  className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  <option value="createdAt">Registration Date</option>
                  <option value="name">Name</option>
                  <option value="email">Email</option>
                  <option value="lastAppointment">Last Appointment</option>
                  <option value="appointmentCount">Total Appointments</option>
                </select>
                <button
                  onClick={() => onSortChange(sortBy)}
                  className="px-3 py-2 border border-border rounded-md text-muted-foreground hover:text-foreground hover:border-foreground transition-colors"
                  title={`Sort ${sortOrder === "asc" ? "Descending" : "Ascending"}`}
                >
                  <svg
                    className={`w-4 h-4 transform transition-transform ${
                      sortOrder === "desc" ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Date Range */}
            <div className="flex-1">
              <label className="block text-sm font-medium text-foreground mb-2">
                Registration Date Range
              </label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="From"
                />
                <span className="self-center text-muted-foreground">to</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => handleDateToChange(e.target.value)}
                  className="flex-1 px-3 py-2 border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="To"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}