import { Metadata } from "next";
import { Suspense } from "react";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { VerifyEmailContent } from "@/components/auth/verify-email-content";

export const metadata: Metadata = {
  title: "Verify Your Email | Healing Pathways Counseling",
  description: "Please check your email and click the verification link to complete your account setup.",
};

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h1 className="font-serif text-4xl sm:text-5xl font-light text-foreground mb-6">
                Check Your Email
              </h1>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                We've sent you a verification link to complete your account setup. 
                Please check your email and click the link to verify your account.
              </p>
            </div>
          </div>
        </section>

        {/* Verification Instructions Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <Suspense fallback={<div>Loading...</div>}>
              <VerifyEmailContent />
            </Suspense>
          </div>
        </section>

        {/* Support Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-12 text-center">
              Need Help?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-card rounded-lg p-6 border border-border" data-testid="support-card">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="font-medium text-foreground mb-3">Didn't Receive the Email?</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Check your spam/junk folder. Sometimes verification emails can end up there. 
                  Also verify you entered the correct email address.
                </p>
                <ul className="text-muted-foreground text-sm space-y-1">
                  <li>• Check your spam/junk folder</li>
                  <li>• Verify the email address you provided</li>
                  <li>• Wait a few minutes for delivery</li>
                  <li>• Try requesting a new verification email</li>
                </ul>
              </div>
              
              <div className="bg-card rounded-lg p-6 border border-border" data-testid="support-card">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 109.75 9.75A9.75 9.75 0 0012 2.25z" />
                  </svg>
                </div>
                <h3 className="font-medium text-foreground mb-3">Still Having Issues?</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Our support team is here to help you get started with your counseling journey.
                </p>
                <div className="space-y-2">
                  <p className="text-primary font-medium text-sm">(555) 123-4567</p>
                  <p className="text-primary font-medium text-sm">support@healingpathways.com</p>
                  <p className="text-muted-foreground text-sm">
                    Available Monday-Friday, 9 AM - 6 PM
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-12 text-center">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="font-serif text-xl font-light text-blue-900 mb-3">
                  What Happens After Verification?
                </h3>
                <div className="text-blue-800 text-sm space-y-2">
                  <p>✓ Your account will be fully activated</p>
                  <p>✓ You can schedule appointments with our counselors</p>
                  <p>✓ Access your personal dashboard and session history</p>
                  <p>✓ Receive appointment reminders and updates</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}