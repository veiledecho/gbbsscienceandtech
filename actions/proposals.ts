"use server";

import { del, put } from "@vercel/blob";
import { ProposalStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import type { ActionState } from "@/lib/actions";
import { prisma } from "@/lib/prisma";

const MAX_UPLOAD_BYTES = 3_500_000;
const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png", "image/webp"]);

function slugify(value: string) {
  return value.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export async function createProposal(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to create a proposal." };
  const parsed = z.object({
    title: z.string().trim().min(5).max(160),
    abstract: z.string().trim().min(30).max(12000),
    teamMembers: z.string().max(1000).optional(),
    bomItems: z.string().max(5000).optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Add a title and an abstract of at least 30 characters." };

  let bomItems: string[] = [];
  try {
    bomItems = parsed.data.bomItems ? (JSON.parse(parsed.data.bomItems) as string[]) : [];
    if (!Array.isArray(bomItems) || bomItems.some((item) => typeof item !== "string" || item.length > 120)) throw new Error();
  } catch {
    return { error: "Bill of materials must be a JSON array of component names." };
  }

  const files = formData.getAll("attachments").filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length > 6 || files.some((file) => !allowedTypes.has(file.type))) {
    return { error: "Attach up to 6 PDF, JPEG, PNG, or WebP files." };
  }
  if (files.reduce((total, file) => total + file.size, 0) > MAX_UPLOAD_BYTES) {
    return { error: "Combined attachment size must be under 3.5 MB for this form." };
  }

  const uploaded: string[] = [];
  try {
    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120);
      const blob = await put(`proposals/${user.id}/${crypto.randomUUID()}-${safeName}`, file, { access: "public" });
      uploaded.push(blob.url);
    }

    const slug = `${slugify(parsed.data.title)}-${crypto.randomUUID().slice(0, 8)}`;
    await prisma.projectProposal.create({
      data: {
        title: parsed.data.title,
        slug,
        abstract: parsed.data.abstract,
        teamMembers: parsed.data.teamMembers?.split(",").map((member) => member.trim()).filter(Boolean) ?? [],
        bomItems,
        leaderId: user.id,
        attachmentUrl: uploaded[0] ?? null,
        attachmentUrls: uploaded,
      },
    });
  } catch {
    await Promise.all(uploaded.map((url) => del(url).catch(() => undefined)));
    return { error: "Proposal could not be saved. Check Blob configuration and try again." };
  }

  revalidatePath("/");
  return { success: "Proposal saved as a draft." };
}

const nextStatuses: Record<ProposalStatus, ProposalStatus[]> = {
  DRAFT: [ProposalStatus.SUBMITTED],
  SUBMITTED: [ProposalStatus.UNDER_REVIEW],
  UNDER_REVIEW: [ProposalStatus.SUBMITTED, ProposalStatus.APPROVED],
  APPROVED: [ProposalStatus.ACTIVE],
  ACTIVE: [ProposalStatus.COMPLETED],
  COMPLETED: [],
};

export async function transitionProposal(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to update a proposal." };
  const parsed = z.object({ proposalId: z.string().min(1), status: z.nativeEnum(ProposalStatus) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Choose a valid proposal stage." };

  const proposal = await prisma.projectProposal.findUnique({
    where: { id: parsed.data.proposalId },
    select: { leaderId: true, status: true },
  });
  if (!proposal || !nextStatuses[proposal.status].includes(parsed.data.status)) return { error: "That proposal transition is not available." };
  const elevated = user.role !== "STUDENT";
  if (!elevated && (proposal.leaderId !== user.id || proposal.status !== ProposalStatus.DRAFT || parsed.data.status !== ProposalStatus.SUBMITTED)) {
    return { error: "Students may submit only their own draft proposals." };
  }

  const result = await prisma.projectProposal.updateMany({
    where: { id: parsed.data.proposalId, status: proposal.status },
    data: { status: parsed.data.status },
  });
  if (result.count !== 1) return { error: "The proposal changed; refresh and try again." };
  revalidatePath("/");
  return { success: "Proposal stage updated." };
}

export async function saveFirmwareFile(_state: ActionState, formData: FormData): Promise<ActionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Sign in to save firmware." };
  const parsed = z.object({
    proposalId: z.string().min(1),
    fileName: z.string().trim().regex(/^[a-zA-Z0-9_-][a-zA-Z0-9._-]{0,99}$/),
    language: z.enum(["cpp", "c", "h"]),
    content: z.string().max(100_000),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Check the file name and keep source files under 100 KB." };

  const proposal = await prisma.projectProposal.findUnique({ where: { id: parsed.data.proposalId }, select: { leaderId: true } });
  if (!proposal) return { error: "The selected proposal no longer exists." };
  if (user.role === "STUDENT" && proposal.leaderId !== user.id) return { error: "You can save firmware only to your own proposals." };

  await prisma.firmwareFile.upsert({
    where: { proposalId_fileName: { proposalId: parsed.data.proposalId, fileName: parsed.data.fileName } },
    create: parsed.data,
    update: { content: parsed.data.content, language: parsed.data.language },
  });
  revalidatePath("/");
  return { success: "Firmware file saved to the proposal." };
}