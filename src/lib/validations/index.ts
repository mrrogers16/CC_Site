import { z } from "zod";

export const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  subject: z.string().min(5, "Subject must be at least 5 characters").max(200),
  message: z.string().min(10, "Message must be at least 10 characters").max(1000),
});

export const appointmentSchema = z.object({
  userId: z.string(),
  serviceId: z.string(),
  dateTime: z.date(),
  notes: z.string().max(500).optional(),
});

export const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
});

export const serviceSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  description: z.string().min(20, "Description must be at least 20 characters"),
  duration: z.number().min(15, "Duration must be at least 15 minutes").max(480),
  price: z.number().min(0, "Price must be non-negative"),
  isActive: z.boolean().default(true),
});

export const blogPostSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters").max(200),
  slug: z.string().min(5, "Slug must be at least 5 characters").max(200),
  excerpt: z.string().max(300),
  content: z.string().min(100, "Content must be at least 100 characters"),
  isPublished: z.boolean().default(false),
  publishedAt: z.date().optional(),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;
export type AppointmentData = z.infer<typeof appointmentSchema>;
export type UserData = z.infer<typeof userSchema>;
export type ServiceData = z.infer<typeof serviceSchema>;
export type BlogPostData = z.infer<typeof blogPostSchema>;