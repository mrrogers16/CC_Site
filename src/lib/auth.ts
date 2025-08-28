import { NextAuthOptions } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import EmailProvider from "next-auth/providers/email";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  providers: [
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST!,
        port: Number(process.env.EMAIL_SERVER_PORT!),
        auth: {
          user: process.env.EMAIL_SERVER_USER!,
          pass: process.env.EMAIL_SERVER_PASSWORD!,
        },
      },
      from: process.env.EMAIL_FROM!,
    }),
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          logger.warn("Login attempt without credentials");
          return null;
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user || !user.password) {
            logger.warn("Invalid login attempt - user not found", {
              email: credentials.email,
            });
            return null;
          }

          const passwordMatch = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!passwordMatch) {
            logger.warn("Invalid login attempt - wrong password", {
              email: credentials.email,
            });
            return null;
          }

          logger.info("User login successful", {
            userId: user.id,
            role: user.role,
          });
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            emailVerified: user.emailVerified,
          };
        } catch (error) {
          logger.error(
            "Auth error",
            error instanceof Error ? error : new Error(String(error))
          );
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60, // 24 hours
  },
  // Add proper CORS and response handling
  cookies: {
    sessionToken: {
      name: "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  pages: {
    signIn: "/auth/login",
    // Don't set signOut here - we'll handle role-based redirects in components
  },
  callbacks: {
    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.emailVerified = user.emailVerified;
      }

      // Handle Google OAuth user role assignment
      if (account?.provider === "google" && user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { role: "CLIENT" }, // Default role for OAuth users
        });
        token.role = "CLIENT";
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.emailVerified = token.emailVerified as Date | null;
      }
      return session;
    },
    async signIn({ user, account, profile: _profile }) {
      // Require email verification for credentials login
      if (account?.provider === "credentials") {
        if (!user.emailVerified) {
          logger.warn("Login blocked - email not verified", {
            email: user.email,
          });
          return false;
        }
      }
      return true;
    },
  },
  events: {
    async signIn({ user, account, isNewUser }) {
      logger.info("User signed in", {
        userId: user.id,
        provider: account?.provider,
        isNewUser,
      });
    },
    async signOut({ token, session }) {
      logger.info("User signed out", {
        userId: token?.id || session?.user?.id,
      });
    },
    async createUser({ user }) {
      logger.info("New user created", { userId: user.id, email: user.email });
    },
  },
  secret: process.env.NEXTAUTH_SECRET!,
  debug: process.env.NODE_ENV === "development",
  // Ensure proper JSON responses
  useSecureCookies: process.env.NODE_ENV === "production",
};
