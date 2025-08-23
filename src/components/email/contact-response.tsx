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

interface ContactResponseEmailProps {
  name: string;
}

export function ContactResponseEmail({ name }: ContactResponseEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Heading style={headerTitle}>Healing Pathways Counseling</Heading>
          </Section>

          <Section style={content}>
            <Text style={greeting}>Dear {name},</Text>

            <Text style={paragraph}>
              Thank you for reaching out to Healing Pathways Counseling.
              We&apos;ve received your message and truly appreciate you taking
              this important step.
            </Text>

            <Text style={paragraph}>
              We understand that reaching out can take courage, and we want you
              to know that we&apos;re here to support you on your journey to
              better mental health and wellbeing.
            </Text>

            <Section style={responseInfo}>
              <Text style={responseTitle}>What happens next?</Text>
              <Text style={responseText}>
                &bull; We&apos;ll review your message carefully
                <br />
                &bull; A member of our team will respond within 24 hours during
                business days
                <br />
                &bull; We&apos;ll answer any questions and help you take the
                next steps
                <br />
                &bull; All communications are kept strictly confidential
              </Text>
            </Section>

            <Hr style={hr} />

            <Section style={contactInfo}>
              <Text style={contactTitle}>Need immediate support?</Text>
              <Text style={contactText}>
                If you&apos;re experiencing a crisis or need immediate support,
                please don&apos;t wait for our response:
              </Text>
              <Text style={contactText}>
                <strong>Call our office:</strong>{" "}
                <Link href="tel:+15551234567" style={link}>
                  (555) 123-4567
                </Link>
                <br />
                <strong>National Crisis Line:</strong>{" "}
                <Link href="tel:988" style={link}>
                  988
                </Link>
                <br />
                <strong>Crisis Text Line:</strong> Text HOME to 741741
                <br />
                <strong>Emergency:</strong> Call 911
              </Text>
            </Section>

            <Hr style={hr} />

            <Text style={paragraph}>
              We look forward to connecting with you soon and helping you on
              your path to healing.
            </Text>

            <Text style={signature}>
              Warm regards,
              <br />
              The Team at Healing Pathways Counseling
            </Text>
          </Section>

          <Section style={footer}>
            <Text style={footerTitle}>Healing Pathways Counseling</Text>
            <Text style={footerText}>
              123 Wellness Way, Suite 200
              <br />
              Your City, ST 12345
              <br />
              <Link href="tel:+15551234567" style={footerLink}>
                (555) 123-4567
              </Link>{" "}
              |
              <Link
                href="mailto:contact@healingpathways.com"
                style={footerLink}
              >
                {" "}
                contact@healingpathways.com
              </Link>
            </Text>
            <Text style={footerText}>
              <Link href={`${process.env.NEXTAUTH_URL}`} style={footerLink}>
                Visit our website
              </Link>
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
  padding: "32px 24px",
  textAlign: "center" as const,
};

const headerTitle = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "300",
  margin: "0",
  fontFamily: "Georgia, serif",
};

const content = {
  backgroundColor: "#ffffff",
  padding: "32px 24px",
  borderRadius: "0 0 8px 8px",
  border: "1px solid #e5e7eb",
};

const greeting = {
  color: "#2c2c2c",
  fontSize: "18px",
  margin: "0 0 20px 0",
};

const paragraph = {
  color: "#2c2c2c",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "0 0 16px 0",
};

const responseInfo = {
  backgroundColor: "#f0f7f7",
  border: "1px solid #b5d5d5",
  borderRadius: "6px",
  padding: "20px",
  margin: "24px 0",
};

const responseTitle = {
  color: "#2c2c2c",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 12px 0",
};

const responseText = {
  color: "#2c2c2c",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0",
};

const contactInfo = {
  backgroundColor: "#fef7f0",
  border: "1px solid #f3d5b7",
  borderRadius: "6px",
  padding: "20px",
  margin: "24px 0",
};

const contactTitle = {
  color: "#b45309",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 8px 0",
};

const contactText = {
  color: "#92400e",
  fontSize: "14px",
  lineHeight: "1.6",
  margin: "0 0 8px 0",
};

const link = {
  color: "#4a8b8c",
  textDecoration: "none",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "24px 0",
};

const signature = {
  color: "#2c2c2c",
  fontSize: "16px",
  lineHeight: "1.6",
  margin: "24px 0 0 0",
};

const footer = {
  backgroundColor: "#2c2c2c",
  borderRadius: "6px",
  padding: "24px",
  margin: "20px 0 0 0",
  textAlign: "center" as const,
};

const footerTitle = {
  color: "#ffffff",
  fontSize: "18px",
  fontWeight: "300",
  margin: "0 0 8px 0",
  fontFamily: "Georgia, serif",
};

const footerText = {
  color: "#d1d5db",
  fontSize: "12px",
  lineHeight: "1.5",
  margin: "4px 0",
};

const footerLink = {
  color: "#7a9e9f",
  textDecoration: "none",
};
