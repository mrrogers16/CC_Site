import { NextRequest, NextResponse } from "next/server";
import { AppError, handleError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { ZodError } from "zod";

export function withErrorHandler<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (error) {
      return handleApiError(error);
    }
  };
}

export function handleApiError(error: unknown): NextResponse {
  logger.error(
    "API Error occurred",
    error instanceof Error ? error : new Error(String(error))
  );

  if (error instanceof ZodError) {
    return NextResponse.json(
      {
        error: "Validation Error",
        message: "Invalid input data",
        details: error.issues,
      },
      { status: 400 }
    );
  }

  if (error instanceof AppError) {
    const response: { error: string; message: string; details?: unknown } = {
      error: error.constructor.name,
      message: error.message,
    };

    // Include details if the error has them (e.g., ValidationError)
    if ("details" in error && error.details) {
      response.details = error.details;
    }

    return NextResponse.json(response, { status: error.statusCode });
  }

  const appError = handleError(error);
  return NextResponse.json(
    {
      error: "Internal Server Error",
      message:
        process.env.NODE_ENV === "development"
          ? appError.message
          : "An unexpected error occurred",
    },
    { status: 500 }
  );
}

export async function logRequest(request: NextRequest): Promise<void> {
  const start = Date.now();
  const { method, url } = request;

  // You could add more sophisticated logging here
  logger.api(method, url, 0, Date.now() - start);
}
