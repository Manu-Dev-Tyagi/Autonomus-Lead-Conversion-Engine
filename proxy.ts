import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/middleware";

// Routes that don't require authentication
const PUBLIC_ROUTES = new Set([
  "/auth/sign-in",
  "/auth/sign-up",
  "/auth/callback",
]);

// API routes that use their own auth (webhook endpoints)
const UNPROTECTED_API = /^\/api\/webhooks\//;

// Admin routes that require admin/owner role
const ADMIN_ROUTES = /^\/admin\//;

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth for public routes and unprotected API endpoints
  if (PUBLIC_ROUTES.has(pathname) || UNPROTECTED_API.test(pathname)) {
    const { supabase, response } = createClient(request);
    await supabase.auth.getUser(); // refresh session
    return response;
  }

  const { supabase, response } = createClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // --- Unauthenticated users ---
  if (!user) {
    // API routes return 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // UI routes redirect to sign-in
    const signInUrl = new URL("/auth/sign-in", request.url);
    signInUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // --- Authenticated but needs onboarding (no tenant) ---
  const tenantId = user.app_metadata?.tenant_id as string | undefined;
  if (
    !tenantId &&
    pathname !== "/onboarding" &&
    !pathname.startsWith("/api/")
  ) {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  // --- Admin route guard ---
  if (ADMIN_ROUTES.test(pathname)) {
    const role = user.app_metadata?.role as string | undefined;
    const isAdmin = role === "admin" || role === "owner";
    if (!isAdmin) {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
