export interface NavItem {
  title: string;
  href: string;
  description?: string;
}

export interface SiteConfig {
  name: string;
  description: string;
  url: string;
  ogImage: string;
  links: {
    twitter?: string;
    facebook?: string;
    instagram?: string;
    linkedin?: string;
  };
}

export interface ContactInfo {
  email: string;
  phone: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  hours?: {
    [key: string]: string;
  };
}

export interface ServiceFeature {
  title: string;
  description: string;
  icon?: string;
}

export interface Testimonial {
  id: string;
  name: string;
  content: string;
  rating?: number;
  date?: Date;
}

export interface CalendarSlot {
  id: string;
  start: Date;
  end: Date;
  isAvailable: boolean;
  serviceId?: string;
}