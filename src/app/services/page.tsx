// /app/services/page.tsx
import { Metadata } from "next";
import { Navigation } from "@/components/layout/navigation";
import { Footer } from "@/components/layout/footer";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Our Services | Healing Pathways Counseling",
  description:
    "Professional counseling services including individual therapy, couples counseling, and specialized mental health support tailored to your needs.",
};

// Fetch services from database
async function getServices() {
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { title: "asc" },
  });

  // Convert Decimal to number for the price and handle features
  return services.map(service => ({
    ...service,
    price: Number(service.price),
    features: (service.features as string[]) || [], // Cast the Json fieawld to string array
  }));
}

function ServiceCard({
  service,
}: {
  service: Awaited<ReturnType<typeof getServices>>[0];
}) {
  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-8 hover:shadow-md transition-shadow h-full flex flex-col">
      <div className="flex-grow">
        <h3 className="font-serif text-2xl font-light text-foreground mb-3">
          {service.title}
        </h3>
        <p className="text-muted-foreground mb-6 leading-relaxed">
          {service.description}
        </p>

        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Session Duration:</span>
            <span className="font-medium text-foreground">
              {service.duration} minutes
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Session Fee:</span>
            <span className="font-medium text-foreground">
              ${service.price}
            </span>
          </div>
        </div>

        {service.features && service.features.length > 0 && (
          <div className="border-t border-border pt-6">
            <h4 className="text-sm font-medium text-foreground mb-3">
              What&apos;s Included:
            </h4>
            <ul className="space-y-2">
              {service.features.map((feature, index) => (
                <li key={index} className="flex items-start">
                  <svg
                    className="w-5 h-5 text-primary mt-0.5 mr-2 flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-sm text-muted-foreground">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <button className="mt-6 w-full bg-primary text-white py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors font-medium">
        Book a Consultation
      </button>
    </div>
  );
}

export default async function ServicesPage() {
  // Get real services from database WITH features
  const services = await getServices();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        {/* Hero Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h1 className="font-serif text-4xl sm:text-5xl font-light text-foreground mb-6">
                Our Services
              </h1>
              <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
                We offer a comprehensive range of counseling services designed
                to support your mental health and wellbeing. Each service is
                tailored to meet your unique needs and goals, provided in a
                safe, confidential, and compassionate environment.
              </p>
            </div>
          </div>
        </section>

        {/* Services Grid */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {services.map(service => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          </div>
        </section>

        {/* Insurance Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-6">
              Insurance & Payment Options
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              We believe that quality mental health care should be accessible to
              everyone. We accept most major insurance plans and offer flexible
              payment options.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
              <div className="bg-card rounded-lg p-6 border border-border">
                <h3 className="font-medium text-foreground mb-3">
                  Accepted Insurance
                </h3>
                <p className="text-muted-foreground text-sm">
                  We accept most major insurance plans including Blue Cross Blue
                  Shield, Aetna, Cigna, and United Healthcare. Contact us to
                  verify your coverage.
                </p>
              </div>
              <div className="bg-card rounded-lg p-6 border border-border">
                <h3 className="font-medium text-foreground mb-3">
                  Self-Pay Options
                </h3>
                <p className="text-muted-foreground text-sm">
                  We offer competitive self-pay rates and sliding scale fees
                  based on financial need. Payment plans are available for
                  ongoing treatment.
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Please contact us to discuss your insurance coverage and payment
              options. We&apos;re here to help you access the care you need.
            </p>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-6">
              Ready to Begin Your Healing Journey?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Take the first step towards better mental health. Schedule a free
              15-minute consultation to discuss your needs and how we can help.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-primary text-white py-3 px-8 rounded-lg hover:bg-primary/90 transition-colors font-medium">
                Schedule Free Consultation
              </button>
              <button className="bg-white text-primary border-2 border-primary py-3 px-8 rounded-lg hover:bg-primary/5 transition-colors font-medium">
                Contact Us
              </button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
