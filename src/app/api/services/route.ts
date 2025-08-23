import { NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/error-handler";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { NotFoundError } from "@/lib/errors";

export const GET = withErrorHandler(async () => {
  const startTime = Date.now();

  try {
    logger.info("Fetching services for booking system", {
      timestamp: new Date().toISOString(),
    });

    const services = await prisma.service.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
        title: true,
        description: true,
        duration: true,
        price: true,
        features: true,
        isActive: true,
      },
    });

    if (services.length === 0) {
      logger.warn("No active services found", {
        queryTime: Date.now() - startTime,
      });
    }

    // Transform the data to match frontend expectations
    const transformedServices = services.map(service => ({
      id: service.id,
      title: service.title,
      description: service.description,
      duration: service.duration,
      price: Number(service.price), // Convert Decimal to number for frontend
      features: Array.isArray(service.features)
        ? (service.features as string[])
        : [], // Ensure features is array
      isActive: service.isActive,
    }));

    logger.info("Services fetched successfully", {
      count: transformedServices.length,
      queryTime: Date.now() - startTime,
    });

    return NextResponse.json(
      {
        success: true,
        services: transformedServices,
      },
      { status: 200 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch services";

    logger.error("Error fetching services", new Error(errorMessage), {
      queryTime: Date.now() - startTime,
      error: error instanceof Error ? error.stack : String(error),
    });

    // Don't expose internal database errors to client
    if (errorMessage.includes("database") || errorMessage.includes("prisma")) {
      throw new NotFoundError("Services currently unavailable");
    }

    throw error;
  }
});
