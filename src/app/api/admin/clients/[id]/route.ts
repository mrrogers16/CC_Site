import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withErrorHandler } from "@/lib/api/error-handler";
import { logger } from "@/lib/logger";
import { AppError, NotFoundError } from "@/lib/errors";

export const GET = withErrorHandler(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  const session = await getServerSession(authOptions);
  
  if (!session?.user || session.user.role !== "ADMIN") {
    throw new AppError("Unauthorized access", 401);
  }

  const { id } = params;

  try {
    // Get comprehensive client information
    const client = await prisma.user.findUnique({
      where: {
        id,
        role: "CLIENT",
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        createdAt: true,
        emailVerified: true,
        emergencyContactName: true,
        emergencyContactPhone: true,
        emailNotifications: true,
        smsReminders: true,
        reminderTime: true,
        appointments: {
          select: {
            id: true,
            dateTime: true,
            status: true,
            notes: true,
            adminNotes: true,
            clientNotes: true,
            cancellationReason: true,
            reminderSent: true,
            confirmationSent: true,
            createdAt: true,
            updatedAt: true,
            service: {
              select: {
                id: true,
                title: true,
                duration: true,
                price: true,
              },
            },
            history: {
              select: {
                id: true,
                action: true,
                oldDateTime: true,
                newDateTime: true,
                oldStatus: true,
                newStatus: true,
                reason: true,
                adminId: true,
                adminName: true,
                createdAt: true,
              },
              orderBy: {
                createdAt: "desc",
              },
            },
          },
          orderBy: {
            dateTime: "desc",
          },
        },
        contactSubmissions: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            subject: true,
            message: true,
            isRead: true,
            createdAt: true,
            updatedAt: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        _count: {
          select: {
            appointments: {
              where: {
                status: {
                  not: "CANCELLED",
                },
              },
            },
            contactSubmissions: true,
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundError("Client");
    }

    // Calculate client statistics
    const now = new Date();
    const totalAppointments = client.appointments.length;
    const completedAppointments = client.appointments.filter(
      appt => appt.status === "COMPLETED"
    ).length;
    const cancelledAppointments = client.appointments.filter(
      appt => appt.status === "CANCELLED"
    ).length;
    const upcomingAppointments = client.appointments.filter(
      appt => appt.status !== "CANCELLED" && new Date(appt.dateTime) > now
    ).length;
    const lastAppointment = client.appointments.find(
      appt => appt.status === "COMPLETED"
    );

    // Calculate total spent (based on completed appointments)
    const totalSpent = client.appointments
      .filter(appt => appt.status === "COMPLETED")
      .reduce((sum, appt) => sum + Number(appt.service.price), 0);

    // Transform appointment history for timeline
    const appointmentHistory = client.appointments.flatMap(appointment =>
      appointment.history.map(historyItem => ({
        id: historyItem.id,
        type: "appointment_history",
        appointmentId: appointment.id,
        action: historyItem.action,
        oldDateTime: historyItem.oldDateTime,
        newDateTime: historyItem.newDateTime,
        oldStatus: historyItem.oldStatus,
        newStatus: historyItem.newStatus,
        reason: historyItem.reason,
        adminId: historyItem.adminId,
        adminName: historyItem.adminName,
        createdAt: historyItem.createdAt,
        serviceTitle: appointment.service.title,
        appointmentDateTime: appointment.dateTime,
      }))
    );

    // Combine contact submissions and appointment history for activity timeline
    const activityTimeline = [
      ...client.contactSubmissions.map(submission => ({
        id: submission.id,
        type: "contact_submission",
        subject: submission.subject,
        message: submission.message,
        isRead: submission.isRead,
        createdAt: submission.createdAt,
      })),
      ...appointmentHistory,
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Transform response data
    const clientData = {
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      createdAt: client.createdAt,
      emailVerified: client.emailVerified,
      emergencyContactName: client.emergencyContactName,
      emergencyContactPhone: client.emergencyContactPhone,
      emailNotifications: client.emailNotifications,
      smsReminders: client.smsReminders,
      reminderTime: client.reminderTime,
      
      // Statistics
      statistics: {
        totalAppointments,
        completedAppointments,
        cancelledAppointments,
        upcomingAppointments,
        totalContactSubmissions: client._count.contactSubmissions,
        totalSpent,
        lastAppointmentDate: lastAppointment?.dateTime || null,
      },
      
      // Recent appointments (last 10)
      recentAppointments: client.appointments.slice(0, 10).map(appointment => ({
        id: appointment.id,
        dateTime: appointment.dateTime,
        status: appointment.status,
        notes: appointment.notes,
        adminNotes: appointment.adminNotes,
        clientNotes: appointment.clientNotes,
        cancellationReason: appointment.cancellationReason,
        reminderSent: appointment.reminderSent,
        confirmationSent: appointment.confirmationSent,
        service: {
          id: appointment.service.id,
          title: appointment.service.title,
          duration: appointment.service.duration,
          price: Number(appointment.service.price),
        },
        createdAt: appointment.createdAt,
        updatedAt: appointment.updatedAt,
      })),
      
      // Contact submissions
      contactSubmissions: client.contactSubmissions,
      
      // Activity timeline (combined history)
      activityTimeline: activityTimeline.slice(0, 50), // Limit to recent 50 activities
    };

    logger.info("Admin accessed client details", {
      adminId: session.user.id,
      clientId: id,
      clientName: client.name,
    });

    return NextResponse.json({
      success: true,
      data: clientData,
    });
  } catch (error) {
    logger.error("Failed to fetch client details", error instanceof Error ? error : new Error("Unknown error"));
    throw error;
  }
});