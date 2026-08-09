import { PrismaClient } from "../src/generated/prisma/index";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting seed...");

  // Clear existing data
  await prisma.appointment.deleteMany();
  await prisma.blockedSlot.deleteMany();
  await prisma.availability.deleteMany();
  await prisma.service.deleteMany();
  await prisma.user.deleteMany();

  // Create services
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
          "Weekly or bi-weekly sessions",
          "Confidential and judgment-free environment",
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
          "Rebuilding trust and intimacy",
          "Pre-marital counseling available",
        ],
        isActive: true,
      },
      {
        title: "Family Therapy",
        description: "Work through family challenges together",
        duration: 60,
        price: 200,
        features: [
          "Family communication improvement",
          "Parenting support and guidance",
          "Blended family adjustment",
          "Generational pattern healing",
        ],
        isActive: true,
      },
      {
        title: "Teen Counseling",
        description: "Specialized support for adolescents",
        duration: 45,
        price: 130,
        features: [
          "Age-appropriate therapeutic techniques",
          "School and peer relationship issues",
          "Identity and self-esteem building",
          "Parent consultation included",
        ],
        isActive: true,
      },
      {
        title: "Trauma & PTSD Treatment",
        description:
          "Specialized trauma-informed care using evidence-based approaches like EMDR and CPT to help you process and heal from traumatic experiences.",
        duration: 50,
        price: 160,
        features: [
          "EMDR therapy available",
          "Cognitive Processing Therapy",
          "Safe trauma processing",
          "Coping skills development",
        ],
        isActive: true,
      },
      {
        title: "Anxiety & Depression Treatment",
        description:
          "Targeted treatment for anxiety disorders and depression using CBT, mindfulness, and other proven therapeutic approaches to help you regain control and find relief.",
        duration: 50,
        price: 150,
        features: [
          "Cognitive Behavioral Therapy (CBT)",
          "Mindfulness-based techniques",
          "Stress management skills",
          "Medication management support",
        ],
        isActive: true,
      },
    ],
  });

  console.log(`Created ${services.count} services`);

  // Create a test user
  const user = await prisma.user.create({
    data: {
      email: "test@example.com",
      name: "Test Client",
      phone: "555-0100",
    },
  });

  console.log(`Created test user: ${user.email}`);

  // Create default availability windows (Monday-Friday, 9 AM - 5 PM)
  const availability = await prisma.availability.createMany({
    data: [
      // Monday
      {
        dayOfWeek: 1,
        startTime: "09:00",
        endTime: "12:00",
        isActive: true,
      },
      {
        dayOfWeek: 1,
        startTime: "13:00",
        endTime: "17:00",
        isActive: true,
      },
      // Tuesday
      {
        dayOfWeek: 2,
        startTime: "09:00",
        endTime: "12:00",
        isActive: true,
      },
      {
        dayOfWeek: 2,
        startTime: "13:00",
        endTime: "17:00",
        isActive: true,
      },
      // Wednesday
      {
        dayOfWeek: 3,
        startTime: "09:00",
        endTime: "12:00",
        isActive: true,
      },
      {
        dayOfWeek: 3,
        startTime: "13:00",
        endTime: "17:00",
        isActive: true,
      },
      // Thursday
      {
        dayOfWeek: 4,
        startTime: "09:00",
        endTime: "12:00",
        isActive: true,
      },
      {
        dayOfWeek: 4,
        startTime: "13:00",
        endTime: "17:00",
        isActive: true,
      },
      // Friday
      {
        dayOfWeek: 5,
        startTime: "09:00",
        endTime: "12:00",
        isActive: true,
      },
      {
        dayOfWeek: 5,
        startTime: "13:00",
        endTime: "17:00",
        isActive: true,
      },
      // Saturday (limited hours)
      {
        dayOfWeek: 6,
        startTime: "10:00",
        endTime: "14:00",
        isActive: true,
      },
    ],
  });

  console.log(`Created ${availability.count} availability windows`);

  // Create some sample blocked slots for holidays/vacation
  const blockedSlots = await prisma.blockedSlot.createMany({
    data: [
      // Example: Block Thanksgiving Day 2025
      {
        dateTime: new Date("2025-11-27T00:00:00Z"),
        duration: 1440, // All day (24 hours * 60 minutes)
        reason: "Thanksgiving Holiday",
      },
      // Example: Block Christmas Day 2025
      {
        dateTime: new Date("2025-12-25T00:00:00Z"),
        duration: 1440,
        reason: "Christmas Holiday",
      },
      // Example: Block New Year's Day 2025
      {
        dateTime: new Date("2025-01-01T00:00:00Z"),
        duration: 1440,
        reason: "New Year's Holiday",
      },
    ],
  });

  console.log(`Created ${blockedSlots.count} blocked time slots`);
}

main()
  .catch(e => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
