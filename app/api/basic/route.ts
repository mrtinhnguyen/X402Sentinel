import { NextResponse } from "next/server";

// This route has been deprecated. Use /api/token-analysis instead.
export async function GET() {
  return NextResponse.json(
    { error: "This endpoint has been deprecated. Please use /api/token-analysis instead." },
    { status: 404 }
  );
}


