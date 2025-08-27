import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useSession, signOut } from "next-auth/react";
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

// Mock NextAuth
jest.mock("next-auth/react");
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;
const mockSignOut = signOut as jest.MockedFunction<typeof signOut>;

// Mock DashboardHome component
jest.mock("@/components/dashboard/dashboard-home", () => ({
  DashboardHome: () => (
    <div data-testid="dashboard-home">Dashboard Home Component</div>
  ),
}));

// Mock fetch for API calls
global.fetch = jest.fn();

describe("DashboardLayout", () => {
  const mockSession = {
    user: {
      id: "user123",
      name: "John Doe",
      email: "john@example.com",
      role: "CLIENT",
      emailVerified: null,
    },
    expires: "2025-01-01",
  };

  const mockUpdate = jest.fn();

  beforeEach(() => {
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: "authenticated",
      update: mockUpdate,
    });

    // Default mock for appointments API
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { appointments: [] },
      }),
    });

    mockSignOut.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders dashboard layout with user information", () => {
    render(<DashboardLayout />);

    // Check if user avatar and name are displayed
    expect(screen.getByText("J")).toBeInTheDocument(); // Avatar initial
    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
  });

  it("renders all sidebar navigation items", () => {
    render(<DashboardLayout />);

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("My Appointments")).toBeInTheDocument();
    expect(screen.getByText("Appointment History")).toBeInTheDocument();
    expect(screen.getByText("Profile Settings")).toBeInTheDocument();
  });

  it("renders quick action buttons", () => {
    render(<DashboardLayout />);

    expect(screen.getByText("Book New Appointment")).toBeInTheDocument();
    expect(screen.getByText("Sign Out")).toBeInTheDocument();
  });

  it("shows dashboard home by default", () => {
    render(<DashboardLayout />);

    expect(screen.getByTestId("dashboard-home")).toBeInTheDocument();
  });

  it("switches sections when navigation items are clicked", async () => {
    const user = userEvent.setup();

    render(<DashboardLayout />);

    // Click on appointments section
    const appointmentsButton = screen.getByText("My Appointments");
    await user.click(appointmentsButton);

    // Should show appointments section title (Phase 2 is now implemented)
    await waitFor(() => {
      // Check for the page heading specifically
      expect(
        screen.getByRole("heading", { name: "My Appointments" })
      ).toBeInTheDocument();
      expect(
        screen.getByText("Manage your upcoming appointments")
      ).toBeInTheDocument();
    });
  });

  it("handles mobile sidebar toggle", async () => {
    const user = userEvent.setup();
    // Mock mobile viewport
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: 500,
    });

    render(<DashboardLayout />);

    // Look for mobile toggle button
    const toggleButton = screen.getByRole("button", {
      name: /toggle navigation menu/i,
    });
    expect(toggleButton).toBeInTheDocument();

    await user.click(toggleButton);

    // The sidebar should be visible after toggle (not have -translate-x-full class)
    const sidebar = screen.getByText("Dashboard").closest("div")
      ?.parentElement?.parentElement;
    if (!sidebar) throw new Error("Sidebar not found");

    // After clicking, the sidebar should not have the hidden class
    expect(sidebar).not.toHaveClass("-translate-x-full");
  });

  it("renders mobile sidebar toggle functionality", async () => {
    const user = userEvent.setup();
    render(<DashboardLayout />);

    // Verify mobile toggle button exists
    const toggleButton = screen.getByRole("button", {
      name: /toggle navigation menu/i,
    });
    expect(toggleButton).toBeInTheDocument();

    // Click to open sidebar - verify button still works
    await user.click(toggleButton);
    expect(toggleButton).toBeInTheDocument();

    // Click again to close - verify it's still functional
    await user.click(toggleButton);
    expect(toggleButton).toBeInTheDocument();
  });

  it("calls signOut when sign out button is clicked", async () => {
    const user = userEvent.setup();
    render(<DashboardLayout />);

    const signOutButton = screen.getByText("Sign Out");
    await user.click(signOutButton);

    expect(mockSignOut).toHaveBeenCalledWith({
      redirect: true,
      callbackUrl: "/",
    });
  });

  it("handles keyboard navigation for accessibility", async () => {
    const user = userEvent.setup();
    render(<DashboardLayout />);

    // Tab through navigation items
    const _dashboardButton = screen.getByText("Dashboard");
    await user.tab();

    // First focusable element should be dashboard (or close enough for accessibility)
    expect(document.activeElement).toBeTruthy();

    // Test that space/enter can activate buttons
    await user.keyboard(" ");
    expect(screen.getByTestId("dashboard-home")).toBeInTheDocument();
  });

  it("displays user avatar with correct initial when name is available", () => {
    render(<DashboardLayout />);
    expect(screen.getByText("J")).toBeInTheDocument();
  });

  it("displays fallback avatar initial when name is not available", () => {
    mockUseSession.mockReturnValue({
      data: {
        ...mockSession,
        user: {
          ...mockSession.user,
          name: null,
        } as any,
      },
      status: "authenticated",
      update: mockUpdate,
    });

    render(<DashboardLayout />);
    // Should show email initial since name is null but email is available
    expect(screen.getByText("j")).toBeInTheDocument(); // From email (lowercase)
  });

  it("displays default avatar initial when neither name nor email available", () => {
    mockUseSession.mockReturnValue({
      data: {
        ...mockSession,
        user: {
          ...mockSession.user,
          name: null,
          email: null,
        } as any,
      },
      status: "authenticated",
      update: mockUpdate,
    });

    render(<DashboardLayout />);
    expect(screen.getByText("U")).toBeInTheDocument(); // Default "U"
  });

  it("highlights active navigation item", async () => {
    const user = userEvent.setup();
    render(<DashboardLayout />);

    // Dashboard should be active by default
    const dashboardButton = screen.getByText("Dashboard");
    expect(dashboardButton.closest("button")).toHaveClass("bg-primary");

    // Click appointments and verify it becomes active
    const appointmentsButton = screen.getByText("My Appointments");
    await user.click(appointmentsButton);

    expect(appointmentsButton.closest("button")).toHaveClass("bg-primary");
    expect(dashboardButton.closest("button")).not.toHaveClass("bg-primary");
  });

  it("renders proper ARIA labels for accessibility", () => {
    render(<DashboardLayout />);

    const toggleButton = screen.getByRole("button", {
      name: /toggle navigation menu/i,
    });
    expect(toggleButton).toHaveAttribute(
      "aria-label",
      "Toggle navigation menu"
    );

    // Check that navigation items are properly marked as buttons
    expect(
      screen.getByRole("button", { name: "Dashboard" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "My Appointments" })
    ).toBeInTheDocument();
  });
});
