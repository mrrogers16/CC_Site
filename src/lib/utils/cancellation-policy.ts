interface CancellationPolicy {
  policy: "free" | "half" | "full";
  refundAmount: number;
  refundPercentage: number;
  message: string;
  canCancel: boolean;
}

/**
 * Calculate cancellation policy based on time remaining until appointment
 *
 * @param appointmentDateTime - ISO string of appointment date/time
 * @param servicePrice - Price of the service as a number
 * @returns CancellationPolicy object with refund details
 */
export function calculateCancellationPolicy(
  appointmentDateTime: string,
  servicePrice: number
): CancellationPolicy {
  const appointmentDate = new Date(appointmentDateTime);
  const now = new Date();

  // Calculate hours between now and appointment
  const hoursUntilAppointment = Math.ceil(
    (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60)
  );

  // If appointment is in the past, no cancellation allowed
  if (hoursUntilAppointment <= 0) {
    return {
      policy: "full",
      refundAmount: 0,
      refundPercentage: 0,
      message: "This appointment has already passed and cannot be cancelled.",
      canCancel: false,
    };
  }

  // 48+ hours: Free cancellation
  if (hoursUntilAppointment >= 48) {
    return {
      policy: "free",
      refundAmount: servicePrice,
      refundPercentage: 100,
      message: "Free cancellation available. You will receive a full refund.",
      canCancel: true,
    };
  }

  // 24-48 hours: Half refund
  if (hoursUntilAppointment >= 24) {
    const refundAmount = servicePrice * 0.5;
    return {
      policy: "half",
      refundAmount,
      refundPercentage: 50,
      message:
        "Cancellation within 48 hours. You will receive a 50% refund due to our cancellation policy.",
      canCancel: true,
    };
  }

  // Less than 24 hours: No refund (full charge)
  return {
    policy: "full",
    refundAmount: 0,
    refundPercentage: 0,
    message:
      "Cancellation within 24 hours. No refund available due to our cancellation policy. You will be charged the full amount.",
    canCancel: true, // Still allow cancellation for tracking purposes
  };
}

/**
 * Format hours remaining into a human-readable string
 *
 * @param hoursUntilAppointment - Number of hours until appointment
 * @returns Formatted string
 */
export function formatTimeUntilAppointment(
  hoursUntilAppointment: number
): string {
  if (hoursUntilAppointment <= 0) {
    return "Appointment has passed";
  }

  if (hoursUntilAppointment < 24) {
    return `${hoursUntilAppointment} hour${hoursUntilAppointment !== 1 ? "s" : ""} remaining`;
  }

  const days = Math.floor(hoursUntilAppointment / 24);
  const remainingHours = hoursUntilAppointment % 24;

  if (remainingHours === 0) {
    return `${days} day${days !== 1 ? "s" : ""} remaining`;
  }

  return `${days} day${days !== 1 ? "s" : ""} and ${remainingHours} hour${remainingHours !== 1 ? "s" : ""} remaining`;
}

/**
 * Get time-based warning color for UI styling
 *
 * @param hoursUntilAppointment - Number of hours until appointment
 * @returns CSS color class suffix (e.g., 'green', 'yellow', 'red')
 */
export function getCancellationWarningColor(
  hoursUntilAppointment: number
): "green" | "yellow" | "red" | "gray" {
  if (hoursUntilAppointment <= 0) return "gray";
  if (hoursUntilAppointment >= 48) return "green";
  if (hoursUntilAppointment >= 24) return "yellow";
  return "red";
}
