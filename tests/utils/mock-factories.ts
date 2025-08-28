import type {
  Service,
  Appointment,
  User,
  AppointmentStatus,
  UserRole,
} from "@/generated/prisma";
import { Decimal } from "@/generated/prisma/runtime/library";

/**
 * Complete mock data factories for Prisma models
 * Following CLAUDE.md TypeScript strict mode patterns
 */

export const createMockService = (overrides?: Partial<Service>): Service => ({
  id: `service-${Date.now()}`,
  createdAt: new Date("2025-08-23T10:00:00Z"),
  updatedAt: new Date("2025-08-23T10:00:00Z"),
  title: "Individual Counseling",
  description: "One-on-one therapy sessions with personalized care",
  duration: 60,
  price: new Decimal("120.00"),
  features: [
    "Personalized care",
    "Evidence-based treatment",
    "Confidential sessions",
  ],
  isActive: true,
  ...overrides,
});

export const createMockAppointment = (
  overrides?: Partial<Appointment>
): Appointment => ({
  id: `appointment-${Date.now()}`,
  createdAt: new Date("2025-08-23T10:00:00Z"),
  updatedAt: new Date("2025-08-23T10:00:00Z"),
  userId: "user-123",
  serviceId: "service-123",
  dateTime: new Date("2025-08-25T10:00:00Z"),
  status: "PENDING" as AppointmentStatus,
  notes: null,
  adminNotes: null,
  clientNotes: null,
  cancellationReason: null,
  reminderSent: null,
  confirmationSent: null,
  ...overrides,
});

export const createMockUser = (overrides?: Partial<User>): User => ({
  id: `user-${Date.now()}`,
  email: "test@example.com",
  name: "Test User",
  phone: "+1234567890",
  password: null,
  emailVerified: null,
  image: null,
  role: "CLIENT" as UserRole,
  emergencyContactName: null,
  emergencyContactPhone: null,
  emailNotifications: true,
  smsReminders: false,
  reminderTime: "24",
  createdAt: new Date("2025-08-23T10:00:00Z"),
  updatedAt: new Date("2025-08-23T10:00:00Z"),
  ...overrides,
});

/**
 * Mock appointment with includes for relationships
 * Used for testing API responses with related data
 */
export const createMockAppointmentWithIncludes = (
  serviceOverrides?: Partial<Service>,
  userOverrides?: Partial<User>,
  appointmentOverrides?: Partial<Appointment>
) => {
  const mockService = createMockService(serviceOverrides);
  const mockUser = createMockUser(userOverrides);
  const mockAppointment = createMockAppointment({
    userId: mockUser.id,
    serviceId: mockService.id,
    ...appointmentOverrides,
  });

  return {
    ...mockAppointment,
    service: {
      id: mockService.id,
      title: mockService.title,
      duration: mockService.duration,
      price: mockService.price,
    },
    user: {
      id: mockUser.id,
      name: mockUser.name,
      email: mockUser.email,
    },
  };
};

/**
 * Type-safe mock service for API responses
 * Only includes fields typically returned by API
 */
export const createMockServiceForAPI = (overrides?: Partial<Service>) => {
  const fullService = createMockService(overrides);
  return {
    id: fullService.id,
    title: fullService.title,
    description: fullService.description,
    duration: fullService.duration,
    price: fullService.price.toString(), // Convert to string for API response
    features: fullService.features,
    isActive: fullService.isActive,
  };
};
