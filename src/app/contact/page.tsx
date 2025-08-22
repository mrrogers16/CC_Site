import { Metadata } from "next";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { ContactForm } from "@/components/forms/contact-form";

export const metadata: Metadata = {
  title: "Contact Us | Healing Pathways Counseling",
  description: "Get in touch with our professional counseling team. We're here to answer your questions and help you start your journey to better mental health.",
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h1 className="font-serif text-4xl sm:text-5xl font-light text-foreground mb-6">
                Contact Us
              </h1>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                We're here to support you on your journey to better mental health. 
                Reach out to us with any questions about our services or to schedule your first appointment.
              </p>
            </div>
          </div>
        </section>

        {/* Contact Form Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              {/* Contact Information */}
              <div>
                <h2 className="font-serif text-3xl font-light text-foreground mb-8">
                  Get in Touch
                </h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-foreground mb-2">Office Hours</h3>
                    <div className="text-muted-foreground">
                      <p>Monday - Thursday: 9:00 AM - 7:00 PM</p>
                      <p>Friday: 9:00 AM - 5:00 PM</p>
                      <p>Saturday: 10:00 AM - 2:00 PM</p>
                      <p>Sunday: Closed</p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-foreground mb-2">Contact Information</h3>
                    <div className="text-muted-foreground space-y-2">
                      <p className="flex items-center">
                        <svg className="w-5 h-5 mr-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        (555) 123-4567
                      </p>
                      <p className="flex items-center">
                        <svg className="w-5 h-5 mr-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        contact@healingpathways.com
                      </p>
                      <p className="flex items-start">
                        <svg className="w-5 h-5 mr-3 mt-0.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        123 Wellness Way<br />
                        Suite 200<br />
                        Your City, ST 12345
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium text-foreground mb-2">Response Times</h3>
                    <div className="text-muted-foreground">
                      <p>We typically respond to messages within 24 hours during business days.</p>
                      <p className="mt-2">For urgent matters, please call our office directly.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Form */}
              <div>
                <h2 className="font-serif text-3xl font-light text-foreground mb-8">
                  Send Us a Message
                </h2>
                <ContactForm />
              </div>
            </div>
          </div>
        </section>

        {/* Crisis Support Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-4xl mx-auto">
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-8">
              <h2 className="font-serif text-2xl font-light text-orange-900 mb-4">
                Crisis Support Resources
              </h2>
              <p className="text-orange-800 mb-6">
                If you're experiencing a mental health crisis or having thoughts of self-harm, 
                please reach out for immediate support. You don't have to face this alone.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-orange-900 mb-2">24/7 Crisis Hotlines</h3>
                  <div className="text-orange-800 space-y-1">
                    <p>National Suicide Prevention Lifeline:</p>
                    <p className="font-medium">988</p>
                    <p className="mt-2">Crisis Text Line:</p>
                    <p className="font-medium">Text HOME to 741741</p>
                  </div>
                </div>
                <div>
                  <h3 className="font-medium text-orange-900 mb-2">Emergency Services</h3>
                  <div className="text-orange-800 space-y-1">
                    <p>Local Emergency: <span className="font-medium">911</span></p>
                    <p>Nearest Emergency Room</p>
                    <p>Mobile Crisis Team: <span className="font-medium">(555) 999-HELP</span></p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-12 text-center">
              Frequently Asked Questions
            </h2>
            <div className="space-y-8">
              <div>
                <h3 className="font-medium text-foreground mb-3">
                  How do I schedule my first appointment?
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  You can schedule your first appointment by calling our office, using our online contact form, 
                  or emailing us directly. We'll start with a brief phone consultation to understand your needs 
                  and match you with the right therapist.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-foreground mb-3">
                  Do you accept insurance?
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Yes, we accept most major insurance plans. We'll verify your coverage and explain your benefits 
                  before your first appointment. We also offer competitive self-pay rates and sliding scale fees 
                  based on financial need.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-foreground mb-3">
                  What should I expect in my first session?
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Your first session will focus on getting to know you and understanding your concerns. 
                  We'll discuss your goals for therapy, review your history, and begin developing a treatment plan 
                  tailored to your specific needs.
                </p>
              </div>
              
              <div>
                <h3 className="font-medium text-foreground mb-3">
                  Is therapy confidential?
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  Yes, everything you share in therapy is confidential. We follow strict professional guidelines 
                  to protect your privacy. The only exceptions are situations involving imminent danger to yourself 
                  or others, which we'll discuss with you during your first session.
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