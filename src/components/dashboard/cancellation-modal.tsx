"use client";

import { useState, useEffect } from "react";
import {
  calculateCancellationPolicy,
  formatTimeUntilAppointment,
  getCancellationWarningColor,
} from "@/lib/utils/cancellation-policy";

interface AppointmentService {
  title: string;
  duration: number;
  price: string;
}

interface Appointment {
  id: string;
  dateTime: string;
  status: "PENDING" | "CONFIRMED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  notes?: string;
  service: AppointmentService;
}

interface CancellationModalProps {
  appointment: Appointment | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (appointmentId: string, reason: string) => Promise<void>;
}

const CANCELLATION_REASONS = [
  { value: "schedule_conflict", label: "Schedule conflict" },
  { value: "illness", label: "Illness" },
  { value: "family_emergency", label: "Family emergency" },
  { value: "personal_reasons", label: "Personal reasons" },
  { value: "other", label: "Other" },
] as const;

export function CancellationModal({
  appointment,
  isOpen,
  onClose,
  onConfirm,
}: CancellationModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [otherReason, setOtherReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<"reason" | "confirmation">("reason");

  // Reset modal state when opened/closed
  useEffect(() => {
    if (isOpen) {
      setSelectedReason("");
      setOtherReason("");
      setStep("reason");
      setIsProcessing(false);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen && !isProcessing) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, isProcessing, onClose]);

  if (!isOpen || !appointment) return null;

  const servicePrice = parseFloat(appointment.service.price);
  const hoursUntilAppointment = Math.ceil(
    (new Date(appointment.dateTime).getTime() - new Date().getTime()) /
      (1000 * 60 * 60)
  );

  const cancellationPolicy = calculateCancellationPolicy(
    appointment.dateTime,
    servicePrice
  );
  const timeRemaining = formatTimeUntilAppointment(hoursUntilAppointment);
  const warningColor = getCancellationWarningColor(hoursUntilAppointment);

  const getReason = () => {
    if (selectedReason === "other") {
      return otherReason.trim();
    }
    return (
      CANCELLATION_REASONS.find(r => r.value === selectedReason)?.label || ""
    );
  };

  const canProceed =
    selectedReason && (selectedReason !== "other" || otherReason.trim());

  const handleNext = () => {
    if (canProceed) {
      setStep("confirmation");
    }
  };

  const handleConfirmCancellation = async () => {
    if (!canProceed || isProcessing) return;

    try {
      setIsProcessing(true);
      await onConfirm(appointment.id, getReason());
      onClose();
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      // Error handling will be managed by parent component
    } finally {
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString: string) => {
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

  const getColorClasses = (color: string) => {
    switch (color) {
      case "green":
        return "bg-green-100 text-green-800 border-green-200";
      case "yellow":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "red":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={e => {
        if (e.target === e.currentTarget && !isProcessing) {
          onClose();
        }
      }}
    >
      <div
        role="dialog"
        className="bg-card rounded-lg shadow-xl max-w-md w-full border border-border"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="font-serif text-xl font-light text-foreground">
            {step === "reason" ? "Cancel Appointment" : "Confirm Cancellation"}
          </h2>
          {!isProcessing && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted/50 rounded-full transition-colors"
              aria-label="Close modal"
            >
              <svg
                className="w-5 h-5 text-muted-foreground"
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
          )}
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {/* Appointment Summary */}
          <div className="bg-muted/30 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-foreground mb-2">
              {appointment.service.title}
            </h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>{formatDate(appointment.dateTime)}</p>
              <p>
                {appointment.service.duration} minutes • $
                {appointment.service.price}
              </p>
              <p className="font-medium">{timeRemaining}</p>
            </div>
          </div>

          {step === "reason" && (
            <div className="space-y-6">
              {/* Cancellation Policy */}
              <div
                className={`p-4 rounded-lg border ${getColorClasses(warningColor)}`}
              >
                <div className="flex items-start space-x-2">
                  <svg
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <div>
                    <p className="font-medium mb-1">
                      Refund: ${cancellationPolicy.refundAmount.toFixed(2)} (
                      {cancellationPolicy.refundPercentage}%)
                    </p>
                    <p className="text-sm">{cancellationPolicy.message}</p>
                  </div>
                </div>
              </div>

              {/* Cancellation Reason */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Please select a reason for cancellation:
                </label>
                <div className="space-y-3">
                  {CANCELLATION_REASONS.map(reason => (
                    <label key={reason.value} className="flex items-center">
                      <input
                        type="radio"
                        name="cancellation-reason"
                        value={reason.value}
                        checked={selectedReason === reason.value}
                        onChange={e => setSelectedReason(e.target.value)}
                        className="w-4 h-4 text-primary border-border focus:ring-primary focus:ring-2"
                      />
                      <span className="ml-3 text-foreground">
                        {reason.label}
                      </span>
                    </label>
                  ))}
                </div>

                {selectedReason === "other" && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Please specify:
                    </label>
                    <textarea
                      value={otherReason}
                      onChange={e => setOtherReason(e.target.value)}
                      placeholder="Please provide additional details..."
                      className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-background text-foreground"
                      rows={3}
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {otherReason.length}/500 characters
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === "confirmation" && (
            <div className="space-y-6">
              {/* Final Confirmation */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <svg
                    className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
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
                  <div className="text-red-800">
                    <p className="font-medium mb-1">
                      Are you sure you want to cancel this appointment?
                    </p>
                    <p className="text-sm">This action cannot be undone.</p>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reason:</span>
                  <span className="text-foreground font-medium">
                    {getReason()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Refund Amount:</span>
                  <span className="text-foreground font-medium">
                    ${cancellationPolicy.refundAmount.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Processing Time:
                  </span>
                  <span className="text-foreground">3-5 business days</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border bg-muted/30">
          {step === "reason" && (
            <>
              <button
                onClick={onClose}
                disabled={isProcessing}
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Keep Appointment
              </button>
              <button
                onClick={handleNext}
                disabled={!canProceed || isProcessing}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
              >
                Continue
              </button>
            </>
          )}

          {step === "confirmation" && (
            <>
              <button
                onClick={() => setStep("reason")}
                disabled={isProcessing}
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleConfirmCancellation}
                disabled={isProcessing}
                className="px-6 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
              >
                {isProcessing && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                )}
                <span>
                  {isProcessing ? "Cancelling..." : "Cancel Appointment"}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
