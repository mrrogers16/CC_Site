import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/error-handler";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { serviceUpdateSchema } from "@/lib/validations";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { ValidationError, NotFoundError } from "@/lib/errors";

export const GET = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized", message: "Admin access required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const startTime = Date.now();

    try {
      logger.info("Admin fetching service details", {
        serviceId: id,
        adminId: session.user.id,
      });

      const service = await prisma.service.findUnique({
        where: { id },
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

      if (!service) {
        throw new NotFoundError("Service");
      }

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
        appointmentCount: service._count.appointments,
      };

      logger.info("Service details fetched successfully", {
        serviceId: id,
        queryTime: Date.now() - startTime,
        adminId: session.user.id,
      });

      return NextResponse.json({
        success: true,
        service: transformedService,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch service";

      logger.error("Error fetching service details", new Error(errorMessage), {
        serviceId: id,
        queryTime: Date.now() - startTime,
        adminId: session.user.id,
        error: error instanceof Error ? error.stack : String(error),
      });

      throw error;
    }
  }
);

export const PATCH = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized", message: "Admin access required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const startTime = Date.now();

    try {
      const body = await request.json();
      logger.info("Admin updating service", {
        serviceId: id,
        adminId: session.user.id,
        updateFields: Object.keys(body),
      });

      const validatedData = serviceUpdateSchema.parse(body);

      // First check if service exists
      const existingService = await prisma.service.findUnique({
        where: { id },
        select: { id: true, title: true },
      });

      if (!existingService) {
        throw new NotFoundError("Service");
      }

      const updatedService = await prisma.service.update({
        where: { id },
        data: {
          ...(validatedData.title && { title: validatedData.title }),
          ...(validatedData.description && {
            description: validatedData.description,
          }),
          ...(validatedData.duration && { duration: validatedData.duration }),
          ...(validatedData.price !== undefined && {
            price: validatedData.price,
          }),
          ...(validatedData.features !== undefined && {
            features: validatedData.features,
          }),
          ...(validatedData.isActive !== undefined && {
            isActive: validatedData.isActive,
          }),
          updatedAt: new Date(),
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

      const transformedService = {
        id: updatedService.id,
        title: updatedService.title,
        description: updatedService.description,
        duration: updatedService.duration,
        price: Number(updatedService.price),
        features: Array.isArray(updatedService.features)
          ? (updatedService.features as string[])
          : [],
        isActive: updatedService.isActive,
        createdAt: updatedService.createdAt,
        updatedAt: updatedService.updatedAt,
        appointmentCount: updatedService._count.appointments,
      };

      logger.info("Service updated successfully", {
        serviceId: id,
        title: updatedService.title,
        queryTime: Date.now() - startTime,
        adminId: session.user.id,
      });

      return NextResponse.json({
        success: true,
        message: "Service updated successfully",
        service: transformedService,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to update service";

      logger.error("Error updating service", new Error(errorMessage), {
        serviceId: id,
        queryTime: Date.now() - startTime,
        adminId: session.user.id,
        error: error instanceof Error ? error.stack : String(error),
      });

      throw error;
    }
  }
);

export const DELETE = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const session = await getServerSession(authOptions);

    if (!session || session.user?.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized", message: "Admin access required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const startTime = Date.now();

    try {
      logger.info("Admin attempting to delete service", {
        serviceId: id,
        adminId: session.user.id,
      });

      // Check if service exists and has appointments
      const service = await prisma.service.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          _count: {
            select: {
              appointments: true,
            },
          },
        },
      });

      if (!service) {
        throw new NotFoundError("Service");
      }

      // Prevent deletion if service has appointments
      if (service._count.appointments > 0) {
        throw new ValidationError(
          `Cannot delete service "${service.title}" because it has ${service._count.appointments} associated appointments. Deactivate the service instead.`
        );
      }

      await prisma.service.delete({
        where: { id },
      });

      logger.info("Service deleted successfully", {
        serviceId: id,
        title: service.title,
        queryTime: Date.now() - startTime,
        adminId: session.user.id,
      });

      return NextResponse.json({
        success: true,
        message: `Service "${service.title}" deleted successfully`,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete service";

      logger.error("Error deleting service", new Error(errorMessage), {
        serviceId: id,
        queryTime: Date.now() - startTime,
        adminId: session.user.id,
        error: error instanceof Error ? error.stack : String(error),
      });

      throw error;
    }
  }
);
