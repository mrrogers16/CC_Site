"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, type RegisterFormData } from "@/lib/validations/auth";
import { logger } from "@/lib/logger";
import { debounce } from "lodash-es";

interface EmailCheckResult {
  available: boolean;
  message: string;
}

interface FieldValidationState {
  isValid: boolean;
  isChecking?: boolean;
  message?: string;
}

export function EnhancedRegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [emailValidation, setEmailValidation] = useState<FieldValidationState>({ isValid: false });
  const [nameValidation, setNameValidation] = useState<FieldValidationState>({ isValid: false });
  const [passwordValidation, setPasswordValidation] = useState<FieldValidationState>({ isValid: false });
  const [confirmPasswordValidation, setConfirmPasswordValidation] = useState<FieldValidationState>({ isValid: false });
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields },
    watch,
    trigger,
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: "onChange",
  });

  const watchedValues = watch();

  // Debounced email availability check
  const checkEmailAvailability = useCallback(
    debounce(async (email: string) => {
      if (!email || errors.email) {
        setEmailValidation({ isValid: false });
        return;
      }

      setEmailValidation({ isValid: false, isChecking: true });

      try {
        const response = await fetch(`/api/auth/check-email?email=${encodeURIComponent(email)}`);
        const result: EmailCheckResult = await response.json();

        if (response.ok) {
          setEmailValidation({
            isValid: result.available,
            isChecking: false,
            message: result.message,
          });
        } else {
          setEmailValidation({
            isValid: false,
            isChecking: false,
            message: "Error checking email availability",
          });
        }
      } catch (error) {
        logger.error("Email availability check failed", error instanceof Error ? error : new Error(String(error)));
        setEmailValidation({
          isValid: false,
          isChecking: false,
          message: "Error checking email availability",
        });
      }
    }, 500),
    [errors.email]
  );

  // Real-time validation effects
  useEffect(() => {
    if (watchedValues.email) {
      checkEmailAvailability(watchedValues.email);
    } else {
      setEmailValidation({ isValid: false });
    }
  }, [watchedValues.email, checkEmailAvailability]);

  useEffect(() => {
    if (watchedValues.name && touchedFields.name) {
      setNameValidation({ isValid: !errors.name });
    }
  }, [watchedValues.name, touchedFields.name, errors.name]);

  useEffect(() => {
    if (watchedValues.password && touchedFields.password) {
      setPasswordValidation({ isValid: !errors.password });
    }
  }, [watchedValues.password, touchedFields.password, errors.password]);

  useEffect(() => {
    if (watchedValues.confirmPassword && touchedFields.confirmPassword) {
      setConfirmPasswordValidation({ isValid: !errors.confirmPassword });
    }
  }, [watchedValues.confirmPassword, touchedFields.confirmPassword, errors.confirmPassword]);

  const onSubmit = async (data: RegisterFormData) => {
    // Prevent submission if email is already taken
    if (!emailValidation.isValid && emailValidation.message === "Email address is already registered") {
      setSubmitError("Email address is already registered. Please use a different email or sign in.");
      return;
    }

    setIsLoading(true);
    setSubmitError(null);

    const payload = {
      name: data.name,
      email: data.email,
      password: data.password,
      confirmPassword: data.confirmPassword,
      phone: data.phone,
    };

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Registration failed");
      }

      logger.info("User registered successfully", { email: data.email });
      
      // Redirect to email verification page with email parameter
      router.push(`/auth/verify-email?email=${encodeURIComponent(data.email)}`);
      
    } catch (error) {
      logger.error("Registration error", error instanceof Error ? error : new Error(String(error)));
      setSubmitError(error instanceof Error ? error.message : "Registration failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signIn("google", { callbackUrl: "/" });
    } catch (error) {
      logger.error("Google sign-in error", error instanceof Error ? error : new Error(String(error)));
      setSubmitError("Google sign-in failed. Please try again.");
    }
  };

  const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
    if (!password) return { score: 0, label: "", color: "" };
    
    let score = 0;
    if (password.length >= 8) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[^a-zA-Z\d]/.test(password)) score++;

    if (score < 2) return { score, label: "Weak", color: "text-red-600" };
    if (score < 4) return { score, label: "Fair", color: "text-orange-600" };
    if (score < 5) return { score, label: "Good", color: "text-blue-600" };
    return { score, label: "Strong", color: "text-green-600" };
  };

  const passwordStrength = getPasswordStrength(watchedValues.password || "");

  const ValidationIcon = ({ isValid, isChecking }: { isValid: boolean; isChecking?: boolean }) => {
    if (isChecking) {
      return (
        <div className="w-5 h-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      );
    }
    
    if (isValid) {
      return (
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    }
    
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Google Sign-In Button */}
      <button
        type="button"
        onClick={handleGoogleSignIn}
        data-testid="google-signin"
        className="w-full flex items-center justify-center px-4 py-2 border border-border rounded-lg bg-white text-foreground hover:bg-muted/50 transition-colors"
      >
        <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
          <path
            fill="currentColor"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="currentColor"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="currentColor"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="currentColor"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Continue with Google
      </button>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-card text-muted-foreground">Or register with email</span>
        </div>
      </div>

      {submitError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4" data-testid="registration-error">
          <p className="text-red-800 text-sm">{submitError}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" role="form">
        {/* Name Field */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
            Full Name *
          </label>
          <div className="relative">
            <input
              {...register("name")}
              type="text"
              id="name"
              data-testid="name-input"
              autoComplete="name"
              className="w-full px-3 py-2 pr-10 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter your full name"
              onBlur={() => trigger("name")}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <ValidationIcon isValid={nameValidation.isValid && !!touchedFields.name} />
            </div>
          </div>
          {errors.name && (
            <p className="mt-1 text-sm text-red-600" data-testid="name-error" role="alert">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
            Email Address *
          </label>
          <div className="relative">
            <input
              {...register("email")}
              type="email"
              id="email"
              data-testid="email-input"
              inputMode="email"
              autoComplete="email"
              className="w-full px-3 py-2 pr-10 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter your email address"
              onBlur={() => trigger("email")}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <ValidationIcon 
                isValid={emailValidation.isValid && !errors.email && !!watchedValues.email} 
                isChecking={!!emailValidation.isChecking && !errors.email && !!watchedValues.email}
              />
            </div>
          </div>
          {errors.email && (
            <p className="mt-1 text-sm text-red-600" data-testid="email-error" role="alert">
              {errors.email.message}
            </p>
          )}
          {!errors.email && emailValidation.message && !!watchedValues.email && (
            <p 
              className={`mt-1 text-sm ${emailValidation.isValid ? 'text-green-600' : 'text-red-600'}`}
              data-testid="email-availability"
            >
              {emailValidation.message}
            </p>
          )}
        </div>

        {/* Phone Field */}
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-foreground mb-1">
            Phone Number (Optional)
          </label>
          <input
            {...register("phone")}
            type="tel"
            id="phone"
            data-testid="phone-input"
            inputMode="tel"
            autoComplete="tel"
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Enter your phone number"
          />
          {errors.phone && (
            <p className="mt-1 text-sm text-red-600" data-testid="phone-error" role="alert">
              {errors.phone.message}
            </p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
            Password *
          </label>
          <div className="relative">
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              id="password"
              data-testid="password-input"
              autoComplete="new-password"
              className="w-full px-3 py-2 pr-10 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Create a password"
              onFocus={() => setPasswordFocused(true)}
              onBlur={() => {
                setPasswordFocused(false);
                trigger("password");
              }}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center space-x-2">
              <ValidationIcon isValid={passwordValidation.isValid && !!touchedFields.password} />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                data-testid="password-toggle"
                className="text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {showPassword ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  )}
                </svg>
              </button>
            </div>
          </div>
          {errors.password && (
            <p className="mt-1 text-sm text-red-600" data-testid="password-error" role="alert">
              {errors.password.message}
            </p>
          )}
          
          {/* Password Requirements (show on focus or error) */}
          {(passwordFocused || errors.password) && (
            <div className="mt-2 p-3 bg-muted/30 rounded-lg" data-testid="password-requirements">
              <p className="text-sm font-medium text-foreground mb-2">Password Requirements:</p>
              <ul className="text-sm space-y-1">
                <li className={`flex items-center ${(watchedValues.password?.length >= 8) ? 'text-green-600' : 'text-muted-foreground'}`}>
                  <svg className="w-3 h-3 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  At least 8 characters
                </li>
                <li className={`flex items-center ${/[a-z]/.test(watchedValues.password || '') ? 'text-green-600' : 'text-muted-foreground'}`}>
                  <svg className="w-3 h-3 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  One lowercase letter
                </li>
                <li className={`flex items-center ${/[A-Z]/.test(watchedValues.password || '') ? 'text-green-600' : 'text-muted-foreground'}`}>
                  <svg className="w-3 h-3 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  One uppercase letter
                </li>
                <li className={`flex items-center ${/\d/.test(watchedValues.password || '') ? 'text-green-600' : 'text-muted-foreground'}`}>
                  <svg className="w-3 h-3 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  One number
                </li>
              </ul>
              {watchedValues.password && (
                <div className="mt-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm">Strength:</span>
                    <span className={`text-sm font-medium ${passwordStrength.color}`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
                    <div 
                      className={`h-1 rounded-full transition-all duration-300 ${
                        passwordStrength.score < 2 ? 'bg-red-500' :
                        passwordStrength.score < 4 ? 'bg-orange-500' :
                        passwordStrength.score < 5 ? 'bg-blue-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Confirm Password Field */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1">
            Confirm Password *
          </label>
          <div className="relative">
            <input
              {...register("confirmPassword")}
              type="password"
              id="confirmPassword"
              data-testid="confirm-password-input"
              autoComplete="new-password"
              className="w-full px-3 py-2 pr-10 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Confirm your password"
              onBlur={() => trigger("confirmPassword")}
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <ValidationIcon isValid={confirmPasswordValidation.isValid && !!touchedFields.confirmPassword} />
            </div>
          </div>
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-600" data-testid="confirm-password-error" role="alert">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          data-testid="register-submit"
          className="w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? "Creating Account..." : "Create Account"}
        </button>
      </form>

      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <a href="/auth/login" className="text-primary hover:underline font-medium" data-testid="login-link">
            Sign in here
          </a>
        </p>
      </div>
    </div>
  );
}