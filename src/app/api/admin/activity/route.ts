import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { withErrorHandler } from "@/lib/api/error-handler";

interface ActivityItem {
  id: string;
  type: "appointment" | "contact" | "user";
  title: string;
  description: string;
  timestamp: string;
  href?: string;
}

export const GET = withErrorHandler(async (_request: NextRequest) => {
  const session = await getServerSession(authOptions);

  if (!session || session.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const activities: ActivityItem[] = [];

  // Get recent appointments
  const recentAppointments = await prisma.appointment.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
    include: {
      user: true,
      service: true,
    },
  });

  recentAppointments.forEach(appointment => {
    activities.push({
      id: `appointment-${appointment.id}`,
      type: "appointment",
      title: `New appointment: ${appointment.service.title}`,
      description: `${appointment.user.name} scheduled ${appointment.service.title}`,
      timestamp: appointment.createdAt.toISOString(),
      href: `/admin/appointments?id=${appointment.id}`,
    });
  });

  // Get recent contact submissions
  const recentContacts = await prisma.contactSubmission.findMany({
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  recentContacts.forEach(contact => {
    activities.push({
      id: `contact-${contact.id}`,
      type: "contact",
      title: `New contact: ${contact.subject}`,
      description: `${contact.name} sent a message`,
      timestamp: contact.createdAt.toISOString(),
      href: `/admin/communications`,
    });
  });

  // Get recent user registrations
  const recentUsers = await prisma.user.findMany({
    where: { role: "CLIENT" },
    take: 10,
    orderBy: { createdAt: "desc" },
  });

  recentUsers.forEach(user => {
    activities.push({
      id: `user-${user.id}`,
      type: "user",
      title: `New client registration`,
      description: `${user.name} joined as a new client`,
      timestamp: user.createdAt.toISOString(),
      href: `/admin/clients?id=${user.id}`,
    });
  });

  // Sort all activities by timestamp and take the most recent 20
  const sortedActivities = activities
    .sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
    .slice(0, 20);

  return NextResponse.json({ success: true, activities: sortedActivities });
});
