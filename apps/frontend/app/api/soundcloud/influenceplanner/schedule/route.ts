import { NextResponse } from "next/server";
import { createAdminClient, getAuthorizedUser } from "../utils";
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

  // Optional: submission ID to auto-update + auto-email
  const submissionId = body?.submissionId;

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
      body: {
        types: body.types || ["REPOST", "UNREPOST"],
        medias,
        targets,
        settings,
        comment: comment || null,
        removeDuplicates: body.removeDuplicates ?? true,
        shuffle: body.shuffle ?? true,
      },
      authToken: auth.token,
    });

    const scheduleUrls: string[] = (data as any)?.data || [];

    // If a submissionId was provided, auto-update the campaign record and send email
    if (submissionId && status >= 200 && status < 300 && scheduleUrls.length > 0) {
      try {
        const supabaseAdmin = createAdminClient(auth.token);

        // Store schedule URLs on the campaign record
        await supabaseAdmin
          .from("soundcloud_submissions")
          .update({
            ip_schedule_urls: scheduleUrls,
            ip_schedule_id: scheduleUrls[0]?.split("/").pop() || null,
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", submissionId);

        // Fetch client email for auto-notification
        const { data: submission } = await supabaseAdmin
          .from("soundcloud_submissions")
          .select("client_email, client_name, track_name, artist_name")
          .eq("id", submissionId)
          .single();

        // Auto-send tracking link email to client
        if (submission?.client_email) {
          const trackingUrl = scheduleUrls[0] || `${process.env.NEXT_PUBLIC_APP_URL || ""}/track/${submissionId}`;

          try {
            await supabaseAdmin.functions.invoke("send-notification-email", {
              body: {
                template: "tracking-link",
                to: submission.client_email,
                data: {
                  clientName: submission.client_name || "Valued Client",
                  trackName: submission.track_name || "your track",
                  artistName: submission.artist_name || "Artist",
                  trackingUrl,
                },
              },
            });

            // Update tracking link sent timestamp
            await supabaseAdmin
              .from("soundcloud_submissions")
              .update({ tracking_link_sent_at: new Date().toISOString() })
              .eq("id", submissionId);
          } catch (emailErr) {
            console.error("Failed to send tracking link email:", emailErr);
            // Don't fail the request if email fails
          }
        }
      } catch (dbErr) {
        console.error("Failed to update submission after scheduling:", dbErr);
        // Don't fail the request -- schedule was created successfully
      }
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
      { error: error.message || "Failed to create schedule" },
      { status: 502 }
    );
  }
}
