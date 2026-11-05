import { Role } from "@prisma/client";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");

  const elevated = user.role !== Role.STUDENT;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [hardware, proposals, attendance, bulletins, checkouts, metrics] = await Promise.all([
    prisma.hardwareItem.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }] }),
    prisma.projectProposal.findMany({
      orderBy: { updatedAt: "desc" }, take: 30,
      include: { leader: { select: { name: true } }, firmwareFiles: { orderBy: { fileName: "asc" } } },
    }),
    prisma.attendanceSession.findMany({
      where: elevated ? {} : { userId: user.id }, orderBy: { createdAt: "desc" }, take: 50,
    }),
    prisma.bulletinPost.findMany({ orderBy: { publishedAt: "desc" }, take: 12, include: { author: { select: { name: true } } } }),
    prisma.checkoutLog.findMany({
      where: { status: "ACTIVE", ...(elevated ? {} : { userId: user.id }) },
      include: { hardware: { select: { name: true } } }, orderBy: { dueDate: "asc" }, take: 100,
    }),
    prisma.$transaction([
      prisma.hardwareItem.aggregate({ _sum: { qty: true } }),
      prisma.attendanceSession.count({ where: { createdAt: { gte: today } } }),
    ]),
  ]);

  return (
    <AppShell
      user={{ id: user.id, name: user.name ?? "Lab member", email: user.email ?? "", role: user.role }}
      hardware={hardware.map((item) => ({ ...item, pinout: JSON.stringify(item.pinout, null, 2) }))}
      proposals={proposals.map((item) => ({
        id: item.id, slug: item.slug, title: item.title, abstract: item.abstract, leaderId: item.leaderId,
        status: item.status, leader: item.leader.name ?? "Lab member", teamMembers: item.teamMembers,
        bomItems: Array.isArray(item.bomItems) ? item.bomItems.map(String) : [],
        updatedAt: item.updatedAt.toISOString(), attachmentUrls: item.attachmentUrls,
        firmwareFiles: item.firmwareFiles.map((file) => ({
          id: file.id, fileName: file.fileName, language: file.language,
          content: file.content, updatedAt: file.updatedAt.toISOString(),
        })),
      }))}
      attendance={attendance.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))}
      bulletins={bulletins.map((item) => ({ ...item, author: item.author.name ?? "Lab team", publishedAt: item.publishedAt.toISOString() }))}
      checkouts={checkouts.map((item) => ({
        id: item.id, hardwareName: item.hardware.name, borrowerName: item.borrowerName,
        qty: item.qty, dueDate: item.dueDate.toISOString(), projectRef: item.projectRef,
      }))}
      stats={{ units: metrics[0]._sum.qty ?? 0, checkinsToday: metrics[1], proposalCount: proposals.filter((item) => ["APPROVED", "ACTIVE"].includes(item.status)).length, loans: checkouts.reduce((total, item) => total + item.qty, 0) }}
    />
  );
}