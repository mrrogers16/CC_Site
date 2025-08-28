import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { withErrorHandler } from "@/lib/api/error-handler";
import { NotFoundError, UnauthorizedError } from "@/lib/errors";

export const GET = withErrorHandler(
  async (
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) => {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "ADMIN") {
      throw new UnauthorizedError("Admin access required");
    }

    const { id } = await params;

    // Check if appointment exists
    const appointment = await prisma.appointment.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!appointment) {
      throw new NotFoundError("Appointment");
    }

    // Get appointment history
    const history = await prisma.appointmentHistory.findMany({
      where: { appointmentId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        action: true,
        oldDateTime: true,
        newDateTime: true,
        oldStatus: true,
        newStatus: true,
        reason: true,
        adminName: true,
        createdAt: true,
      },
    });

    logger.info("Retrieved appointment history", {
      appointmentId: id,
      historyRecords: history.length,
      adminId: session.user.id,
    });

    return NextResponse.json({
      success: true,
      history: history.map(record => ({
        ...record,
        oldDateTime: record.oldDateTime?.toISOString(),
        newDateTime: record.newDateTime?.toISOString(),
        createdAt: record.createdAt.toISOString(),
      })),
    });
  }
);
