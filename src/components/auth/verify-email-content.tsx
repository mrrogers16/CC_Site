"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { logger } from "@/lib/logger";

export function VerifyEmailContent() {
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<
    "pending" | "success" | "error"
  >("pending");
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = searchParams.get("email");
  const token = searchParams.get("token");

  const handleTokenVerification = useCallback(async () => {
    setIsVerifying(true);

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, token }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setVerificationStatus("success");
        logger.info("Email verification successful", { email });

        // Redirect to login after a brief delay
        setTimeout(() => {
          router.push("/auth/login?verified=true");
        }, 3000);
      } else {
        setVerificationStatus("error");
        logger.error(
          "Email verification failed",
          new Error(data.error || "Unknown error")
        );
      }
    } catch (error) {
      setVerificationStatus("error");
      logger.error(
        "Email verification error",
        error instanceof Error ? error : new Error(String(error))
      );
    } finally {
      setIsVerifying(false);
    }
  }, [token, email, router]);

  // Handle automatic verification if token is present
  useEffect(() => {
    if (token && email) {
      handleTokenVerification();
    }
  }, [token, email, handleTokenVerification]);

  const handleResendVerification = async () => {
    if (!email) {
      setResendMessage("No email address found. Please try registering again.");
      return;
    }

    setIsResending(true);
    setResendMessage(null);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        logger.info("Verification email resend successful", { email });
        setResendMessage("Verification email sent! Please check your inbox.");
      } else {
        logger.error(
          "Failed to resend verification email",
          new Error(data.error || "Unknown error")
        );
        setResendMessage(
          data.error ||
            "Failed to resend email. Please try again or contact support."
        );
      }
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

  // If we're verifying a token, show verification status
  if (token && email) {
    if (isVerifying) {
      return (
        <div className="max-w-2xl mx-auto">
          <div className="bg-card rounded-lg shadow-sm border border-border p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
            <h2 className="font-serif text-2xl font-light text-foreground mb-4">
              Verifying Your Email...
            </h2>
            <p className="text-muted-foreground">
              Please wait while we verify your email address.
            </p>
          </div>
        </div>
      );
    }

    if (verificationStatus === "success") {
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
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="font-serif text-2xl font-light text-foreground mb-4">
              Email Verified Successfully!
            </h2>
            <p className="text-muted-foreground mb-6">
              Your email has been verified. You can now sign in to your account.
              <br />
              Redirecting you to the login page...
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-green-800 text-sm">
                ✓ Account activated and ready to use
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (verificationStatus === "error") {
      return (
        <div className="max-w-2xl mx-auto">
          <div className="bg-card rounded-lg shadow-sm border border-border p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-8 h-8 text-red-600"
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
            </div>
            <h2 className="font-serif text-2xl font-light text-foreground mb-4">
              Verification Failed
            </h2>
            <p className="text-muted-foreground mb-6">
              The verification link is invalid or has expired. Please request a
              new verification email.
            </p>
            <div className="space-y-4">
              <button
                onClick={() => router.push("/auth/register")}
                className="bg-primary text-primary-foreground py-3 px-6 rounded-lg hover:bg-primary/90 transition-colors font-medium"
              >
                Create New Account
              </button>
              <p className="text-sm">
                <a href="/auth/login" className="text-primary hover:underline">
                  Back to Login
                </a>
              </p>
            </div>
          </div>
        </div>
      );
    }
  }

  // Default view: Show verification instructions
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
