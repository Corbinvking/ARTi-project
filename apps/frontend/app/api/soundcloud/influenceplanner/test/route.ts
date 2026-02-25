import { NextResponse } from "next/server";
import { getAuthorizedUser } from "../utils";
import { influencePlannerFetch } from "../../../../(dashboard)/soundcloud/soundcloud-app/integrations/influenceplannerClient";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getAuthorizedUser(request);
  if ("error" in auth) {
    return NextResponse.json(
      { error: auth.error, source: "auth" },
      { status: auth.status }
    );
  }

  try {
    const { data, status, headers } = await influencePlannerFetch({
      method: "GET",
      path: "/network/members",
      query: { limit: 1, offset: 0 },
      authToken: auth.token,
    });

    if (status === 401 || status === 403) {
      return NextResponse.json(
        {
          error: "InfluencePlanner API credentials are invalid or expired. Update them in Settings.",
          source: "influenceplanner",
          status,
          body: data,
        },
        { status }
      );
    }

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
      { error: error.message || "InfluencePlanner API test failed", source: "influenceplanner" },
      { status: 502 }
    );
  }
}
