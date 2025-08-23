import Link from "next/link";

const services = [
  {
    title: "Individual Therapy",
    description:
      "One-on-one sessions tailored to your personal growth and healing journey.",
    duration: "50 minutes",
    href: "/services/individual",
  },
  {
    title: "Couples Counseling",
    description:
      "Strengthen your relationship through improved communication and understanding.",
    duration: "50 minutes",
    href: "/services/couples",
  },
  {
    title: "Family Therapy",
    description:
      "Work together as a family to overcome challenges and build stronger bonds.",
    duration: "50 minutes",
    href: "/services/family",
  },
];

export function ServicesOverview() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-muted/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="font-serif text-3xl sm:text-4xl font-light text-foreground mb-4">
            Counseling Services
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprehensive mental health services designed to support you through
            life&apos;s challenges
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {services.map(service => (
            <div
              key={service.title}
              className="bg-card rounded-lg p-8 shadow-sm border border-border hover:shadow-md transition-shadow duration-200"
            >
              <h3 className="text-xl font-semibold text-foreground mb-4">
                {service.title}
              </h3>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                {service.description}
              </p>
              <p className="text-sm text-primary font-medium mb-6">
                Duration: {service.duration}
              </p>
              <Link
                href={service.href}
                className="inline-flex items-center text-primary hover:text-primary/80 font-medium"
              >
                Learn More
                <svg
                  className="w-4 h-4 ml-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Link
            href="/services"
            className="inline-flex items-center justify-center px-8 py-3 text-lg font-medium text-primary border-2 border-primary rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors duration-200"
          >
            View All Services
          </Link>
        </div>
      </div>
    </section>
  );
}
