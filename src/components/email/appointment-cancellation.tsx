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

interface AppointmentCancellationEmailProps {
  clientName: string;
  appointmentDateTime: string;
  service: string;
  duration: number;
  price: string;
  reason?: string;
  cancellationPolicy?: string;
}

export function AppointmentCancellationEmail({
  clientName,
  appointmentDateTime,
  service,
  duration,
  price,
  reason,
  cancellationPolicy,
}: AppointmentCancellationEmailProps) {
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

  const { date, time } = formatDateTime(appointmentDateTime);

  return (
    <Html>
      <Head />
      <Preview>Appointment Cancellation Confirmation - {service}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerTitle}>Healing Pathways Counseling</Heading>
            <Text style={headerSubtitle}>
              Professional Mental Health Services
            </Text>
          </Section>

          <Section style={content}>
            <Heading style={title}>Appointment Cancelled</Heading>

            <Text style={greeting}>Dear {clientName},</Text>

            <Text style={paragraph}>
              We&apos;re writing to confirm that your appointment has been
              cancelled. The details of the cancelled appointment are provided
              below.
            </Text>

            {reason && (
              <Section style={reasonSection}>
                <Text style={reasonTitle}>Cancellation reason:</Text>
                <Text style={reasonText}>{reason}</Text>
              </Section>
            )}

            <Hr style={divider} />

            <Section style={appointmentDetails}>
              <Text style={sectionTitle}>Cancelled Appointment Details</Text>
              <Section style={cancelledAppointment}>
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
                    <Text style={detailLabel}>Date:</Text>
                    <Text style={detailValue}>{date}</Text>
                  </Column>
                  <Column>
                    <Text style={detailLabel}>Time:</Text>
                    <Text style={detailValue}>{time}</Text>
                  </Column>
                </Row>
                <Row>
                  <Column>
                    <Text style={detailLabel}>Fee:</Text>
                    <Text style={detailValue}>${price}</Text>
                  </Column>
                  <Column>
                    <Text style={statusLabel}>CANCELLED</Text>
                  </Column>
                </Row>
              </Section>
            </Section>

            <Hr style={divider} />

            {cancellationPolicy && (
              <>
                <Section style={policySection}>
                  <Text style={sectionTitle}>Cancellation Policy</Text>
                  <Text style={policyText}>{cancellationPolicy}</Text>
                </Section>
                <Hr style={divider} />
              </>
            )}

            <Section style={nextStepsSection}>
              <Text style={sectionTitle}>What&apos;s Next?</Text>
              <Text style={nextStepsText}>
                <strong>Rescheduling:</strong> If you&apos;d like to reschedule
                this appointment, please call us at (555) 123-4567 or visit our
                website to book a new appointment.
                <br />
                <br />
                <strong>Billing:</strong> If this appointment was prepaid, we
                will process any applicable refund according to our cancellation
                policy within 3-5 business days.
                <br />
                <br />
                <strong>Questions:</strong> If you have any questions about this
                cancellation or need assistance with rescheduling, please
                don&apos;t hesitate to contact us.
              </Text>
            </Section>

            <Section style={supportSection}>
              <Text style={sectionTitle}>Support Resources</Text>
              <Text style={supportText}>
                If you&apos;re experiencing a mental health emergency or crisis,
                please don&apos;t wait for your next appointment:
              </Text>
              <Text style={emergencyText}>
                • <strong>Emergency:</strong> Call 911 or go to your nearest
                emergency room
                <br />• <strong>Crisis Line:</strong> National Suicide
                Prevention Lifeline: 988
                <br />• <strong>Crisis Text:</strong> Text HOME to 741741
                <br />• <strong>Our Office:</strong> (555) 123-4567 (during
                business hours)
              </Text>
            </Section>

            <Text style={closingText}>
              We understand that sometimes appointments need to be cancelled,
              and we&apos;re here to support you whenever you&apos;re ready to
              continue your wellness journey.
            </Text>

            <Text style={signature}>
              Warm regards,
              <br />
              <strong>The Healing Pathways Counseling Team</strong>
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              <strong>Healing Pathways Counseling</strong>
              <br />
              123 Wellness Way, Suite 200 | Cityville, ST 12345
              <br />
              Phone: (555) 123-4567 | Email: contact@healingpathways.com
              <br />
              <br />
              This is an automated message. If you have questions, please
              contact us directly.
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
  backgroundColor: "#fef2f2",
  borderLeft: "4px solid #dc2626",
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
  color: "#7f1d1d",
  fontSize: "14px",
  margin: "0",
  fontStyle: "italic",
};

const divider = {
  borderColor: "#e0e0e0",
  margin: "20px 0",
};

const sectionTitle = {
  color: "#2c2c2c",
  fontSize: "16px",
  fontWeight: "bold",
  margin: "0 0 12px 0",
};

const appointmentDetails = {
  margin: "20px 0",
};

const cancelledAppointment = {
  backgroundColor: "#fef2f2",
  border: "1px solid #fecaca",
  borderRadius: "8px",
  padding: "16px",
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

const statusLabel = {
  backgroundColor: "#dc2626",
  color: "#ffffff",
  fontSize: "12px",
  fontWeight: "bold",
  padding: "4px 8px",
  borderRadius: "4px",
  margin: "8px 0 0 0",
  display: "inline-block",
};

const policySection = {
  backgroundColor: "#fffbeb",
  border: "1px solid #fcd34d",
  borderRadius: "8px",
  padding: "16px",
  margin: "20px 0",
};

const policyText = {
  color: "#92400e",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0",
};

const nextStepsSection = {
  margin: "20px 0",
};

const nextStepsText = {
  color: "#525252",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0",
};

const supportSection = {
  backgroundColor: "#f0f7f7",
  border: "1px solid #4a8b8c",
  borderRadius: "8px",
  padding: "16px",
  margin: "20px 0",
};

const supportText = {
  color: "#2c2c2c",
  fontSize: "14px",
  lineHeight: "1.5",
  margin: "0 0 12px 0",
};

const emergencyText = {
  color: "#1f2937",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0",
  fontFamily: "monospace",
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
