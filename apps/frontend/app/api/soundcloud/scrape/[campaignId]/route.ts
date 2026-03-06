import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export async function GET(
  _request: Request,
  { params }: { params: { campaignId: string } },
) {
  const { campaignId } = params;

  try {
    const res = await fetch(`${API_BASE}/api/soundcloud/scrape/${campaignId}`, {
      headers: { "Content-Type": "application/json" },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err.message || "Proxy request failed" },
      { status: 502 },
    );
  }
}
