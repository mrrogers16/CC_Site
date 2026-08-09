import { render, screen } from "@testing-library/react";
import BookingPage from "@/app/book/page";

jest.mock("@/components/layout/navigation", () => ({
  Navigation: () => <nav data-testid="navigation" />,
}));

jest.mock("@/components/layout/footer", () => ({
  Footer: () => <footer data-testid="footer" />,
}));

describe("BookingPage", () => {
  it("renders the coming soon state while booking is disabled", () => {
    render(<BookingPage />);

    const heading = screen.getByRole("heading", {
      name: /online booking coming soon/i,
    });
    expect(heading).toBeInTheDocument();

    const contactLink = screen.getByRole("link", { name: /contact us/i });
    expect(contactLink).toHaveAttribute("href", "/contact");
  });

  it("does not render a booking embed while disabled", () => {
    render(<BookingPage />);

    const embed = screen.queryByTitle("Book an appointment");
    expect(embed).toBeNull();
  });

  it("renders navigation and footer", () => {
    render(<BookingPage />);

    expect(screen.getByTestId("navigation")).toBeInTheDocument();
    expect(screen.getByTestId("footer")).toBeInTheDocument();
  });
});
