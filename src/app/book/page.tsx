import { Metadata } from "next";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import AppointmentBooking from "@/components/booking/appointment-booking";

export const metadata: Metadata = {
  title: "Book Appointment - Healing Pathways Counseling",
  description:
    "Schedule your appointment with our professional counseling services. Easy online booking with available time slots and instant confirmation.",
};

export default function BookingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <AppointmentBooking />
      </main>
      <Footer />
    </div>
  );
}
