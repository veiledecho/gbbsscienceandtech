import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function csvCell(value: string) {
  const safeValue = /^[\t\r\n ]*[=+\-@]/.test(value) ? `'${value}` : value;
  return `"${safeValue.replaceAll('"', '""')}"`;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.role === Role.STUDENT) {
    return NextResponse.json({ error: "You do not have permission to export attendance." }, { status: 403 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      controller.enqueue(encoder.encode("Student name,Student ID,Station,Session type,Objective,Checked in at\r\n"));
      let cursor: string | undefined;
      try {
        while (true) {
          const batch = await prisma.attendanceSession.findMany({
            take: 500,
            ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
            orderBy: [{ createdAt: "asc" }, { id: "asc" }],
            select: { id: true, studentName: true, studentId: true, station: true, sessionType: true, objective: true, createdAt: true },
          });
          if (batch.length === 0) break;
          const rows = batch.map((record) => [
            record.studentName,
            record.studentId,
            record.station,
            record.sessionType,
            record.objective,
            record.createdAt.toISOString(),
          ].map(csvCell).join(",")).join("\r\n");
          controller.enqueue(encoder.encode(`${rows}\r\n`));
          cursor = batch[batch.length - 1].id;
          if (batch.length < 500) break;
        }
        controller.close();
      } catch {
        controller.error(new Error("Attendance export failed."));
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="stem-os-attendance.csv"',
      "Cache-Control": "private, no-store",
    },
  });
}