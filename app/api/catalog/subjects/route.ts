import { asc, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { subjects } from "@/drizzle/schema";
import { getDatabase } from "@/lib/db";
import { serverError } from "@/lib/api/responses";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const catalogue = await getDatabase().select({
      id: subjects.id,
      slug: subjects.slug,
      name: subjects.name,
      cardAssetUrl: subjects.cardAssetUrl,
    }).from(subjects).where(inArray(subjects.status, ["approved", "published"]))
      .orderBy(asc(subjects.sortOrder), asc(subjects.name));
    return NextResponse.json({ data: catalogue });
  } catch (error) {
    return serverError(error);
  }
}
