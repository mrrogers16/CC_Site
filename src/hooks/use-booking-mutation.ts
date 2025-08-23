import { useMutation, useQueryClient } from "@tanstack/react-query";
import { logger } from "@/lib/logger";

interface BookingData {
  serviceId: string;
  dateTime: string;
  clientDetails: {
    name: string;
    email: string;
    phone?: string;
    notes?: string;
  };
}

interface BookingResponse {
  appointment: {
    id: string;
    dateTime: string;
    status: string;
    service: {
      id: string;
      title: string;
      duration: number;
      price: number;
    };
    user?: {
      id: string;
      name: string;
      email: string;
    };
  };
  message: string;
}

interface UseBookingMutationOptions {
  onSuccess?: (data: BookingResponse) => void;
  onError?: (error: Error) => void;
}

interface UseCancelBookingMutationOptions {
  onSuccess?: (data: CancelBookingResponse) => void;
  onError?: (error: Error) => void;
}

interface UseRescheduleBookingMutationOptions {
  onSuccess?: (data: RescheduleBookingResponse) => void;
  onError?: (error: Error) => void;
}

export function useBookingMutation(options: UseBookingMutationOptions = {}) {
  const queryClient = useQueryClient();
  const { onSuccess, onError } = options;

  return useMutation({
    mutationFn: async (bookingData: BookingData): Promise<BookingResponse> => {
      logger.info("Submitting appointment booking", {
        serviceId: bookingData.serviceId,
        dateTime: bookingData.dateTime,
        hasClientDetails: !!bookingData.clientDetails,
      });

      const response = await fetch("/api/appointments/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = errorData.message || "Failed to book appointment";

        logger.error("Appointment booking failed", new Error(errorMessage), {
          status: response.status,
          statusText: response.statusText,
          serviceId: bookingData.serviceId,
          dateTime: bookingData.dateTime,
        });

        throw new Error(errorMessage);
      }

      const data = await response.json();

      logger.info("Appointment booking successful", {
        appointmentId: data.appointment?.id,
        serviceId: bookingData.serviceId,
        dateTime: bookingData.dateTime,
      });

      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate relevant queries to update cached data
      const dateStr = new Date(variables.dateTime).toISOString().split("T")[0];

      // Invalidate available slots for the booked date and service
      queryClient.invalidateQueries({
        queryKey: ["available-slots", dateStr, variables.serviceId],
      });

      // Invalidate available dates for the service
      queryClient.invalidateQueries({
        queryKey: ["available-dates", variables.serviceId],
      });

      // Invalidate any time slot availability checks
      queryClient.invalidateQueries({
        queryKey: ["time-slot-availability"],
      });

      logger.info("Query cache invalidated after successful booking", {
        appointmentId: data.appointment?.id,
        dateStr,
        serviceId: variables.serviceId,
      });

      onSuccess?.(data);
    },
    onError: (error, variables) => {
      logger.error("Booking mutation error", error, {
        serviceId: variables.serviceId,
        dateTime: variables.dateTime,
      });

      onError?.(error instanceof Error ? error : new Error(String(error)));
    },
    retry: false, // Don't retry booking attempts to avoid duplicate bookings
    meta: {
      errorMessage: "Failed to book appointment",
    },
  });
}

interface CancelBookingData {
  appointmentId: string;
  reason?: string;
}

interface CancelBookingResponse {
  success: boolean;
  message: string;
  appointment?: {
    id: string;
    status: string;
  };
}

