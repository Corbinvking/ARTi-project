import { NextResponse } from "next/server";
import { createAdminClient, getAuthorizedUser } from "../utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reveal = url.searchParams.get("reveal") === "true";
  const auth = await getAuthorizedUser(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const supabaseAdmin = createAdminClient(auth.token);
    const { data, error } = await supabaseAdmin
      .from("soundcloud_settings")
      .select("ip_base_url, ip_username, ip_api_key")
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const settings = Array.isArray(data) ? data[0] : null;

    const responsePayload: Record<string, any> = {
      ip_base_url: settings?.ip_base_url ?? "https://api.influenceplanner.com/partner/v1/",
      ip_username: settings?.ip_username ?? "",
      api_key_configured: !!settings?.ip_api_key,
    };

    if (reveal) {
      responsePayload.ip_api_key = settings?.ip_api_key ?? "";
    }

    return NextResponse.json(responsePayload);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to load InfluencePlanner settings" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await getAuthorizedUser(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const ip_base_url = body?.ip_base_url;
  const ip_username = body?.ip_username;
  const ip_api_key = body?.ip_api_key;

  if (!ip_base_url || !ip_username) {
    return NextResponse.json(
      { error: "Base URL and username are required." },
      { status: 400 }
    );
  }

  try {
    const supabaseAdmin = createAdminClient(auth.token);
    const { data: existingRows } = await supabaseAdmin
      .from("soundcloud_settings")
      .select("id")
      .order("updated_at", { ascending: false })
      .limit(1);

    const existing = Array.isArray(existingRows) ? existingRows[0] : null;

    const payload: Record<string, any> = {
      ip_base_url,
      ip_username,
      updated_at: new Date().toISOString(),
    };

    if (ip_api_key) {
      payload.ip_api_key = ip_api_key;
    }

    if (existing?.id) {
      const { error } = await supabaseAdmin.from("soundcloud_settings").update(payload).eq("id", existing.id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { error } = await supabaseAdmin.from("soundcloud_settings").insert({
        ...payload,
        org_id: "00000000-0000-0000-0000-000000000001",
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ status: "ok" });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to save InfluencePlanner settings" },
      { status: 500 }
    );
  }
}
