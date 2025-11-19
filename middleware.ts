import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    // Example: Redirect if not authenticated and not on the login page
    if (!req.nextauth.token && req.nextUrl.pathname !== "/login") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token, // Allow if token exists
    },
  }
);

export const config = {
  matcher: [
    "/((?!login|forgot-password|reset-password|api/auth|api/password).*)"
  ],
};
