import {
  calculateCancellationPolicy,
  formatTimeUntilAppointment,
  getCancellationWarningColor,
} from "@/lib/utils/cancellation-policy";

describe("calculateCancellationPolicy", () => {
  const servicePrice = 120.0;

  it("returns full refund for appointments 48+ hours away", () => {
    const appointmentDateTime = new Date(
      Date.now() + 72 * 60 * 60 * 1000
    ).toISOString(); // 72 hours

    const result = calculateCancellationPolicy(
      appointmentDateTime,
      servicePrice
    );

    expect(result).toEqual({
      policy: "free",
      refundAmount: 120.0,
      refundPercentage: 100,
      message: "Free cancellation available. You will receive a full refund.",
      canCancel: true,
    });
  });

  it("returns half refund for appointments 24-48 hours away", () => {
    const appointmentDateTime = new Date(
      Date.now() + 36 * 60 * 60 * 1000
    ).toISOString(); // 36 hours

    const result = calculateCancellationPolicy(
      appointmentDateTime,
      servicePrice
    );

    expect(result).toEqual({
      policy: "half",
      refundAmount: 60.0,
      refundPercentage: 50,
      message:
        "Cancellation within 48 hours. You will receive a 50% refund due to our cancellation policy.",
      canCancel: true,
    });
  });

  it("returns no refund for appointments less than 24 hours away", () => {
    const appointmentDateTime = new Date(
      Date.now() + 12 * 60 * 60 * 1000
    ).toISOString(); // 12 hours

    const result = calculateCancellationPolicy(
      appointmentDateTime,
      servicePrice
    );

    expect(result).toEqual({
      policy: "full",
      refundAmount: 0,
      refundPercentage: 0,
      message:
        "Cancellation within 24 hours. No refund available due to our cancellation policy. You will be charged the full amount.",
      canCancel: true,
    });
  });

  it("prevents cancellation for past appointments", () => {
    const appointmentDateTime = new Date(
      Date.now() - 2 * 60 * 60 * 1000
    ).toISOString(); // 2 hours ago

    const result = calculateCancellationPolicy(
      appointmentDateTime,
      servicePrice
    );

    expect(result).toEqual({
      policy: "full",
      refundAmount: 0,
      refundPercentage: 0,
      message: "This appointment has already passed and cannot be cancelled.",
      canCancel: false,
    });
  });

  it("handles exact boundary cases", () => {
    // Exactly 48 hours
    const exactly48Hours = new Date(
      Date.now() + 48 * 60 * 60 * 1000
    ).toISOString();
    const result48 = calculateCancellationPolicy(exactly48Hours, servicePrice);
    expect(result48.policy).toBe("free");
    expect(result48.refundPercentage).toBe(100);

    // Exactly 24 hours
    const exactly24Hours = new Date(
      Date.now() + 24 * 60 * 60 * 1000
    ).toISOString();
    const result24 = calculateCancellationPolicy(exactly24Hours, servicePrice);
    expect(result24.policy).toBe("half");
    expect(result24.refundPercentage).toBe(50);

    // Just under 24 hours (23 hours, 59 minutes) - Math.ceil rounds this to 24 hours
    const just23Hours = new Date(
      Date.now() + 23 * 60 * 60 * 1000 + 59 * 60 * 1000
    ).toISOString();
    const resultJust23 = calculateCancellationPolicy(just23Hours, servicePrice);
    expect(resultJust23.policy).toBe("half"); // Math.ceil makes this 24 hours = half refund
    expect(resultJust23.refundPercentage).toBe(50);
  });

  it("calculates correct refund amounts for different service prices", () => {
    const appointmentDateTime = new Date(
      Date.now() + 36 * 60 * 60 * 1000
    ).toISOString(); // 36 hours (half refund)

    const testCases = [
      { price: 100, expectedRefund: 50 },
      { price: 80.5, expectedRefund: 40.25 },
      { price: 200, expectedRefund: 100 },
      { price: 75, expectedRefund: 37.5 },
    ];

    testCases.forEach(({ price, expectedRefund }) => {
      const result = calculateCancellationPolicy(appointmentDateTime, price);
      expect(result.refundAmount).toBe(expectedRefund);
    });
  });

  it("handles zero price appointments", () => {
    const appointmentDateTime = new Date(
      Date.now() + 72 * 60 * 60 * 1000
    ).toISOString(); // 72 hours

    const result = calculateCancellationPolicy(appointmentDateTime, 0);

    expect(result.refundAmount).toBe(0);
    expect(result.refundPercentage).toBe(100); // Still 100% refund policy
    expect(result.canCancel).toBe(true);
  });
});

