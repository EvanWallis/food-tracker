import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export async function GET() {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, goalPercent: 80 },
  });
  return NextResponse.json(settings);
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => ({}));
  const goalPercent = clamp(Number(body.goalPercent) || 0, 0, 100);

  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: { goalPercent },
    create: { id: 1, goalPercent },
  });

  return NextResponse.json(settings);
}
