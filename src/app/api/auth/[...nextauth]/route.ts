import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";
import { logger } from "@/lib/logger";

const handler = NextAuth(authOptions);

// Wrap handlers with error logging
const wrappedHandler = async (req: any, context: any) => {
  try {
    return await handler(req, context);
  } catch (error) {
    logger.error(
      "NextAuth handler error",
      error instanceof Error ? error : new Error(String(error))
    );

    // Return proper JSON error response
    return new Response(
      JSON.stringify({
        error: "Authentication error",
        message: "An error occurred during authentication",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};

export { wrappedHandler as GET, wrappedHandler as POST };
