import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = {};

  if (typeof body.mealText === "string") {
    updates.mealText = body.mealText.trim();
  }
  if (typeof body.mood === "string") {
    updates.mood = body.mood;
  }
  if (typeof body.notes === "string") {
    updates.notes = body.notes;
  }
  if (body.notes === null) {
    updates.notes = null;
  }
  if (body.timestamp) {
    const timestamp = new Date(body.timestamp);
    if (!Number.isNaN(timestamp.getTime())) {
      updates.timestamp = timestamp;
    }
  }
  if (body.wholeFoodsPercent !== undefined) {
    updates.wholeFoodsPercent = clamp(Number(body.wholeFoodsPercent) || 0, 0, 100);
  }
  if (body.sizeWeight !== undefined) {
    updates.sizeWeight = body.sizeWeight
      ? clamp(Number(body.sizeWeight), 0.5, 2)
      : null;
  }
  if (body.sizeLabel !== undefined) {
    updates.sizeLabel = typeof body.sizeLabel === "string" ? body.sizeLabel : null;
  }

  const entry = await prisma.mealEntry.update({
    where: { id: params.id },
    data: updates,
  });

  return NextResponse.json(entry);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  await prisma.mealEntry.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
