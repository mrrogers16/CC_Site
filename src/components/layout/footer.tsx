import Link from "next/link";
import { siteConfig } from "@/lib/config/site";

const footerLinks = {
  services: [
    { title: "Individual Therapy", href: "/services/individual" },
    { title: "Couples Counseling", href: "/services/couples" },
    { title: "Family Therapy", href: "/services/family" },
    { title: "Group Therapy", href: "/services/group" },
  ],
  resources: [
    { title: "About", href: "/about" },
    { title: "Blog", href: "/blog" },
    { title: "FAQ", href: "/faq" },
    { title: "Privacy Policy", href: "/privacy" },
  ],
  contact: [
    { title: "Schedule Appointment", href: "/book" },
    { title: "Contact Us", href: "/contact" },
    { title: "Location", href: "/location" },
    { title: "Emergency Resources", href: "/emergency" },
  ],
};

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-muted border-t border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <Link href="/" className="inline-block mb-4">
              <span className="font-serif text-2xl font-semibold text-primary">
                {siteConfig.name}
              </span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              Professional counseling services focused on your mental health and
              wellbeing.
            </p>
            <div className="flex space-x-4">
              {/* Social links would go here */}
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Services</h3>
            <ul className="space-y-2">
              {footerLinks.services.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Resources</h3>
            <ul className="space-y-2">
              {footerLinks.resources.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-foreground mb-4">Contact</h3>
            <ul className="space-y-2">
              {footerLinks.contact.map(link => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-muted-foreground hover:text-primary transition-colors duration-200 text-sm"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 text-sm text-muted-foreground">
              <p>Phone: (555) 123-4567</p>
              <p>Email: info@healingpathways.com</p>
            </div>
          </div>
        </div>

        <div className="border-t border-border mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-muted-foreground text-sm">
              © {currentYear} {siteConfig.name}. All rights reserved.
            </p>
            <p className="text-muted-foreground text-sm mt-4 md:mt-0">
              Licensed Professional Counselor • LPC #12345
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
