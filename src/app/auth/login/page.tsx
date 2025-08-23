import { Metadata } from "next";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { LoginForm } from "@/components/forms/login-form";

export const metadata: Metadata = {
  title: "Login | Healing Pathways Counseling",
  description:
    "Sign in to your account to access your appointments and manage your wellness journey.",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h1 className="font-serif text-4xl sm:text-5xl font-light text-foreground mb-6">
                Welcome Back
              </h1>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Sign in to your account to access your appointments, manage your
                profile, and continue your journey towards better mental health.
              </p>
            </div>
          </div>
        </section>

        {/* Login Form Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto">
            <div className="bg-card rounded-lg shadow-sm border border-border p-8">
              <h2 className="font-serif text-2xl font-light text-foreground mb-6 text-center">
                Sign In
              </h2>
              <LoginForm />
            </div>
          </div>
        </section>

        {/* Support Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-6">
              Need Help?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              If you&apos;re having trouble accessing your account or need
              assistance, we&apos;re here to help. Our team is available during
              business hours.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-card rounded-lg p-6 border border-border">
                <h3 className="font-medium text-foreground mb-3">
                  Contact Support
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Reach out to our support team for account-related issues or
                  technical difficulties.
                </p>
                <p className="text-primary font-medium">(555) 123-4567</p>
                <p className="text-primary font-medium">
                  support@healingpathways.com
                </p>
              </div>
              <div className="bg-card rounded-lg p-6 border border-border">
                <h3 className="font-medium text-foreground mb-3">
                  Office Hours
                </h3>
                <div className="text-muted-foreground text-sm space-y-1">
                  <p>Monday - Thursday: 9:00 AM - 7:00 PM</p>
                  <p>Friday: 9:00 AM - 5:00 PM</p>
                  <p>Saturday: 10:00 AM - 2:00 PM</p>
                  <p>Sunday: Closed</p>
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
