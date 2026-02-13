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
    // Use service role when available so all genres (including operator-created) are always visible after refresh
    let supabase: ReturnType<typeof createAdminClient>;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = createAdminClient(auth.token);
    }
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

const DEFAULT_ORG_ID = "00000000-0000-0000-0000-000000000001";
const MAX_GENRE_NAME_LENGTH = 100;

/**
 * POST /api/soundcloud/genre-families
 * Create a new genre family (operator-created genres). Idempotent: if name exists for org, returns existing row.
 */
export async function POST(request: Request) {
  const auth = await getAuthorizedUser(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const rawName = typeof body?.name === "string" ? body.name.trim() : "";
  if (!rawName) {
    return NextResponse.json({ error: "name is required and must be non-empty" }, { status: 400 });
  }
  if (rawName.length > MAX_GENRE_NAME_LENGTH) {
    return NextResponse.json(
      { error: `name must be at most ${MAX_GENRE_NAME_LENGTH} characters` },
      { status: 400 }
    );
  }

  try {
    let supabase: ReturnType<typeof createAdminClient>;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = createAdminClient(auth.token);
    }

    const { data: existing } = await supabase
      .from("soundcloud_genre_families")
      .select("id, name")
      .eq("org_id", DEFAULT_ORG_ID)
      .eq("name", rawName)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ id: existing.id, name: existing.name });
    }

    const { data: inserted, error } = await supabase
      .from("soundcloud_genre_families")
      .insert({
        org_id: DEFAULT_ORG_ID,
        name: rawName,
        active: true,
      })
      .select("id, name")
      .single();

    if (error) {
      if (error.code === "23505") {
        const { data: row } = await supabase
          .from("soundcloud_genre_families")
          .select("id, name")
          .eq("org_id", DEFAULT_ORG_ID)
          .eq("name", rawName)
          .single();
        if (row) return NextResponse.json({ id: row.id, name: row.name });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ id: inserted!.id, name: inserted!.name });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to create genre" },
      { status: 500 }
    );
  }
}
