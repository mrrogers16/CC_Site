interface AppointmentConfirmationEmailProps {
  clientName: string;
  appointmentDetails: {
    id: string;
    service: string;
    dateTime: string;
    duration: number;
    price: string;
  };
}

export function AppointmentConfirmationEmail({
  clientName,
  appointmentDetails,
}: AppointmentConfirmationEmailProps) {
  const appointmentDate = new Date(appointmentDetails.dateTime);
  const formattedDate = appointmentDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = appointmentDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div
      style={{
        fontFamily: "Arial, sans-serif",
        margin: 0,
        padding: 0,
        backgroundColor: "#f9f9f9",
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          margin: "0 auto",
          backgroundColor: "#ffffff",
        }}
      >
        {/* Header */}
        <div
          style={{
            backgroundColor: "#4a8b8c",
            color: "white",
            padding: "30px 20px",
            textAlign: "center",
          }}
        >
          <h1
            style={{
              margin: 0,
              fontSize: "28px",
              fontWeight: 300,
              fontFamily: "Playfair Display, serif",
            }}
          >
            Healing Pathways Counseling
          </h1>
        </div>

        {/* Main Content */}
        <div style={{ padding: "40px 30px" }}>
          <h2
            style={{
              color: "#2c2c2c",
              fontSize: "24px",
              marginBottom: "20px",
              fontWeight: 300,
            }}
          >
            Appointment Confirmed, {clientName}!
          </h2>

          <p
            style={{
              color: "#555",
              lineHeight: 1.6,
              marginBottom: "30px",
              fontSize: "16px",
            }}
          >
            Thank you for scheduling your appointment with Healing Pathways
            Counseling. We&apos;re committed to supporting you on your journey to
            better mental health and well-being.
          </p>

          {/* Appointment Details Card */}
          <div
            style={{
              backgroundColor: "#f0f7f7",
              border: "1px solid #e0e9e9",
              borderRadius: "8px",
              padding: "25px",
              marginBottom: "30px",
            }}
          >
            <h3
              style={{
                color: "#4a8b8c",
                fontSize: "18px",
                fontWeight: 600,
                marginBottom: "15px",
                marginTop: 0,
              }}
            >
              Your Appointment Details
            </h3>

            <div style={{ color: "#333" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                  borderBottom: "1px solid #e0e9e9",
                  paddingBottom: "8px",
                }}
              >
                <span style={{ fontWeight: 600 }}>Service:</span>
                <span>{appointmentDetails.service}</span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                  borderBottom: "1px solid #e0e9e9",
                  paddingBottom: "8px",
                }}
              >
                <span style={{ fontWeight: 600 }}>Date:</span>
                <span>{formattedDate}</span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                  borderBottom: "1px solid #e0e9e9",
                  paddingBottom: "8px",
                }}
              >
                <span style={{ fontWeight: 600 }}>Time:</span>
                <span>{formattedTime}</span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "12px",
                  borderBottom: "1px solid #e0e9e9",
                  paddingBottom: "8px",
                }}
              >
                <span style={{ fontWeight: 600 }}>Duration:</span>
                <span>{appointmentDetails.duration} minutes</span>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0",
                }}
              >
                <span style={{ fontWeight: 600 }}>Session Fee:</span>
                <span style={{ fontWeight: 600, color: "#4a8b8c" }}>
                  ${appointmentDetails.price}
                </span>
              </div>
            </div>
          </div>

          {/* Location Information */}
          <div
            style={{
              backgroundColor: "#fff",
              border: "1px solid #e0e0e0",
              borderRadius: "8px",
              padding: "20px",
              marginBottom: "30px",
            }}
          >
            <h3
              style={{
                color: "#4a8b8c",
                fontSize: "18px",
                fontWeight: 600,
                marginBottom: "15px",
                marginTop: 0,
              }}
            >
              Office Location
            </h3>
            <div style={{ color: "#555", lineHeight: 1.6 }}>
              <p style={{ margin: "0 0 8px 0" }}>
                <strong>Healing Pathways Counseling</strong>
                <br />
                123 Wellness Way, Suite 200
                <br />
                Cityville, ST 12345
              </p>
              <p style={{ margin: "8px 0 0 0" }}>
                <strong>Phone:</strong> (555) 123-4567
                <br />
                <strong>Email:</strong> appointments@healingpathways.com
              </p>
            </div>
          </div>

          {/* What to Expect */}
          <div style={{ marginBottom: "30px" }}>
            <h3
              style={{
                color: "#4a8b8c",
                fontSize: "18px",
                fontWeight: 600,
                marginBottom: "15px",
              }}
            >
              What to Expect
            </h3>
            <div style={{ color: "#555", lineHeight: 1.6 }}>
              <div style={{ marginBottom: "12px" }}>
                <strong>For First-Time Clients:</strong>
                <ul style={{ marginTop: "5px", paddingLeft: "20px" }}>
                  <li>
                    Please arrive 10-15 minutes early to complete intake forms
                  </li>
                  <li>Bring a valid ID and insurance card (if applicable)</li>
                  <li>
                    We&apos;ll discuss your goals and create a personalized treatment
                    plan
                  </li>
                </ul>
              </div>
              <div>
                <strong>Parking:</strong> Free parking is available in our
                building lot
              </div>
            </div>
          </div>

          {/* Important Policies */}
          <div
            style={{
              backgroundColor: "#fef9e7",
              border: "1px solid #f7e98e",
              borderRadius: "8px",
              padding: "20px",
              marginBottom: "25px",
            }}
          >
            <h3
              style={{
                color: "#8b5a00",
                fontSize: "16px",
                fontWeight: 600,
                marginBottom: "12px",
                marginTop: 0,
              }}
            >
              Important Information
            </h3>
            <div
              style={{ color: "#8b5a00", fontSize: "14px", lineHeight: 1.5 }}
            >
              <p style={{ margin: "0 0 10px 0" }}>
                <strong>Cancellation Policy:</strong> Please provide 24-hour
                notice for cancellations to avoid fees.
              </p>
              <p style={{ margin: "0 0 10px 0" }}>
                <strong>Rescheduling:</strong> You can reschedule through your
                patient portal or by calling our office.
              </p>
              <p style={{ margin: "0" }}>
                <strong>Confirmation ID:</strong> {appointmentDetails.id}
              </p>
            </div>
          </div>
        </div>

        {/* Crisis Support Section */}
        <div
          style={{
            backgroundColor: "#f8f4f4",
            padding: "25px 30px",
            borderTop: "1px solid #e0e0e0",
          }}
        >
          <h3
            style={{
              color: "#8b0000",
              fontSize: "16px",
              fontWeight: 600,
              marginBottom: "12px",
              marginTop: 0,
            }}
          >
            Crisis Support Available 24/7
          </h3>
          <div style={{ color: "#555", fontSize: "14px", lineHeight: 1.5 }}>
            <p style={{ margin: "0 0 8px 0" }}>
              If you&apos;re experiencing a mental health crisis before your
              appointment:
            </p>
            <ul style={{ margin: "0", paddingLeft: "20px" }}>
              <li>
                <strong>National Crisis Lifeline:</strong> 988
              </li>
              <li>
                <strong>Crisis Text Line:</strong> Text HOME to 741741
              </li>
              <li>
                <strong>Emergency Services:</strong> Call 911
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            backgroundColor: "#2c2c2c",
            color: "white",
            padding: "20px 30px",
            textAlign: "center",
            fontSize: "12px",
          }}
        >
          <p style={{ margin: "0 0 10px 0" }}>
            We&apos;re here to support you on your journey to better mental health.
          </p>
          <p style={{ margin: "0" }}>
            Healing Pathways Counseling | Licensed Professional Counselor #12345
          </p>
        </div>
      </div>
    </div>
  );
}
