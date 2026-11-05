import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const query = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) ?? "";
  if (query.length < 2) return NextResponse.json({ results: [] });
  const contains = { contains: query, mode: "insensitive" as const };
  const elevated = user.role !== Role.STUDENT;

  const [hardware, proposals, bulletins, firmware, attendance, checkouts] = await Promise.all([
    prisma.hardwareItem.findMany({ where: { OR: [{ name: contains }, { category: contains }, { specs: contains }, { location: contains }] }, take: 5, select: { id: true, name: true, category: true } }),
    prisma.projectProposal.findMany({ where: { OR: [{ title: contains }, { abstract: contains }] }, take: 5, select: { slug: true, title: true, status: true } }),
    prisma.bulletinPost.findMany({ where: { OR: [{ title: contains }, { content: contains }, { category: contains }] }, take: 5, select: { slug: true, title: true, category: true } }),
    prisma.firmwareFile.findMany({ where: { OR: [{ fileName: contains }, { content: contains }] }, take: 5, select: { id: true, fileName: true, language: true } }),
    prisma.attendanceSession.findMany({
      where: { AND: [elevated ? {} : { userId: user.id }, { OR: [{ studentName: contains }, { studentId: contains }, { station: contains }, { objective: contains }] }] },
      take: 5,
      select: { id: true, studentName: true, station: true },
    }),
    prisma.checkoutLog.findMany({
      where: { AND: [elevated ? {} : { userId: user.id }, { OR: [{ borrowerName: contains }, { projectRef: contains }, { hardware: { name: contains } }] }] },
      take: 5,
      select: { id: true, borrowerName: true, projectRef: true, hardware: { select: { name: true } } },
    }),
  ]);

  const results = [
    ...hardware.map((item) => ({ type: "Hardware", id: item.id, title: item.name, detail: item.category })),
    ...proposals.map((item) => ({ type: "Proposal", id: item.slug, title: item.title, detail: item.status.replaceAll("_", " ") })),
    ...bulletins.map((item) => ({ type: "Bulletin", id: item.slug, title: item.title, detail: item.category })),
    ...firmware.map((item) => ({ type: "Firmware", id: item.id, title: item.fileName, detail: item.language })),
    ...attendance.map((item) => ({ type: "Attendance", id: item.id, title: item.studentName, detail: item.station })),
    ...checkouts.map((item) => ({ type: "Checkout", id: item.id, title: item.hardware.name, detail: item.projectRef ?? item.borrowerName })),
  ];
  return NextResponse.json({ results }, { headers: { "Cache-Control": "private, no-store" } });
}