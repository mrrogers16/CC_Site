import { render } from "@testing-library/react";
import { AppointmentRescheduleEmail } from "@/components/email/appointment-reschedule";
import { AppointmentCancellationEmail } from "@/components/email/appointment-cancellation";

describe("Email Templates", () => {
  describe("AppointmentRescheduleEmail", () => {
    const defaultProps = {
      clientName: "John Doe",
      oldDateTime: "2025-08-28T10:00:00Z",
      newDateTime: "2025-08-29T14:00:00Z",
      service: "Individual Therapy",
      duration: 60,
      price: "150.00",
    };

    it("renders reschedule email with required content", () => {
      const { container } = render(
        <AppointmentRescheduleEmail {...defaultProps} />
      );
      const html = container.innerHTML;

      expect(html).toContain("Healing Pathways Counseling");
      expect(html).toContain("Appointment Rescheduled");
      expect(html).toContain("Dear John Doe");
      expect(html).toContain("Individual Therapy");
      expect(html).toContain("60 minutes");
      expect(html).toContain("$150.00");
    });

    it("displays previous appointment section with cancelled label", () => {
      const { container } = render(
        <AppointmentRescheduleEmail {...defaultProps} />
      );
      const html = container.innerHTML;

      expect(html).toContain("Previous Appointment");
      expect(html).toContain("CANCELLED");
      // Check for old date formatting (Wednesday, August 28, 2025)
      expect(html).toContain("Wednesday, August 28, 2025");
    });

    it("displays new appointment section with confirmed label", () => {
      const { container } = render(
        <AppointmentRescheduleEmail {...defaultProps} />
      );
      const html = container.innerHTML;

      expect(html).toContain("New Appointment");
      expect(html).toContain("CONFIRMED");
      // Check for new date formatting (Thursday, August 29, 2025)
      expect(html).toContain("Thursday, August 29, 2025");
    });

    it("formats time correctly in 12-hour format", () => {
      const { container } = render(
        <AppointmentRescheduleEmail {...defaultProps} />
      );
      const html = container.innerHTML;

      // Old time: 10:00 AM UTC
      expect(html).toContain("10:00 AM");
      // New time: 2:00 PM UTC
      expect(html).toContain("2:00 PM");
    });

    it("displays reason when provided", () => {
      const propsWithReason = {
        ...defaultProps,
        reason: "Client requested different time",
      };

      const { container } = render(
        <AppointmentRescheduleEmail {...propsWithReason} />
      );
      const html = container.innerHTML;

      expect(html).toContain("Reason for rescheduling:");
      expect(html).toContain("Client requested different time");
    });

    it("does not display reason section when not provided", () => {
      const { container } = render(
        <AppointmentRescheduleEmail {...defaultProps} />
      );
      const html = container.innerHTML;

      expect(html).not.toContain("Reason for rescheduling:");
    });

    it("includes contact information and location", () => {
      const { container } = render(
        <AppointmentRescheduleEmail {...defaultProps} />
      );
      const html = container.innerHTML;

      expect(html).toContain("123 Wellness Way, Suite 200");
      expect(html).toContain("Cityville, ST 12345");
      expect(html).toContain("(555) 123-4567");
    });

    it("includes important reminders section", () => {
      const { container } = render(
        <AppointmentRescheduleEmail {...defaultProps} />
      );
      const html = container.innerHTML;

      expect(html).toContain("Important Reminders");
      expect(html).toContain("arrive 10-15 minutes early");
      expect(html).toContain("24-hour notice");
      expect(html).toContain("valid ID and insurance card");
    });

    it("includes professional signature", () => {
      const { container } = render(
        <AppointmentRescheduleEmail {...defaultProps} />
      );
      const html = container.innerHTML;

      expect(html).toContain("Warm regards");
      expect(html).toContain("The Healing Pathways Counseling Team");
    });

    it("includes footer with automated message disclaimer", () => {
      const { container } = render(
        <AppointmentRescheduleEmail {...defaultProps} />
      );
      const html = container.innerHTML;

      expect(html).toContain("automated message");
      expect(html).toContain("contact@healingpathways.com");
    });

    it("has proper email preview text", () => {
      const { container } = render(
        <AppointmentRescheduleEmail {...defaultProps} />
      );
      const html = container.innerHTML;

      expect(html).toContain(
        "Your appointment has been rescheduled - New date confirmed"
      );
    });
  });

  describe("AppointmentCancellationEmail", () => {
    const defaultProps = {
      clientName: "Jane Smith",
      appointmentDateTime: "2025-08-28T15:30:00Z",
      service: "Couples Therapy",
      duration: 90,
      price: "200.00",
    };

    it("renders cancellation email with required content", () => {
      const { container } = render(
        <AppointmentCancellationEmail {...defaultProps} />
      );
      const html = container.innerHTML;

      expect(html).toContain("Healing Pathways Counseling");
      expect(html).toContain("Appointment Cancelled");
      expect(html).toContain("Dear Jane Smith");
      expect(html).toContain("Couples Therapy");
      expect(html).toContain("90 minutes");
      expect(html).toContain("$200.00");
    });

    it("displays cancelled appointment details with proper formatting", () => {
      const { container } = render(
        <AppointmentCancellationEmail {...defaultProps} />
      );
      const html = container.innerHTML;

      expect(html).toContain("Cancelled Appointment Details");
      expect(html).toContain("CANCELLED");
      // Check for date formatting (Wednesday, August 28, 2025)
      expect(html).toContain("Wednesday, August 28, 2025");
      // Check for time formatting (3:30 PM UTC)
      expect(html).toContain("3:30 PM");
    });

    it("displays reason when provided", () => {
      const propsWithReason = {
        ...defaultProps,
        reason: "Emergency cancellation",
      };

      const { container } = render(
        <AppointmentCancellationEmail {...propsWithReason} />
      );
      const html = container.innerHTML;

      expect(html).toContain("Cancellation reason:");
      expect(html).toContain("Emergency cancellation");
    });

    it("does not display reason section when not provided", () => {
      const { container } = render(
        <AppointmentCancellationEmail {...defaultProps} />
      );
      const html = container.innerHTML;

      expect(html).not.toContain("Cancellation reason:");
    });

    it("displays cancellation policy when provided", () => {
      const propsWithPolicy = {
        ...defaultProps,
        cancellationPolicy:
          "24-hour cancellation notice required for full refund",
      };

      const { container } = render(
        <AppointmentCancellationEmail {...propsWithPolicy} />
      );
      const html = container.innerHTML;

      expect(html).toContain("Cancellation Policy");
      expect(html).toContain(
        "24-hour cancellation notice required for full refund"
      );
    });

    it("does not display policy section when not provided", () => {
      const { container } = render(
        <AppointmentCancellationEmail {...defaultProps} />
      );
      const html = container.innerHTML;

      expect(html).not.toContain("Cancellation Policy");
    });

    it("includes next steps section", () => {
      const { container } = render(
        <AppointmentCancellationEmail {...defaultProps} />
      );
      const html = container.innerHTML;

      expect(html).toContain("What's Next?");
      expect(html).toContain("Rescheduling:");
      expect(html).toContain("Billing:");
      expect(html).toContain("Questions:");
      expect(html).toContain("(555) 123-4567");
    });

    it("includes support resources section", () => {
      const { container } = render(
        <AppointmentCancellationEmail {...defaultProps} />
      );
      const html = container.innerHTML;

      expect(html).toContain("Support Resources");
      expect(html).toContain("mental health emergency");
      expect(html).toContain("Call 911");
      expect(html).toContain("National Suicide Prevention Lifeline: 988");
      expect(html).toContain("Text HOME to 741741");
    });

    it("includes professional signature and closing", () => {
      const { container } = render(
        <AppointmentCancellationEmail {...defaultProps} />
      );
      const html = container.innerHTML;

      expect(html).toContain("appointments need to be cancelled");
      expect(html).toContain("wellness journey");
      expect(html).toContain("Warm regards");
      expect(html).toContain("The Healing Pathways Counseling Team");
    });

    it("includes comprehensive footer with contact details", () => {
      const { container } = render(
        <AppointmentCancellationEmail {...defaultProps} />
      );
      const html = container.innerHTML;

      expect(html).toContain("123 Wellness Way, Suite 200");
      expect(html).toContain("Cityville, ST 12345");
      expect(html).toContain("Phone: (555) 123-4567");
      expect(html).toContain("Email: contact@healingpathways.com");
      expect(html).toContain("automated message");
    });

    it("has proper email preview text", () => {
      const { container } = render(
        <AppointmentCancellationEmail {...defaultProps} />
      );
      const html = container.innerHTML;

      expect(html).toContain(
        "Appointment Cancellation Confirmation - Couples Therapy"
      );
    });
  });

  describe("Date and Time Formatting", () => {
    it("formats various date times correctly in reschedule email", () => {
      // Test different times and dates
      const testCases = [
        {
          dateTime: "2025-12-25T08:00:00Z", // Christmas morning
          expectedDate: "Thursday, December 25, 2025",
          expectedTime: "8:00 AM",
        },
        {
          dateTime: "2025-01-01T23:45:00Z", // New Year's Eve late
          expectedDate: "Wednesday, January 1, 2025",
          expectedTime: "11:45 PM",
        },
        {
          dateTime: "2025-06-15T12:00:00Z", // Noon on Sunday
          expectedDate: "Sunday, June 15, 2025",
          expectedTime: "12:00 PM",
        },
      ];

      testCases.forEach(({ dateTime, expectedDate, expectedTime }) => {
        const props = {
          clientName: "Test Client",
          oldDateTime: dateTime,
          newDateTime: "2025-08-29T14:00:00Z",
          service: "Test Service",
          duration: 60,
          price: "100.00",
        };

        const { container } = render(<AppointmentRescheduleEmail {...props} />);
        const html = container.innerHTML;

        expect(html).toContain(expectedDate);
        expect(html).toContain(expectedTime);
      });
    });

    it("formats various date times correctly in cancellation email", () => {
      const testCases = [
        {
          dateTime: "2025-07-04T16:30:00Z", // Independence Day afternoon
          expectedDate: "Friday, July 4, 2025",
          expectedTime: "4:30 PM",
        },
        {
          dateTime: "2025-02-14T09:15:00Z", // Valentine's Day morning
          expectedDate: "Friday, February 14, 2025",
          expectedTime: "9:15 AM",
        },
      ];

      testCases.forEach(({ dateTime, expectedDate, expectedTime }) => {
        const props = {
          clientName: "Test Client",
          appointmentDateTime: dateTime,
          service: "Test Service",
          duration: 60,
          price: "100.00",
        };

        const { container } = render(
          <AppointmentCancellationEmail {...props} />
        );
        const html = container.innerHTML;

        expect(html).toContain(expectedDate);
        expect(html).toContain(expectedTime);
      });
    });
  });

  describe("Email Styling and Structure", () => {
    it("includes proper HTML structure in reschedule email", () => {
      const { container } = render(
        <AppointmentRescheduleEmail
          {...{
            clientName: "Test",
            oldDateTime: "2025-08-28T10:00:00Z",
            newDateTime: "2025-08-29T14:00:00Z",
            service: "Test",
            duration: 60,
            price: "100",
          }}
        />
      );

      const html = container.innerHTML;
      expect(html).toContain("<html");
      expect(html).toContain("<head>");
      expect(html).toContain("<body");
      expect(html).toContain("style=");
    });

    it("includes proper HTML structure in cancellation email", () => {
      const { container } = render(
        <AppointmentCancellationEmail
          {...{
            clientName: "Test",
            appointmentDateTime: "2025-08-28T10:00:00Z",
            service: "Test",
            duration: 60,
            price: "100",
          }}
        />
      );

      const html = container.innerHTML;
      expect(html).toContain("<html");
      expect(html).toContain("<head>");
      expect(html).toContain("<body");
      expect(html).toContain("style=");
    });

    it("uses consistent branding colors in both emails", () => {
      const rescheduleProps = {
        clientName: "Test",
        oldDateTime: "2025-08-28T10:00:00Z",
        newDateTime: "2025-08-29T14:00:00Z",
        service: "Test",
        duration: 60,
        price: "100",
      };

      const cancellationProps = {
        clientName: "Test",
        appointmentDateTime: "2025-08-28T10:00:00Z",
        service: "Test",
        duration: 60,
        price: "100",
      };

      const rescheduleHtml = render(
        <AppointmentRescheduleEmail {...rescheduleProps} />
      ).container.innerHTML;
      const cancellationHtml = render(
        <AppointmentCancellationEmail {...cancellationProps} />
      ).container.innerHTML;

      // Check for sage green primary color (#4a8b8c)
      expect(rescheduleHtml).toContain("#4a8b8c");
      expect(cancellationHtml).toContain("#4a8b8c");

      // Check for consistent background colors
      expect(rescheduleHtml).toContain("#fefefe");
      expect(cancellationHtml).toContain("#fefefe");
    });
  });

  describe("Accessibility and Best Practices", () => {
    it("includes alt text and proper semantic structure", () => {
      const { container } = render(
        <AppointmentRescheduleEmail
          {...{
            clientName: "Test",
            oldDateTime: "2025-08-28T10:00:00Z",
            newDateTime: "2025-08-29T14:00:00Z",
            service: "Test",
            duration: 60,
            price: "100",
          }}
        />
      );

      const html = container.innerHTML;

      // Check for proper heading hierarchy
      expect(html).toContain("Healing Pathways Counseling");
      expect(html).toContain("Appointment Rescheduled");
    });

    it("uses appropriate contrast and readable fonts", () => {
      const { container } = render(
        <AppointmentCancellationEmail
          {...{
            clientName: "Test",
            appointmentDateTime: "2025-08-28T10:00:00Z",
            service: "Test",
            duration: 60,
            price: "100",
          }}
        />
      );

      const html = container.innerHTML;

      // Check for readable font families
      expect(html).toContain("Segoe UI");
      expect(html).toContain("Roboto");

      // Check for appropriate text colors (high contrast)
      expect(html).toContain("#2c2c2c"); // Dark text
      expect(html).toContain("#ffffff"); // White text on dark backgrounds
    });
  });
});
