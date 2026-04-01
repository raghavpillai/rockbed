import { auth } from "@/lib/auth";
import { prisma } from "@rockbed/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || adminPassword.length === 0) {
    return NextResponse.json({ error: "Admin password not configured" }, { status: 503 });
  }

  const { password } = await req.json();
  if (!password || typeof password !== "string") {
    return NextResponse.json({ error: "Invalid admin password" }, { status: 401 });
  }

  // Timing-safe comparison
  const a = Buffer.from(password);
  const b = Buffer.from(adminPassword);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Invalid admin password" }, { status: 401 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { role: "admin" },
  });

  return NextResponse.json({ ok: true });
}
