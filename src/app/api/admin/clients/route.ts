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
  const search = searchParams.get("search");
  const sortBy = searchParams.get("sortBy") || "name";

  const where: any = {
    role: "CLIENT",
  };

  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  let orderBy: any = {};
  switch (sortBy) {
    case "created":
      orderBy = { createdAt: "desc" };
      break;
    case "appointments":
      orderBy = { appointments: { _count: "desc" } };
      break;
    default:
      orderBy = { name: "asc" };
  }

  const clients = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      emailVerified: true,
      _count: {
        select: {
          appointments: true,
        },
      },
      appointments: {
        select: {
          id: true,
          dateTime: true,
          status: true,
          service: {
            select: {
              title: true,
            },
          },
        },
        orderBy: {
          dateTime: "desc",
        },
        take: 5,
      },
    },
    orderBy,
  });

  return NextResponse.json({ success: true, clients });
});
