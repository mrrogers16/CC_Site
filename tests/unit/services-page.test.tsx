import { render, screen } from "@testing-library/react";
import ServicesPage from "@/app/services/page";
import { services } from "@/lib/config/services";

jest.mock("@/components/layout/navigation", () => ({
  Navigation: () => <nav data-testid="navigation" />,
}));

jest.mock("@/components/layout/footer", () => ({
  Footer: () => <footer data-testid="footer" />,
}));

describe("ServicesPage", () => {
  it("renders the page heading", () => {
    render(<ServicesPage />);

    const heading = screen.getByRole("heading", { name: /our services/i });
    expect(heading).toBeInTheDocument();
  });

  it("renders every service from config", () => {
    render(<ServicesPage />);

    for (const service of services) {
      expect(
        screen.getByRole("heading", { name: service.title })
      ).toBeInTheDocument();
    }
  });

  it("renders duration, price, and features for a service", () => {
    render(<ServicesPage />);

    const service = services[0];
    expect(service).toBeDefined();
    if (!service) return;

    expect(
      screen.getAllByText(`${service.duration} minutes`).length
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(`$${service.price}`).length).toBeGreaterThan(0);
    for (const feature of service.features) {
      expect(screen.getByText(feature)).toBeInTheDocument();
    }
  });

  it("renders navigation and footer", () => {
    render(<ServicesPage />);

    expect(screen.getByTestId("navigation")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });
});
