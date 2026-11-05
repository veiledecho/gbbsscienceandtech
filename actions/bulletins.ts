"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import type { ActionState } from "@/lib/actions";
import { prisma } from "@/lib/prisma";

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function createBulletin(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to publish a bulletin." };
  if (user.role === "STUDENT") return { error: "Only club leaders and staff can publish bulletins." };
  const parsed = z.object({
    title: z.string().trim().min(5).max(160),
    category: z.string().trim().min(2).max(80),
    content: z.string().trim().min(20).max(8000),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Enter a title, category, and bulletin text." };

  await prisma.bulletinPost.create({
    data: {
      ...parsed.data,
      slug: `${slugify(parsed.data.title)}-${crypto.randomUUID().slice(0, 8)}`,
      authorId: user.id,
    },
  });
  revalidatePath("/");
  return { success: "Bulletin published." };
}