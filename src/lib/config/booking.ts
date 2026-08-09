import { BookingConfig } from "@/types";

// NOTE: All booking runs on PracticeQ (see MIGRATION.md). Until the PracticeQ
// account is configured, `enabled` stays false and /book renders a
// "Booking coming soon" state. Set `url` to the PracticeQ booking page URL
// to activate the embed.
export const bookingConfig: BookingConfig = {
  enabled: false,
  url: "",
};
