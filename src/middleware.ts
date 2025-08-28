import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default withAuth(
  function middleware(request: NextRequest & { nextauth?: { token?: any } }) {
    const { pathname } = request.nextUrl;
    const token = request.nextauth?.token;

    // Handle admin login page - redirect logged-in admin users to dashboard
    if (pathname === "/admin/login") {
      if (token?.role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin/dashboard", request.url));
      }
    }

    // Protect admin routes - require ADMIN role
    if (pathname.startsWith("/admin") && pathname !== "/admin/login") {
      if (!token) {
        // Not logged in - redirect to admin login
        return NextResponse.redirect(new URL("/admin/login", request.url));
      }

      if (token.role !== "ADMIN") {
        // Logged in but not admin - redirect to home with error
        const homeUrl = new URL("/", request.url);
        homeUrl.searchParams.set("error", "unauthorized");
        return NextResponse.redirect(homeUrl);
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;

        // Allow public routes
        if (!pathname.startsWith("/admin")) {
          return true;
        }

        // Allow admin login page for everyone
        if (pathname === "/admin/login") {
          return true;
        }

        // Require authentication for all other admin routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    // Match admin routes except login page
    "/admin/((?!login).)*",
    // Optionally protect other routes
    // "/dashboard/:path*"
  ],
};
