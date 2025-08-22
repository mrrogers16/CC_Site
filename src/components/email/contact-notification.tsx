import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Heading,
  Hr,
  Link,
} from "@react-email/components";
import type { ContactFormData } from "@/lib/validations";

interface ContactNotificationEmailProps {
  contactData: ContactFormData;
  submissionId: string;
}

export function ContactNotificationEmail({
  contactData,
  submissionId,
}: ContactNotificationEmailProps) {
  const { name, email, phone, subject, message } = contactData;

  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerTitle}>New Contact Form Submission</Heading>
          </Section>

          <Section style={content}>
            <Text style={title}>Contact Details</Text>
            
            <Section style={infoSection}>
              <Text style={label}>Name:</Text>
              <Text style={value}>{name}</Text>
            </Section>

            <Section style={infoSection}>
              <Text style={label}>Email:</Text>
              <Text style={value}>
                <Link href={`mailto:${email}`} style={link}>
                  {email}
                </Link>
              </Text>
            </Section>

            {phone && (
              <Section style={infoSection}>
                <Text style={label}>Phone:</Text>
                <Text style={value}>
                  <Link href={`tel:${phone}`} style={link}>
                    {phone}
                  </Link>
                </Text>
              </Section>
            )}

            <Section style={infoSection}>
              <Text style={label}>Subject:</Text>
              <Text style={value}>{subject}</Text>
            </Section>

            <Hr style={hr} />

            <Text style={label}>Message:</Text>
            <Section style={messageBox}>
              <Text style={messageText}>{message}</Text>
            </Section>

            <Hr style={hr} />

            <Section style={actionSection}>
              <Text style={actionText}>
                <Link
                  href={`${process.env.NEXTAUTH_URL}/admin/contact`}
                  style={button}
                >
                  View in Admin Dashboard
                </Link>
              </Text>
              <Text style={submissionInfo}>
                Submission ID: {submissionId}
              </Text>
            </Section>
          </Section>

          <Section style={footer}>
            <Text style={footerText}>
              Healing Pathways Counseling Admin Notification
            </Text>
            <Text style={footerText}>
              This email was automatically generated from your website contact form.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: "Inter, -apple-system, BlinkMacSystemFont, sans-serif",
};

const container = {
  margin: "0 auto",
  padding: "20px 0 48px",
  maxWidth: "600px",
};

const header = {
  backgroundColor: "#4a8b8c",
  borderRadius: "8px 8px 0 0",
  padding: "24px",
  textAlign: "center" as const,
};

const headerTitle = {
  color: "#ffffff",
  fontSize: "24px",
  fontWeight: "600",
  margin: "0",
};

const content = {
  backgroundColor: "#ffffff",
  padding: "24px",
  borderRadius: "0 0 8px 8px",
  border: "1px solid #e5e7eb",
};

const title = {
  color: "#2c2c2c",
  fontSize: "18px",
  fontWeight: "600",
  margin: "0 0 16px 0",
};

const infoSection = {
  margin: "12px 0",
};

const label = {
  color: "#6b7280",
  fontSize: "14px",
  fontWeight: "500",
  margin: "0 0 4px 0",
};

const value = {
  color: "#2c2c2c",
  fontSize: "16px",
  margin: "0 0 12px 0",
};

const link = {
  color: "#4a8b8c",
  textDecoration: "none",
};

const messageBox = {
  backgroundColor: "#f8f8f8",
  border: "1px solid #e5e7eb",
  borderRadius: "6px",
  padding: "16px",
  margin: "8px 0 16px 0",
};

const messageText = {
  color: "#2c2c2c",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0",
  whiteSpace: "pre-wrap" as const,
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "20px 0",
};

const actionSection = {
  textAlign: "center" as const,
  margin: "24px 0",
};

const button = {
  backgroundColor: "#4a8b8c",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "500",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const actionText = {
  margin: "0 0 8px 0",
};

const submissionInfo = {
  color: "#6b7280",
  fontSize: "12px",
  margin: "8px 0 0 0",
};

const footer = {
  backgroundColor: "#f8f8f8",
  borderRadius: "6px",
  padding: "16px",
  margin: "20px 0 0 0",
  textAlign: "center" as const,
};

const footerText = {
  color: "#6b7280",
  fontSize: "12px",
  margin: "4px 0",
};