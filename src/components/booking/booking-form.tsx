"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSession } from "next-auth/react";
import { logger } from "@/lib/logger";

const clientDetailsSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address"),
  phone: z
    .string()
    .regex(/^\+?[\d\s\-\(\)\.]{10,}$/, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
  notes: z
    .string()
    .max(500, "Notes cannot exceed 500 characters")
    .optional()
    .or(z.literal("")),
});

type ClientDetailsFormData = z.infer<typeof clientDetailsSchema>;

interface BookingFormProps {
  onClientDetailsSubmit: (details: {
    name: string;
    email: string;
    phone?: string;
    notes?: string;
  }) => void;
  onBack: () => void;
}

export default function BookingForm({
  onClientDetailsSubmit,
  onBack,
}: BookingFormProps) {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    watch,
  } = useForm<ClientDetailsFormData>({
    resolver: zodResolver(clientDetailsSchema),
    mode: "onChange",
    defaultValues: {
      name: session?.user?.name || "",
      email: session?.user?.email || "",
      phone: "",
      notes: "",
    },
  });

  const watchedName = watch("name");
  const watchedEmail = watch("email");
  const watchedNotes = watch("notes");

  const onSubmit = async (data: ClientDetailsFormData) => {
    setIsSubmitting(true);

    try {
      const clientDetails = {
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone?.trim() || undefined,
        notes: data.notes?.trim() || undefined,
      };

      logger.info("Client details submitted for booking", {
        hasName: !!clientDetails.name,
        hasEmail: !!clientDetails.email,
        hasPhone: !!clientDetails.phone,
        hasNotes: !!clientDetails.notes,
        isAuthenticated: !!session,
      });

      onClientDetailsSubmit(clientDetails);
    } catch (error) {
      logger.error(
        "Error submitting client details",
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const remainingChars = 500 - (watchedNotes?.length || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-serif text-2xl font-light mb-2">
            Your Information
          </h2>
          <p className="text-muted-foreground">
            Please provide your contact details to complete the booking.
          </p>
        </div>
        <button
          onClick={onBack}
          className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary border border-primary rounded-md hover:bg-primary hover:text-background transition-colors"
        >
          ← Back to Time Selection
        </button>
      </div>

      <div className="bg-background border border-border rounded-lg p-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Name Field */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                {...register("name")}
                type="text"
                id="name"
                autoComplete="name"
                className={`
                  w-full px-4 py-3 border rounded-md transition-colors
                  focus:ring-2 focus:ring-primary focus:border-transparent
                  ${
                    errors.name
                      ? "border-red-500 focus:ring-red-500"
                      : watchedName && !errors.name
                        ? "border-green-500"
                        : "border-border"
                  }
                `}
                placeholder="Enter your full name"
                aria-describedby={errors.name ? "name-error" : undefined}
              />
              {watchedName && !errors.name && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <svg
                    className="h-5 w-5 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>
            {errors.name && (
              <p
                id="name-error"
                className="mt-2 text-sm text-red-600"
                role="alert"
              >
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Email Field */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                {...register("email")}
                type="email"
                id="email"
                autoComplete="email"
                className={`
                  w-full px-4 py-3 border rounded-md transition-colors
                  focus:ring-2 focus:ring-primary focus:border-transparent
                  ${
                    errors.email
                      ? "border-red-500 focus:ring-red-500"
                      : watchedEmail && !errors.email
                        ? "border-green-500"
                        : "border-border"
                  }
                `}
                placeholder="Enter your email address"
                aria-describedby={errors.email ? "email-error" : undefined}
              />
              {watchedEmail && !errors.email && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <svg
                    className="h-5 w-5 text-green-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              )}
            </div>
            {errors.email && (
              <p
                id="email-error"
                className="mt-2 text-sm text-red-600"
                role="alert"
              >
                {errors.email.message}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              We&apos;ll send your appointment confirmation to this email.
            </p>
          </div>

          {/* Phone Field */}
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Phone Number{" "}
              <span className="text-muted-foreground">(Optional)</span>
            </label>
            <input
              {...register("phone")}
              type="tel"
              id="phone"
              autoComplete="tel"
              className={`
                w-full px-4 py-3 border rounded-md transition-colors
                focus:ring-2 focus:ring-primary focus:border-transparent
                ${
                  errors.phone
                    ? "border-red-500 focus:ring-red-500"
                    : "border-border"
                }
              `}
              placeholder="Enter your phone number"
              aria-describedby={errors.phone ? "phone-error" : undefined}
            />
            {errors.phone && (
              <p
                id="phone-error"
                className="mt-2 text-sm text-red-600"
                role="alert"
              >
                {errors.phone.message}
              </p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Optional. We may contact you if needed regarding your appointment.
            </p>
          </div>

          {/* Notes Field */}
          <div>
            <label
              htmlFor="notes"
              className="block text-sm font-medium text-foreground mb-2"
            >
              Additional Notes{" "}
              <span className="text-muted-foreground">(Optional)</span>
            </label>
            <div className="relative">
              <textarea
                {...register("notes")}
                id="notes"
                rows={4}
                maxLength={500}
                className={`
                  w-full px-4 py-3 border rounded-md transition-colors resize-none
                  focus:ring-2 focus:ring-primary focus:border-transparent
                  ${
                    errors.notes
                      ? "border-red-500 focus:ring-red-500"
                      : "border-border"
                  }
                `}
                placeholder="Any specific concerns, questions, or preferences you'd like to share..."
                aria-describedby={errors.notes ? "notes-error" : "notes-help"}
              />
              <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                {remainingChars} characters remaining
              </div>
            </div>
            {errors.notes && (
              <p
                id="notes-error"
                className="mt-2 text-sm text-red-600"
                role="alert"
              >
                {errors.notes.message}
              </p>
            )}
            <p id="notes-help" className="mt-1 text-xs text-muted-foreground">
              Share any relevant information that might help us prepare for your
              session.
            </p>
          </div>

          {/* Privacy Notice */}
          <div className="bg-muted/30 border border-border rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <svg
                className="w-5 h-5 text-accent mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-foreground">
                  Privacy & Confidentiality
                </h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Your personal information is kept strictly confidential and
                  secure. We follow HIPAA guidelines to protect your privacy and
                  only use this information for appointment scheduling and
                  communication purposes.
                </p>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex items-center justify-between pt-4">
            <div className="text-sm text-muted-foreground">
              <span className="text-red-500">*</span> Required fields
            </div>
            <button
              type="submit"
              disabled={!isValid || isSubmitting}
              className={`
                inline-flex items-center px-8 py-3 rounded-md font-medium transition-all
                focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
                ${
                  isValid && !isSubmitting
                    ? "bg-primary text-background hover:bg-primary/90"
                    : "bg-muted text-muted-foreground cursor-not-allowed"
                }
              `}
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
                  Processing...
                </>
              ) : (
                "Continue to Review →"
              )}
            </button>
          </div>
        </form>
      </div>

      {session ? (
        <div className="bg-accent/10 border border-accent rounded-lg p-4">
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
            <div>
              <p className="text-sm font-medium text-foreground">
                Signed in as {session.user?.name}
              </p>
              <p className="text-xs text-muted-foreground">
                Your information has been pre-filled from your account.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-muted/30 border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">
            💡{" "}
            <a href="/auth/login" className="text-primary hover:underline">
              Sign in
            </a>{" "}
            to save your information for faster booking next time.
          </p>
        </div>
      )}
    </div>
  );
}
