import { NextResponse } from "next/server";
import { getAuthorizedUser } from "../utils";
import { influencePlannerRequest } from "../../../../(dashboard)/soundcloud/soundcloud-app/integrations/influenceplannerClient";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getAuthorizedUser(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { data } = await influencePlannerRequest({
      method: "GET",
      path: "/network/members",
      query: { limit: 1, offset: 0 },
    });

    return NextResponse.json({ status: "ok", sample: data });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "InfluencePlanner API test failed" },
      { status: 502 }
    );
  }
}