export function useCancelBookingMutation(
  options: UseCancelBookingMutationOptions = {}
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError } = options;

  return useMutation({
    mutationFn: async (
      cancelData: CancelBookingData
    ): Promise<CancelBookingResponse> => {
      logger.info("Submitting appointment cancellation", {
        appointmentId: cancelData.appointmentId,
        hasReason: !!cancelData.reason,
      });

      const response = await fetch(
        `/api/appointments/${cancelData.appointmentId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "CANCELLED",
            cancellationReason: cancelData.reason,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message || "Failed to cancel appointment";

        logger.error(
          "Appointment cancellation failed",
          new Error(errorMessage),
          {
            status: response.status,
            statusText: response.statusText,
            appointmentId: cancelData.appointmentId,
          }
        );

        throw new Error(errorMessage);
      }

      const data = await response.json();

      logger.info("Appointment cancellation successful", {
        appointmentId: cancelData.appointmentId,
      });

      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate queries to refresh available slots
      queryClient.invalidateQueries({
        queryKey: ["available-slots"],
      });

      queryClient.invalidateQueries({
        queryKey: ["available-dates"],
      });

      // Invalidate specific appointment query if it exists
      queryClient.invalidateQueries({
        queryKey: ["appointment", variables.appointmentId],
      });

      logger.info("Query cache invalidated after successful cancellation", {
        appointmentId: variables.appointmentId,
      });

      onSuccess?.(data);
    },
    onError: (error, variables) => {
      logger.error("Cancel booking mutation error", error, {
        appointmentId: variables.appointmentId,
      });

      onError?.(error instanceof Error ? error : new Error(String(error)));
    },
    retry: 1, // Allow one retry for cancellations
    meta: {
      errorMessage: "Failed to cancel appointment",
    },
  });
}

interface RescheduleBookingData {
  appointmentId: string;
  newDateTime: string;
  reason?: string;
}

interface RescheduleBookingResponse {
  success: boolean;
  message: string;
  appointment?: {
    id: string;
    dateTime: string;
    status: string;
  };
}

export function useRescheduleBookingMutation(
  options: UseRescheduleBookingMutationOptions = {}
) {
  const queryClient = useQueryClient();
  const { onSuccess, onError } = options;

  return useMutation({
    mutationFn: async (
      rescheduleData: RescheduleBookingData
    ): Promise<RescheduleBookingResponse> => {
      logger.info("Submitting appointment reschedule", {
        appointmentId: rescheduleData.appointmentId,
        newDateTime: rescheduleData.newDateTime,
        hasReason: !!rescheduleData.reason,
      });

      const response = await fetch(
        `/api/appointments/${rescheduleData.appointmentId}/reschedule`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            newDateTime: rescheduleData.newDateTime,
            reason: rescheduleData.reason,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage =
          errorData.message || "Failed to reschedule appointment";

        logger.error("Appointment reschedule failed", new Error(errorMessage), {
          status: response.status,
          statusText: response.statusText,
          appointmentId: rescheduleData.appointmentId,
          newDateTime: rescheduleData.newDateTime,
        });

        throw new Error(errorMessage);
      }

      const data = await response.json();

      logger.info("Appointment reschedule successful", {
        appointmentId: rescheduleData.appointmentId,
        newDateTime: rescheduleData.newDateTime,
      });

      return data;
    },
    onSuccess: (data, variables) => {
      // Invalidate queries for both old and new date slots
      queryClient.invalidateQueries({
        queryKey: ["available-slots"],
      });

      queryClient.invalidateQueries({
        queryKey: ["available-dates"],
      });

      // Invalidate specific appointment query
      queryClient.invalidateQueries({
        queryKey: ["appointment", variables.appointmentId],
      });

      logger.info("Query cache invalidated after successful reschedule", {
        appointmentId: variables.appointmentId,
        newDateTime: variables.newDateTime,
      });

      onSuccess?.(data);
    },
    onError: (error, variables) => {
      logger.error("Reschedule booking mutation error", error, {
        appointmentId: variables.appointmentId,
        newDateTime: variables.newDateTime,
      });

      onError?.(error instanceof Error ? error : new Error(String(error)));
    },
    retry: false, // Don't retry reschedule attempts
    meta: {
      errorMessage: "Failed to reschedule appointment",
    },
  });
}
