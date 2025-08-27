"use client";

import { useState, useEffect } from "react";
import {
  calculateReschedulingPolicy,
  getReschedulingWarningColor,
} from "@/lib/utils/rescheduling-policy";
import CalendarView from "@/components/booking/calendar-view";
import TimeSlotGrid from "@/components/booking/time-slot-grid";

interface RescheduleAppointment {
  id: string;
  dateTime: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  notes?: string;
  service: {
    id: string;
    title: string;
    duration: number;
    price: string;
  };
}

interface RescheduleModalProps {
  appointment: RescheduleAppointment | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (appointmentId: string, newDateTime: string) => Promise<void>;
}

type RescheduleStep = "confirm" | "calendar" | "timeslot" | "final";

export function RescheduleModal({
  appointment,
  isOpen,
  onClose,
  onConfirm,
}: RescheduleModalProps) {
  const [currentStep, setCurrentStep] = useState<RescheduleStep>("confirm");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [selectedTime, setSelectedTime] = useState<Date | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setCurrentStep("confirm");
      setSelectedDate(undefined);
      setSelectedTime(undefined);
      setIsSubmitting(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen || !appointment) return null;

  const servicePrice = parseFloat(appointment.service.price);
  const reschedulingPolicy = calculateReschedulingPolicy(
    appointment.dateTime,
    servicePrice
  );
  const warningColor = getReschedulingWarningColor(
    Math.ceil(
      (new Date(appointment.dateTime).getTime() - new Date().getTime()) /
        (1000 * 60 * 60)
    )
  );

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    setCurrentStep("timeslot");
  };

  const handleTimeSelect = (dateTime: Date) => {
    setSelectedTime(dateTime);
    setCurrentStep("final");
  };

  const handleConfirmReschedule = async () => {
    if (!selectedTime || !appointment) return;

    try {
      setIsSubmitting(true);
      setError(null);

      await onConfirm(appointment.id, selectedTime.toISOString());
      onClose();
    } catch (error) {
      console.error("Error rescheduling appointment:", error);
      setError(
        error instanceof Error
          ? error.message
          : "Failed to reschedule appointment. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case "calendar":
        setCurrentStep("confirm");
        break;
      case "timeslot":
        setCurrentStep("calendar");
        setSelectedDate(undefined);
        break;
      case "final":
        setCurrentStep("timeslot");
        setSelectedTime(undefined);
        break;
      default:
        onClose();
    }
  };

  const getStepTitle = () => {
    switch (currentStep) {
      case "confirm":
        return "Reschedule Appointment";
      case "calendar":
        return "Select New Date";
      case "timeslot":
        return "Select New Time";
      case "final":
        return "Confirm Rescheduling";
      default:
        return "Reschedule Appointment";
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "confirm":
        return (
          <div className="space-y-6">
            {/* Current Appointment Details */}
            <div className="bg-muted/30 border border-border rounded-lg p-6">
              <h3 className="font-semibold text-foreground mb-3">
                Current Appointment
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service:</span>
                  <span className="text-foreground font-medium">
                    {appointment.service.title}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date & Time:</span>
                  <span className="text-foreground font-medium">
                    {formatDateTime(appointment.dateTime)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span className="text-foreground">
                    {appointment.service.duration} minutes
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Price:</span>
                  <span className="text-foreground">
                    ${appointment.service.price}
                  </span>
                </div>
              </div>
            </div>

            {/* Rescheduling Policy */}
            <div
              className={`border rounded-lg p-6 ${
                warningColor === "green"
                  ? "bg-green-50 border-green-200"
                  : warningColor === "yellow"
                    ? "bg-yellow-50 border-yellow-200"
                    : warningColor === "red"
                      ? "bg-red-50 border-red-200"
                      : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex items-start space-x-3">
                <div
                  className={`flex-shrink-0 w-5 h-5 rounded-full mt-0.5 ${
                    warningColor === "green"
                      ? "bg-green-500"
                      : warningColor === "yellow"
                        ? "bg-yellow-500"
                        : warningColor === "red"
                          ? "bg-red-500"
                          : "bg-gray-500"
                  }`}
                />
                <div className="space-y-2">
                  <p
                    className={`text-sm font-medium ${
                      warningColor === "green"
                        ? "text-green-800"
                        : warningColor === "yellow"
                          ? "text-yellow-800"
                          : warningColor === "red"
                            ? "text-red-800"
                            : "text-gray-800"
                    }`}
                  >
                    {reschedulingPolicy.timeRemaining}
                  </p>
                  <p
                    className={`text-sm ${
                      warningColor === "green"
                        ? "text-green-700"
                        : warningColor === "yellow"
                          ? "text-yellow-700"
                          : warningColor === "red"
                            ? "text-red-700"
                            : "text-gray-700"
                    }`}
                  >
                    {reschedulingPolicy.message}
                  </p>
                  {reschedulingPolicy.fees > 0 && (
                    <p
                      className={`text-sm font-semibold ${
                        warningColor === "yellow"
                          ? "text-yellow-800"
                          : "text-red-800"
                      }`}
                    >
                      Rescheduling Fee: ${reschedulingPolicy.fees.toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {!reschedulingPolicy.canReschedule && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                <div className="flex items-center space-x-2 text-red-800">
                  <svg
                    className="w-5 h-5 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span className="font-medium">
                    This appointment cannot be rescheduled.
                  </span>
                </div>
              </div>
            )}
          </div>
        );

      case "calendar":
        return (
          <div className="space-y-4">
            <div className="bg-muted/30 border border-border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-foreground">
                    {appointment.service.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {appointment.service.duration} minutes
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-primary">
                    ${appointment.service.price}
                  </p>
                </div>
              </div>
            </div>

            <CalendarView
              selectedService={{
                id: appointment.service.id,
                title: appointment.service.title,
                duration: appointment.service.duration,
                price: parseFloat(appointment.service.price),
              }}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
              onBack={handleBack}
            />
          </div>
        );

      case "timeslot":
        return (
          selectedDate && (
            <div className="space-y-4">
              <div className="bg-muted/30 border border-border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium text-foreground">
                      {appointment.service.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedDate.toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-primary">
                      ${appointment.service.price}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {appointment.service.duration} minutes
                    </p>
                  </div>
                </div>
              </div>

              <TimeSlotGrid
                selectedService={{
                  id: appointment.service.id,
                  title: appointment.service.title,
                  duration: appointment.service.duration,
                  price: parseFloat(appointment.service.price),
                }}
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                onTimeSelect={handleTimeSelect}
                onBack={handleBack}
              />
            </div>
          )
        );

      case "final":
        return (
          selectedTime && (
            <div className="space-y-6">
              {/* New Appointment Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="font-semibold text-green-800 mb-3">
                  New Appointment Details
                </h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-green-700">Service:</span>
                    <span className="text-green-800 font-medium">
                      {appointment.service.title}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">New Date & Time:</span>
                    <span className="text-green-800 font-medium">
                      {formatDateTime(selectedTime.toISOString())}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-green-700">Duration:</span>
                    <span className="text-green-800">
                      {appointment.service.duration} minutes
                    </span>
                  </div>
                </div>
              </div>

              {/* Fee Summary */}
              {reschedulingPolicy.fees > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                  <h3 className="font-semibold text-yellow-800 mb-3">
                    Rescheduling Fee
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-yellow-700">Service Price:</span>
                      <span className="text-yellow-800">
                        ${appointment.service.price}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-700">Rescheduling Fee:</span>
                      <span className="text-yellow-800 font-medium">
                        ${reschedulingPolicy.fees.toFixed(2)} (
                        {reschedulingPolicy.feePercentage}%)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-red-800">
                    <svg
                      className="w-5 h-5 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span className="text-sm">{error}</span>
                  </div>
                </div>
              )}
            </div>
          )
        );

      default:
        return null;
    }
  };

  const renderActions = () => {
    switch (currentStep) {
      case "confirm":
        return (
          <div className="flex items-center justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() =>
                reschedulingPolicy.canReschedule
                  ? setCurrentStep("calendar")
                  : onClose()
              }
              disabled={!reschedulingPolicy.canReschedule}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {reschedulingPolicy.canReschedule ? "Continue" : "Close"}
            </button>
          </div>
        );

      case "calendar":
      case "timeslot":
        return (
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span>Back</span>
            </button>
          </div>
        );

      case "final":
        return (
          <div className="flex items-center justify-between">
            <button
              onClick={handleBack}
              className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span>Back</span>
            </button>
            <div className="flex items-center space-x-4">
              <button
                onClick={onClose}
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReschedule}
                disabled={isSubmitting}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {isSubmitting ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>Rescheduling...</span>
                  </>
                ) : (
                  <span>Confirm Reschedule</span>
                )}
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-border">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-serif text-2xl font-light text-foreground">
            {getStepTitle()}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted/50 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <svg
              className="w-6 h-6 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">{renderStepContent()}</div>

        {/* Actions */}
        <div className="p-6 border-t border-border">{renderActions()}</div>
      </div>
    </div>
  );
}
