import { NextRequest, NextResponse } from "next/server";
import { getCurationConfig, saveCurationConfig } from "@/lib/curation";

export async function GET() {
  try {
    const curation = await getCurationConfig();
    return NextResponse.json({ curation });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load curation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { selection } = await request.json();

    if (!Array.isArray(selection) || !selection.every((p) => typeof p === "string")) {
      return NextResponse.json(
        { error: "selection must be an array of pathname strings" },
        { status: 400 },
      );
    }

    await saveCurationConfig(selection);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save curation";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
