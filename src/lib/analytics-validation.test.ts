import { AnalyticsValidator } from "./analytics-validation";

describe("AnalyticsValidator", () => {
  const testData = AnalyticsValidator.createTestData();
  const startDate = new Date("2024-01-01T00:00:00Z");
  const endDate = new Date("2024-01-31T23:59:59Z");

  describe("Revenue Validation", () => {
    it("should calculate revenue correctly with test data", () => {
      const result = AnalyticsValidator.validateRevenue(
        testData,
        startDate,
        endDate,
        {
          currentTotal: 300, // 2 completed appointments * $150 each
          percentageChange: 100, // Previous period had $150, current $300 = 100% increase
          avgSessionValue: 150, // $300 / 2 sessions
        }
      );

      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.calculations.currentTotal).toBe(300);
      expect(result.calculations.percentageChange).toBe(100);
      expect(result.calculations.avgSessionValue).toBe(150);
    });

    it("should handle zero previous revenue correctly", () => {
      // Test with data that has no previous period
      const dataWithNoPrevious = testData.filter(
        apt => apt.dateTime >= startDate && apt.dateTime <= endDate
      );

      const result = AnalyticsValidator.validateRevenue(
        dataWithNoPrevious,
        startDate,
        endDate
      );

      expect(result.passed).toBe(true);
      expect(result.calculations.previousTotal).toBe(0);
      expect(result.calculations.percentageChange).toBe(100); // Should be 100% when previous is 0
    });

    it("should detect revenue calculation errors", () => {
      const result = AnalyticsValidator.validateRevenue(
        testData,
        startDate,
        endDate,
        {
          currentTotal: 500, // Incorrect expectation
          percentageChange: 50, // Incorrect expectation
          avgSessionValue: 250, // Incorrect expectation
        }
      );

      expect(result.passed).toBe(false);
      expect(result.errors).toContain(
        "Revenue total mismatch: expected 500, got 300"
      );
      expect(result.errors).toContain(
        "Percentage change mismatch: expected 50, got 100"
      );
      expect(result.errors).toContain(
        "Average session value mismatch: expected 250, got 150"
      );
    });
  });

  describe("Appointment Analytics Validation", () => {
    it("should calculate appointment metrics correctly", () => {
      const result = AnalyticsValidator.validateAppointments(
        testData,
        startDate,
        endDate
      );

      expect(result.passed).toBe(true);
      expect(result.calculations.totalAppointments).toBe(3); // 2 completed + 1 cancelled in Jan 2024
      expect(result.calculations.statusBreakdown.completed).toBe(2);
      expect(result.calculations.statusBreakdown.cancelled).toBe(1);
      expect(result.calculations.cancellationRate).toBe(33.33); // 1/3 * 100 = 33.33%
    });

    it("should calculate utilization rate correctly", () => {
      const result = AnalyticsValidator.validateAppointments(
        testData,
        startDate,
        endDate
      );

      // January has 31 days * (5/7) work days * 8 hours = ~177.14 available slots
      // 3 appointments booked = ~1.69% utilization
      expect(result.calculations.utilizationRate).toBeGreaterThan(0);
      expect(result.calculations.utilizationRate).toBeLessThan(5); // Should be low with minimal test data
      expect(result.calculations.bookedSlots).toBe(3);
    });
  });

  describe("Client Analytics Validation", () => {
    it("should identify new vs returning clients correctly", () => {
      const result = AnalyticsValidator.validateClients(
        testData,
        startDate,
        endDate,
        {
          newClients: 2, // user1 and user3 (first appointments in Jan 2024)
          returningClients: 1, // user2 (first appointment in Dec 2023)
          newVsReturningRatio: 200, // 2 new / 1 returning * 100 = 200%
        }
      );

      expect(result.passed).toBe(true);
      expect(result.calculations.newClients).toBe(2);
      expect(result.calculations.returningClients).toBe(1);
      expect(result.calculations.newVsReturningRatio).toBe(200);
      expect(result.calculations.totalUniqueClients).toBe(3);
    });

    it("should handle all new clients scenario", () => {
      // Test data where all clients are new
      const allNewClientsData = testData.filter(
        apt => apt.user.appointments[0].dateTime >= startDate
      );

      const result = AnalyticsValidator.validateClients(
        allNewClientsData,
        startDate,
        endDate
      );

      expect(result.passed).toBe(true);
      expect(result.calculations.returningClients).toBe(0);
      expect(result.calculations.newVsReturningRatio).toBe(Infinity);
    });

    it("should calculate average sessions per client", () => {
      const result = AnalyticsValidator.validateClients(
        testData,
        startDate,
        endDate
      );

      // 3 appointments / 3 unique clients = 1.0 sessions per client
      expect(result.calculations.avgSessionsPerClient).toBe(1.0);
    });
  });

  describe("Full Analytics Validation", () => {
    it("should validate complete analytics with test data", () => {
      const result = AnalyticsValidator.validateFullAnalytics(
        testData,
        startDate,
        endDate,
        {
          revenue: {
            currentTotal: 300,
            percentageChange: 100,
            avgSessionValue: 150,
          },
          clients: {
            newClients: 2,
            returningClients: 1,
            newVsReturningRatio: 200,
          },
        }
      );

      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.calculations.revenue.currentTotal).toBe(300);
      expect(result.calculations.clients.newClients).toBe(2);
      expect(result.calculations.appointments.totalAppointments).toBe(3);
    });

    it("should accumulate all validation errors", () => {
      const result = AnalyticsValidator.validateFullAnalytics(
        testData,
        startDate,
        endDate,
        {
          revenue: {
            currentTotal: 999, // Wrong
            percentageChange: 50, // Wrong
            avgSessionValue: 250, // Wrong
          },
          clients: {
            newClients: 5, // Wrong
            returningClients: 2, // Wrong
            newVsReturningRatio: 100, // Wrong
          },
        }
      );

      expect(result.passed).toBe(false);
      expect(result.errors.length).toBeGreaterThan(3); // Should have multiple errors
      expect(
        result.errors.some(err => err.includes("Revenue total mismatch"))
      ).toBe(true);
      expect(
        result.errors.some(err => err.includes("New clients mismatch"))
      ).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty appointment data", () => {
      const result = AnalyticsValidator.validateFullAnalytics(
        [],
        startDate,
        endDate
      );

      expect(result.passed).toBe(true);
      expect(result.calculations.revenue.currentTotal).toBe(0);
      expect(result.calculations.appointments.totalAppointments).toBe(0);
      expect(result.calculations.clients.newClients).toBe(0);
    });

    it("should handle appointments outside date range", () => {
      const futureDate = new Date("2025-01-01T00:00:00Z");
      const futureEndDate = new Date("2025-01-31T23:59:59Z");

      const result = AnalyticsValidator.validateFullAnalytics(
        testData,
        futureDate,
        futureEndDate
      );

      expect(result.passed).toBe(true);
      expect(result.calculations.revenue.currentTotal).toBe(0);
      expect(result.calculations.appointments.totalAppointments).toBe(0);
    });

    it("should handle mixed appointment statuses correctly", () => {
      const mixedData = [
        ...testData,
        {
          id: "apt5",
          status: "PENDING" as const,
          dateTime: new Date("2024-01-30T10:00:00Z"),
          service: {
            id: "svc1",
            title: "Individual Therapy",
            price: 150,
            duration: 60,
          },
          userId: "user4",
          user: {
            appointments: [{ dateTime: new Date("2024-01-30T10:00:00Z") }],
          },
        },
        {
          id: "apt6",
          status: "NO_SHOW" as const,
          dateTime: new Date("2024-01-28T10:00:00Z"),
          service: {
            id: "svc1",
            title: "Individual Therapy",
            price: 150,
            duration: 60,
          },
          userId: "user5",
          user: {
            appointments: [{ dateTime: new Date("2024-01-28T10:00:00Z") }],
          },
        },
      ];

      const result = AnalyticsValidator.validateFullAnalytics(
        mixedData,
        startDate,
        endDate
      );

      expect(result.passed).toBe(true);
      expect(result.calculations.appointments.statusBreakdown.pending).toBe(1);
      expect(result.calculations.appointments.statusBreakdown.noShow).toBe(1);
      // Cancellation rate should include both cancelled and no-show
      expect(result.calculations.appointments.cancellationRate).toBe(40); // 2/5 * 100 = 40%
    });
  });

  describe("Date Range Edge Cases", () => {
    it("should handle same start and end date", () => {
      const singleDay = new Date("2024-01-15T00:00:00Z");
      const singleDayEnd = new Date("2024-01-15T23:59:59Z");

      const result = AnalyticsValidator.validateFullAnalytics(
        testData,
        singleDay,
        singleDayEnd
      );

      expect(result.passed).toBe(true);
      // Should only include appointments from that specific day
      expect(result.calculations.revenue.currentTotal).toBe(150); // Only apt1
    });

    it("should handle very short date ranges", () => {
      const hourStart = new Date("2024-01-15T10:00:00Z");
      const hourEnd = new Date("2024-01-15T11:00:00Z");

      const result = AnalyticsValidator.validateFullAnalytics(
        testData,
        hourStart,
        hourEnd
      );

      expect(result.passed).toBe(true);
      expect(result.calculations.revenue.currentTotal).toBe(150); // apt1 at 10:00
    });
  });
});
