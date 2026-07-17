import { NextRequest, NextResponse } from "next/server";
import { saveOrderConfig } from "@/lib/order";

export async function POST(request: NextRequest) {
  try {
    const { order } = await request.json();

    if (!Array.isArray(order) || !order.every((p) => typeof p === "string")) {
      return NextResponse.json(
        { error: "order must be an array of pathname strings" },
        { status: 400 },
      );
    }

    await saveOrderConfig(order);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
