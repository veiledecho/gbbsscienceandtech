"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import type { ActionState } from "@/lib/actions";
import { prisma } from "@/lib/prisma";

export async function checkInToLab(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in before checking in." };
  const parsed = z.object({
    station: z.string().trim().min(2).max(80),
    sessionType: z.string().trim().min(2).max(80),
    objective: z.string().trim().min(5).max(1000),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Choose a station, session type, and brief objective." };

  if (!user?.studentId) return { error: "Add a school ID to your account before checking in." };

  await prisma.attendanceSession.create({
    data: {
      userId: user.id,
      studentName: user.name ?? user.email ?? "Lab member",
      studentId: user.studentId,
      ...parsed.data,
    },
  });
  revalidatePath("/");
  return { success: "Lab session recorded." };
}