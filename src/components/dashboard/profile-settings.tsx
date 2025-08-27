"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Profile validation schema
const profileSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must be less than 100 characters"),
  phone: z
    .string()
    .optional()
    .refine(val => {
      if (!val || val.trim() === "") return true;
      // Remove all non-digits
      const cleaned = val.replace(/\D/g, "");
      // Check if it's 10 digits (US phone number)
      return cleaned.length === 10;
    }, "Please enter a valid 10-digit phone number"),
  emergencyContactName: z.string().optional(),
  emergencyContactPhone: z
    .string()
    .optional()
    .refine(val => {
      if (!val || val.trim() === "") return true;
      const cleaned = val.replace(/\D/g, "");
      return cleaned.length === 10;
    }, "Please enter a valid 10-digit phone number"),
  communicationPreferences: z.object({
    emailNotifications: z.boolean(),
    smsReminders: z.boolean(),
    reminderTime: z.enum(["24", "2", "1", "0.5"]),
  }),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface ProfileSettingsProps {
  className?: string;
}

export function ProfileSettings({}: ProfileSettingsProps) {
  const { data: session, update: updateSession } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      phone: "",
      emergencyContactName: "",
      emergencyContactPhone: "",
      communicationPreferences: {
        emailNotifications: true,
        smsReminders: false,
        reminderTime: "24",
      },
    },
  });

  const watchedPhone = watch("phone");
  const _watchedEmergencyPhone = watch("emergencyContactPhone");

  // Load user profile data
  useEffect(() => {
    const loadProfile = async () => {
      if (!session?.user?.id) {
        setIsLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/user/profile");
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            reset({
              name: data.data.name || session.user.name || "",
              phone: data.data.phone || "",
              emergencyContactName: data.data.emergencyContactName || "",
              emergencyContactPhone: data.data.emergencyContactPhone || "",
              communicationPreferences: {
                emailNotifications: data.data.emailNotifications ?? true,
                smsReminders: data.data.smsReminders ?? false,
                reminderTime: data.data.reminderTime || "24",
              },
            });
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [session?.user?.id, session?.user?.name, reset]);

  const formatPhoneNumber = (value: string) => {
    // Remove all non-digits
    const cleaned = value.replace(/\D/g, "");

    // Format as (XXX) XXX-XXXX
    if (cleaned.length >= 6) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6, 10)}`;
    } else if (cleaned.length >= 3) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3)}`;
    }
    return cleaned;
  };

  const onSubmit = async (data: ProfileFormData) => {
    try {
      setIsSaving(true);
      setSaveSuccess(false);
      setSaveError(null);

      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setSaveSuccess(true);
          // Update session if name changed
          if (data.name !== session?.user?.name) {
            await updateSession({ name: data.name });
          }
          // Reset form dirty state
          reset(data);
          setTimeout(() => setSaveSuccess(false), 3000);
        } else {
          throw new Error(result.message || "Failed to update profile");
        }
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      setSaveError(
        error instanceof Error
          ? error.message
          : "Failed to update profile. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-2">
            Profile Settings
          </h1>
          <p className="text-lg text-muted-foreground">
            Manage your personal information and preferences
          </p>
        </div>

        <div className="space-y-6 max-w-2xl">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-muted rounded w-1/4 animate-pulse" />
              <div className="h-10 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-2">
          Profile Settings
        </h1>
        <p className="text-lg text-muted-foreground">
          Manage your personal information and preferences
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">
        {/* Personal Information */}
        <div className="space-y-6">
          <h2 className="font-serif text-xl font-light text-foreground border-b border-border pb-2">
            Personal Information
          </h2>

          {/* Name */}
          <div className="space-y-2">
            <label
              htmlFor="name"
              className="block text-sm font-medium text-foreground"
            >
              Full Name *
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              {...register("name")}
              className="block w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter your full name"
            />
            {errors.name && (
              <p className="text-sm text-red-600" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-foreground"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={session?.user?.email || ""}
              disabled
              className="block w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">
              Email address cannot be changed. Contact support if you need to
              update your email.
            </p>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-foreground"
            >
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              {...register("phone")}
              onChange={e => {
                const formatted = formatPhoneNumber(e.target.value);
                e.target.value = formatted;
                register("phone").onChange(e);
              }}
              className="block w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="(555) 123-4567"
            />
            {errors.phone && (
              <p className="text-sm text-red-600" role="alert">
                {errors.phone.message}
              </p>
            )}
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="space-y-6">
          <h2 className="font-serif text-xl font-light text-foreground border-b border-border pb-2">
            Emergency Contact
          </h2>

          {/* Emergency Contact Name */}
          <div className="space-y-2">
            <label
              htmlFor="emergencyContactName"
              className="block text-sm font-medium text-foreground"
            >
              Emergency Contact Name
            </label>
            <input
              id="emergencyContactName"
              type="text"
              {...register("emergencyContactName")}
              className="block w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter emergency contact name"
            />
          </div>

          {/* Emergency Contact Phone */}
          <div className="space-y-2">
            <label
              htmlFor="emergencyContactPhone"
              className="block text-sm font-medium text-foreground"
            >
              Emergency Contact Phone
            </label>
            <input
              id="emergencyContactPhone"
              type="tel"
              {...register("emergencyContactPhone")}
              onChange={e => {
                const formatted = formatPhoneNumber(e.target.value);
                e.target.value = formatted;
                register("emergencyContactPhone").onChange(e);
              }}
              className="block w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="(555) 123-4567"
            />
            {errors.emergencyContactPhone && (
              <p className="text-sm text-red-600" role="alert">
                {errors.emergencyContactPhone.message}
              </p>
            )}
          </div>
        </div>

        {/* Communication Preferences */}
        <div className="space-y-6">
          <h2 className="font-serif text-xl font-light text-foreground border-b border-border pb-2">
            Communication Preferences
          </h2>

          {/* Email Notifications */}
          <div className="flex items-start space-x-3">
            <input
              id="emailNotifications"
              type="checkbox"
              {...register("communicationPreferences.emailNotifications")}
              className="mt-1 h-4 w-4 text-primary focus:ring-primary border-border rounded"
            />
            <div className="space-y-1">
              <label
                htmlFor="emailNotifications"
                className="text-sm font-medium text-foreground"
              >
                Email Notifications
              </label>
              <p className="text-xs text-muted-foreground">
                Receive appointment confirmations, reminders, and updates via
                email
              </p>
            </div>
          </div>

          {/* SMS Reminders */}
          <div className="flex items-start space-x-3">
            <input
              id="smsReminders"
              type="checkbox"
              {...register("communicationPreferences.smsReminders")}
              disabled={!watchedPhone}
              className="mt-1 h-4 w-4 text-primary focus:ring-primary border-border rounded disabled:opacity-50"
            />
            <div className="space-y-1">
              <label
                htmlFor="smsReminders"
                className="text-sm font-medium text-foreground"
              >
                SMS Reminders
              </label>
              <p className="text-xs text-muted-foreground">
                {watchedPhone
                  ? "Receive appointment reminders via text message"
                  : "Add a phone number to enable SMS reminders"}
              </p>
            </div>
          </div>

          {/* Reminder Timing */}
          <div className="space-y-2">
            <label
              htmlFor="reminderTime"
              className="block text-sm font-medium text-foreground"
            >
              Reminder Timing
            </label>
            <select
              id="reminderTime"
              {...register("communicationPreferences.reminderTime")}
              className="block w-full px-3 py-2 border border-border rounded-lg bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="24">24 hours before</option>
              <option value="2">2 hours before</option>
              <option value="1">1 hour before</option>
              <option value="0.5">30 minutes before</option>
            </select>
          </div>
        </div>

        {/* Save Button */}
        <div className="pt-6 border-t border-border">
          <div className="flex items-center justify-between">
            <div>
              {saveSuccess && (
                <div className="flex items-center space-x-2 text-green-600">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm">Profile updated successfully!</span>
                </div>
              )}
              {saveError && (
                <div className="flex items-center space-x-2 text-red-600">
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm">{saveError}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!isDirty || isSaving}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isSaving ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4"
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
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
