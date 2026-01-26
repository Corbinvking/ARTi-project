import { NextResponse } from "next/server";
import { getAuthorizedUser } from "../utils";
import { influencePlannerFetch } from "../../../../(dashboard)/soundcloud/soundcloud-app/integrations/influenceplannerClient";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getAuthorizedUser(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { data, status, headers } = await influencePlannerFetch({
      method: "GET",
      path: "/network/members",
      query: { limit: 1, offset: 0 },
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
      { error: error.message || "InfluencePlanner API test failed" },
      { status: 502 }
    );
  }
}
