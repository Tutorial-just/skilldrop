import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedRoutes = [
  "/admin",
  "/expert",
  "/buyer",
  "/dashboard",
  "/bookings",
  "/settings",
  "/calls",
];

function isProtectedRoute(pathname: string) {
  return protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function createSafeNext(pathname: string, search: string) {
  const next = `${pathname}${search}`;

  if (!next.startsWith("/")) {
    return "/";
  }

  if (next.startsWith("//")) {
    return "/";
  }

  return next;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    const errorUrl = new URL("/sign-in", request.url);
    errorUrl.searchParams.set("error", "auth-config-missing");

    return NextResponse.redirect(errorUrl);
  }

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    const signInUrl = new URL("/sign-in", request.url);

    signInUrl.searchParams.set(
      "next",
      createSafeNext(request.nextUrl.pathname, request.nextUrl.search),
    );

    return NextResponse.redirect(signInUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/expert/:path*",
    "/buyer/:path*",
    "/dashboard/:path*",
    "/bookings/:path*",
    "/settings/:path*",
    "/calls/:path*",
  ],
};