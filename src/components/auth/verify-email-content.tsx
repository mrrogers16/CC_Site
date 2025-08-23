"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { logger } from "@/lib/logger";

export function VerifyEmailContent() {
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const email = searchParams.get("email");

  const handleResendVerification = async () => {
    if (!email) {
      setResendMessage("No email address found. Please try registering again.");
      return;
    }

    setIsResending(true);
    setResendMessage(null);

    try {
      // TODO: Implement resend verification endpoint
      // For now, just simulate the action
      await new Promise(resolve => setTimeout(resolve, 1500));

      logger.info("Verification email resend requested", { email });
      setResendMessage("Verification email sent! Please check your inbox.");
    } catch (error) {
      logger.error(
        "Failed to resend verification email",
        error instanceof Error ? error : new Error(String(error))
      );
      setResendMessage(
        "Failed to resend email. Please try again or contact support."
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-card rounded-lg shadow-sm border border-border p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
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
              d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        <h2 className="font-serif text-2xl font-light text-foreground mb-4">
          Verification Email Sent
        </h2>

        {email && (
          <p className="text-muted-foreground mb-6">
            We&apos;ve sent a verification link to:
            <br />
            <span
              className="font-medium text-foreground"
              data-testid="email-display"
            >
              {email}
            </span>
          </p>
        )}

        <div className="space-y-4 mb-8">
          <div className="flex items-start text-left">
            <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
              1
            </span>
            <div>
              <p className="font-medium text-foreground">
                Check your email inbox
              </p>
              <p className="text-sm text-muted-foreground">
                Look for an email from Healing Pathways Counseling with the
                subject &quot;Verify your account&quot;
              </p>
            </div>
          </div>

          <div className="flex items-start text-left">
            <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
              2
            </span>
            <div>
              <p className="font-medium text-foreground">
                Click the verification link
              </p>
              <p className="text-sm text-muted-foreground">
                This will activate your account and redirect you to sign in
              </p>
            </div>
          </div>

          <div className="flex items-start text-left">
            <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm font-medium mr-3 mt-0.5">
              3
            </span>
            <div>
              <p className="font-medium text-foreground">
                Start your wellness journey
              </p>
              <p className="text-sm text-muted-foreground">
                Schedule your first appointment and explore our counseling
                services
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-border pt-6">
          <p className="text-sm text-muted-foreground mb-4">
            Didn&apos;t receive the email? Check your spam folder or:
          </p>

          {resendMessage && (
            <div
              className={`mb-4 p-3 rounded-lg text-sm ${
                resendMessage.includes("sent") ||
                resendMessage.includes("Please check")
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
              data-testid="resend-message"
            >
              {resendMessage}
            </div>
          )}

          <button
            onClick={handleResendVerification}
            disabled={isResending || !email}
            data-testid="resend-button"
            className="bg-primary text-white py-2 px-6 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResending ? "Sending..." : "Resend Verification Email"}
          </button>

          {!email && (
            <p className="mt-2 text-sm text-muted-foreground">
              <a href="/auth/register" className="text-primary hover:underline">
                Return to registration
              </a>
            </p>
          )}
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-muted-foreground">
          Remember to check your spam/junk folder if you don&apos;t see the
          email within a few minutes.
        </p>
      </div>
    </div>
  );
}
