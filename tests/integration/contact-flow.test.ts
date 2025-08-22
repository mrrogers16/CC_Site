import { NextRequest } from 'next/server';
import { POST as ContactPost } from '@/app/api/contact/route';
import { POST as AdminResponse, PATCH as AdminUpdate } from '@/app/api/admin/contact/[id]/route';
import { getServerSession } from 'next-auth/next';

// Mock dependencies
jest.mock('@/lib/db');
jest.mock('@/lib/logger');
jest.mock('@/lib/email');
jest.mock('next-auth/next');

import { prisma } from '@/lib/db';
import { logger } from '@/lib/logger';
import { sendContactNotification, sendAutoResponse, sendAdminResponse } from '@/lib/email';

describe('Contact System Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default logger mocks
    (logger.info as jest.Mock).mockImplementation(() => {});
    (logger.error as jest.Mock).mockImplementation(() => {});
    (logger.api as jest.Mock).mockImplementation(() => {});
  });

  describe('Complete Contact Submission Flow', () => {
    it('handles end-to-end contact submission for new user', async () => {
      const contactData = {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-123-4567',
        subject: 'Seeking counseling services',
        message: 'I would like to schedule an appointment for therapy.',
      };

      const mockUser = {
        id: 'user-123',
        email: 'john@example.com',
        name: 'John Doe',
        phone: '555-123-4567',
      };

      const mockSubmission = {
        id: 'submission-123',
        userId: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        phone: '555-123-4567',
        subject: 'Seeking counseling services',
        message: 'I would like to schedule an appointment for therapy.',
        isRead: false,
        createdAt: new Date(),
      };

      // Mock database operations
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue(mockUser);
      (prisma.contactSubmission.create as jest.Mock).mockResolvedValue(mockSubmission);

      // Mock email operations
      (sendContactNotification as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'notification-123',
      });
      (sendAutoResponse as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'autoresponse-123',
      });

      // Submit contact form
      const request = new NextRequest('http://localhost:3000/api/contact', {
        method: 'POST',
        body: JSON.stringify(contactData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await ContactPost(request);
      const responseData = await response.json();

      // Verify response
      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.submissionId).toBe('submission-123');

      // Verify database operations
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'john@example.com' },
      });
      expect(prisma.user.create).toHaveBeenCalledWith({
        data: {
          email: 'john@example.com',
          name: 'John Doe',
          phone: '555-123-4567',
        },
      });
      expect(prisma.contactSubmission.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-123-4567',
          subject: 'Seeking counseling services',
          message: 'I would like to schedule an appointment for therapy.',
          isRead: false,
        },
      });

      // Verify logging
      expect(logger.info).toHaveBeenCalledWith(
        'Created new user from contact form',
        { userId: 'user-123', email: 'john@example.com' }
      );
      expect(logger.info).toHaveBeenCalledWith(
        'Contact form submission saved',
        {
          submissionId: 'submission-123',
          userId: 'user-123',
          subject: 'Seeking counseling services',
        }
      );
    });

    it('handles contact submission for existing user with updates', async () => {
      const contactData = {
        name: 'John Doe Updated',
        email: 'john@example.com',
        phone: '555-999-8888',
        subject: 'Follow-up question',
        message: 'I have a follow-up question about our last session.',
      };

      const existingUser = {
        id: 'user-123',
        email: 'john@example.com',
        name: 'John Doe',
        phone: '555-123-4567',
      };

      const updatedUser = {
        ...existingUser,
        name: 'John Doe Updated',
        phone: '555-999-8888',
      };

      const mockSubmission = {
        id: 'submission-456',
        userId: 'user-123',
        ...contactData,
        isRead: false,
        createdAt: new Date(),
      };

      // Mock database operations
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(existingUser);
      (prisma.user.update as jest.Mock).mockResolvedValue(updatedUser);
      (prisma.contactSubmission.create as jest.Mock).mockResolvedValue(mockSubmission);

      // Mock email operations
      (sendContactNotification as jest.Mock).mockResolvedValue({ success: true });
      (sendAutoResponse as jest.Mock).mockResolvedValue({ success: true });

      const request = new NextRequest('http://localhost:3000/api/contact', {
        method: 'POST',
        body: JSON.stringify(contactData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await ContactPost(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);

      // Verify user was updated
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: {
          name: 'John Doe Updated',
          phone: '555-999-8888',
        },
      });

      expect(logger.info).toHaveBeenCalledWith(
        'Updated existing user from contact form',
        {
          userId: 'user-123',
          updates: ['name', 'phone'],
        }
      );
    });
  });

  describe('Admin Response Flow', () => {
    const mockSession = {
      user: { id: 'admin-123', email: 'admin@healingpathways.com' },
    };

    beforeEach(() => {
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);
    });

    it('marks submission as read and sends response', async () => {
      const submissionId = 'submission-123';
      const responseData = {
        subject: 'Re: Seeking counseling services',
        message: 'Thank you for reaching out. I would be happy to schedule an appointment with you.',
      };

      const mockSubmission = {
        id: submissionId,
        email: 'john@example.com',
        name: 'John Doe',
        subject: 'Seeking counseling services',
        message: 'I would like to schedule an appointment.',
        isRead: false,
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
        },
      };

      // Mock database operations
      (prisma.contactSubmission.findUnique as jest.Mock).mockResolvedValue(mockSubmission);
      (prisma.contactSubmission.update as jest.Mock).mockResolvedValue({
        ...mockSubmission,
        isRead: true,
      });

      // Mock email operation
      (sendAdminResponse as jest.Mock).mockResolvedValue({
        success: true,
        messageId: 'admin-response-123',
      });

      // Send admin response
      const request = new NextRequest(`http://localhost:3000/api/admin/contact/${submissionId}`, {
        method: 'POST',
        body: JSON.stringify(responseData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await AdminResponse(request, { params: { id: submissionId } });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.emailSent).toBe(true);

      // Verify email was sent
      expect(sendAdminResponse).toHaveBeenCalledWith(
        'john@example.com',
        'Re: Seeking counseling services',
        'Thank you for reaching out. I would be happy to schedule an appointment with you.',
        submissionId
      );

      // Verify submission marked as read
      expect(prisma.contactSubmission.update).toHaveBeenCalledWith({
        where: { id: submissionId },
        data: { isRead: true },
      });

      // Verify logging
      expect(logger.info).toHaveBeenCalledWith(
        'Admin response sent successfully',
        {
          submissionId,
          to: 'john@example.com',
          subject: 'Re: Seeking counseling services',
          adminUserId: 'admin-123',
          messageId: 'admin-response-123',
        }
      );
    });

    it('updates submission read status', async () => {
      const submissionId = 'submission-123';
      const mockSubmission = {
        id: submissionId,
        isRead: false,
      };

      const updatedSubmission = {
        id: submissionId,
        isRead: true,
        user: {
          id: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
          phone: null,
        },
      };

      (prisma.contactSubmission.findUnique as jest.Mock).mockResolvedValue(mockSubmission);
      (prisma.contactSubmission.update as jest.Mock).mockResolvedValue(updatedSubmission);

      const request = new NextRequest(`http://localhost:3000/api/admin/contact/${submissionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ isRead: true }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await AdminUpdate(request, { params: { id: submissionId } });
      const result = await response.json();

      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.data.isRead).toBe(true);

      expect(prisma.contactSubmission.update).toHaveBeenCalledWith({
        where: { id: submissionId },
        data: { isRead: true },
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
      });
    });

    it('requires authentication for admin operations', async () => {
      (getServerSession as jest.Mock).mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/admin/contact/test-id', {
        method: 'PATCH',
        body: JSON.stringify({ isRead: true }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await AdminUpdate(request, { params: { id: 'test-id' } });
      const result = await response.json();

      expect(response.status).toBe(401);
      expect(result.error).toBe('Unauthorized');
    });
  });

  describe('Error Handling', () => {
    it('handles email sending failures gracefully in contact submission', async () => {
      const contactData = {
        name: 'John Doe',
        email: 'john@example.com',
        subject: 'Test Subject',
        message: 'Test message',
      };

      const mockUser = { id: 'user-123', email: 'john@example.com', name: 'John Doe' };
      const mockSubmission = { id: 'submission-123', userId: 'user-123' };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (prisma.contactSubmission.create as jest.Mock).mockResolvedValue(mockSubmission);
      
      // Mock email failures
      (sendContactNotification as jest.Mock).mockResolvedValue({
        success: false,
        error: 'SMTP Error',
      });
      (sendAutoResponse as jest.Mock).mockResolvedValue({
        success: false,
        error: 'SMTP Error',
      });

      const request = new NextRequest('http://localhost:3000/api/contact', {
        method: 'POST',
        body: JSON.stringify(contactData),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await ContactPost(request);
      const result = await response.json();

      // Should still succeed even if emails fail
      expect(response.status).toBe(200);
      expect(result.success).toBe(true);
      expect(result.submissionId).toBe('submission-123');

      // Verify database operations still completed
      expect(prisma.contactSubmission.create).toHaveBeenCalled();
    });

    it('handles admin response email failure', async () => {
      const mockSession = {
        user: { id: 'admin-123', email: 'admin@healingpathways.com' },
      };
      (getServerSession as jest.Mock).mockResolvedValue(mockSession);

      const submissionId = 'submission-123';
      const mockSubmission = {
        id: submissionId,
        email: 'john@example.com',
        user: { id: 'user-123' },
      };

      (prisma.contactSubmission.findUnique as jest.Mock).mockResolvedValue(mockSubmission);
      (sendAdminResponse as jest.Mock).mockResolvedValue({
        success: false,
        error: 'Email sending failed',
      });

      const request = new NextRequest(`http://localhost:3000/api/admin/contact/${submissionId}`, {
        method: 'POST',
        body: JSON.stringify({
          subject: 'Test Subject',
          message: 'Test message',
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await AdminResponse(request, { params: { id: submissionId } });
      const result = await response.json();

      expect(response.status).toBe(500);
      expect(result.error).toBe('Failed to send email response');
      expect(result.details).toBe('Email sending failed');
    });
  });
});