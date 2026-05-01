import { NextRequest, NextResponse } from "next/server";

const protectedRoutes = [
  {
    prefix: "/admin",
    allowedRoles: ["ADMIN"],
    requiredLabel: "Admin",
  },
  {
    prefix: "/expert",
    allowedRoles: ["EXPERT", "ADMIN"],
    requiredLabel: "Expert or Admin",
  },
  {
    prefix: "/buyer",
    allowedRoles: ["BUYER", "EXPERT", "ADMIN"],
    requiredLabel: "Buyer, Expert or Admin",
  },
  {
    prefix: "/dashboard",
    allowedRoles: ["BUYER", "EXPERT", "ADMIN"],
    requiredLabel: "Buyer, Expert or Admin",
  },
];

function createSafeNext(pathname: string, search: string) {
  return pathname + search;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const matchedRoute = protectedRoutes.find((route) =>
    pathname.startsWith(route.prefix),
  );

  if (!matchedRoute) {
    return NextResponse.next();
  }

  const role = request.cookies.get("skilldrop_role")?.value;
  const next = createSafeNext(request.nextUrl.pathname, request.nextUrl.search);

  if (!role) {
    const signInUrl = new URL("/sign-in", request.url);
    signInUrl.searchParams.set("next", next);
    signInUrl.searchParams.set("required", matchedRoute.requiredLabel);

    return NextResponse.redirect(signInUrl);
  }

  if (!matchedRoute.allowedRoles.includes(role)) {
    const accessDeniedUrl = new URL("/access-denied", request.url);

    accessDeniedUrl.searchParams.set("next", next);
    accessDeniedUrl.searchParams.set("current", role);
    accessDeniedUrl.searchParams.set("required", matchedRoute.requiredLabel);

    return NextResponse.redirect(accessDeniedUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/expert/:path*", "/buyer/:path*", "/dashboard/:path*"],
};