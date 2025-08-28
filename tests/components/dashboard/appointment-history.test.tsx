import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SessionProvider as _SessionProvider } from "next-auth/react";
import { AppointmentHistory } from "@/components/dashboard/appointment-history";
import { jest } from "@jest/globals";

// Mock fetch
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

describe("AppointmentHistory Component", () => {
  const mockSession = {
    user: {
      id: "user1",
      name: "John Doe",
      email: "john@example.com",
    },
  };

  const mockHistoryAppointments = [
    {
      id: "appointment1",
      dateTime: "2024-01-15T10:00:00Z",
      status: "COMPLETED",
      notes: "Initial consultation",
      service: {
        title: "Individual Therapy",
        duration: 60,
        price: "120",
      },
      createdAt: "2024-01-10T10:00:00Z",
      updatedAt: "2024-01-15T11:00:00Z",
    },
    {
      id: "appointment2",
      dateTime: "2024-01-08T14:00:00Z",
      status: "CANCELLED",
      notes: null,
      service: {
        title: "Couples Therapy",
        duration: 90,
        price: "180",
      },
      createdAt: "2024-01-05T10:00:00Z",
      updatedAt: "2024-01-08T12:00:00Z",
    },
  ];

  const mockPagination = {
    page: 1,
    limit: 10,
    total: 2,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  };

  beforeEach(() => {
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: "authenticated",
    });

    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        success: true,
        data: {
          appointments: mockHistoryAppointments,
          pagination: mockPagination,
        },
      }),
    } as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("Loading State", () => {
    test("shows loading skeleton when fetching data", () => {
      // Mock pending fetch
      mockFetch.mockImplementation(() => new Promise(() => {}));

      render(<AppointmentHistory />);

      expect(screen.getByText("Appointment History")).toBeInTheDocument();
      expect(
        screen.getByText("View your past appointments")
      ).toBeInTheDocument();

      // Check for loading animations
      const skeletonElements = document.querySelectorAll(".animate-pulse");
      expect(skeletonElements.length).toBeGreaterThan(0);
    });
  });

  describe("Error State", () => {
    test("displays error message when fetch fails", async () => {
      mockFetch.mockRejectedValue(new Error("Network error"));

      render(<AppointmentHistory />);

      await waitFor(() => {
        expect(
          screen.getByText(
            "Unable to load appointment history. Please try again."
          )
        ).toBeInTheDocument();
      });

      expect(screen.getByText("Appointment History")).toBeInTheDocument();
      expect(
        screen.getByText("View your past appointments")
      ).toBeInTheDocument();
    });

    test("displays error message when API returns error", async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: jest.fn().mockResolvedValue({
          success: false,
          message: "Failed to fetch appointment history",
        }),
      } as any);

      render(<AppointmentHistory />);

      await waitFor(() => {
        expect(
          screen.getByText(
            "Unable to load appointment history. Please try again."
          )
        ).toBeInTheDocument();
      });
    });
  });

  describe("Empty State", () => {
    test("shows empty state when no appointments exist", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: {
            appointments: [],
            pagination: { ...mockPagination, total: 0 },
          },
        }),
      } as any);

      render(<AppointmentHistory />);

      await waitFor(() => {
        expect(
          screen.getByText("No appointment history found")
        ).toBeInTheDocument();
      });

      expect(
        screen.getByText("You don't have any past appointments yet.")
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /schedule your first appointment/i })
      ).toHaveAttribute("href", "/book");
    });

    test("shows filtered empty state when search/filters return no results", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: {
            appointments: [],
            pagination: { ...mockPagination, total: 0 },
          },
        }),
      } as any);

      render(<AppointmentHistory />);

      // Set a search term
      const searchInput = await waitFor(() =>
        screen.getByPlaceholderText("Search appointments...")
      );
      fireEvent.change(searchInput, { target: { value: "test search" } });

      await waitFor(() => {
        expect(
          screen.getByText("No appointment history found")
        ).toBeInTheDocument();
      });

      expect(
        screen.getByText("Try adjusting your search or filters.")
      ).toBeInTheDocument();
    });
  });

  describe("Appointment List Display", () => {
    test("displays appointment history correctly", async () => {
      render(<AppointmentHistory />);

      await waitFor(() => {
        expect(screen.getByText("Individual Therapy")).toBeInTheDocument();
        expect(screen.getByText("Couples Therapy")).toBeInTheDocument();
      });

      // Check appointment count
      expect(screen.getByText("2 past appointments")).toBeInTheDocument();

      // Check status badges
      expect(screen.getByText("Completed")).toBeInTheDocument();
      expect(screen.getByText("Cancelled")).toBeInTheDocument();

      // Check appointment details
      expect(screen.getByText("60 minutes")).toBeInTheDocument();
      expect(screen.getByText("90 minutes")).toBeInTheDocument();
      expect(screen.getByText("$120")).toBeInTheDocument();
      expect(screen.getByText("$180")).toBeInTheDocument();
    });

    test("displays appointment notes when present", async () => {
      render(<AppointmentHistory />);

      await waitFor(() => {
        expect(screen.getByText("Notes:")).toBeInTheDocument();
        expect(screen.getByText("Initial consultation")).toBeInTheDocument();
      });
    });

    test("calls onAppointmentClick when appointment is clicked", async () => {
      const mockOnAppointmentClick = jest.fn();

      render(
        <AppointmentHistory onAppointmentClick={mockOnAppointmentClick} />
      );

      await waitFor(() => {
        expect(screen.getByText("Individual Therapy")).toBeInTheDocument();
      });

      const appointmentCard = screen
        .getByText("Individual Therapy")
        .closest("div")?.parentElement;

      if (appointmentCard) {
        fireEvent.click(appointmentCard);
      }

      expect(mockOnAppointmentClick).toHaveBeenCalledWith("appointment1");
    });
  });

  describe("Search Functionality", () => {
    test("filters appointments by search term", async () => {
      render(<AppointmentHistory />);

      const searchInput = await waitFor(() =>
        screen.getByPlaceholderText("Search appointments...")
      );

      fireEvent.change(searchInput, { target: { value: "Individual" } });

      // Wait for debounced search
      await waitFor(
        () => {
          expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining("search=Individual")
          );
        },
        { timeout: 1000 }
      );
    });

    test("debounces search input", async () => {
      render(<AppointmentHistory />);

      const searchInput = await waitFor(() =>
        screen.getByPlaceholderText("Search appointments...")
      );

      // Type multiple characters quickly
      fireEvent.change(searchInput, { target: { value: "I" } });
      fireEvent.change(searchInput, { target: { value: "In" } });
      fireEvent.change(searchInput, { target: { value: "Ind" } });

      // Should not call fetch immediately
      expect(mockFetch).toHaveBeenCalledTimes(1); // Only initial load

      // Wait for debounce
      await waitFor(
        () => {
          expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining("search=Ind")
          );
        },
        { timeout: 1000 }
      );
    });
  });

  describe("Filter Functionality", () => {
    test("filters by appointment status", async () => {
      render(<AppointmentHistory />);

      const statusSelect = await waitFor(() =>
        screen.getByDisplayValue("All Status")
      );

      fireEvent.change(statusSelect, { target: { value: "COMPLETED" } });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("status=COMPLETED")
        );
      });
    });

    test("filters by date range", async () => {
      render(<AppointmentHistory />);

      const dateRangeSelect = await waitFor(() =>
        screen.getByDisplayValue("All Time")
      );

      fireEvent.change(dateRangeSelect, { target: { value: "last_month" } });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("dateRange=last_month")
        );
      });
    });

    test("resets to page 1 when filter changes", async () => {
      // Mock multi-page pagination
      const multiPagePagination = {
        ...mockPagination,
        page: 2,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: {
            appointments: mockHistoryAppointments,
            pagination: multiPagePagination,
          },
        }),
      } as any);

      render(<AppointmentHistory />);

      const statusSelect = await waitFor(() =>
        screen.getByDisplayValue("All Status")
      );

      fireEvent.change(statusSelect, { target: { value: "COMPLETED" } });

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("page=1")
        );
      });
    });
  });

  describe("Pagination", () => {
    test("displays pagination when multiple pages exist", async () => {
      const multiPagePagination = {
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: {
            appointments: mockHistoryAppointments,
            pagination: multiPagePagination,
          },
        }),
      } as any);

      render(<AppointmentHistory />);

      await waitFor(() => {
        expect(
          screen.getByText("Page 1 of 3 (25 total appointments)")
        ).toBeInTheDocument();
      });

      // Check pagination buttons
      const prevButton = screen.getByRole("button", { name: /previous/i });
      const nextButton = screen.getByRole("button", { name: /next/i });

      expect(prevButton).toBeDisabled();
      expect(nextButton).not.toBeDisabled();
    });

    test("handles page navigation", async () => {
      const multiPagePagination = {
        page: 1,
        limit: 10,
        total: 25,
        totalPages: 3,
        hasNext: true,
        hasPrev: false,
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: {
            appointments: mockHistoryAppointments,
            pagination: multiPagePagination,
          },
        }),
      } as any);

      render(<AppointmentHistory />);

      const nextButton = await waitFor(() =>
        screen.getByRole("button", { name: /next/i })
      );

      fireEvent.click(nextButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining("page=2")
        );
      });
    });

    test("does not display pagination for single page", async () => {
      render(<AppointmentHistory />);

      await waitFor(() => {
        expect(screen.getByText("Individual Therapy")).toBeInTheDocument();
      });

      // Should not show pagination controls
      expect(screen.queryByText(/page \d+ of \d+/i)).not.toBeInTheDocument();
    });
  });

  describe("Status Icons and Badges", () => {
    test("displays correct status icons for different appointment statuses", async () => {
      const appointmentsWithAllStatuses = [
        { ...mockHistoryAppointments[0], status: "COMPLETED" as const },
        {
          ...mockHistoryAppointments[1],
          status: "CANCELLED" as const,
          id: "appointment3",
        },
        {
          ...mockHistoryAppointments[0],
          status: "NO_SHOW" as const,
          id: "appointment4",
        },
      ];

      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          data: {
            appointments: appointmentsWithAllStatuses,
            pagination: mockPagination,
          },
        }),
      } as any);

      render(<AppointmentHistory />);

      await waitFor(() => {
        expect(screen.getByText("Completed")).toBeInTheDocument();
        expect(screen.getByText("Cancelled")).toBeInTheDocument();
        expect(screen.getByText("No Show")).toBeInTheDocument();
      });
    });
  });

  describe("Authentication", () => {
    test("does not fetch data when user is not authenticated", () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
      });

      render(<AppointmentHistory />);

      expect(mockFetch).not.toHaveBeenCalled();
    });

    test("stops loading when no user session exists", () => {
      mockUseSession.mockReturnValue({
        data: null,
        status: "unauthenticated",
      });

      render(<AppointmentHistory />);

      expect(screen.queryByText("Loading")).not.toBeInTheDocument();
    });
  });

  describe("API Integration", () => {
    test("makes correct API call for history appointments", () => {
      render(<AppointmentHistory />);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("upcoming=false")
      );
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining("page=1"));
    });

    test("includes all filter parameters in API call", async () => {
      render(<AppointmentHistory />);

      // Set all filters
      const searchInput = await waitFor(() =>
        screen.getByPlaceholderText("Search appointments...")
      );
      fireEvent.change(searchInput, { target: { value: "therapy" } });

      const statusSelect = screen.getByDisplayValue("All Status");
      fireEvent.change(statusSelect, { target: { value: "COMPLETED" } });

      const dateRangeSelect = screen.getByDisplayValue("All Time");
      fireEvent.change(dateRangeSelect, { target: { value: "last_month" } });

      await waitFor(
        () => {
          expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining("search=therapy")
          );
          expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining("status=COMPLETED")
          );
          expect(mockFetch).toHaveBeenCalledWith(
            expect.stringContaining("dateRange=last_month")
          );
        },
        { timeout: 1000 }
      );
    });
  });
});
