import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/error-handler";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { serviceSchema } from "@/lib/validations";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { NotFoundError } from "@/lib/errors";

export const GET = withErrorHandler(async () => {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Unauthorized", message: "Admin access required" },
      { status: 401 }
    );
  }

  const startTime = Date.now();

  try {
    logger.info("Admin fetching all services", {
      adminId: session.user.id,
      timestamp: new Date().toISOString(),
    });

    const services = await prisma.service.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        title: true,
        description: true,
        duration: true,
        price: true,
        features: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            appointments: true,
          },
        },
      },
    });

    const transformedServices = services.map(service => ({
      id: service.id,
      title: service.title,
      description: service.description,
      duration: service.duration,
      price: Number(service.price),
      features: Array.isArray(service.features)
        ? (service.features as string[])
        : [],
      isActive: service.isActive,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
      appointmentCount: service._count.appointments,
    }));

    logger.info("Admin services fetched successfully", {
      count: transformedServices.length,
      queryTime: Date.now() - startTime,
      adminId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      services: transformedServices,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch services";

    logger.error("Error fetching admin services", new Error(errorMessage), {
      queryTime: Date.now() - startTime,
      adminId: session.user.id,
      error: error instanceof Error ? error.stack : String(error),
    });

    throw new NotFoundError("Services data unavailable");
  }
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Unauthorized", message: "Admin access required" },
      { status: 401 }
    );
  }

  const startTime = Date.now();

  try {
    const body = await request.json();
    logger.info("Admin creating new service", {
      adminId: session.user.id,
      serviceData: {
        title: body.title,
        duration: body.duration,
        price: body.price,
      },
    });

    const validatedData = serviceSchema.parse(body);

    const service = await prisma.service.create({
      data: {
        title: validatedData.title,
        description: validatedData.description,
        duration: validatedData.duration,
        price: validatedData.price,
        features: validatedData.features || [],
        isActive: validatedData.isActive,
      },
    });

    const transformedService = {
      id: service.id,
      title: service.title,
      description: service.description,
      duration: service.duration,
      price: Number(service.price),
      features: Array.isArray(service.features)
        ? (service.features as string[])
        : [],
      isActive: service.isActive,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
      appointmentCount: 0,
    };

    logger.info("Service created successfully", {
      serviceId: service.id,
      title: service.title,
      queryTime: Date.now() - startTime,
      adminId: session.user.id,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Service created successfully",
        service: transformedService,
      },
      { status: 201 }
    );
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create service";

    logger.error("Error creating service", new Error(errorMessage), {
      queryTime: Date.now() - startTime,
      adminId: session.user.id,
      error: error instanceof Error ? error.stack : String(error),
    });

    throw error;
  }
});
