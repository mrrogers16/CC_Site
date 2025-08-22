import { Metadata } from "next";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { EnhancedRegisterForm } from "@/components/forms/enhanced-register-form";

export const metadata: Metadata = {
  title: "Register | Healing Pathways Counseling",
  description: "Create your account to access our counseling services and book appointments with ease.",
};

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h1 className="font-serif text-4xl sm:text-5xl font-light text-foreground mb-6">
                Create Your Account
              </h1>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                Join our community and take the first step towards better mental health. 
                Create your account to access our services and schedule appointments.
              </p>
            </div>
          </div>
        </section>

        {/* Registration Form Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto" data-testid="register-container">
            <div className="bg-card rounded-lg shadow-sm border border-border p-8">
              <h2 className="font-serif text-2xl font-light text-foreground mb-6 text-center">
                Register
              </h2>
              <EnhancedRegisterForm />
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30" data-testid="benefits-section">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-12 text-center">
              Why Create an Account?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center" data-testid="benefit-card">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4M8 7h8M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2m-8 0V7" />
                  </svg>
                </div>
                <h3 className="font-medium text-foreground mb-2">Easy Booking</h3>
                <p className="text-muted-foreground text-sm">
                  Schedule appointments quickly and manage your sessions with our intuitive booking system.
                </p>
              </div>
              
              <div className="text-center" data-testid="benefit-card">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="font-medium text-foreground mb-2">Secure & Private</h3>
                <p className="text-muted-foreground text-sm">
                  Your information is protected with industry-standard security and privacy measures.
                </p>
              </div>
              
              <div className="text-center" data-testid="benefit-card">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="font-medium text-foreground mb-2">Personal Dashboard</h3>
                <p className="text-muted-foreground text-sm">
                  Access your appointment history, manage your profile, and track your wellness journey.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}