import { useQuery } from "@tanstack/react-query";
import { logger } from "@/lib/logger";

export interface TimeSlot {
  dateTime: Date;
  available: boolean;
  reason?: string;
}

interface AvailableSlotsResponse {
  slots: TimeSlot[];
  date: string;
  serviceId?: string;
}

interface UseAvailableSlotsOptions {
  enabled?: boolean;
  refetchInterval?: number;
  staleTime?: number;
}

export function useAvailableSlots(
  date: Date | null,
  serviceId: string | null,
  options: UseAvailableSlotsOptions = {}
) {
  const {
    enabled = true,
    refetchInterval = 60000, // 1 minute
    staleTime = 2 * 60 * 1000, // 2 minutes
  } = options;

  const dateStr = date?.toISOString().split("T")[0];

  return useQuery({
    queryKey: ["available-slots", dateStr, serviceId],
    queryFn: async (): Promise<AvailableSlotsResponse> => {
      if (!dateStr || !serviceId) {
        throw new Error("Date and service ID are required");
      }

      logger.info("Fetching available slots", { date: dateStr, serviceId });

      const params = new URLSearchParams({
        date: dateStr,
        serviceId,
      });

      const response = await fetch(`/api/appointments/available?${params}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to fetch available slots");
      }

      const data = await response.json();

      // Convert string dates back to Date objects
      const slots =
        data.slots?.map(
          (slot: {
            dateTime: string;
            available: boolean;
            reason?: string;
          }) => ({
            ...slot,
            dateTime: new Date(slot.dateTime),
          })
        ) || [];

      logger.info("Available slots fetched successfully", {
        date: dateStr,
        serviceId,
        slotsCount: slots.length,
        availableCount: slots.filter((slot: TimeSlot) => slot.available).length,
      });

      return {
        slots,
        date: dateStr,
        serviceId,
      };
    },
    enabled: enabled && !!dateStr && !!serviceId,
    staleTime,
    refetchInterval,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      // Retry up to 3 times, but not for client errors (4xx)
      if (failureCount >= 3) return false;
      if (error instanceof Error && error.message.includes("4")) return false;
      return true;
    },
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    meta: {
      errorMessage: "Failed to load available time slots",
    },
  });
}

export function useAvailableDates(
  serviceId: string | null,
  options: UseAvailableSlotsOptions = {}
) {
  const {
    enabled = true,
    staleTime = 5 * 60 * 1000, // 5 minutes
  } = options;

  return useQuery({
    queryKey: ["available-dates", serviceId],
    queryFn: async (): Promise<Date[]> => {
      if (!serviceId) {
        throw new Error("Service ID is required");
      }

      logger.info("Fetching available dates", { serviceId });

      // Calculate date range (next 30 days, excluding weekends)
      const today = new Date();
      const dates: Date[] = [];
      const promises: Promise<Response>[] = [];

      for (let i = 1; i <= 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() + i);
        checkDate.setHours(0, 0, 0, 0);

        // Skip weekends (Saturday = 6, Sunday = 0)
        if (checkDate.getDay() === 0 || checkDate.getDay() === 6) {
          continue;
        }

        dates.push(checkDate);
        const dateStr = checkDate.toISOString().split("T")[0];
        promises.push(
          fetch(
            `/api/appointments/available?date=${dateStr}&serviceId=${serviceId}`
          )
        );
      }

      const responses = await Promise.all(
        promises.map(p => p.catch(_e => null))
      );
      const availableDates: Date[] = [];

      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        if (response && response.ok) {
          try {
            const data = await response.json();
            if (
              data.slots &&
              data.slots.some((slot: { available: boolean }) => slot.available)
            ) {
              const date = dates[i];
              if (date) {
                availableDates.push(date);
              }
            }
          } catch (error) {
            logger.warn("Failed to parse available slots response", {
              date: dates[i]?.toISOString().split("T")[0] || `index-${i}`,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
      }

      logger.info("Available dates fetched successfully", {
        serviceId,
        totalDates: dates.length,
        availableDates: availableDates.length,
      });

      return availableDates;
    },
    enabled: enabled && !!serviceId,
    staleTime,
    refetchOnWindowFocus: false,
    retry: 2,
    meta: {
      errorMessage: "Failed to load available dates",
    },
  });
}

export function useTimeSlotAvailability(
  dateTime: Date | null,
  serviceId: string | null,
  options: UseAvailableSlotsOptions = {}
) {
  const {
    enabled = true,
    staleTime = 30 * 1000, // 30 seconds for real-time checking
  } = options;

  return useQuery({
    queryKey: ["time-slot-availability", dateTime?.toISOString(), serviceId],
    queryFn: async (): Promise<{ available: boolean; reason?: string }> => {
      if (!dateTime || !serviceId) {
        throw new Error("DateTime and service ID are required");
      }

      const response = await fetch("/api/appointments/check-availability", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dateTime: dateTime.toISOString(),
          serviceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to check availability");
      }

      const data = await response.json();
      return data;
    },
    enabled: enabled && !!dateTime && !!serviceId,
    staleTime,
    refetchInterval: 30000, // Check every 30 seconds
    retry: false, // Don't retry availability checks
    meta: {
      errorMessage: "Failed to check time slot availability",
    },
  });
}
