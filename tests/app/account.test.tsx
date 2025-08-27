import { render, screen } from "@testing-library/react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import AccountPage from "@/app/account/page";

// Mock NextAuth
jest.mock("next-auth/react");
const mockUseSession = useSession as jest.MockedFunction<typeof useSession>;

// Mock Next.js router
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>;

// Mock dashboard layout component
jest.mock("@/components/dashboard/dashboard-layout", () => ({
  DashboardLayout: () => (
    <div data-testid="dashboard-layout">Dashboard Layout</div>
  ),
}));

// Mock layout components
jest.mock("@/components/layout/navigation", () => ({
  Navigation: () => <div data-testid="navigation">Navigation</div>,
}));

jest.mock("@/components/layout/footer", () => ({
  Footer: () => <div data-testid="footer">Footer</div>,
}));

describe("AccountPage", () => {
  const mockPush = jest.fn();
  const mockUpdate = jest.fn();
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

  beforeEach(() => {
    mockUseRouter.mockReturnValue({
      push: mockPush,
      replace: jest.fn(),
      refresh: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      prefetch: jest.fn(),
    });
    mockPush.mockClear();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state when session is loading", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "loading",
      update: mockUpdate,
    });

    render(<AccountPage />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
    expect(screen.getByRole("presentation")).toBeInTheDocument(); // Spinner
  });

  it("redirects to login when user is not authenticated", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: mockUpdate,
    });

    render(<AccountPage />);

    expect(mockPush).toHaveBeenCalledWith("/auth/login?callbackUrl=/account");
  });

  it("renders dashboard layout when user is authenticated", () => {
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: "authenticated",
      update: mockUpdate,
    });

    render(<AccountPage />);

    expect(screen.getByTestId("navigation")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });

  it("does not redirect when user is authenticated", () => {
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: "authenticated",
      update: mockUpdate,
    });

    render(<AccountPage />);

    expect(mockPush).not.toHaveBeenCalled();
  });

  it("redirects unauthenticated users to login with callback URL", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: mockUpdate,
    });

    render(<AccountPage />);

    expect(mockPush).toHaveBeenCalledWith("/auth/login?callbackUrl=/account");
  });

  it("shows proper loading indicator", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "loading",
      update: mockUpdate,
    });

    render(<AccountPage />);

    const spinner = screen.getByRole("presentation");
    expect(spinner).toHaveClass("animate-spin");
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("handles session update correctly", () => {
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: "authenticated",
      update: mockUpdate,
    });

    render(<AccountPage />);

    expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
    expect(mockUpdate).toBeDefined();
  });

  it("renders full page layout for authenticated users", () => {
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: "authenticated",
      update: mockUpdate,
    });

    render(<AccountPage />);

    expect(screen.getByTestId("navigation")).toBeInTheDocument();
    expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });

  it("does not render dashboard for loading state", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "loading",
      update: mockUpdate,
    });

    render(<AccountPage />);

    expect(screen.queryByTestId("dashboard-layout")).not.toBeInTheDocument();
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("does not render dashboard for unauthenticated users", () => {
    mockUseSession.mockReturnValue({
      data: null,
      status: "unauthenticated",
      update: mockUpdate,
    });

    render(<AccountPage />);

    expect(screen.queryByTestId("dashboard-layout")).not.toBeInTheDocument();
  });

  it("handles authentication state changes correctly", () => {
    // First render as loading
    const { rerender } = render(<AccountPage />);

    mockUseSession.mockReturnValue({
      data: null,
      status: "loading",
      update: mockUpdate,
    });

    rerender(<AccountPage />);
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    // Then become authenticated
    mockUseSession.mockReturnValue({
      data: mockSession,
      status: "authenticated",
      update: mockUpdate,
    });

    rerender(<AccountPage />);
    expect(screen.getByTestId("dashboard-layout")).toBeInTheDocument();
  });
});
