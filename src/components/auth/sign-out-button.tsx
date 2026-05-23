import { LogOut } from "lucide-react";

import { signOutAction } from "@/server/actions/auth.actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button
        type="submit"
        className="btn btn-ghost text-[var(--muted-foreground)] hover:text-[var(--danger)]"
      >
        <LogOut size={17} />
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </form>
  );
}