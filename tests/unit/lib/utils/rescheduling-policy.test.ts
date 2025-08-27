import { jest } from "@jest/globals";
import {
  calculateReschedulingPolicy,
  canRescheduleAppointment,
} from "@/lib/utils/rescheduling-policy";

// Mock Date for consistent testing
const mockDate = new Date("2024-12-26T10:00:00.000Z");
jest.useFakeTimers();
jest.setSystemTime(mockDate);

describe("Rescheduling Policy Utility", () => {
  afterAll(() => {
    jest.useRealTimers();
  });

  describe("calculateReschedulingPolicy", () => {
    it("should allow free rescheduling when 48+ hours in advance", () => {
      // 72 hours in advance
      const appointmentDateTime = "2024-12-29T10:00:00.000Z";
      const servicePrice = 150;

      const result = calculateReschedulingPolicy(
        appointmentDateTime,
        servicePrice
      );

      expect(result).toEqual({
        canReschedule: true,
        policy: "free",
        fees: 0,
        feePercentage: 0,
        message:
          "Free rescheduling available. You can reschedule without any fees.",
        timeRemaining: "3 days",
      });
    });

    it("should apply 50% fee when 24-48 hours in advance", () => {
      // 36 hours in advance
      const appointmentDateTime = "2024-12-27T22:00:00.000Z";
      const servicePrice = 150;

      const result = calculateReschedulingPolicy(
        appointmentDateTime,
        servicePrice
      );

      expect(result).toEqual({
        canReschedule: true,
        policy: "fee",
        fees: 75,
        feePercentage: 50,
        message:
          "Rescheduling fee applies. You will be charged 50% of the session fee ($75.00) to reschedule.",
        timeRemaining: "1 day 12 hours",
      });
    });

    it("should prevent rescheduling when less than 24 hours", () => {
      // 12 hours in advance
      const appointmentDateTime = "2024-12-26T22:00:00.000Z";
      const servicePrice = 150;

      const result = calculateReschedulingPolicy(
        appointmentDateTime,
        servicePrice
      );

      expect(result).toEqual({
        canReschedule: false,
        policy: "not_allowed",
        fees: 0,
        feePercentage: 0,
        message:
          "Appointments cannot be rescheduled within 24 hours of the scheduled time. Please contact our office directly if you have an emergency.",
        timeRemaining: "12 hours",
      });
    });

    it("should prevent rescheduling for past appointments", () => {
      // 2 hours ago
      const appointmentDateTime = "2024-12-26T08:00:00.000Z";
      const servicePrice = 150;

      const result = calculateReschedulingPolicy(
        appointmentDateTime,
        servicePrice
      );

      expect(result).toEqual({
        canReschedule: false,
        policy: "not_allowed",
        fees: 0,
        feePercentage: 0,
        message:
          "Past appointments cannot be rescheduled. Please contact our office if you need assistance.",
        timeRemaining: "Past due",
      });
    });

    it("should handle edge case exactly at 48 hours", () => {
      // Exactly 48 hours in advance
      const appointmentDateTime = "2024-12-28T10:00:00.000Z";
      const servicePrice = 150;

      const result = calculateReschedulingPolicy(
        appointmentDateTime,
        servicePrice
      );

      expect(result.policy).toBe("free");
      expect(result.canReschedule).toBe(true);
      expect(result.fees).toBe(0);
    });

    it("should handle edge case exactly at 24 hours", () => {
      // Exactly 24 hours in advance
      const appointmentDateTime = "2024-12-27T10:00:00.000Z";
      const servicePrice = 150;

      const result = calculateReschedulingPolicy(
        appointmentDateTime,
        servicePrice
      );

      expect(result.policy).toBe("not_allowed");
      expect(result.canReschedule).toBe(false);
    });

    it("should calculate correct fees for different service prices", () => {
      const appointmentDateTime = "2024-12-27T22:00:00.000Z"; // 36 hours

      const result100 = calculateReschedulingPolicy(appointmentDateTime, 100);
      expect(result100.fees).toBe(50);

      const result200 = calculateReschedulingPolicy(appointmentDateTime, 200);
      expect(result200.fees).toBe(100);

      const result250 = calculateReschedulingPolicy(appointmentDateTime, 250);
      expect(result250.fees).toBe(125);
    });

    it("should handle decimal service prices correctly", () => {
      const appointmentDateTime = "2024-12-27T22:00:00.000Z"; // 36 hours
      const servicePrice = 155.5;

      const result = calculateReschedulingPolicy(
        appointmentDateTime,
        servicePrice
      );

      expect(result.fees).toBe(77.75);
      expect(result.feePercentage).toBe(50);
    });
  });

  describe("canRescheduleAppointment", () => {
    it("should allow rescheduling for PENDING appointments with sufficient time", () => {
      const appointmentDateTime = "2024-12-29T10:00:00.000Z"; // 72 hours

      const result = canRescheduleAppointment("PENDING", appointmentDateTime);

      expect(result).toBe(true);
    });

    it("should allow rescheduling for CONFIRMED appointments with sufficient time", () => {
      const appointmentDateTime = "2024-12-29T10:00:00.000Z"; // 72 hours

      const result = canRescheduleAppointment("CONFIRMED", appointmentDateTime);

      expect(result).toBe(true);
    });

    it("should prevent rescheduling for CANCELLED appointments", () => {
      const appointmentDateTime = "2024-12-29T10:00:00.000Z"; // 72 hours

      const result = canRescheduleAppointment("CANCELLED", appointmentDateTime);

      expect(result).toBe(false);
    });

    it("should prevent rescheduling for COMPLETED appointments", () => {
      const appointmentDateTime = "2024-12-29T10:00:00.000Z"; // 72 hours

      const result = canRescheduleAppointment("COMPLETED", appointmentDateTime);

      expect(result).toBe(false);
    });

    it("should prevent rescheduling for NO_SHOW appointments", () => {
      const appointmentDateTime = "2024-12-29T10:00:00.000Z"; // 72 hours

      const result = canRescheduleAppointment("NO_SHOW", appointmentDateTime);

      expect(result).toBe(false);
    });

    it("should prevent rescheduling when less than 24 hours regardless of status", () => {
      const appointmentDateTime = "2024-12-26T22:00:00.000Z"; // 12 hours

      expect(canRescheduleAppointment("PENDING", appointmentDateTime)).toBe(
        false
      );
      expect(canRescheduleAppointment("CONFIRMED", appointmentDateTime)).toBe(
        false
      );
    });

    it("should prevent rescheduling for past appointments", () => {
      const appointmentDateTime = "2024-12-26T08:00:00.000Z"; // 2 hours ago

      expect(canRescheduleAppointment("PENDING", appointmentDateTime)).toBe(
        false
      );
      expect(canRescheduleAppointment("CONFIRMED", appointmentDateTime)).toBe(
        false
      );
    });
  });
});
