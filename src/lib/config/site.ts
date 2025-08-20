import { SiteConfig } from "@/types";

export const siteConfig: SiteConfig = {
  name: "Healing Pathways Counseling",
  description: "Professional counseling services focused on your mental health and wellbeing. Compassionate, evidence-based therapy to help you navigate life's challenges.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ogImage: "/og-image.jpg",
  links: {
    twitter: "https://twitter.com/healingpathways",
    facebook: "https://facebook.com/healingpathwayscounseling", 
    instagram: "https://instagram.com/healingpathways",
    linkedin: "https://linkedin.com/company/healing-pathways-counseling",
  },
};