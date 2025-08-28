import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { jest } from "@jest/globals";
import AdminAnalyticsPage from "./page";

// Mock dependencies
jest.mock("next-auth/react", () => ({
  useSession: jest.fn(),
}));

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

jest.mock("@/components/layout/navigation", () => ({
  Navigation: () => <div data-testid="navigation">Navigation</div>,
}));

jest.mock("@/components/layout/footer", () => ({
  Footer: () => <div data-testid="footer">Footer</div>,
}));

jest.mock("@/components/admin/layout/admin-sidebar", () => ({
  AdminSidebar: ({ isOpen, onToggle }: any) => (
    <div data-testid="admin-sidebar">
      Sidebar - {isOpen ? "Open" : "Closed"}
      <button onClick={() => onToggle(!isOpen)}>Toggle</button>
    </div>
  ),
}));

// Create properly typed mocks
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockPush = jest.fn();

// Set up mock implementations
(useSession as jest.Mock).mockReturnValue({
  data: null,
  status: "loading",
  update: jest.fn(),
});

(useRouter as jest.Mock).mockReturnValue({
  push: mockPush,
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
  prefetch: jest.fn(),
});

// Mock fetch globally
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>;
global.fetch = mockFetch;

describe("AdminAnalyticsPage", () => {
  const mockAnalyticsData = {
    dateRange: {
      startDate: "2024-01-01T00:00:00Z",
      endDate: "2024-01-31T23:59:59Z",
    },
    revenue: {
      currentTotal: 4500,
      previousTotal: 3900,
      percentageChange: 15.38,
      avgSessionValue: 225,
      totalSessions: 20,
    },
    appointments: {
      totalAppointments: 25,
      utilizationRate: 72.5,
      cancellationRate: 12.0,
      statusBreakdown: {
        completed: 20,
        cancelled: 3,
        pending: 1,
        confirmed: 1,
        noShow: 0,
      },
      availableSlots: 160,
      bookedSlots: 25,
    },
    clients: {
      newClients: 12,
      returningClients: 8,
      totalUniqueClients: 18,
      newVsReturningRatio: 1.5,
      avgSessionsPerClient: 1.39,
    },
    services: {
      totalServices: 3,
      mostPopularService: {
        id: "service1",
        title: "Individual Therapy",
        bookingCount: 15,
        revenue: 3375,
      },
      serviceBreakdown: [
        {
          id: "service1",
          title: "Individual Therapy",
          bookingCount: 15,
          revenue: 3375,
          avgDuration: 60,
        },
        {
          id: "service2",
          title: "Couples Therapy",
          bookingCount: 5,
          revenue: 1125,
          avgDuration: 90,
        },
      ],
      totalServiceRevenue: 4500,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockClear();
    mockFetch.mockClear();
  });

  describe("Authentication", () => {
    it("should show loading spinner when session is loading", () => {
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: "loading",
        update: jest.fn(),
      });

      render(<AdminAnalyticsPage />);

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should redirect to login if no session", () => {
      (useSession as jest.Mock).mockReturnValue({
        data: null,
        status: "unauthenticated",
        update: jest.fn(),
      });

      render(<AdminAnalyticsPage />);

      expect(mockPush).toHaveBeenCalledWith("/admin/login");
    });

    it("should redirect if user is not admin", () => {
      (useSession as jest.Mock).mockReturnValue({
        data: {
          user: { id: "1", role: "CLIENT" },
          expires: "",
        },
        status: "authenticated",
        update: jest.fn(),
      });

      render(<AdminAnalyticsPage />);

      expect(mockPush).toHaveBeenCalledWith("/admin/login");
    });
  });

  describe("Analytics Data Loading", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { 
            id: "admin", 
            role: "ADMIN",
            email: "admin@example.com",
            name: "Admin User",
            emailVerified: new Date()
          },
          expires: "",
        },
        status: "authenticated",
        update: jest.fn() as any,
      });
    });

    it("should fetch analytics data on mount", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, analytics: mockAnalyticsData }),
      } as Response);

      render(<AdminAnalyticsPage />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("/api/admin/analytics?")
        );
      });
    });

    it("should display loading state while fetching", async () => {
      mockFetch.mockImplementation(
        () =>
          new Promise(() => {
            // Never resolve to keep loading state
          })
      );

      render(<AdminAnalyticsPage />);

      expect(screen.getByText("Loading analytics data...")).toBeInTheDocument();
    });

    it("should display error message on fetch failure", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      render(<AdminAnalyticsPage />);

      await waitFor(() => {
        expect(
          screen.getByText("Error fetching analytics data")
        ).toBeInTheDocument();
      });
    });

    it("should display API error message", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: false, message: "Invalid date range" }),
      } as Response);

      render(<AdminAnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText("Invalid date range")).toBeInTheDocument();
      });
    });
  });

  describe("Date Range Controls", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { 
            id: "admin", 
            role: "ADMIN",
            email: "admin@example.com",
            name: "Admin User",
            emailVerified: new Date()
          },
          expires: "",
        },
        status: "authenticated",
        update: jest.fn() as any,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, analytics: mockAnalyticsData }),
      } as Response);
    });

    it("should display date range inputs", async () => {
      render(<AdminAnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText("Start Date")).toBeInTheDocument();
        expect(screen.getByLabelText("End Date")).toBeInTheDocument();
      });
    });

    it("should display period selection buttons", async () => {
      render(<AdminAnalyticsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Week" })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: "Month" })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: "Quarter" })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: "Year" })
        ).toBeInTheDocument();
      });
    });

    it("should update date range when period button is clicked", async () => {
      render(<AdminAnalyticsPage />);

      await waitFor(() => {
        fireEvent.click(screen.getByRole("button", { name: "Week" }));
      });

      // Should trigger new API call with updated date range
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + after period change
      });
    });

    it("should update date range when input is changed", async () => {
      render(<AdminAnalyticsPage />);

      await waitFor(() => {
        const startDateInput = screen.getByLabelText("Start Date");
        fireEvent.change(startDateInput, { target: { value: "2024-02-01" } });
      });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(2); // Initial + after date change
      });
    });
  });

  describe("Analytics Display", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { 
            id: "admin", 
            role: "ADMIN",
            email: "admin@example.com",
            name: "Admin User",
            emailVerified: new Date()
          },
          expires: "",
        },
        status: "authenticated",
        update: jest.fn() as any,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, analytics: mockAnalyticsData }),
      } as Response);
    });

    it("should display revenue analytics correctly", async () => {
      render(<AdminAnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText("Revenue Analytics")).toBeInTheDocument();
        expect(screen.getByText("$4,500")).toBeInTheDocument(); // Current total
        expect(screen.getByText("$225")).toBeInTheDocument(); // Avg session value
        expect(screen.getByText("20")).toBeInTheDocument(); // Total sessions
        expect(screen.getByText("↑")).toBeInTheDocument(); // Positive change indicator
        expect(
          screen.getByText("15.4% vs previous period")
        ).toBeInTheDocument();
      });
    });

    it("should display appointment analytics correctly", async () => {
      render(<AdminAnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText("Appointment Analytics")).toBeInTheDocument();
        expect(screen.getByText("72.5%")).toBeInTheDocument(); // Utilization rate
        expect(screen.getByText("12.0%")).toBeInTheDocument(); // Cancellation rate
        expect(screen.getByText("25 of 160 slots filled")).toBeInTheDocument();
        expect(
          screen.getByText("Appointment Status Breakdown")
        ).toBeInTheDocument();
      });
    });

    it("should display client analytics correctly", async () => {
      render(<AdminAnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText("Client Analytics")).toBeInTheDocument();
        expect(screen.getByText("12")).toBeInTheDocument(); // New clients
        expect(screen.getByText("8")).toBeInTheDocument(); // Returning clients
        expect(screen.getByText("18")).toBeInTheDocument(); // Total unique
        expect(screen.getByText("1.5:1")).toBeInTheDocument(); // Ratio
        expect(screen.getByText("1.4")).toBeInTheDocument(); // Avg sessions per client
      });
    });

    it("should display service performance correctly", async () => {
      render(<AdminAnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText("Service Performance")).toBeInTheDocument();
        expect(screen.getByText("Most Popular Service")).toBeInTheDocument();
        expect(screen.getByText("Individual Therapy")).toBeInTheDocument();
        expect(screen.getByText("15 bookings")).toBeInTheDocument();
        expect(screen.getByText("$3,375")).toBeInTheDocument();
        expect(
          screen.getByText("All Services Performance")
        ).toBeInTheDocument();
      });
    });

    it("should handle negative revenue change", async () => {
      const negativeChangeData = {
        ...mockAnalyticsData,
        revenue: {
          ...mockAnalyticsData.revenue,
          percentageChange: -10.5,
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, analytics: negativeChangeData }),
      } as Response);

      render(<AdminAnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText("↓")).toBeInTheDocument();
        expect(
          screen.getByText("10.5% vs previous period")
        ).toBeInTheDocument();
      });
    });

    it("should handle client ratio edge cases", async () => {
      const infinityRatioData = {
        ...mockAnalyticsData,
        clients: {
          ...mockAnalyticsData.clients,
          newVsReturningRatio: Infinity,
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, analytics: infinityRatioData }),
      } as Response);

      render(<AdminAnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText("All New")).toBeInTheDocument();
      });
    });

    it("should handle zero client ratio", async () => {
      const zeroRatioData = {
        ...mockAnalyticsData,
        clients: {
          ...mockAnalyticsData.clients,
          newVsReturningRatio: 0,
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, analytics: zeroRatioData }),
      } as Response);

      render(<AdminAnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText("All Returning")).toBeInTheDocument();
      });
    });

    it("should handle no most popular service", async () => {
      const noServiceData = {
        ...mockAnalyticsData,
        services: {
          ...mockAnalyticsData.services,
          mostPopularService: null,
        },
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, analytics: noServiceData }),
      } as Response);

      render(<AdminAnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByText("Service Performance")).toBeInTheDocument();
        expect(
          screen.queryByText("Most Popular Service")
        ).not.toBeInTheDocument();
      });
    });
  });

  describe("UI Interactions", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { 
            id: "admin", 
            role: "ADMIN",
            email: "admin@example.com",
            name: "Admin User",
            emailVerified: new Date()
          },
          expires: "",
        },
        status: "authenticated",
        update: jest.fn() as any,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, analytics: mockAnalyticsData }),
      } as Response);
    });

    it("should toggle sidebar on mobile", async () => {
      render(<AdminAnalyticsPage />);

      await waitFor(() => {
        const sidebarToggle = screen.getByLabelText("Toggle sidebar");
        fireEvent.click(sidebarToggle);
      });

      // Sidebar state should be updated
      expect(screen.getByText("Sidebar - Open")).toBeInTheDocument();
    });

    it("should highlight selected period button", async () => {
      render(<AdminAnalyticsPage />);

      await waitFor(() => {
        const monthButton = screen.getByRole("button", { name: "Month" });
        // Default selection should be "month"
        expect(monthButton.className).toContain("bg-primary");
      });
    });
  });

  describe("Accessibility", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { 
            id: "admin", 
            role: "ADMIN",
            email: "admin@example.com",
            name: "Admin User",
            emailVerified: new Date()
          },
          expires: "",
        },
        status: "authenticated",
        update: jest.fn() as any,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, analytics: mockAnalyticsData }),
      } as Response);
    });

    it("should have proper heading structure", async () => {
      render(<AdminAnalyticsPage />);

      await waitFor(() => {
        const mainHeading = screen.getByRole("heading", { level: 1 });
        expect(mainHeading).toHaveTextContent("Practice Analytics");

        const sectionHeadings = screen.getAllByRole("heading", { level: 2 });
        expect(sectionHeadings.length).toBeGreaterThan(0);
      });
    });

    it("should have proper form labels", async () => {
      render(<AdminAnalyticsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText("Start Date")).toBeInTheDocument();
        expect(screen.getByLabelText("End Date")).toBeInTheDocument();
      });
    });

    it("should have proper button roles and labels", async () => {
      render(<AdminAnalyticsPage />);

      await waitFor(() => {
        expect(
          screen.getByRole("button", { name: "Week" })
        ).toBeInTheDocument();
        expect(
          screen.getByRole("button", { name: "Month" })
        ).toBeInTheDocument();
        expect(screen.getByLabelText("Toggle sidebar")).toBeInTheDocument();
      });
    });
  });

  describe("Performance", () => {
    beforeEach(() => {
      mockUseSession.mockReturnValue({
        data: {
          user: { 
            id: "admin", 
            role: "ADMIN",
            email: "admin@example.com",
            name: "Admin User",
            emailVerified: new Date()
          },
          expires: "",
        },
        status: "authenticated",
        update: jest.fn() as any,
      });
    });

    it("should not refetch on every render", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, analytics: mockAnalyticsData }),
      } as Response);

      const { rerender } = render(<AdminAnalyticsPage />);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      // Rerender without prop changes
      rerender(<AdminAnalyticsPage />);

      // Should not fetch again
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });
});
