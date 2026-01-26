import { NextResponse } from "next/server";
import { getAuthorizedUser } from "../utils";
import { influencePlannerFetch } from "../../../../(dashboard)/soundcloud/soundcloud-app/integrations/influenceplannerClient";

export const dynamic = "force-dynamic";

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

  const targets = Array.isArray(body?.targets) ? body.targets : [];
  const medias = Array.isArray(body?.medias) ? body.medias : [];
  const settings = body?.settings;
  const comment = body?.comment;

  if (!targets.length || !medias.length || !settings) {
    return NextResponse.json(
      { error: "Targets, medias, and settings are required." },
      { status: 400 }
    );
  }

  if (comment && targets.length > 3) {
    return NextResponse.json(
      { error: "Comments are limited to 3 targets or fewer." },
      { status: 400 }
    );
  }

  try {
    const { data, status, headers } = await influencePlannerFetch({
      method: "POST",
      path: "/schedule/create",
      body,
      authToken: auth.token,
    });

    return NextResponse.json(
      {
        status,
        headers,
        body: data,
      },
      { status }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to create schedule" },
      { status: 502 }
    );
  }
}
