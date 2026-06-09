"use server";

import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

type UserRole = "buyer" | "expert";

function getStringValue(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

function redirectWithError(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

function createSafeRedirectPath(value: string) {
  if (!value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}

async function getRedirectPathForUser({
  email,
  role,
}: {
  email: string;
  role: string | undefined;
}) {
  if (role === "admin") {
    return "/admin";
  }

  if (role === "expert") {
    const existingProfile = await prisma.expertProfile.findFirst({
      where: {
        user: {
          email,
        },
      },
      select: {
        id: true,
      },
    });

    if (!existingProfile) {
      return "/become-expert";
    }

    return "/expert";
  }

  return "/buyer";
}

export async function signUpAction(formData: FormData) {
  const supabase = await createClient();

  const name = getStringValue(formData, "name");
  const email = getStringValue(formData, "email").toLowerCase();
  const password = getStringValue(formData, "password");
  const role = getStringValue(formData, "role") as UserRole;

  if (!name) {
    redirectWithError("/sign-up", "Please enter your name.");
  }

  if (!email || !email.includes("@")) {
    redirectWithError("/sign-up", "Please enter a valid email address.");
  }

  if (password.length < 8) {
    redirectWithError("/sign-up", "Password must be at least 8 characters.");
  }

  if (role !== "buyer" && role !== "expert") {
    redirectWithError("/sign-up", "Please choose an account type.");
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name,
        role,
      },
    },
  });

  if (error) {
    redirectWithError("/sign-up", error.message);
  }

  if (role === "expert") {
    redirect("/become-expert");
  }

  redirect("/buyer");
}

export async function signInAction(formData: FormData) {
  const supabase = await createClient();

  const email = getStringValue(formData, "email").toLowerCase();
  const password = getStringValue(formData, "password");
  const nextPath = createSafeRedirectPath(getStringValue(formData, "next"));

  if (!email || !password) {
    redirectWithError("/sign-in", "Please enter your email and password.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    redirectWithError("/sign-in", "Invalid email or password.");
  }

  const authUser = data.user;

  const role = authUser.user_metadata?.role as string | undefined;
  const userEmail = authUser.email?.toLowerCase();

  if (!userEmail) {
    redirectWithError("/sign-in", "Your account email is missing.");
  }

  const redirectPath = await getRedirectPathForUser({
    email: userEmail,
    role,
  });

  redirect(nextPath ?? redirectPath);
}

export async function signOutAction() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  redirect("/");
}