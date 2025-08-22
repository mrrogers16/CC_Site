import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          logger.warn("Login attempt without credentials");
          return null;
        }

        try {
          // For demo purposes, using simple admin credentials
          // In production, implement proper password hashing
          const adminEmail = "admin@healingpathways.com";
          const adminPassword = "admin123";

          if (credentials.email === adminEmail && credentials.password === adminPassword) {
            // Check if admin user exists in database, create if not
            let adminUser = await prisma.user.findUnique({
              where: { email: adminEmail }
            });

            if (!adminUser) {
              adminUser = await prisma.user.create({
                data: {
                  email: adminEmail,
                  name: "Admin User",
                  phone: null
                }
              });
              logger.info("Created admin user", { userId: adminUser.id });
            }

            logger.info("Admin login successful", { userId: adminUser.id });
            return {
              id: adminUser.id,
              email: adminUser.email,
              name: adminUser.name,
            };
          }

          logger.warn("Invalid login attempt", { email: credentials.email });
          return null;
        } catch (error) {
          logger.error("Auth error", error instanceof Error ? error : new Error(String(error)));
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/admin/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET!,
};