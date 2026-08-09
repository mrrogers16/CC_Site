import Link from "next/link";

export function ContactSection() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">
            Ready to Begin Your Healing Journey?
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Take the first step towards better mental health. We&apos;re here to
            support you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Call Us
            </h3>
            <p className="text-muted-foreground mb-2">
              Speak with our team directly
            </p>
            <p className="text-primary font-medium">(555) 123-4567</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Email Us
            </h3>
            <p className="text-muted-foreground mb-2">Get in touch via email</p>
            <p className="text-primary font-medium">info@healingpathways.com</p>
          </div>

          <div className="text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              Telehealth
            </h3>
            <p className="text-muted-foreground mb-2">Virtual sessions only</p>
            <p className="text-primary font-medium">
              Serving clients across Texas
            </p>
          </div>
        </div>

        <div className="text-center space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/book"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-colors duration-200"
            >
              Schedule Appointment
            </Link>

            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-8 py-4 text-lg font-medium text-primary border-2 border-primary rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors duration-200"
            >
              Send Message
            </Link>
          </div>

          <p className="text-sm text-muted-foreground">
            Hours: Monday - Friday, 9AM - 6PM | Emergency services available
            24/7
          </p>
        </div>
      </div>
    </section>
  );
}
