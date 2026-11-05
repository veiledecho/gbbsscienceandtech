"use server";

import { Role } from "@prisma/client";
import { put } from "@vercel/blob";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import type { ActionState } from "@/lib/actions";
import { prisma } from "@/lib/prisma";

const checkoutSchema = z.object({
  hardwareId: z.string().min(1),
  qty: z.coerce.number().int().min(1).max(100),
  dueDate: z.coerce.date(),
  projectRef: z.string().trim().max(160).optional(),
});

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function checkoutHardware(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to check out equipment." };
  const parsed = checkoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success || parsed.data.dueDate <= new Date()) return { error: "Check the quantity and choose a future due date." };

  try {
    await prisma.$transaction(async (tx) => {
      const available = await tx.hardwareItem.updateMany({
        where: { id: parsed.data.hardwareId, qty: { gte: parsed.data.qty } },
        data: { qty: { decrement: parsed.data.qty } },
      });
      if (available.count !== 1) throw new Error("INSUFFICIENT_STOCK");

      await tx.checkoutLog.create({
        data: {
          hardwareId: parsed.data.hardwareId,
          userId: user.id,
          borrowerName: user.name ?? user.email ?? "Lab member",
          qty: parsed.data.qty,
          dueDate: parsed.data.dueDate,
          projectRef: parsed.data.projectRef || null,
        },
      });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "INSUFFICIENT_STOCK") return { error: "That quantity is no longer available." };
    return { error: "Checkout could not be completed. Try again." };
  }

  revalidatePath("/");
  return { success: "Equipment checked out." };
}

export async function returnHardware(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to return equipment." };
  const checkoutId = String(formData.get("checkoutId") ?? "");
  const elevated = user.role !== Role.STUDENT;

  try {
    await prisma.$transaction(async (tx) => {
      const checkout = await tx.checkoutLog.findFirst({
        where: { id: checkoutId, status: "ACTIVE", ...(elevated ? {} : { userId: user.id }) },
        select: { hardwareId: true, qty: true },
      });
      if (!checkout) throw new Error("CHECKOUT_NOT_ACTIVE");

      const changed = await tx.checkoutLog.updateMany({
        where: { id: checkoutId, status: "ACTIVE", ...(elevated ? {} : { userId: user.id }) },
        data: { status: "RETURNED", returnDate: new Date() },
      });
      if (changed.count !== 1) throw new Error("CHECKOUT_NOT_ACTIVE");
      await tx.hardwareItem.update({ where: { id: checkout.hardwareId }, data: { qty: { increment: checkout.qty } } });
    });
  } catch (error) {
    if (error instanceof Error && error.message === "CHECKOUT_NOT_ACTIVE") return { error: "This loan was already returned or is not yours to return." };
    return { error: "Return could not be completed. Try again." };
  }

  revalidatePath("/");
  return { success: "Equipment returned to inventory." };
}

export async function registerHardware(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user || user.role === Role.STUDENT) {
    return { error: "You do not have permission to register hardware." };
  }

  const parsed = z.object({
    name: z.string().trim().min(2).max(120),
    category: z.string().trim().min(2).max(80),
    qty: z.coerce.number().int().min(0).max(100000),
    specs: z.string().trim().min(2).max(3000),
    pinout: z.string().max(5000),
    location: z.string().trim().min(1).max(120),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Complete all component fields with valid values." };

  let pinout: unknown;
  try {
    pinout = JSON.parse(parsed.data.pinout);
  } catch {
    return { error: "Pinout must be valid JSON." };
  }

  const image = formData.get("image");
  let imageUrl: string | undefined;
  if (image instanceof File && image.size > 0) {
    if (!["image/jpeg", "image/png", "image/webp", "image/avif"].includes(image.type) || image.size > 3_000_000) return { error: "Choose a JPEG, PNG, WebP, or AVIF image under 3 MB." };
    const blob = await put(`hardware/${crypto.randomUUID()}-${image.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`, image, { access: "public" });
    imageUrl = blob.url;
  }

  const slug = `${slugify(parsed.data.name)}-${crypto.randomUUID().slice(0, 8)}`;
  await prisma.hardwareItem.create({
    data: { ...parsed.data, pinout: pinout as object, slug, imageUrl },
  });
  revalidatePath("/");
  return { success: "Component registered." };
}