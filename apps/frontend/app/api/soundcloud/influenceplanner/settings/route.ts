import { NextResponse } from "next/server";
import { createAdminClient, getAuthorizedUser } from "../utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getAuthorizedUser(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin
      .from("settings")
      .select("ip_base_url, ip_username, ip_api_key")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ip_base_url: data?.ip_base_url ?? "https://api.influenceplanner.com/partner/v1/",
      ip_username: data?.ip_username ?? "",
      api_key_configured: !!data?.ip_api_key,
    });
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
    const supabaseAdmin = createAdminClient();
    const { data: existing } = await supabaseAdmin
      .from("settings")
      .select("id, ip_api_key")
      .single();

    const payload: Record<string, any> = {
      ip_base_url,
      ip_username,
      updated_at: new Date().toISOString(),
    };

    if (ip_api_key) {
      payload.ip_api_key = ip_api_key;
    }

    if (existing?.id) {
      const { error } = await supabaseAdmin.from("settings").update(payload).eq("id", existing.id);
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      const { error } = await supabaseAdmin.from("settings").insert(payload);
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
