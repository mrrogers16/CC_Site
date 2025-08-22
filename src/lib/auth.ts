import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
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
          const user = await prisma.user.findUnique({
            where: { email: credentials.email }
          });

          if (!user || !user.password) {
            logger.warn("Invalid login attempt - user not found", { email: credentials.email });
            return null;
          }

          const passwordMatch = await bcrypt.compare(credentials.password, user.password);
          
          if (!passwordMatch) {
            logger.warn("Invalid login attempt - wrong password", { email: credentials.email });
            return null;
          }

          logger.info("User login successful", { userId: user.id, role: user.role });
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            emailVerified: user.emailVerified,
          };
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
    signIn: "/auth/login",
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
          data: { role: "CLIENT" } // Default role for OAuth users
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
          logger.warn("Login blocked - email not verified", { email: user.email });
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
        isNewUser 
      });
    },
    async createUser({ user }) {
      logger.info("New user created", { userId: user.id, email: user.email });
    },
  },
  secret: process.env.NEXTAUTH_SECRET!,
};