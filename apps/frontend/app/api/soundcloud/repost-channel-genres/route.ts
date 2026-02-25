import { NextResponse } from "next/server";
import { createAdminClient, getAuthorizedUser } from "../influenceplanner/utils";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await getAuthorizedUser(request);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    let supabase: ReturnType<typeof createAdminClient>;
    try {
      supabase = createAdminClient();
    } catch {
      supabase = createAdminClient(auth.token);
    }
    const { data: rows, error } = await supabase
      .from("soundcloud_repost_channel_genres")
      .select("ip_user_id, genre_family_id")
      .order("ip_user_id");

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const list = (rows || []).map((row: any) => ({
      ip_user_id: row.ip_user_id,
      genre_family_id: row.genre_family_id,
    }));

    return NextResponse.json(list);
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to load repost channel genres" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
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

  const ip_user_id = body?.ip_user_id;
  const genre_family_id = body?.genre_family_id;

  if (typeof ip_user_id !== "string" || !ip_user_id.trim()) {
    return NextResponse.json(
      { error: "ip_user_id is required" },
      { status: 400 }
    );
  }
  if (typeof genre_family_id !== "string" || !genre_family_id.trim()) {
    return NextResponse.json(
      { error: "genre_family_id is required" },
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

    // Accept id from either soundcloud_genre_families or genre_families (DB FK is to soundcloud; genre_families used for display in app)
    const [scRes, genRes] = await Promise.all([
      supabase.from("soundcloud_genre_families").select("id").eq("id", genre_family_id).single(),
      supabase.from("genre_families").select("id").eq("id", genre_family_id).single(),
    ]);
    const existsInSc = !scRes.error && scRes.data;
    const existsInGen = !genRes.error && genRes.data;
    if (!existsInSc && !existsInGen) {
      return NextResponse.json(
        { error: "genre_family_id not found" },
        { status: 400 }
      );
    }

    const { error: insertError } = await supabase
      .from("soundcloud_repost_channel_genres")
      .upsert(
        {
          ip_user_id: ip_user_id.trim(),
          genre_family_id: genre_family_id.trim(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "ip_user_id,genre_family_id" }
      );

    if (insertError) {
      const msg = String(insertError.message ?? "");
      // 23505 = unique_violation: usually means migration for multiple genres per channel not applied
      const isDuplicate =
        (insertError as { code?: string }).code === "23505" ||
        (msg.includes("duplicate key") && msg.includes("ip_user_id"));
      if (isDuplicate) {
        return NextResponse.json(
          {
            error:
              "Only one genre per channel is allowed. To allow multiple genres, run the database migration 20260216_repost_channel_genres_multiple.sql on the server.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to save repost channel genre" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
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

  const ip_user_id = body?.ip_user_id;
  const genre_family_id = body?.genre_family_id;
  if (typeof ip_user_id !== "string" || !ip_user_id.trim()) {
    return NextResponse.json(
      { error: "ip_user_id is required" },
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
    let q = supabase
      .from("soundcloud_repost_channel_genres")
      .delete()
      .eq("ip_user_id", ip_user_id.trim());
    if (typeof genre_family_id === "string" && genre_family_id.trim()) {
      q = q.eq("genre_family_id", genre_family_id.trim());
    }
    const { error: deleteError } = await q;

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Failed to remove genre" },
      { status: 500 }
    );
  }
}
