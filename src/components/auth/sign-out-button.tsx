import { signOutAction } from "@/server/actions/auth.actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button type="submit" className="btn btn-secondary">
        Sign out
      </button>
    </form>
  );
}