import type { AppRole } from "@/lib/auth/get-current-user";

export type Permission =
  | "admin:access"
  | "admin:manage_users"
  | "admin:manage_experts"
  | "admin:manage_bookings"
  | "expert:access"
  | "expert:manage_profile"
  | "expert:manage_services"
  | "expert:manage_availability"
  | "expert:view_bookings"
  | "buyer:access"
  | "buyer:create_booking"
  | "buyer:manage_bookings"
  | "buyer:save_experts"
  | "booking:view"
  | "booking:cancel"
  | "review:create";

const rolePermissions: Record<AppRole, Permission[]> = {
  buyer: [
    "buyer:access",
    "buyer:create_booking",
    "buyer:manage_bookings",
    "buyer:save_experts",
    "booking:view",
    "booking:cancel",
    "review:create",
  ],
  expert: [
    "buyer:access",
    "buyer:create_booking",
    "buyer:manage_bookings",
    "buyer:save_experts",
    "expert:access",
    "expert:manage_profile",
    "expert:manage_services",
    "expert:manage_availability",
    "expert:view_bookings",
    "booking:view",
    "booking:cancel",
    "review:create",
  ],
  admin: [
    "admin:access",
    "admin:manage_users",
    "admin:manage_experts",
    "admin:manage_bookings",
    "buyer:access",
    "buyer:create_booking",
    "buyer:manage_bookings",
    "buyer:save_experts",
    "expert:access",
    "expert:manage_profile",
    "expert:manage_services",
    "expert:manage_availability",
    "expert:view_bookings",
    "booking:view",
    "booking:cancel",
    "review:create",
  ],
};

export function hasPermission(role: AppRole | null | undefined, permission: Permission) {
  if (!role) {
    return false;
  }

  return rolePermissions[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(
  role: AppRole | null | undefined,
  permissions: Permission[],
) {
  return permissions.some((permission) => hasPermission(role, permission));
}

export function hasAllPermissions(
  role: AppRole | null | undefined,
  permissions: Permission[],
) {
  return permissions.every((permission) => hasPermission(role, permission));
}

export function canAccessRoute(role: AppRole | null | undefined, pathname: string) {
  if (!role) {
    return false;
  }

  if (pathname.startsWith("/admin")) {
    return role === "admin";
  }

  if (pathname.startsWith("/expert")) {
    return role === "expert" || role === "admin";
  }

  if (pathname.startsWith("/buyer")) {
    return role === "buyer" || role === "expert" || role === "admin";
  }

  if (pathname.startsWith("/dashboard")) {
    return role === "buyer" || role === "expert" || role === "admin";
  }

  return true;
}