import { render, screen, waitFor } from "@testing-library/react";
import { jest } from "@jest/globals";
import { MetricsWidgets } from "./metrics-widgets";

// Mock Next.js Link component
jest.mock("next/link", () => {
  return function Link({ children, href, ...props }: any) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  };
});

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

describe("MetricsWidgets", () => {
  const mockMetricsData = {
    totalClients: 45,
    appointmentsToday: 8,
    pendingAppointments: 12,
    unreadMessages: 3,
    thisMonthRevenue: 4500,
    completedAppointments: 120,
    revenueChange: 15.5,
    lastMonthRevenue: 3900,
    utilizationRate: 72.5,
    availableSlots: 160,
    bookedSlotsThisWeek: 32,
    newClientsThisMonth: 12,
    returningClientsThisMonth: 8,
    clientRatio: 150, // 12/8 * 100 = 150%
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    mockFetch.mockReset();
  });

  afterEach(async () => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    mockFetch.mockReset();
    // Clean up any pending operations
    await Promise.resolve();
  });

  describe("Loading State", () => {
    it("should display loading placeholders while fetching data", () => {
      mockFetch.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolve to keep loading state
          })
      );

      render(<MetricsWidgets />);

      // Check for loading placeholders
      const loadingElements = screen.getAllByText((_, element) => {
        return element?.className?.includes("animate-pulse") || false;
      });

      expect(loadingElements.length).toBeGreaterThan(0);
    });
  });

  describe("Data Display", () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, metrics: mockMetricsData }),
      });
    });

    it("should display all metric widgets correctly", async () => {
      render(<MetricsWidgets />);

      await waitFor(() => {
        expect(screen.getByText("45")).toBeInTheDocument(); // Total Clients
        expect(screen.getByText("8")).toBeInTheDocument(); // Appointments Today
        expect(screen.getByText("12")).toBeInTheDocument(); // Pending Appointments
        expect(screen.getByText("3")).toBeInTheDocument(); // Unread Messages
        expect(screen.getByText("120")).toBeInTheDocument(); // Completed Sessions
      });
    });

    it("should format revenue correctly", async () => {
      render(<MetricsWidgets />);

      await waitFor(() => {
        expect(screen.getByText("$4,500")).toBeInTheDocument();
      });
    });

    it("should display percentage change indicators", async () => {
      render(<MetricsWidgets />);

      await waitFor(() => {
        expect(screen.getByText("15.5% vs last month")).toBeInTheDocument();
      });
    });

    it("should format utilization rate correctly", async () => {
      render(<MetricsWidgets />);

      await waitFor(() => {
        expect(screen.getByText("72.5%")).toBeInTheDocument();
        expect(screen.getByText("32 of 160 slots filled")).toBeInTheDocument();
      });
    });

    it("should handle client ratio formatting", async () => {
      render(<MetricsWidgets />);

      await waitFor(() => {
        expect(screen.getByText("150.0:1")).toBeInTheDocument();
        expect(screen.getByText("12 new, 8 returning")).toBeInTheDocument();
      });
    });

    it("should display analytics link", async () => {
      render(<MetricsWidgets />);

      await waitFor(() => {
        const analyticsLink = screen.getByText("View Detailed Analytics →");
        expect(analyticsLink).toBeInTheDocument();
        expect(analyticsLink.closest("a")).toHaveAttribute(
          "href",
          "/admin/analytics"
        );
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero values correctly", async () => {
      const zeroMetrics = {
        ...mockMetricsData,
        totalClients: 0,
        appointmentsToday: 0,
        thisMonthRevenue: 0,
        revenueChange: 0,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, metrics: zeroMetrics }),
      });

      render(<MetricsWidgets />);

      await waitFor(() => {
        expect(screen.getByText("0")).toBeInTheDocument();
        expect(screen.getByText("$0")).toBeInTheDocument();
        expect(screen.getByText("0.0% vs last month")).toBeInTheDocument();
      });
    });

    it("should handle negative revenue change", async () => {
      const negativeChangeMetrics = {
        ...mockMetricsData,
        revenueChange: -12.3,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, metrics: negativeChangeMetrics }),
      });

      render(<MetricsWidgets />);

      await waitFor(() => {
        expect(screen.getByText("12.3% vs last month")).toBeInTheDocument();
      });
    });

    it("should handle client ratio edge cases", async () => {
      // Test Infinity case (all new clients)
      const infinityRatioMetrics = {
        ...mockMetricsData,
        clientRatio: Infinity,
        returningClientsThisMonth: 0,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, metrics: infinityRatioMetrics }),
      });

      render(<MetricsWidgets />);

      await waitFor(() => {
        expect(screen.getByText("All New")).toBeInTheDocument();
      });
    });

    it("should handle zero client ratio (all returning)", async () => {
      const zeroRatioMetrics = {
        ...mockMetricsData,
        clientRatio: 0,
        newClientsThisMonth: 0,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, metrics: zeroRatioMetrics }),
      });

      render(<MetricsWidgets />);

      await waitFor(() => {
        expect(screen.getByText("All Returning")).toBeInTheDocument();
      });
    });
  });

  describe("Error Handling", () => {
    it("should handle fetch errors gracefully", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      render(<MetricsWidgets />);

      await waitFor(() => {
        // Should show default values (0) when fetch fails
        const zeroElements = screen.getAllByText("0");
        expect(zeroElements.length).toBeGreaterThan(0);
      });
    });

    it("should handle API errors gracefully", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
      });

      render(<MetricsWidgets />);

      await waitFor(() => {
        // Should show default values when API returns error
        const zeroElements = screen.getAllByText("0");
        expect(zeroElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Visual Elements", () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, metrics: mockMetricsData }),
      });
    });

    it("should display all required sections", async () => {
      render(<MetricsWidgets />);

      await waitFor(() => {
        expect(screen.getByText("Practice Overview")).toBeInTheDocument();
        expect(screen.getByText("Total Clients")).toBeInTheDocument();
        expect(screen.getByText("Appointments Today")).toBeInTheDocument();
        expect(screen.getByText("This Month Revenue")).toBeInTheDocument();
        expect(screen.getByText("Appointment Utilization")).toBeInTheDocument();
        expect(screen.getByText("New vs Returning")).toBeInTheDocument();
      });
    });

    it("should display subtitles for analytics widgets", async () => {
      render(<MetricsWidgets />);

      await waitFor(() => {
        expect(screen.getByText("This Week")).toBeInTheDocument();
        expect(screen.getByText("This Month")).toBeInTheDocument();
      });
    });

    it("should highlight analytics widgets with special styling", async () => {
      render(<MetricsWidgets />);

      await waitFor(() => {
        const revenueWidget = screen
          .getByText("This Month Revenue")
          .closest("div")
          ?.closest("div");
        const utilizationWidget = screen
          .getByText("Appointment Utilization")
          .closest("div")
          ?.closest("div");
        const clientRatioWidget = screen
          .getByText("New vs Returning")
          .closest("div")
          ?.closest("div");

        // These should have the analytics styling - look at parent container
        expect(revenueWidget?.className).toContain("ring-1");
        expect(utilizationWidget?.className).toContain("ring-1");
        expect(clientRatioWidget?.className).toContain("ring-1");
      });
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, metrics: mockMetricsData }),
      });
    });

    it("should have proper heading structure", async () => {
      render(<MetricsWidgets />);

      await waitFor(() => {
        const heading = screen.getByText("Practice Overview");
        expect(heading.tagName).toBe("H2");
      });
    });

    it("should have accessible link to analytics page", async () => {
      render(<MetricsWidgets />);

      await waitFor(() => {
        const analyticsLink = screen.getByRole("link", {
          name: /view detailed analytics/i,
        });
        expect(analyticsLink).toBeInTheDocument();
        expect(analyticsLink).toHaveAttribute("href", "/admin/analytics");
      });
    });
  });

  describe("Performance", () => {
    it("should fetch metrics data only once on mount", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, metrics: mockMetricsData }),
      });

      render(<MetricsWidgets />);

      await waitFor(() => {
        expect(screen.getByText("45")).toBeInTheDocument();
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith("/api/admin/dashboard-metrics");
    });
  });
});
