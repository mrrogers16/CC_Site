import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { withErrorHandler } from "@/lib/api/error-handler";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { sendAdminResponse } from "@/lib/email";
import { z } from "zod";

// Schema for updating submission status
const updateSubmissionSchema = z.object({
  isRead: z.boolean()
});

// Schema for sending response
const responseSchema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters").max(200),
  message: z.string().min(10, "Message must be at least 10 characters").max(2000)
});

// PATCH: Mark submission as read/unread
export const PATCH = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const startTime = Date.now();
  const { id } = await params;
  
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      const duration = Date.now() - startTime;
      logger.api("PATCH", `/api/admin/contact/${id}`, 401, duration);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { isRead } = updateSubmissionSchema.parse(body);

    // Find and update the submission
    const submission = await prisma.contactSubmission.findUnique({
      where: { id }
    });

    if (!submission) {
      const duration = Date.now() - startTime;
      logger.api("PATCH", `/api/admin/contact/${id}`, 404, duration);
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    const updatedSubmission = await prisma.contactSubmission.update({
      where: { id },
      data: { isRead },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    logger.info("Contact submission status updated", {
      submissionId: id,
      isRead,
      adminUserId: session.user.id
    });

    const duration = Date.now() - startTime;
    logger.api("PATCH", `/api/admin/contact/${id}`, 200, duration);

    return NextResponse.json({
      success: true,
      data: updatedSubmission
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.api("PATCH", `/api/admin/contact/${id}`, 500, duration);
    throw error;
  }
});

// POST: Send response to contact submission
export const POST = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const startTime = Date.now();
  const { id } = await params;
  
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      const duration = Date.now() - startTime;
      logger.api("POST", `/api/admin/contact/${id}`, 401, duration);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { subject, message } = responseSchema.parse(body);

    // Find the submission
    const submission = await prisma.contactSubmission.findUnique({
      where: { id },
      include: {
        user: true
      }
    });

    if (!submission) {
      const duration = Date.now() - startTime;
      logger.api("POST", `/api/admin/contact/${id}`, 404, duration);
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    // Send the response email
    const emailResult = await sendAdminResponse(
      submission.email,
      subject,
      message,
      id
    );

    if (!emailResult.success) {
      logger.error("Failed to send admin response email", new Error(emailResult.error || "Unknown error"), { 
        submissionId: id,
        adminUserId: session.user.id
      });
      
      const duration = Date.now() - startTime;
      logger.api("POST", `/api/admin/contact/${id}`, 500, duration);
      
      return NextResponse.json({ 
        error: "Failed to send email response",
        details: emailResult.error
      }, { status: 500 });
    }

    // Mark submission as read
    await prisma.contactSubmission.update({
      where: { id },
      data: { isRead: true }
    });

    logger.info("Admin response sent successfully", {
      submissionId: id,
      to: submission.email,
      subject,
      adminUserId: session.user.id,
      messageId: emailResult.messageId
    });

    const duration = Date.now() - startTime;
    logger.api("POST", `/api/admin/contact/${id}`, 200, duration);

    return NextResponse.json({
      success: true,
      message: "Response sent successfully",
      emailSent: true,
      messageId: emailResult.messageId
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.api("POST", `/api/admin/contact/${id}`, 500, duration);
    throw error;
  }
});

// GET: Get specific submission details
export const GET = withErrorHandler(async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const startTime = Date.now();
  const { id } = await params;
  
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      const duration = Date.now() - startTime;
      logger.api("GET", `/api/admin/contact/${id}`, 401, duration);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the submission
    const submission = await prisma.contactSubmission.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    });

    if (!submission) {
      const duration = Date.now() - startTime;
      logger.api("GET", `/api/admin/contact/${id}`, 404, duration);
      return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    }

    logger.info("Contact submission retrieved", {
      submissionId: id,
      adminUserId: session.user.id
    });

    const duration = Date.now() - startTime;
    logger.api("GET", `/api/admin/contact/${id}`, 200, duration);

    return NextResponse.json({
      success: true,
      data: submission
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.api("GET", `/api/admin/contact/${id}`, 500, duration);
    throw error;
  }
});