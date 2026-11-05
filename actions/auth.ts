"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ActionState } from "@/lib/actions";

const registrationSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  studentId: z.string().trim().min(2).max(40),
  password: z.string().min(10).max(128),
});

export async function registerUser(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registrationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a valid name, school ID, email, and password (10+ characters)." };

  const email = parsed.data.email.toLowerCase();
  try {
    const existing = await prisma.user.findFirst({
      where: { OR: [{ email }, { studentId: parsed.data.studentId }] },
      select: { id: true },
    });
    if (existing) return { error: "That email or school ID is already registered." };

    await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        studentId: parsed.data.studentId,
        passwordHash: await bcrypt.hash(parsed.data.password, 12),
      },
    });
  } catch (error) {
    console.error("Account registration failed", error);
    return { error: "Account service is unavailable. Check the database configuration and try again." };
  }
  redirect("/signin?registered=1");
}

export async function signInWithCredentials(formData: FormData): Promise<void> {
  try {
    await signIn("credentials", {
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      redirectTo: "/",
    });
  } catch (error) {
    if (!(error instanceof AuthError)) throw error;
    if (error.type !== "CredentialsSignin") console.error("Credential sign-in callback failed", error);
    redirect(error.type === "CredentialsSignin" ? "/signin?error=credentials" : "/signin?error=service");
  }
}

export async function signOutUser(): Promise<void> {
  await signOut({ redirectTo: "/signin" });
}