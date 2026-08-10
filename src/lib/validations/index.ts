import { z } from "zod";

export const contactFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  subject: z.string().min(5, "Subject must be at least 5 characters").max(200),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(1000),
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
export type BlogPostData = z.infer<typeof blogPostSchema>;
