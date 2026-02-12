import { NextResponse } from "next/server";
import { createAdminClient, getAuthorizedUser } from "../influenceplanner/utils";

export const dynamic = "force-dynamic";

/**
 * GET /api/soundcloud/genre-families
 * Returns merged list of genre families from soundcloud_genre_families and genre_families
 * so the Repost Channel Genres dropdown has options (server-side read, no RLS blocking).
 */
export async function GET(request: Request) {
  const auth = await getAuthorizedUser(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const supabase = createAdminClient(auth.token);
    const seen = new Set<string>();
    const list: { id: string; name: string }[] = [];

    const { data: scData } = await supabase
      .from("soundcloud_genre_families")
      .select("id, name")
      .order("name");
    (scData || []).forEach((r: { id: string; name: string }) => {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        list.push({ id: r.id, name: r.name });
      }
    });

    const { data: genData } = await supabase
      .from("genre_families")
      .select("id, name")
      .order("name");
    (genData || []).forEach((r: { id: string; name: string }) => {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        list.push({ id: r.id, name: r.name });
      }
    });

    list.sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json(list);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load genre families" },
      { status: 500 }
    );
  }
}
