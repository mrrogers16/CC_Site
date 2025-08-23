"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ServiceSelector from "./service-selector";
import CalendarView from "./calendar-view";
import TimeSlotGrid from "./time-slot-grid";
import BookingForm from "./booking-form";
import BookingSummary from "./booking-summary";
import BookingSuccess from "./booking-success";

export interface BookingState {
  step: number;
  selectedService?: {
    id: string;
    title: string;
    duration: number;
    price: number;
  } | undefined;
  selectedDate?: Date | undefined;
  selectedTime?: Date | undefined;
  clientDetails?: {
    name: string;
    email: string;
    phone?: string | undefined;
    notes?: string | undefined;
  } | undefined;
  appointmentId?: string | undefined;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function BookingContent() {
  const [bookingState, setBookingState] = useState<BookingState>({ step: 1 });

  const updateBookingState = (updates: Partial<BookingState>) => {
    setBookingState(prev => ({ ...prev, ...updates }));
  };

  const goToStep = (step: number) => {
    setBookingState(prev => ({ ...prev, step }));
  };

  const resetBooking = () => {
    setBookingState({ step: 1 });
  };

  if (bookingState.step === 6) {
    return (
      <BookingSuccess
        appointmentId={bookingState.appointmentId!}
        onBookAnother={resetBooking}
      />
    );
  }

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">
            Book Your Appointment
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Schedule your counseling session with our easy-to-use booking
            system. Choose your service, select a convenient time, and
            we&apos;ll take care of the rest.
          </p>
        </div>

        {/* Progress indicator */}
        <div className="mb-12">
          <div className="flex items-center justify-center space-x-4 sm:space-x-8">
            {[
              { step: 1, label: "Service" },
              { step: 2, label: "Date" },
              { step: 3, label: "Time" },
              { step: 4, label: "Details" },
              { step: 5, label: "Review" },
            ].map(({ step, label }) => (
              <div
                key={step}
                className={`flex items-center space-x-2 ${
                  step === bookingState.step
                    ? "text-primary"
                    : step < bookingState.step
                      ? "text-accent"
                      : "text-muted-foreground"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step === bookingState.step
                      ? "bg-primary text-background"
                      : step < bookingState.step
                        ? "bg-accent text-background"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step < bookingState.step ? "✓" : step}
                </div>
                <span className="text-sm font-medium hidden sm:inline">
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Booking steps content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
          {/* Step 1: Service Selection */}
          {bookingState.step === 1 && (
            <div className="lg:col-span-3">
              <ServiceSelector
                selectedService={bookingState.selectedService}
                onServiceSelect={service => {
                  updateBookingState({
                    selectedService: service,
                    step: 2,
                  });
                }}
              />
            </div>
          )}

          {/* Step 2: Date Selection */}
          {bookingState.step === 2 && bookingState.selectedService && (
            <>
              <div className="lg:col-span-2">
                <CalendarView
                  selectedService={bookingState.selectedService}
                  selectedDate={bookingState.selectedDate}
                  onDateSelect={date => {
                    updateBookingState({
                      selectedDate: date,
                      step: 3,
                    });
                  }}
                  onBack={() => goToStep(1)}
                />
              </div>
              <div className="lg:col-span-1">
                <div className="bg-muted/30 rounded-lg p-6">
                  <h3 className="font-serif text-xl font-light mb-4">
                    Selected Service
                  </h3>
                  <div className="space-y-2">
                    <p className="font-medium">
                      {bookingState.selectedService.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {bookingState.selectedService.duration} minutes
                    </p>
                    <p className="text-lg font-medium text-primary">
                      ${bookingState.selectedService.price}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Step 3: Time Selection */}
          {bookingState.step === 3 &&
            bookingState.selectedService &&
            bookingState.selectedDate && (
              <>
                <div className="lg:col-span-2">
                  <TimeSlotGrid
                    selectedService={bookingState.selectedService}
                    selectedDate={bookingState.selectedDate}
                    selectedTime={bookingState.selectedTime}
                    onTimeSelect={dateTime => {
                      updateBookingState({
                        selectedTime: dateTime,
                        step: 4,
                      });
                    }}
                    onBack={() => goToStep(2)}
                  />
                </div>
                <div className="lg:col-span-1">
                  <div className="bg-muted/30 rounded-lg p-6">
                    <h3 className="font-serif text-xl font-light mb-4">
                      Booking Summary
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Service</p>
                        <p className="font-medium">
                          {bookingState.selectedService.title}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p className="font-medium">
                          {bookingState.selectedDate.toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Duration
                        </p>
                        <p className="font-medium">
                          {bookingState.selectedService.duration} minutes
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Price</p>
                        <p className="text-lg font-medium text-primary">
                          ${bookingState.selectedService.price}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

          {/* Step 4: Client Details */}
          {bookingState.step === 4 &&
            bookingState.selectedService &&
            bookingState.selectedDate &&
            bookingState.selectedTime && (
              <div className="lg:col-span-3">
                <BookingForm
                  onClientDetailsSubmit={details => {
                    updateBookingState({
                      clientDetails: details,
                      step: 5,
                    });
                  }}
                  onBack={() => goToStep(3)}
                />
              </div>
            )}

          {/* Step 5: Review & Confirm */}
          {bookingState.step === 5 &&
            bookingState.selectedService &&
            bookingState.selectedDate &&
            bookingState.selectedTime &&
            bookingState.clientDetails && (
              <div className="lg:col-span-3">
                <BookingSummary
                  bookingState={bookingState}
                  onConfirm={appointmentId => {
                    updateBookingState({
                      appointmentId,
                      step: 6,
                    });
                  }}
                  onBack={() => goToStep(4)}
                />
              </div>
            )}
        </div>
      </div>
    </section>
  );
}

export default function AppointmentBooking() {
  return (
    <QueryClientProvider client={queryClient}>
      <BookingContent />
    </QueryClientProvider>
  );
}
