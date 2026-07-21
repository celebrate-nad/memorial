import { NextRequest, NextResponse } from "next/server";
import { getSlideshowSettings, saveSlideshowSettings } from "@/lib/slideshow-settings";

export async function GET() {
  try {
    const settings = await getSlideshowSettings();
    return NextResponse.json({ settings });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { photosPerSlide, slideDurationMs } = await request.json();

    if (![1, 2, 4].includes(photosPerSlide)) {
      return NextResponse.json(
        { error: "photosPerSlide must be 1, 2, or 4" },
        { status: 400 },
      );
    }

    if (typeof slideDurationMs !== "number" || slideDurationMs < 1000 || slideDurationMs > 30000) {
      return NextResponse.json(
        { error: "slideDurationMs must be between 1000 and 30000" },
        { status: 400 },
      );
    }

    await saveSlideshowSettings({ photosPerSlide, slideDurationMs });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save settings";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
