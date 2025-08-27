"use client";

import { useState } from "react";
import { format } from "date-fns";
import { BookingState } from "./appointment-booking";
import { logger } from "@/lib/logger";

interface BookingSummaryProps {
  bookingState: BookingState;
  onConfirm: (appointmentId: string) => void;
  onBack: () => void;
}

export default function BookingSummary({

  bookingState,
  onConfirm,
  onBack,
}: BookingSummaryProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { selectedService, selectedDate, selectedTime, clientDetails } =
    bookingState;

  if (!selectedService || !selectedDate || !selectedTime || !clientDetails) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Incomplete booking information</p>
      </div>
    );
  }

  const handleConfirmBooking = async () => {
    if (!termsAccepted) {
      setError("Please accept the terms and conditions to proceed");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const appointmentData = {
        serviceId: selectedService.id,
        dateTime: selectedTime.toISOString(),
        clientDetails: {
          name: clientDetails.name,
          email: clientDetails.email,
          phone: clientDetails.phone || undefined,
          notes: clientDetails.notes || undefined,
        },
      };

      logger.info("Submitting appointment booking", {
        serviceId: selectedService.id,
        dateTime: selectedTime.toISOString(),
        hasClientDetails: true,
      });

      const response = await fetch("/api/appointments/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(appointmentData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to book appointment");
      }

      const data = await response.json();

      logger.info("Appointment booking successful", {
        appointmentId: data.data?.id,
      });

      onConfirm(data.data?.id || "unknown");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to book appointment";
      setError(errorMessage);

      logger.error(
        "Appointment booking failed",
        error instanceof Error ? error : new Error(errorMessage)
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-light mb-2">
            Review & Confirm
          </h2>
          <p className="text-muted-foreground">
            Please review your appointment details before confirming.
          </p>
        </div>
        <button
          onClick={onBack}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary hover:text-background transition-colors"
        >
          ← Back to Details
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Appointment Details */}
        <div className="space-y-6">
          <div className="bg-background border border-border rounded-lg p-6">
            <h3 className="font-serif text-xl font-light mb-4">
              Appointment Details
            </h3>
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">Service</p>
                  <p className="font-medium text-foreground">
                    {selectedService.title}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="font-medium">
                    {selectedService.duration} minutes
                  </p>
                </div>
              </div>

              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm text-muted-foreground">Date</p>
                  <p className="font-medium text-foreground">
                    {format(selectedDate, "EEEE, MMMM d, yyyy")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-medium">
                    {format(selectedTime, "h:mm a")}
                  </p>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <div className="flex justify-between items-center">
                  <p className="font-medium text-foreground">Total</p>
                  <p className="text-2xl font-medium text-primary">
                    ${selectedService.price}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="bg-background border border-border rounded-lg p-6">
            <h3 className="font-serif text-xl font-light mb-4">
              Contact Information
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{clientDetails.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{clientDetails.email}</p>
              </div>
              {clientDetails.phone && (
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-medium">{clientDetails.phone}</p>
                </div>
              )}
              {clientDetails.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notes</p>
                  <p className="text-sm bg-muted/30 rounded p-3 mt-1">
                    {clientDetails.notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Confirmation Section */}
        <div className="space-y-6">
          <div className="bg-muted/30 border border-border rounded-lg p-6">
            <h3 className="font-serif text-xl font-light mb-4">
              Important Information
            </h3>
            <div className="space-y-4 text-sm text-muted-foreground">
              <div className="flex items-start space-x-3">
                <svg
                  className="w-5 h-5 text-accent mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <p>
                  You&apos;ll receive a confirmation email with appointment
                  details and preparation instructions.
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <svg
                  className="w-5 h-5 text-accent mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <p>
                  Please arrive 5-10 minutes early to complete any necessary
                  paperwork.
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <svg
                  className="w-5 h-5 text-accent mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                <p>
                  If you need to reschedule or cancel, please contact us at
                  least 24 hours in advance.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-background border border-border rounded-lg p-6">
            <h3 className="font-serif text-xl font-light mb-4">
              Payment Information
            </h3>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Payment is due at the time of service. We accept:
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Cash and Check</li>
                <li>• Credit and Debit Cards</li>
                <li>• Health Savings Account (HSA)</li>
                <li>• Insurance (when applicable)</li>
              </ul>
              <div className="bg-accent/10 border border-accent rounded p-3 mt-4">
                <p className="text-sm font-medium text-foreground">
                  Session Fee: ${selectedService.price}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  We&apos;ll verify insurance coverage and provide a superbill
                  for reimbursement if applicable.
                </p>
              </div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="bg-background border border-border rounded-lg p-6">
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={e => setTermsAccepted(e.target.checked)}
                className="mt-1 h-4 w-4 text-primary focus:ring-primary border-border rounded"
              />
              <div className="flex-1">
                <label
                  htmlFor="terms"
                  className="text-sm font-medium text-foreground cursor-pointer"
                >
                  Terms and Conditions
                </label>
                <p className="text-xs text-muted-foreground mt-1">
                  I understand and agree to the{" "}
                  <a
                    href="/terms"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    terms of service
                  </a>{" "}
                  and{" "}
                  <a
                    href="/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    privacy policy
                  </a>
                  . I consent to the collection and use of my personal
                  information for appointment scheduling and clinical services
                  in accordance with HIPAA regulations.
                </p>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div
              className="bg-red-50 border border-red-200 rounded-lg p-4"
              role="alert"
            >
              <div className="flex items-start space-x-3">
                <svg
                  className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-red-800">
                    Booking Error
                  </p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Confirm Button */}
          <button
            onClick={handleConfirmBooking}
            disabled={!termsAccepted || isSubmitting}
            className={`
              w-full py-4 px-6 rounded-md font-medium text-lg transition-all
              focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
              ${
                termsAccepted && !isSubmitting
                  ? "bg-primary text-background hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }
            `}
          >
            {isSubmitting ? (
              <div className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5"
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
                Booking Your Appointment...
              </div>
            ) : (
              "Confirm Appointment"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
