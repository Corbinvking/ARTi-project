# Slack Integration Setup Guide

This guide covers everything needed to connect the ARTi platform to Slack. Once complete, each app (SoundCloud, YouTube, Spotify, Instagram) sends real-time notifications to its own Slack channel.

---

## Prerequisites

- A Slack workspace you have admin access to
- Channels already created for each app you want notifications in

---

## Step 1: Create a Slack App

1. Go to **https://api.slack.com/apps**
2. Click **Create New App** > **From scratch**
3. App Name: `ARTi Platform` (or whatever you prefer)
4. Pick your workspace
5. Click **Create App**

---

## Step 2: Enable Incoming Webhooks

1. In the left sidebar, click **Incoming Webhooks**
2. Toggle **Activate Incoming Webhooks** to **On**

---

## Step 3: Create One Webhook Per Channel

You need one webhook URL per platform/channel. For each channel:

1. Scroll to the bottom of the Incoming Webhooks page
2. Click **Add New Webhook to Workspace**
3. Select the target channel
4. Click **Allow**
5. Copy the generated webhook URL

Repeat for each channel. You should end up with something like this:

| Platform   | Slack Channel        | Webhook URL (example)                                            |
|------------|----------------------|------------------------------------------------------------------|
| SoundCloud | `#soundcloud-groups` | `https://hooks.slack.com/services/T00000000/B11111111/xxxx...`   |
| YouTube    | `#youtube`           | `https://hooks.slack.com/services/T00000000/B22222222/yyyy...`   |
| Spotify    | `#spotify`           | `https://hooks.slack.com/services/T00000000/B33333333/zzzz...`   |
| Instagram  | `#instagram`         | `https://hooks.slack.com/services/T00000000/B44444444/wwww...`   |

---

## Step 4: Credentials Needed

Once you have the webhooks, provide the following for each platform you want to enable:

### SoundCloud

```
Slack Channel:    #soundcloud-groups
Webhook URL:      https://hooks.slack.com/services/TXXXXX/BXXXXX/XXXXXXXXXX
```

### YouTube

```
Slack Channel:    #youtube
Webhook URL:      https://hooks.slack.com/services/TXXXXX/BXXXXX/XXXXXXXXXX
```

### Spotify

```
Slack Channel:    #spotify
Webhook URL:      https://hooks.slack.com/services/TXXXXX/BXXXXX/XXXXXXXXXX
```

### Instagram

```
Slack Channel:    #instagram
Webhook URL:      https://hooks.slack.com/services/TXXXXX/BXXXXX/XXXXXXXXXX
```

---

## Step 5: Enter Credentials in the Platform

### SoundCloud

1. Go to **SoundCloud > Settings**
2. Under **Notification Settings**:
   - Toggle **Enable Slack Notifications** on
   - Enter the **Slack Channel** name (e.g. `#soundcloud-groups`)
   - Paste the **Slack Webhook URL**
3. Click **Save**
4. Click **Test Connection** to verify

### YouTube

1. Go to **YouTube > Settings > Notifications** tab
2. Under **Slack Integration**:
   - Toggle **Enable Slack Notifications** on
   - Enter the **Slack Channel** name (e.g. `#youtube`)
   - Paste the **Slack Webhook URL**
3. Click **Save Slack Settings**
4. Click **Test Connection** to verify

### Spotify / Instagram

These platforms do not yet have a settings UI for Slack. To configure them, insert directly into the database:

```sql
INSERT INTO platform_notification_settings (platform, slack_enabled, slack_webhook, slack_channel)
VALUES
  ('spotify', true, 'https://hooks.slack.com/services/TXXXXX/BXXXXX/XXXXXXXXXX', '#spotify'),
  ('instagram', true, 'https://hooks.slack.com/services/TXXXXX/BXXXXX/XXXXXXXXXX', '#instagram')
ON CONFLICT (org_id, platform) DO UPDATE SET
  slack_enabled = EXCLUDED.slack_enabled,
  slack_webhook = EXCLUDED.slack_webhook,
  slack_channel = EXCLUDED.slack_channel,
  updated_at = now();
```

---

## Step 6: Run the Migration

Before any of this works, the `platform_notification_settings` table must exist. Run the migration:

```
supabase/migrations/20260225_platform_notification_settings.sql
```

This migration also moves any existing SoundCloud Slack settings from the old `soundcloud_settings` table into the new table automatically.

---

## What Gets Notified

Once configured, these events send Slack messages:

| Platform   | Events                                                              |
|------------|---------------------------------------------------------------------|
| SoundCloud | Campaign status changes, submission updates, inquiry decisions, reconnect emails |
| YouTube    | Campaign status changes, new campaign creation                      |
| Spotify    | Campaign submission approvals/rejections, campaign status changes   |
| Instagram  | Campaign status changes, new campaign creation (via unified intake) |

---

## Troubleshooting

| Problem                          | Fix                                                                 |
|----------------------------------|---------------------------------------------------------------------|
| Test Connection says "disabled"  | Make sure you toggled Enable on AND clicked Save before testing     |
| No message in Slack              | Verify the webhook URL is correct and the Slack App is still active |
| Wrong channel                    | Each webhook is tied to its channel; create a new webhook for a different channel |
| Backend not running              | The Fastify API must be running -- Slack calls go through `POST /api/slack-notify` |

---

## Security Notes

- Webhook URLs are stored in the `platform_notification_settings` table in Supabase
- Webhook calls are made server-side from the Fastify backend, never from the browser
- No Slack OAuth tokens or bot tokens are needed -- this uses Incoming Webhooks only
- RLS policies restrict access to authenticated users
