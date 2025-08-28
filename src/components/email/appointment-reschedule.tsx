import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
  Row,
  Column,
} from "@react-email/components";

interface AppointmentRescheduleEmailProps {
  clientName: string;
  oldDateTime: string;
  newDateTime: string;
  service: string;
  duration: number;
  price: string;
  reason?: string;
}

export function AppointmentRescheduleEmail({
  clientName,
  oldDateTime,
  newDateTime,
  service,
  duration,
  price,
  reason,
}: AppointmentRescheduleEmailProps) {
  const formatDateTime = (dateTimeStr: string) => {
    const date = new Date(dateTimeStr);
    return {
      date: date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }),
    };
  };

  const oldFormatted = formatDateTime(oldDateTime);
  const newFormatted = formatDateTime(newDateTime);

  return (
    <Html>
      <Head />
      <Preview>
        Your appointment has been rescheduled - New date confirmed
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerTitle}>Healing Pathways Counseling</Heading>
            <Text style={headerSubtitle}>
              Professional Mental Health Services
            </Text>
          </Section>

          <Section style={content}>
            <Heading style={title}>Appointment Rescheduled</Heading>

            <Text style={greeting}>Dear {clientName},</Text>

            <Text style={paragraph}>
              We&apos;re writing to confirm that your appointment has been
              rescheduled. Please note your new appointment details below.
            </Text>

            {reason && (
              <Section style={reasonSection}>
                <Text style={reasonTitle}>Reason for rescheduling:</Text>
                <Text style={reasonText}>{reason}</Text>
              </Section>
            )}

            <Hr style={divider} />

            <Row>
              <Column style={columnHeader}>
                <Text style={sectionTitle}>Previous Appointment</Text>
              </Column>
              <Column style={columnHeader}>
                <Text style={sectionTitle}>New Appointment</Text>
              </Column>
            </Row>

            <Row style={appointmentRow}>
              <Column style={appointmentColumn}>
                <Section style={oldAppointment}>
                  <Text style={appointmentDate}>{oldFormatted.date}</Text>
                  <Text style={appointmentTime}>{oldFormatted.time}</Text>
                  <Text style={cancelledLabel}>CANCELLED</Text>
                </Section>
              </Column>
              <Column style={appointmentColumn}>
                <Section style={newAppointment}>
                  <Text style={appointmentDate}>{newFormatted.date}</Text>
                  <Text style={appointmentTime}>{newFormatted.time}</Text>
                  <Text style={confirmedLabel}>CONFIRMED</Text>
                </Section>
              </Column>
            </Row>

            <Hr style={divider} />

            <Section style={serviceDetails}>
              <Text style={sectionTitle}>Service Details</Text>
              <Row>
                <Column>
                  <Text style={detailLabel}>Service:</Text>
                  <Text style={detailValue}>{service}</Text>
                </Column>
                <Column>
                  <Text style={detailLabel}>Duration:</Text>
                  <Text style={detailValue}>{duration} minutes</Text>
                </Column>
              </Row>
              <Row>
                <Column>
                  <Text style={detailLabel}>Fee:</Text>
                  <Text style={detailValue}>${price}</Text>
                </Column>
              </Row>
            </Section>

            <Hr style={divider} />

            <Section style={locationSection}>
              <Text style={sectionTitle}>Location & Contact</Text>
              <Text style={locationText}>
                <strong>Healing Pathways Counseling</strong>
                <br />
                123 Wellness Way, Suite 200
                <br />
                Cityville, ST 12345
                <br />
                Phone: (555) 123-4567
              </Text>
            </Section>

            <Section style={importantNotes}>
              <Text style={sectionTitle}>Important Reminders</Text>
              <Text style={noteText}>
                • Please arrive 10-15 minutes early for your appointment
                <br />
                • Bring a valid ID and insurance card if applicable
                <br />
                • For cancellations or further rescheduling, please provide
                24-hour notice
                <br />• Contact us immediately if you need to make any changes
              </Text>
            </Section>

            <Text style={closingText}>
              We appreciate your understanding regarding this schedule change
              and look forward to supporting you on your wellness journey.
            </Text>

            <Text style={signature}>
              Warm regards,
              <br />
              <strong>The Healing Pathways Counseling Team</strong>
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              This is an automated message from Healing Pathways Counseling. If
              you have any questions, please call us at (555) 123-4567 or email
              contact@healingpathways.com.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: "#fefefe",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
};

