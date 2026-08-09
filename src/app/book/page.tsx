import { Metadata } from "next";
import Link from "next/link";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { bookingConfig } from "@/lib/config/booking";
import { siteConfig } from "@/lib/config/site";

export const metadata: Metadata = {
  title: `Book Appointment - ${siteConfig.name}`,
  description:
    "Schedule a virtual counseling session for clients located in Texas. Online scheduling through our secure practice platform.",
};

export default function BookingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-16">
        {bookingConfig.enabled && bookingConfig.url ? (
          <iframe
            src={bookingConfig.url}
            title="Book an appointment"
            className="w-full min-h-[80vh] border-0"
          />
        ) : (
          <div className="text-center">
            <h1 className="font-serif text-4xl font-semibold text-primary mb-6">
              Online Booking Coming Soon
            </h1>
            <p className="text-lg text-muted-foreground mb-8">
              We are setting up secure online scheduling for virtual sessions.
              In the meantime, please reach out through our contact page and we
              will help you find a time that works.
            </p>
            <Link
              href="/contact"
              className="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors duration-200 font-medium"
            >
              Contact Us
            </Link>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
