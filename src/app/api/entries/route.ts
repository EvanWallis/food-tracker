import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export async function GET() {
  const entries = await prisma.mealEntry.findMany({
    orderBy: { timestamp: "desc" },
  });
  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  const mealText = typeof body.mealText === "string" ? body.mealText.trim() : "";
  const mood = typeof body.mood === "string" ? body.mood : "";
  const llmReason = typeof body.llmReason === "string" ? body.llmReason : "";
  const notes = typeof body.notes === "string" ? body.notes : null;
  const timestamp = body.timestamp ? new Date(body.timestamp) : null;

  if (!mealText || !timestamp || Number.isNaN(timestamp.getTime())) {
    return NextResponse.json({ error: "Invalid entry data." }, { status: 400 });
  }

  const wholeFoodsPercent = clamp(Number(body.wholeFoodsPercent) || 0, 0, 100);
  const sizeWeight = body.sizeWeight ? clamp(Number(body.sizeWeight), 0.5, 2) : null;
  const sizeLabel = typeof body.sizeLabel === "string" ? body.sizeLabel : null;

  const entry = await prisma.mealEntry.create({
    data: {
      mealText,
      timestamp,
      mood,
      wholeFoodsPercent,
      llmReason,
      notes,
      sizeLabel,
      sizeWeight,
    },
  });

  return NextResponse.json(entry);
}
