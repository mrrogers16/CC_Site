import { calculateCancellationPolicy } from "./cancellation-policy";

interface ReschedulingPolicy {
  canReschedule: boolean;
  policy: "free" | "fee" | "not_allowed";
  fees: number;
  feePercentage: number;
  message: string;
  timeRemaining: string;
}

/**
 * Calculate rescheduling policy based on time remaining until appointment
 * Uses same time restrictions as cancellation policy
 *
 * @param appointmentDateTime - ISO string of appointment date/time
 * @param servicePrice - Price of the service as a number
 * @returns ReschedulingPolicy object with fee details
 */
export function calculateReschedulingPolicy(
  appointmentDateTime: string,
  servicePrice: number
): ReschedulingPolicy {
  const appointmentDate = new Date(appointmentDateTime);
  const now = new Date();

  // Calculate hours between now and appointment
  const hoursUntilAppointment = Math.ceil(
    (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60)
  );

  // Get base cancellation policy
  const _cancellationPolicy = calculateCancellationPolicy(
    appointmentDateTime,
    servicePrice
  );

  // Format time remaining
  const timeRemaining = formatTimeUntilAppointment(hoursUntilAppointment);

  // If appointment is in the past, no rescheduling allowed
  if (hoursUntilAppointment <= 0) {
    return {
      canReschedule: false,
      policy: "not_allowed",
      fees: 0,
      feePercentage: 0,
      message:
        "Past appointments cannot be rescheduled. Please contact our office if you need assistance.",
      timeRemaining: "Past due",
    };
  }

  // 48+ hours: Free rescheduling
  if (hoursUntilAppointment >= 48) {
    return {
      canReschedule: true,
      policy: "free",
      fees: 0,
      feePercentage: 0,
      message:
        "Free rescheduling available. You can reschedule without any fees.",
      timeRemaining,
    };
  }

  // 24-48 hours: Rescheduling fee (50% of service price)
  if (hoursUntilAppointment > 24) {
    const fee = servicePrice * 0.5;
    return {
      canReschedule: true,
      policy: "fee",
      fees: fee,
      feePercentage: 50,
      message: `Rescheduling fee applies. You will be charged 50% of the session fee ($${fee.toFixed(2)}) to reschedule.`,
      timeRemaining,
    };
  }

  // Less than or equal to 24 hours: No rescheduling allowed
  return {
    canReschedule: false,
    policy: "not_allowed",
    fees: 0,
    feePercentage: 0,
    message:
      "Appointments cannot be rescheduled within 24 hours of the scheduled time. Please contact our office directly if you have an emergency.",
    timeRemaining,
  };
}

/**
 * Format hours remaining into a human-readable string
 *
 * @param hoursUntilAppointment - Number of hours until appointment
 * @returns Formatted string
 */
function formatTimeUntilAppointment(hoursUntilAppointment: number): string {
  if (hoursUntilAppointment <= 0) {
    return "Past due";
  }

  if (hoursUntilAppointment < 24) {
    return `${hoursUntilAppointment} hours`;
  }

  const days = Math.floor(hoursUntilAppointment / 24);
  const remainingHours = hoursUntilAppointment % 24;

  if (remainingHours === 0) {
    return `${days} day${days !== 1 ? "s" : ""}`;
  }

  return `${days} day${days !== 1 ? "s" : ""} ${remainingHours} hours`;
}

/**
 * Get rescheduling warning color for UI styling
 *
 * @param hoursUntilAppointment - Number of hours until appointment
 * @returns CSS color class suffix
 */
export function getReschedulingWarningColor(
  hoursUntilAppointment: number
): "green" | "yellow" | "red" | "gray" {
  if (hoursUntilAppointment <= 0) return "gray";
  if (hoursUntilAppointment >= 48) return "green";
  if (hoursUntilAppointment >= 24) return "yellow";
  return "red";
}

/**
 * Check if appointment can be rescheduled based on status and time
 *
 * @param status - Appointment status
 * @param appointmentDateTime - ISO string of appointment date/time
 * @returns boolean indicating if rescheduling is allowed
 */
export function canRescheduleAppointment(
  status: string,
  appointmentDateTime: string
): boolean {
  // Only allow rescheduling for PENDING or CONFIRMED appointments
  if (status !== "PENDING" && status !== "CONFIRMED") {
    return false;
  }

  // Check time-based restrictions
  const appointmentDate = new Date(appointmentDateTime);
  const now = new Date();
  const hoursUntilAppointment = Math.ceil(
    (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60)
  );

  // Must be more than 24 hours in the future
  return hoursUntilAppointment > 24;
}