const header = {
  backgroundColor: "#4a8b8c",
  padding: "24px 20px",
  textAlign: "center" as const,
};

const headerTitle = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0 0 8px 0",
};

const headerSubtitle = {
  color: "#b5d3d4",
  fontSize: "14px",
  margin: "0",
};

const content = {
  padding: "24px 20px",
};

const title = {
  color: "#2c2c2c",
  fontSize: "20px",
  fontWeight: "bold",
  margin: "0 0 20px 0",
  textAlign: "center" as const,
};

const greeting = {
  color: "#2c2c2c",
  fontSize: "16px",
  margin: "0 0 16px 0",
};

const paragraph = {
  color: "#525252",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 16px 0",
};

const reasonSection = {
  backgroundColor: "#f0f7f7",
  borderLeft: "4px solid #4a8b8c",
  padding: "12px 16px",
  margin: "16px 0",
};

const reasonTitle = {
  color: "#2c2c2c",
  fontSize: "14px",
  fontWeight: "bold",
  margin: "0 0 8px 0",
};

const reasonText = {
  color: "#525252",
  fontSize: "14px",
  margin: "0",
  fontStyle: "italic",
};

const divider = {
  borderColor: "#e0e0e0",
  margin: "20px 0",
};

const columnHeader = {
  width: "50%",
  paddingRight: "10px",
};

const sectionTitle = {
  color: "#2c2c2c",
  fontSize: "16px",
  fontWeight: "bold",
  margin: "0 0 12px 0",
};

const appointmentRow = {
  margin: "16px 0",
};

const appointmentColumn = {
  width: "50%",
  paddingRight: "10px",
};

const oldAppointment = {
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  padding: "16px",
  textAlign: "center" as const,
};

const newAppointment = {
  backgroundColor: "#f0fdf4",
  border: "1px solid #bbf7d0",
  borderRadius: "8px",
  padding: "16px",
  textAlign: "center" as const,
};

const appointmentDate = {
  color: "#2c2c2c",
  fontSize: "16px",
  fontWeight: "bold",
  margin: "0 0 4px 0",
};

const appointmentTime = {
  color: "#525252",
  fontSize: "14px",
  margin: "0 0 8px 0",
};

const cancelledLabel = {
  backgroundColor: "#dc2626",
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: "bold",
  padding: "4px 8px",
  borderRadius: "4px",
  margin: "0",
};

const confirmedLabel = {
  backgroundColor: "#16a34a",
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: "bold",
  padding: "4px 8px",
  borderRadius: "4px",
  margin: "0",
};

const serviceDetails = {
  margin: "20px 0",
};

const detailLabel = {
  color: "#6b7280",
  fontSize: "12px",
  margin: "0 0 4px 0",
  textTransform: "uppercase" as const,
  fontWeight: "bold",
};

const detailValue = {
  color: "#2c2c2c",
  fontSize: "14px",
  margin: "0 0 12px 0",
};

const locationSection = {
  margin: "20px 0",
};

const locationText = {
  color: "#525252",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0",
};

const importantNotes = {
  backgroundColor: "#fffbeb",
  border: "1px solid #fcd34d",
  borderRadius: "8px",
  padding: "16px",
  margin: "20px 0",
};

const noteText = {
  color: "#92400e",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0",
};

const closingText = {
  color: "#525252",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "20px 0 16px 0",
};

const signature = {
  color: "#2c2c2c",
  fontSize: "14px",
  margin: "0 0 24px 0",
};

const footer = {
  backgroundColor: "#f9fafb",
  padding: "16px 20px",
};

const footerText = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "1.4",
  margin: "0",
  textAlign: "center" as const,
};
