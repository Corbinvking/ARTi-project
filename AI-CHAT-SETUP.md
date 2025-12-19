# AI Chat Setup Guide - Natural Language Database Queries

## Overview

The AI Analytics Chat feature allows you to query your Spotify/YouTube/Instagram database using natural language. Instead of writing SQL, just ask questions like:

- "Which vendor has the best performance?"
- "How many campaigns are over 100k streams?"
- "What's the average cost per 1k streams?"
- "Show me all active campaigns for client X"

## Quick Setup (2 Minutes)

### 1. Get an API Key

**Option A: Claude (Recommended)**
1. Go to https://console.anthropic.com/
2. Create an account or sign in
3. Go to "API Keys" → "Create Key"
4. Copy the key (starts with `sk-ant-...`)

**Option B: OpenAI**
1. Go to https://platform.openai.com/api-keys
2. Create an account or sign in
3. Create a new API key
4. Copy the key (starts with `sk-...`)

### 2. Add to Environment Variables

**For Production (DigitalOcean Droplet):**

```bash
# SSH into your droplet
ssh root@164.90.129.146

# Edit the API environment file
nano /root/arti-marketing-ops/apps/api/.env

# Add your API key:
ANTHROPIC_API_KEY=sk-ant-your-key-here

# Or for OpenAI:
# OPENAI_API_KEY=sk-your-key-here
# LLM_PROVIDER=openai

# Restart the API
cd /root/arti-marketing-ops
docker compose restart api
```

**For Local Development:**

```bash
# Edit your local .env file
cd apps/api
echo "ANTHROPIC_API_KEY=sk-ant-your-key-here" >> .env

# Restart the dev server
npm run dev
```

### 3. Test It!

Open your app at https://app.artistinfluence.com and go to:
- **Spotify → Stream Strategist → AI Chat tab**

Try asking:
- "How many campaigns are currently active?"
- "Which vendor delivers the most daily streams?"
- "What's Club Restricted's cost per 1k streams?"

---

## How It Works

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   User Query    │ ───▶ │   Claude LLM    │ ───▶ │  Generate SQL   │
│ "top vendors?"  │      │                 │      │  SELECT * FROM  │
└─────────────────┘      └─────────────────┘      │  vendors...     │
                                                   └────────┬────────┘
                                                            │
                                                            ▼
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│  Natural Lang   │ ◀─── │   Claude LLM    │ ◀─── │ Execute Query   │
│   Response      │      │  Format Answer  │      │  on Supabase    │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

1. **User asks a question** in natural language
2. **Claude generates SQL** based on your database schema
3. **Query is executed** safely (read-only) on Supabase
4. **Claude formats** the results into a natural language response
5. **User sees** a helpful, readable answer

---

## Configuration Options

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Claude API key | `sk-ant-xxxxx` |
| `OPENAI_API_KEY` | OpenAI API key (alternative) | `sk-xxxxx` |
| `LLM_PROVIDER` | Which LLM to use | `anthropic` or `openai` |

### Fallback Mode

If no API key is configured, the system falls back to **pattern matching**:
- Recognizes common queries like "top vendors", "campaign count", etc.
- Still useful but limited to predefined patterns
- Add an API key to unlock full natural language understanding

---

## API Endpoints

### POST /api/ai-analytics
Main chat endpoint

**Request:**
```json
{
  "query": "Which vendor has the best performance?"
}
```

**Response:**
```json
{
  "answer": "Based on max daily stream capacity, **Music Gateway** is the top performing vendor...",
  "data": [...],
  "sql": "SELECT * FROM vendors ORDER BY max_daily_streams DESC LIMIT 5"
}
```

### GET /api/ai-analytics/health
Health check

**Response:**
```json
{
  "status": "healthy",
  "campaigns_count": 45,
  "llm_configured": true,
  "llm_provider": "anthropic"
}
```

### GET /api/ai-analytics/schema
View database schema (for debugging)

---

## Supported Query Types

### Campaign Queries
- "How many campaigns are active?"
- "Show campaigns over 100k streams"
- "What's the total budget for all campaigns?"
- "List campaigns by client X"

### Vendor Queries
- "Which vendor is the best?"
- "Compare vendor costs"
- "Who delivers the most daily streams?"
- "Show vendor performance metrics"

### Client Queries
- "Which clients have the most campaigns?"
- "Show all campaigns for [client name]"
- "What's the total spend by client?"

### Playlist Queries
- "Show top playlists by followers"
- "Which playlists are algorithmic?"
- "List playlists with no vendor"

### Analytics Queries
- "What's the average cost per 1k streams?"
- "Show monthly campaign trends"
- "Compare vendor ROI"

---

## Security

✅ **Read-only queries** - Only SELECT statements are allowed
✅ **No mutations** - INSERT, UPDATE, DELETE are blocked
✅ **Service role access** - Uses Supabase service role (backend only)
✅ **API key secured** - Key stored in environment variables, not in code

---

## Troubleshooting

### "LLM not configured" message
- Check that `ANTHROPIC_API_KEY` is set in your environment
- Restart the API after adding the key
- Verify with: `GET /api/ai-analytics/health`

### Slow responses
- Claude API calls take 1-3 seconds
- Complex queries may take longer
- Consider caching common queries

### Query errors
- Check `/api/ai-analytics/schema` to see available tables
- Try rephrasing your question
- Use simpler, more direct questions

---

## Cost Estimate

Claude API pricing (as of 2025):
- ~$3 per 1 million input tokens
- ~$15 per 1 million output tokens
- Average query: ~500 tokens = ~$0.001 per query
- 1,000 queries ≈ $1-2

---

## Future Enhancements

- [ ] Query caching for common questions
- [ ] Conversation memory (follow-up questions)
- [ ] Export query results to CSV
- [ ] Scheduled report generation
- [ ] Custom query templates

---

**Last Updated:** December 2024
**Requires:** Claude API key or OpenAI API key

