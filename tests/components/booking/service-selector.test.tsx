import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ServiceSelector from "@/components/booking/service-selector";

// Mock the logger
jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock fetch
global.fetch = jest.fn();

const mockServices = [
  {
    id: "service-1",
    title: "Individual Counseling",
    description: "One-on-one therapy sessions for personal growth and healing.",
    duration: 60,
    price: 120,
    features: [
      "Personalized treatment plan",
      "Evidence-based approaches",
      "Flexible scheduling",
    ],
  },
  {
    id: "service-2",
    title: "Couples Therapy",
    description:
      "Relationship counseling for couples looking to strengthen their bond.",
    duration: 90,
    price: 180,
    features: [
      "Relationship assessment",
      "Communication skills",
      "Conflict resolution",
    ],
  },
  {
    id: "service-3",
    title: "Group Therapy",
    description: "Therapeutic group sessions for shared healing experiences.",
    duration: 75,
    price: 90,
    features: ["Peer support", "Shared experiences", "Cost-effective"],
  },
];

const mockOnServiceSelect = jest.fn();

describe("ServiceSelector", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ services: mockServices }),
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it("renders loading state initially", () => {
    render(<ServiceSelector onServiceSelect={mockOnServiceSelect} />);

    expect(screen.getByText("Select Your Service")).toBeInTheDocument();
    expect(
      screen.getByText("Loading available services...")
    ).toBeInTheDocument();

    // Should show skeleton loading cards
    const skeletonCards = screen.getAllByTestId(/loading-skeleton/i);
    expect(skeletonCards.length).toBeGreaterThan(0);
  });

  it("fetches and displays services successfully", async () => {
    render(<ServiceSelector onServiceSelect={mockOnServiceSelect} />);

    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    });

    // Check all services are displayed
    expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    expect(screen.getByText("Couples Therapy")).toBeInTheDocument();
    expect(screen.getByText("Group Therapy")).toBeInTheDocument();

    // Check service details
    expect(
      screen.getByText(
        "One-on-one therapy sessions for personal growth and healing."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("60 minutes")).toBeInTheDocument();
    expect(screen.getByText("$120")).toBeInTheDocument();

    // Check features are displayed
    expect(screen.getByText("Personalized treatment plan")).toBeInTheDocument();
    expect(screen.getByText("Evidence-based approaches")).toBeInTheDocument();
    expect(screen.getByText("Flexible scheduling")).toBeInTheDocument();
  });

  it("handles service selection", async () => {
    const user = userEvent.setup();
    render(<ServiceSelector onServiceSelect={mockOnServiceSelect} />);

    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    });

    // Click on the first service card
    const serviceCard = screen
      .getByText("Individual Counseling")
      .closest("div");
    if (!serviceCard) throw new Error("Service card not found");
    await user.click(serviceCard);

    expect(mockOnServiceSelect).toHaveBeenCalledWith({
      id: "service-1",
      title: "Individual Counseling",
      duration: 60,
      price: 120,
    });
  });

  it("handles service selection via button", async () => {
    const user = userEvent.setup();
    render(<ServiceSelector onServiceSelect={mockOnServiceSelect} />);

    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    });

    // Click on the select button
    const selectButton = screen.getAllByText("Select Service")[0];
    if (!selectButton) throw new Error("Select button not found");
    await user.click(selectButton);

    expect(mockOnServiceSelect).toHaveBeenCalledWith({
      id: "service-1",
      title: "Individual Counseling",
      duration: 60,
      price: 120,
    });
  });

  it("shows selected service with proper styling", async () => {
    const _user = userEvent.setup();
    const selectedService = {
      id: "service-2",
      title: "Couples Therapy",
      duration: 90,
      price: 180,
    };

    render(
      <ServiceSelector
        selectedService={selectedService}
        onServiceSelect={mockOnServiceSelect}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Couples Therapy")).toBeInTheDocument();
    });

    // Check that the selected service has proper styling
    const selectedCard = screen.getByText("Couples Therapy").closest("div");
    if (!selectedCard) throw new Error("Selected card not found");
    expect(selectedCard).toHaveClass("border-primary ring-2 ring-primary/20");

    // Check for checkmark icon
    const checkmark = selectedCard.querySelector("svg");
    expect(checkmark).toBeInTheDocument();

    // Check button text changes to "Selected"
    expect(screen.getByText("Selected")).toBeInTheDocument();
  });

  it("displays error state when fetch fails", async () => {
    (fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

    render(<ServiceSelector onServiceSelect={mockOnServiceSelect} />);

    await waitFor(() => {
      expect(screen.getByText("Unable to Load Services")).toBeInTheDocument();
    });

    expect(screen.getByText("Network error")).toBeInTheDocument();
    expect(screen.getByText("Try Again")).toBeInTheDocument();
  });

  it("displays error state when response is not ok", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ message: "Server error" }),
    });

    render(<ServiceSelector onServiceSelect={mockOnServiceSelect} />);

    await waitFor(() => {
      expect(screen.getByText("Unable to Load Services")).toBeInTheDocument();
    });

    expect(screen.getByText("Failed to fetch services")).toBeInTheDocument();
  });

  it("shows empty state when no services are available", async () => {
    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ services: [] }),
    });

    render(<ServiceSelector onServiceSelect={mockOnServiceSelect} />);

    await waitFor(() => {
      expect(screen.getByText("No Services Available")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Please contact us to schedule an appointment.")
    ).toBeInTheDocument();
  });

  it("handles retry after error", async () => {
    const user = userEvent.setup();

    // First call fails
    (fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));

    // Mock window.location.reload
    const mockReload = jest.fn();
    Object.defineProperty(window, "location", {
      value: { reload: mockReload },
      writable: true,
    });

    render(<ServiceSelector onServiceSelect={mockOnServiceSelect} />);

    await waitFor(() => {
      expect(screen.getByText("Unable to Load Services")).toBeInTheDocument();
    });

    // Click retry button
    const retryButton = screen.getByText("Try Again");
    await user.click(retryButton);

    expect(mockReload).toHaveBeenCalled();
  });

  it("displays service features correctly", async () => {
    render(<ServiceSelector onServiceSelect={mockOnServiceSelect} />);

    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    });

    // Check that features are displayed with proper icons
    const features = [
      "Personalized treatment plan",
      "Evidence-based approaches",
      "Flexible scheduling",
    ];

    features.forEach(feature => {
      expect(screen.getByText(feature)).toBeInTheDocument();
    });

    // Check for checkmark icons next to features
    const featureItems = screen
      .getAllByText("Personalized treatment plan")[0]
      ?.closest("li");
    if (!featureItems) throw new Error("Feature item not found");
    const checkmarkIcon = featureItems.querySelector("svg");
    expect(checkmarkIcon).toBeInTheDocument();
  });

  it("truncates long descriptions appropriately", async () => {
    const serviceWithLongDescription = {
      ...mockServices[0],
      description:
        "This is a very long description that should be truncated to prevent the card from becoming too tall. ".repeat(
          5
        ),
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ services: [serviceWithLongDescription] }),
    });

    render(<ServiceSelector onServiceSelect={mockOnServiceSelect} />);

    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    });

    // The long description should be present but truncated with CSS
    const description = screen.getByText(/This is a very long description/);
    expect(description).toHaveClass("line-clamp-3");
  });

  it("limits features display to 3 items", async () => {
    const serviceWithManyFeatures = {
      ...mockServices[0],
      features: [
        "Feature 1",
        "Feature 2",
        "Feature 3",
        "Feature 4",
        "Feature 5",
      ],
    };

    (fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ services: [serviceWithManyFeatures] }),
    });

    render(<ServiceSelector onServiceSelect={mockOnServiceSelect} />);

    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    });

    // Should show first 3 features
    expect(screen.getByText("Feature 1")).toBeInTheDocument();
    expect(screen.getByText("Feature 2")).toBeInTheDocument();
    expect(screen.getByText("Feature 3")).toBeInTheDocument();

    // Should not show 4th and 5th features
    expect(screen.queryByText("Feature 4")).not.toBeInTheDocument();
    expect(screen.queryByText("Feature 5")).not.toBeInTheDocument();
  });

  it("provides proper accessibility attributes", async () => {
    render(<ServiceSelector onServiceSelect={mockOnServiceSelect} />);

    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    });

    // Check for proper button labels
    const selectButtons = screen.getAllByLabelText(/Select.*service/i);
    expect(selectButtons.length).toBeGreaterThan(0);

    // Check for proper button text
    expect(screen.getAllByText("Select Service")).toHaveLength(3);
  });

  it("handles keyboard navigation", async () => {
    const user = userEvent.setup();
    render(<ServiceSelector onServiceSelect={mockOnServiceSelect} />);

    await waitFor(() => {
      expect(screen.getByText("Individual Counseling")).toBeInTheDocument();
    });

    const firstSelectButton = screen.getAllByText("Select Service")[0];
    if (!firstSelectButton) throw new Error("First select button not found");

    // Focus and activate with keyboard
    firstSelectButton.focus();
    expect(firstSelectButton).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(mockOnServiceSelect).toHaveBeenCalledWith({
      id: "service-1",
      title: "Individual Counseling",
      duration: 60,
      price: 120,
    });
  });
});
