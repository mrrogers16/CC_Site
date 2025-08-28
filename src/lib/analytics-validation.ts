/**
 * Analytics validation utilities for testing calculations accuracy
 * Used to verify analytics calculations in development and testing environments
 */

interface MockAppointment {
  id: string;
  status: "COMPLETED" | "CANCELLED" | "PENDING" | "CONFIRMED" | "NO_SHOW";
  dateTime: Date;
  service: {
    id: string;
    title: string;
    price: number;
    duration: number;
  };
  userId: string;
  user: {
    appointments: Array<{
      dateTime: Date;
    }>;
  };
}

interface AnalyticsValidationResult {
  passed: boolean;
  errors: string[];
  calculations: {
    revenue: {
      currentTotal: number;
      previousTotal: number;
      percentageChange: number;
      avgSessionValue: number;
      totalSessions: number;
    };
    appointments: {
      totalAppointments: number;
      utilizationRate: number;
      cancellationRate: number;
      statusBreakdown: Record<string, number>;
    };
    clients: {
      newClients: number;
      returningClients: number;
      totalUniqueClients: number;
      newVsReturningRatio: number;
    };
  };
}

export class AnalyticsValidator {
  /**
   * Validate revenue calculations with known test data
   */
  static validateRevenue(
    appointments: MockAppointment[],
    startDate: Date,
    endDate: Date,
    expectedResults?: {
      currentTotal: number;
      percentageChange: number;
      avgSessionValue: number;
    }
  ): { passed: boolean; errors: string[]; calculations: any } {
    const errors: string[] = [];

    // Filter appointments for current period
    const currentAppointments = appointments.filter(
      apt =>
        apt.status === "COMPLETED" &&
        apt.dateTime >= startDate &&
        apt.dateTime <= endDate
    );

    // Calculate current revenue
    const currentTotal = currentAppointments.reduce(
      (total, apt) => total + apt.service.price,
      0
    );

    // Calculate previous period for comparison
    const periodLength = endDate.getTime() - startDate.getTime();
    const prevStartDate = new Date(startDate.getTime() - periodLength);
    const prevEndDate = new Date(startDate.getTime() - 1);

    const previousAppointments = appointments.filter(
      apt =>
        apt.status === "COMPLETED" &&
        apt.dateTime >= prevStartDate &&
        apt.dateTime <= prevEndDate
    );

    const previousTotal = previousAppointments.reduce(
      (total, apt) => total + apt.service.price,
      0
    );

    // Calculate percentage change
    const percentageChange =
      previousTotal > 0
        ? ((currentTotal - previousTotal) / previousTotal) * 100
        : currentTotal > 0
          ? 100
          : 0;

    // Calculate average session value
    const avgSessionValue =
      currentAppointments.length > 0
        ? currentTotal / currentAppointments.length
        : 0;

    const calculations = {
      currentTotal: Math.round(currentTotal),
      previousTotal: Math.round(previousTotal),
      percentageChange: Math.round(percentageChange * 100) / 100,
      avgSessionValue: Math.round(avgSessionValue),
      totalSessions: currentAppointments.length,
    };

    // Validate against expected results if provided
    if (expectedResults) {
      if (calculations.currentTotal !== expectedResults.currentTotal) {
        errors.push(
          `Revenue total mismatch: expected ${expectedResults.currentTotal}, got ${calculations.currentTotal}`
        );
      }
      if (
        Math.abs(
          calculations.percentageChange - expectedResults.percentageChange
        ) > 0.1
      ) {
        errors.push(
          `Percentage change mismatch: expected ${expectedResults.percentageChange}, got ${calculations.percentageChange}`
        );
      }
      if (calculations.avgSessionValue !== expectedResults.avgSessionValue) {
        errors.push(
          `Average session value mismatch: expected ${expectedResults.avgSessionValue}, got ${calculations.avgSessionValue}`
        );
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      calculations,
    };
  }

  /**
   * Validate appointment analytics calculations
   */
  static validateAppointments(
    appointments: MockAppointment[],
    startDate: Date,
    endDate: Date,
    expectedResults?: {
      utilizationRate: number;
      cancellationRate: number;
    }
  ): { passed: boolean; errors: string[]; calculations: any } {
    const errors: string[] = [];

    // Filter appointments for period
    const periodAppointments = appointments.filter(
      apt => apt.dateTime >= startDate && apt.dateTime <= endDate
    );

    // Calculate status breakdown
    const statusBreakdown = {
      completed: periodAppointments.filter(apt => apt.status === "COMPLETED")
        .length,
      cancelled: periodAppointments.filter(apt => apt.status === "CANCELLED")
        .length,
      pending: periodAppointments.filter(apt => apt.status === "PENDING")
        .length,
      confirmed: periodAppointments.filter(apt => apt.status === "CONFIRMED")
        .length,
      noShow: periodAppointments.filter(apt => apt.status === "NO_SHOW").length,
    };

    // Calculate utilization rate (assuming 8 hours per day, 5 days per week)
    const workDays =
      Math.floor(
        (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      ) *
      (5 / 7);
    const availableSlots = workDays * 8;
    const bookedSlots = periodAppointments.length;
    const utilizationRate =
      availableSlots > 0 ? (bookedSlots / availableSlots) * 100 : 0;

    // Calculate cancellation rate
    const cancellationRate =
      periodAppointments.length > 0
        ? ((statusBreakdown.cancelled + statusBreakdown.noShow) /
            periodAppointments.length) *
          100
        : 0;

    const calculations = {
      totalAppointments: periodAppointments.length,
      utilizationRate: Math.round(utilizationRate * 100) / 100,
      cancellationRate: Math.round(cancellationRate * 100) / 100,
      statusBreakdown,
      availableSlots: Math.round(availableSlots),
      bookedSlots,
    };

    // Validate against expected results
    if (expectedResults) {
      if (
        Math.abs(
          calculations.utilizationRate - expectedResults.utilizationRate
        ) > 0.1
      ) {
        errors.push(
          `Utilization rate mismatch: expected ${expectedResults.utilizationRate}, got ${calculations.utilizationRate}`
        );
      }
      if (
        Math.abs(
          calculations.cancellationRate - expectedResults.cancellationRate
        ) > 0.1
      ) {
        errors.push(
          `Cancellation rate mismatch: expected ${expectedResults.cancellationRate}, got ${calculations.cancellationRate}`
        );
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      calculations,
    };
  }

  /**
   * Validate client analytics calculations
   */
  static validateClients(
    appointments: MockAppointment[],
    startDate: Date,
    endDate: Date,
    expectedResults?: {
      newClients: number;
      returningClients: number;
      newVsReturningRatio: number;
    }
  ): { passed: boolean; errors: string[]; calculations: any } {
    const errors: string[] = [];

    // Filter appointments for period with user data
    const periodAppointments = appointments.filter(
      apt => apt.dateTime >= startDate && apt.dateTime <= endDate
    );

    // Identify new vs returning clients
    const newClients = periodAppointments.filter(apt => {
      const firstAppointment = apt.user.appointments[0];
      return firstAppointment && firstAppointment.dateTime >= startDate;
    });

    const returningClients = periodAppointments.filter(apt => {
      const firstAppointment = apt.user.appointments[0];
      return firstAppointment && firstAppointment.dateTime < startDate;
    });

    // Calculate unique clients
    const uniqueClientIds = new Set(periodAppointments.map(apt => apt.userId));
    const avgSessionsPerClient =
      uniqueClientIds.size > 0
        ? periodAppointments.length / uniqueClientIds.size
        : 0;

    // Calculate ratio
    const newVsReturningRatio =
      returningClients.length > 0
        ? (newClients.length / returningClients.length) * 100
        : newClients.length > 0
          ? Infinity
          : 0;

    const calculations = {
      newClients: newClients.length,
      returningClients: returningClients.length,
      totalUniqueClients: uniqueClientIds.size,
      newVsReturningRatio:
        newVsReturningRatio === Infinity
          ? Infinity
          : Math.round(newVsReturningRatio * 100) / 100,
      avgSessionsPerClient: Math.round(avgSessionsPerClient * 100) / 100,
    };

    // Validate against expected results
    if (expectedResults) {
      if (calculations.newClients !== expectedResults.newClients) {
        errors.push(
          `New clients mismatch: expected ${expectedResults.newClients}, got ${calculations.newClients}`
        );
      }
      if (calculations.returningClients !== expectedResults.returningClients) {
        errors.push(
          `Returning clients mismatch: expected ${expectedResults.returningClients}, got ${calculations.returningClients}`
        );
      }
      if (
        calculations.newVsReturningRatio !== expectedResults.newVsReturningRatio
      ) {
        errors.push(
          `Client ratio mismatch: expected ${expectedResults.newVsReturningRatio}, got ${calculations.newVsReturningRatio}`
        );
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      calculations,
    };
  }

  /**
   * Run comprehensive analytics validation with test data
   */
  static validateFullAnalytics(
    appointments: MockAppointment[],
    startDate: Date,
    endDate: Date,
    expectedResults?: Partial<AnalyticsValidationResult["calculations"]>
  ): AnalyticsValidationResult {
    const allErrors: string[] = [];

    // Validate each analytics category
    const revenueResult = this.validateRevenue(
      appointments,
      startDate,
      endDate,
      expectedResults?.revenue
    );
    const appointmentsResult = this.validateAppointments(
      appointments,
      startDate,
      endDate,
      expectedResults?.appointments
    );
    const clientsResult = this.validateClients(
      appointments,
      startDate,
      endDate,
      expectedResults?.clients
    );

    allErrors.push(...revenueResult.errors);
    allErrors.push(...appointmentsResult.errors);
    allErrors.push(...clientsResult.errors);

    return {
      passed: allErrors.length === 0,
      errors: allErrors,
      calculations: {
        revenue: revenueResult.calculations,
        appointments: appointmentsResult.calculations,
        clients: clientsResult.calculations,
      },
    };
  }

  /**
   * Create test data for analytics validation
   */
  static createTestData(): MockAppointment[] {
    return [
      // Current period appointments (January 2024)
      {
        id: "apt1",
        status: "COMPLETED",
        dateTime: new Date("2024-01-15T10:00:00Z"),
        service: {
          id: "svc1",
          title: "Individual Therapy",
          price: 150,
          duration: 60,
        },
        userId: "user1",
        user: {
          appointments: [{ dateTime: new Date("2024-01-15T10:00:00Z") }],
        }, // New client
      },
      {
        id: "apt2",
        status: "COMPLETED",
        dateTime: new Date("2024-01-20T14:00:00Z"),
        service: {
          id: "svc1",
          title: "Individual Therapy",
          price: 150,
          duration: 60,
        },
        userId: "user2",
        user: {
          appointments: [{ dateTime: new Date("2023-12-15T10:00:00Z") }],
        }, // Returning client
      },
      {
        id: "apt3",
        status: "CANCELLED",
        dateTime: new Date("2024-01-25T11:00:00Z"),
        service: {
          id: "svc2",
          title: "Couples Therapy",
          price: 200,
          duration: 90,
        },
        userId: "user3",
        user: {
          appointments: [{ dateTime: new Date("2024-01-25T11:00:00Z") }],
        }, // New client (cancelled)
      },
      // Previous period appointments (December 2023)
      {
        id: "apt4",
        status: "COMPLETED",
        dateTime: new Date("2023-12-15T10:00:00Z"),
        service: {
          id: "svc1",
          title: "Individual Therapy",
          price: 150,
          duration: 60,
        },
        userId: "user2",
        user: {
          appointments: [{ dateTime: new Date("2023-12-15T10:00:00Z") }],
        },
      },
    ];
  }
}

/**
 * Performance testing utilities
 */
export class AnalyticsPerformanceTester {
  static async measureAnalyticsApiPerformance(
    apiUrl: string,
    iterations: number = 10
  ): Promise<{
    averageTime: number;
    minTime: number;
    maxTime: number;
    totalTime: number;
    results: Array<{ time: number; success: boolean }>;
  }> {
    const results: Array<{ time: number; success: boolean }> = [];

    for (let i = 0; i < iterations; i++) {
      const startTime = performance.now();

      try {
        const response = await fetch(apiUrl);
        const endTime = performance.now();
        const duration = endTime - startTime;

        results.push({
          time: duration,
          success: response.ok,
        });
      } catch (_error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        results.push({
          time: duration,
          success: false,
        });
      }
    }

    const times = results.map(r => r.time);
    const totalTime = times.reduce((sum, time) => sum + time, 0);

    return {
      averageTime: totalTime / iterations,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      totalTime,
      results,
    };
  }

  static async measureDashboardMetricsPerformance(): Promise<any> {
    return this.measureAnalyticsApiPerformance("/api/admin/dashboard-metrics");
  }

  static async measureAnalyticsPagePerformance(): Promise<any> {
    return this.measureAnalyticsApiPerformance("/api/admin/analytics");
  }
}
