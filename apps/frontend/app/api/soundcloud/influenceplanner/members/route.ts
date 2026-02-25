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

  const url = new URL(request.url);
  const limit = url.searchParams.get("limit");
  const offset = url.searchParams.get("offset");
  const searchTerm = url.searchParams.get("searchTerm");
  const sortBy = url.searchParams.get("sortBy");
  const sortDir = url.searchParams.get("sortDir");

  try {
    const { data, status, headers } = await influencePlannerFetch({
      method: "GET",
      path: "/network/members",
      query: {
        limit: limit ? Number(limit) : undefined,
        offset: offset ? Number(offset) : undefined,
        searchTerm: searchTerm || undefined,
        sortBy: sortBy || undefined,
        sortDir: sortDir || undefined,
      },
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
      { error: error.message || "Failed to fetch members", source: "influenceplanner" },
      { status: 502 }
    );
  }
}
