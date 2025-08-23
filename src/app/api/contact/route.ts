import { NextRequest, NextResponse } from "next/server";
import { withErrorHandler } from "@/lib/api/error-handler";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { contactFormSchema } from "@/lib/validations";
import { sendContactNotification, sendAutoResponse } from "@/lib/email";

export const POST = withErrorHandler(async (request: NextRequest) => {
  const startTime = Date.now();

  try {
    const body = await request.json();
    const validatedData = contactFormSchema.parse(body);

    // Smart user creation/update logic
    let user = await prisma.user.findUnique({
      where: { email: validatedData.email },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: validatedData.email,
          name: validatedData.name,
          phone: validatedData.phone || null,
        },
      });
      logger.info("Created new user from contact form", {
        userId: user.id,
        email: user.email,
      });
    } else {
      // Update user info if name or phone changed
      const updateData: { name?: string; phone?: string | null } = {};
      if (user.name !== validatedData.name) {
        updateData.name = validatedData.name;
      }
      if (user.phone !== (validatedData.phone || null)) {
        updateData.phone = validatedData.phone || null;
      }

      if (Object.keys(updateData).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: updateData,
        });
        logger.info("Updated existing user from contact form", {
          userId: user.id,
          updates: Object.keys(updateData),
        });
      }
    }

    // Create contact submission
    const contactSubmission = await prisma.contactSubmission.create({
      data: {
        userId: user.id,
        name: validatedData.name,
        email: validatedData.email,
        phone: validatedData.phone || null,
        subject: validatedData.subject,
        message: validatedData.message,
        isRead: false,
      },
    });

    logger.info("Contact form submission saved", {
      submissionId: contactSubmission.id,
      userId: user.id,
      subject: validatedData.subject,
    });

    // Send email notifications (don't block the response if emails fail)
    Promise.all([
      sendContactNotification(validatedData, contactSubmission.id),
      sendAutoResponse(validatedData),
    ])
      .then(([notificationResult, autoResponseResult]) => {
        if (notificationResult.success) {
          logger.info("Contact notification email sent", {
            submissionId: contactSubmission.id,
            messageId: notificationResult.messageId,
          });
        } else {
          logger.error(
            "Failed to send contact notification",
            new Error(notificationResult.error || "Unknown error"),
            {
              submissionId: contactSubmission.id,
            }
          );
        }

        if (autoResponseResult.success) {
          logger.info("Auto-response email sent", {
            submissionId: contactSubmission.id,
            messageId: autoResponseResult.messageId,
          });
        } else {
          logger.error(
            "Failed to send auto-response",
            new Error(autoResponseResult.error || "Unknown error"),
            {
              submissionId: contactSubmission.id,
            }
          );
        }
      })
      .catch(error => {
        logger.error(
          "Email notification error",
          error instanceof Error ? error : new Error(String(error)),
          {
            submissionId: contactSubmission.id,
          }
        );
      });

    const duration = Date.now() - startTime;
    logger.api("POST", "/api/contact", 200, duration);

    return NextResponse.json({
      success: true,
      message:
        "Thank you for your message. We'll get back to you within 24 hours.",
      submissionId: contactSubmission.id,
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.api("POST", "/api/contact", 500, duration);
    throw error;
  }
});

export const GET = withErrorHandler(async (request: NextRequest) => {
  const startTime = Date.now();

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const isRead = searchParams.get("isRead");

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    if (isRead !== null) {
      where.isRead = isRead === "true";
    }

    // Get submissions with pagination
    const [submissions, total] = await Promise.all([
      prisma.contactSubmission.findMany({
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
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.contactSubmission.count({ where }),
    ]);

    const duration = Date.now() - startTime;
    logger.api("GET", "/api/contact", 200, duration);

    return NextResponse.json({
      success: true,
      data: {
        submissions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: skip + limit < total,
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.api("GET", "/api/contact", 500, duration);
    throw error;
  }
});
