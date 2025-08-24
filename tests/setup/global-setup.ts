import { PrismaClient } from "../../src/generated/prisma/index";

async function globalSetup() {
  const prisma = new PrismaClient();

  try {
    console.log("🌱 Seeding test database...");

    // Clear existing data
    await prisma.appointment.deleteMany();
    await prisma.blockedSlot.deleteMany();
    await prisma.availability.deleteMany();
    await prisma.service.deleteMany();
    await prisma.user.deleteMany();

    // Create essential services for testing
    const services = await prisma.service.createMany({
      data: [
        {
          title: "Individual Therapy",
          description: "One-on-one counseling for personal growth and healing",
          duration: 50,
          price: 150,
          features: [
            "Personalized treatment planning",
            "Evidence-based therapeutic approaches",
          ],
          isActive: true,
        },
        {
          title: "Couples Counseling",
          description:
            "Strengthen your relationship through better communication",
          duration: 60,
          price: 180,
          features: [
            "Communication skills training",
            "Conflict resolution strategies",
          ],
          isActive: true,
        },
      ],
    });

    // Create basic availability windows
    await prisma.availability.createMany({
      data: [
        // Monday-Friday, 9 AM - 5 PM
        { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", isActive: true },
        { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", isActive: true },
        { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", isActive: true },
        { dayOfWeek: 4, startTime: "09:00", endTime: "17:00", isActive: true },
        { dayOfWeek: 5, startTime: "09:00", endTime: "17:00", isActive: true },
      ],
    });

    console.log(
      `✅ Created ${services.count} services and availability windows`
    );
  } catch (error) {
    console.error("❌ Database seeding failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

export default globalSetup;
