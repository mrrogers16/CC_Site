import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withErrorHandler } from "@/lib/api/error-handler";

export const GET = withErrorHandler(async (request: NextRequest) => {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const serviceId = searchParams.get("serviceId");
  const clientId = searchParams.get("clientId");

  const where: {
    status?: string;
    dateTime?: { gte: Date; lte: Date };
    serviceId?: string;
    userId?: string;
  } = {};

  if (status && status !== "all") {
    where.status = status.toUpperCase();
  }

  if (startDate && endDate) {
    where.dateTime = {
      gte: new Date(startDate),
      lte: new Date(endDate),
    };
  }

  if (serviceId) {
    where.serviceId = serviceId;
  }

  if (clientId) {
    where.userId = clientId;
  }

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
      service: {
        select: {
          id: true,
          title: true,
          duration: true,
          price: true,
        },
      },
    },
    orderBy: {
      dateTime: "asc",
    },
  });

  return NextResponse.json({ success: true, appointments });
});
