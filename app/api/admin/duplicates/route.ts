import { NextResponse } from "next/server";
import { detectDuplicates } from "@/lib/duplicates";

export const maxDuration = 60; // Allow up to 60s for hashing many files

export async function GET() {
  try {
    const duplicates = await detectDuplicates();
    return NextResponse.json({ duplicates });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to detect duplicates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