describe("formatTimeUntilAppointment", () => {
  it("formats hours correctly for less than 24 hours", () => {
    expect(formatTimeUntilAppointment(1)).toBe("1 hour remaining");
    expect(formatTimeUntilAppointment(2)).toBe("2 hours remaining");
    expect(formatTimeUntilAppointment(12)).toBe("12 hours remaining");
    expect(formatTimeUntilAppointment(23)).toBe("23 hours remaining");
  });

  it("formats days correctly for 24+ hours", () => {
    expect(formatTimeUntilAppointment(24)).toBe("1 day remaining");
    expect(formatTimeUntilAppointment(48)).toBe("2 days remaining");
    expect(formatTimeUntilAppointment(72)).toBe("3 days remaining");
  });

  it("formats days and hours correctly for partial days", () => {
    expect(formatTimeUntilAppointment(25)).toBe("1 day and 1 hour remaining");
    expect(formatTimeUntilAppointment(26)).toBe("1 day and 2 hours remaining");
    expect(formatTimeUntilAppointment(49)).toBe("2 days and 1 hour remaining");
    expect(formatTimeUntilAppointment(50)).toBe("2 days and 2 hours remaining");
    expect(formatTimeUntilAppointment(73)).toBe("3 days and 1 hour remaining");
  });

  it("handles past appointments", () => {
    expect(formatTimeUntilAppointment(0)).toBe("Appointment has passed");
    expect(formatTimeUntilAppointment(-1)).toBe("Appointment has passed");
    expect(formatTimeUntilAppointment(-24)).toBe("Appointment has passed");
  });

  it("handles singular vs plural correctly", () => {
    expect(formatTimeUntilAppointment(1)).toBe("1 hour remaining");
    expect(formatTimeUntilAppointment(2)).toBe("2 hours remaining");
    expect(formatTimeUntilAppointment(24)).toBe("1 day remaining");
    expect(formatTimeUntilAppointment(48)).toBe("2 days remaining");
    expect(formatTimeUntilAppointment(25)).toBe("1 day and 1 hour remaining");
    expect(formatTimeUntilAppointment(26)).toBe("1 day and 2 hours remaining");
  });

  it("handles large numbers correctly", () => {
    expect(formatTimeUntilAppointment(168)).toBe("7 days remaining"); // 1 week
    expect(formatTimeUntilAppointment(720)).toBe("30 days remaining"); // 1 month
    expect(formatTimeUntilAppointment(169)).toBe("7 days and 1 hour remaining");
  });
});

describe("getCancellationWarningColor", () => {
  it("returns correct colors for different time ranges", () => {
    // Past appointments
    expect(getCancellationWarningColor(0)).toBe("gray");
    expect(getCancellationWarningColor(-1)).toBe("gray");

    // Less than 24 hours - no refund (red)
    expect(getCancellationWarningColor(1)).toBe("red");
    expect(getCancellationWarningColor(12)).toBe("red");
    expect(getCancellationWarningColor(23)).toBe("red");

    // 24-47 hours - half refund (yellow)
    expect(getCancellationWarningColor(24)).toBe("yellow");
    expect(getCancellationWarningColor(36)).toBe("yellow");
    expect(getCancellationWarningColor(47)).toBe("yellow");

    // 48+ hours - full refund (green)
    expect(getCancellationWarningColor(48)).toBe("green");
    expect(getCancellationWarningColor(72)).toBe("green");
    expect(getCancellationWarningColor(168)).toBe("green");
  });

  it("handles boundary cases correctly", () => {
    expect(getCancellationWarningColor(23)).toBe("red"); // Just under 24 hours
    expect(getCancellationWarningColor(24)).toBe("yellow"); // Exactly 24 hours
    expect(getCancellationWarningColor(47)).toBe("yellow"); // Just under 48 hours
    expect(getCancellationWarningColor(48)).toBe("green"); // Exactly 48 hours
  });

  it("returns valid CSS color names", () => {
    const validColors = ["gray", "red", "yellow", "green"];
    const testHours = [0, 12, 24, 48, 72];

    testHours.forEach(hours => {
      const color = getCancellationWarningColor(hours);
      expect(validColors).toContain(color);
    });
  });
});

describe("Integration tests", () => {
  it("policy calculation and color warning are consistent", () => {
    const servicePrice = 120;
    const testCases = [
      { hours: 72, expectedPolicy: "free", expectedColor: "green" },
      { hours: 36, expectedPolicy: "half", expectedColor: "yellow" },
      { hours: 12, expectedPolicy: "full", expectedColor: "red" },
      { hours: 0, expectedPolicy: "full", expectedColor: "gray" },
    ];

    testCases.forEach(({ hours, expectedPolicy, expectedColor }) => {
      const appointmentDateTime = new Date(
        Date.now() + hours * 60 * 60 * 1000
      ).toISOString();
      const policy = calculateCancellationPolicy(
        appointmentDateTime,
        servicePrice
      );
      const color = getCancellationWarningColor(hours);

      expect(policy.policy).toBe(expectedPolicy);
      expect(color).toBe(expectedColor);
    });
  });

  it("time formatting and policy calculation use consistent logic", () => {
    const servicePrice = 120;
    const testHours = [1, 12, 24, 48, 72];

    testHours.forEach(hours => {
      const appointmentDateTime = new Date(
        Date.now() + hours * 60 * 60 * 1000
      ).toISOString();
      const policy = calculateCancellationPolicy(
        appointmentDateTime,
        servicePrice
      );
      const timeString = formatTimeUntilAppointment(hours);
      const color = getCancellationWarningColor(hours);

      // Ensure all functions handle the same time ranges consistently
      if (hours >= 48) {
        expect(policy.policy).toBe("free");
        expect(color).toBe("green");
      } else if (hours >= 24) {
        expect(policy.policy).toBe("half");
        expect(color).toBe("yellow");
      } else if (hours > 0) {
        expect(policy.policy).toBe("full");
        expect(color).toBe("red");
      }

      // Time string should not indicate "passed" for future appointments
      if (hours > 0) {
        expect(timeString).not.toContain("passed");
      }
    });
  });

  it("handles edge case of appointment exactly now", () => {
    const now = new Date();
    const appointmentDateTime = now.toISOString();
    const servicePrice = 120;

    const policy = calculateCancellationPolicy(
      appointmentDateTime,
      servicePrice
    );
    const color = getCancellationWarningColor(0);
    const timeString = formatTimeUntilAppointment(0);

    expect(policy.canCancel).toBe(false);
    expect(policy.refundAmount).toBe(0);
    expect(color).toBe("gray");
    expect(timeString).toBe("Appointment has passed");
  });
});
