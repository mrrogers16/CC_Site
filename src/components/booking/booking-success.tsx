"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import Link from "next/link";

interface BookingSuccessProps {
  appointmentId: string;
  onBookAnother: () => void;
}

interface AppointmentDetails {
  id: string;
  dateTime: string;
  service: {
    title: string;
    duration: number;
    price: number;
  };
  user?: {
    name: string;
    email: string;
  };
  status: string;
}

export default function BookingSuccess({
  appointmentId,
  onBookAnother,
}: BookingSuccessProps) {
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAppointmentDetails = async () => {
      if (!appointmentId || appointmentId === "unknown") {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`/api/appointments/${appointmentId}`);

        if (!response.ok) {
          throw new Error("Failed to fetch appointment details");
        }

        const data = await response.json();
        setAppointment(data.data);
      } catch (error) {
        setError(
          error instanceof Error
            ? error.message
            : "Failed to load appointment details"
        );
        console.error("Error fetching appointment details:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAppointmentDetails();
  }, [appointmentId]);

  if (loading) {
    return (
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center">
            <div className="animate-spin h-12 w-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
            <h1 className="font-serif text-3xl font-light text-foreground mb-4">
              Confirming Your Appointment
            </h1>
            <p className="text-muted-foreground">
              Please wait while we finalize your booking...
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-8 h-8 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">
            Appointment Confirmed!
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your appointment has been successfully booked. We&apos;ve sent a
            confirmation email with all the details and next steps.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Appointment Details */}
          <div className="space-y-6">
            <div className="bg-background border border-border rounded-lg p-6">
              <h2 className="font-serif text-xl font-light mb-4">
                Appointment Details
              </h2>

              {error || !appointment ? (
                <div className="space-y-3">
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-2">
                      {error || "Unable to load appointment details"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Your appointment has been confirmed. Please check your
                      email for complete details.
                    </p>
                  </div>
                  <div className="bg-accent/10 border border-accent rounded p-4">
                    <p className="text-sm font-medium">Appointment ID</p>
                    <p className="text-lg font-mono">{appointmentId}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Keep this ID for your records
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Service</p>
                      <p className="font-medium">{appointment.service.title}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Duration</p>
                      <p className="font-medium">
                        {appointment.service.duration} minutes
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium">
                        {format(
                          new Date(appointment.dateTime),
                          "EEEE, MMMM d, yyyy"
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Time</p>
                      <p className="font-medium">
                        {format(new Date(appointment.dateTime), "h:mm a")}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4">
                    <div className="flex justify-between items-center">
                      <p className="font-medium">Session Fee</p>
                      <p className="text-xl font-medium text-primary">
                        ${appointment.service.price}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Payment due at time of service
                    </p>
                  </div>

                  <div className="bg-muted/30 rounded p-3">
                    <p className="text-sm font-medium">Appointment ID</p>
                    <p className="text-lg font-mono">{appointment.id}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Keep this ID for your records
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Contact Information */}
            <div className="bg-accent/10 border border-accent rounded-lg p-6">
              <h3 className="font-medium text-foreground mb-3">
                Need to Make Changes?
              </h3>
              <p className="text-sm text-muted-foreground mb-3">
                If you need to reschedule or cancel your appointment, please
                contact us at least 24 hours in advance.
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <svg
                    className="w-4 h-4 text-accent"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <a
                    href="mailto:appointments@healingpathways.com"
                    className="text-primary hover:underline"
                  >
                    appointments@healingpathways.com
                  </a>
                </div>
                <div className="flex items-center space-x-2">
                  <svg
                    className="w-4 h-4 text-accent"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  </svg>
                  <a
                    href="tel:+1-555-HEALING"
                    className="text-primary hover:underline"
                  >
                    (555) 432-5464
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div className="space-y-6">
            <div className="bg-background border border-border rounded-lg p-6">
              <h2 className="font-serif text-xl font-light mb-4">
                What Happens Next?
              </h2>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-xs font-medium text-background">
                      1
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      Check Your Email
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      We&apos;ve sent a confirmation email with detailed
                      instructions, location information, and preparation tips.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-xs font-medium text-background">
                      2
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      Complete Intake Forms
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      If this is your first visit, please complete the intake
                      forms included in your confirmation email before your
                      appointment.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-xs font-medium text-background">
                      3
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Arrive Early</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Please arrive 5-10 minutes before your scheduled time to
                      check in and complete any remaining paperwork.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <span className="text-xs font-medium text-background">
                      4
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-foreground">
                      Your First Session
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      We&apos;ll begin with an assessment to understand your
                      needs and goals, then work together to create your
                      personalized treatment plan.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-background border border-border rounded-lg p-6">
              <h3 className="font-serif text-lg font-light mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <button
                  onClick={onBookAnother}
                  className="w-full py-2 px-4 bg-primary text-background rounded-md hover:bg-primary/90 transition-colors font-medium"
                >
                  Book Another Appointment
                </button>

                <a
                  href="/contact"
                  className="w-full py-2 px-4 border border-primary text-primary rounded-md hover:bg-primary hover:text-background transition-colors font-medium text-center block"
                >
                  Contact Us
                </a>

                <Link
                  href="/"
                  className="w-full py-2 px-4 bg-muted text-foreground rounded-md hover:bg-muted/80 transition-colors font-medium text-center block"
                >
                  Return to Home
                </Link>
              </div>
            </div>

            {/* Crisis Support */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <h4 className="font-medium text-red-800 mb-2">
                Crisis Support Available 24/7
              </h4>
              <p className="text-sm text-red-700 mb-3">
                If you&apos;re experiencing a mental health crisis before your
                appointment, please reach out immediately:
              </p>
              <div className="space-y-1 text-sm">
                <div className="font-medium text-red-800">
                  National Suicide Prevention Lifeline: 988
                </div>
                <div className="font-medium text-red-800">
                  Crisis Text Line: Text HOME to 741741
                </div>
                <div className="font-medium text-red-800">
                  Emergency Services: 911
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Information */}
        <div className="mt-12 text-center">
          <div className="bg-muted/30 border border-border rounded-lg p-6">
            <h3 className="font-serif text-lg font-light mb-3">
              Thank You for Choosing Healing Pathways Counseling
            </h3>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We&apos;re committed to providing you with compassionate,
              professional care in a safe and supportive environment. We look
              forward to working with you on your journey toward healing and
              growth.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
