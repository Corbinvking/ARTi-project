# Provider Integration Architecture Plan
## Comprehensive Strategy for API Calls, Webhooks & Scrapers

### 🎯 **Overview**
Integrating provider APIs (Spotify, Instagram, YouTube), webhook events to n8n, and custom Playwright scrapers into a unified management layer accessible via the frontend.

---

## 🏗️ **Architecture Design**

### **Layer Structure**
```
Frontend (Next.js)
    ↓ (API calls + UI controls)
Backend API (Node.js)
    ↓ (Provider management + webhook dispatch)
Provider Layer
    ├── API Integrations (Spotify, Instagram, YouTube)
    ├── Webhook System (→ n8n)
    └── Scraper Infrastructure (Playwright + Docker)
```

### **Data Flow**
```
User Action (Frontend)
    → Backend API Call
    → Provider API Request / Webhook Trigger / Scraper Job
    → Data Processing
    → Database Storage
    → Frontend Update + Optional n8n Notification
```

---

## 🔧 **Technical Components**

### **1. Provider Management System**

#### **Backend Structure**
```
apps/api/src/
├── providers/
│   ├── spotify/
│   │   ├── api.ts          # Spotify API client
│   │   ├── auth.ts         # OAuth flow
│   │   ├── webhooks.ts     # Event handling
│   │   └── scraper.ts      # Scraper integration
│   ├── instagram/
│   ├── youtube/
│   └── base/
│       ├── provider.ts     # Base provider class
│       ├── webhook.ts      # Webhook base
│       └── scraper.ts      # Scraper base
├── webhooks/
│   ├── dispatcher.ts       # Send to n8n
│   ├── events.ts          # Event definitions
│   └── tracking.ts        # Success/failure logs
└── scrapers/
    ├── manager.ts         # Scraper orchestration
    ├── health.ts          # Health monitoring
    └── jobs.ts            # Job queue integration
```

#### **Database Schema Extensions**
```sql
-- Provider connections (extends existing connected_accounts)
ALTER TABLE connected_accounts ADD COLUMN provider_config JSONB;
ALTER TABLE connected_accounts ADD COLUMN last_sync_at TIMESTAMP;
ALTER TABLE connected_accounts ADD COLUMN sync_status VARCHAR(50);

-- Webhook events tracking
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES orgs(id),
    event_type VARCHAR(100) NOT NULL,
    provider VARCHAR(50) NOT NULL,
    payload JSONB NOT NULL,
    n8n_webhook_url TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP,
    success_at TIMESTAMP,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Scraper jobs and health
CREATE TABLE scraper_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES orgs(id),
    provider VARCHAR(50) NOT NULL,
    job_type VARCHAR(100) NOT NULL,
    config JSONB NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    results JSONB,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE scraper_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL,
    last_check_at TIMESTAMP DEFAULT NOW(),
    response_time_ms INTEGER,
    error_count INTEGER DEFAULT 0,
    success_rate DECIMAL(5,2),
    metadata JSONB
);
```

### **2. Frontend Integration UI**

#### **New Components**
```
apps/frontend/src/components/
├── providers/
│   ├── ProviderDashboard.tsx      # Main provider overview
│   ├── ProviderCard.tsx           # Individual provider status
│   ├── ApiKeyManager.tsx          # Key management interface
│   ├── WebhookEventLog.tsx        # Event success/failure tracking
│   ├── ScraperHealthMonitor.tsx   # Scraper status dashboard
│   └── ProviderSettings.tsx       # Configuration management
├── webhooks/
│   ├── WebhookTester.tsx          # Test webhook endpoints
│   ├── EventHistory.tsx           # Historical event log
│   └── N8nIntegration.tsx         # n8n workflow status
└── scrapers/
    ├── ScraperControls.tsx        # Start/stop/configure scrapers
    ├── JobQueue.tsx               # View running/queued jobs
    └── PerformanceMetrics.tsx     # Success rates, timing, etc.
```

#### **Page Structure Updates**
```
/admin/integrations
├── /providers          # API key management, connection status
├── /webhooks           # Event log, n8n integration health
├── /scrapers           # Scraper management, job monitoring
└── /analytics          # Cross-provider performance metrics
```

### **3. Webhook Infrastructure**

#### **Event System**
```typescript
// Event types
interface WebhookEvent {
    id: string;
    type: 'provider.connected' | 'data.synced' | 'scraper.completed' | 'error.occurred';
    provider: 'spotify' | 'instagram' | 'youtube';
    orgId: string;
    payload: any;
    metadata: {
        userId: string;
        timestamp: string;
        source: 'api' | 'scraper' | 'manual';
    };
}

// Webhook dispatcher
class WebhookDispatcher {
    async sendToN8n(event: WebhookEvent): Promise<void> {
        // Sign payload
        // POST to n8n webhook URL
        // Track success/failure
        // Retry on failure
    }
}
```

#### **n8n Integration Points**
```
n8n Webhooks:
├── /webhook/provider-event        # General provider events
├── /webhook/data-sync            # Data synchronization events
├── /webhook/scraper-results      # Scraper completion events
└── /webhook/error-alerts         # Error notifications
```

### **4. Scraper Integration**

#### **Docker Scraper Service**
```yaml
# docker-compose.scrapers.yml
services:
  spotify-scraper:
    build: ./scrapers/spotify
    volumes:
      - ./scrapers/shared:/app/shared
      - ./data/scraper-results:/app/results
    environment:
      - REDIS_URL=${REDIS_URL}
      - API_BASE_URL=${API_BASE_URL}
    networks:
      - arti-network
    
  scraper-manager:
    build: ./scrapers/manager
    depends_on: [redis, spotify-scraper]
    environment:
      - REDIS_URL=${REDIS_URL}
      - DATABASE_URL=${DATABASE_URL}
```

#### **Scraper Health Monitoring**
```typescript
class ScraperHealthMonitor {
    async checkHealth(provider: string): Promise<HealthStatus> {
        // Ping scraper container
        // Check last successful run
        // Verify resource usage
        // Return status + metrics
    }
    
    async getPerformanceMetrics(provider: string): Promise<Metrics> {
        // Success rate over time
        // Average execution time
        // Error frequency
        // Resource consumption
    }
}
```

---

## 🔄 **Development Flow Integration**

### **Local Development**
```bash
# Start all services including scrapers
npm run dev:full

# Individual service development
npm run dev:api          # Backend API only
npm run dev:frontend     # Frontend only
npm run dev:scrapers     # Scrapers only
npm run dev:n8n          # n8n workflows
```

### **Testing Strategy**
```bash
# Provider API testing
npm run test:providers

# Webhook testing
npm run test:webhooks

# Scraper testing
npm run test:scrapers

# Integration testing
npm run test:integration
```

### **Deployment Pipeline**
```bash
# Local to Production Mirror
1. git push origin main
2. Vercel auto-deploys frontend
3. DigitalOcean webhook pulls backend changes
4. Scraper containers auto-rebuild
5. n8n workflows sync via Git
```

---

## 📊 **Frontend Management Interface**

### **Provider Dashboard Page**
```
┌─────────────────────────────────────────┐
│ 🔌 Platform Integrations               │
├─────────────────────────────────────────┤
│                                         │
│ ✅ Spotify        🟢 Connected          │
│    Last sync: 2 min ago   [Test] [Edit] │
│    API Key: ••••••••      [Webhooks]    │
│                                         │
│ ✅ Instagram      🟢 Connected          │
│    Last sync: 5 min ago   [Test] [Edit] │
│    API Key: ••••••        [Webhooks]    │
│                                         │
│ ❌ YouTube        🔴 Error              │
│    API quota exceeded     [Fix] [Edit]  │
│    API Key: ••••••        [Webhooks]    │
│                                         │
├─────────────────────────────────────────┤
│ 📡 Webhook Events (Last 24h)           │
│ ✅ 47 successful  ❌ 3 failed          │
│ [View Event Log] [Test Webhooks]       │
│                                         │
│ 🤖 Scraper Health                      │
│ Spotify: 🟢 Running (98% success)      │
│ [View Jobs] [Performance Metrics]      │
└─────────────────────────────────────────┘
```

### **Webhook Event Log**
```
┌─────────────────────────────────────────┐
│ 📡 Webhook Event History               │
├─────────────────────────────────────────┤
│ Time     Event Type        Status       │
│ 14:32    data.synced       ✅ Success   │
│ 14:30    scraper.completed ✅ Success   │
│ 14:28    provider.connected❌ Failed    │
│ 14:25    data.synced       ✅ Success   │
│                                         │
│ [Filter by Provider] [Export Logs]     │
│ [Test n8n Connection] [View in n8n]    │
└─────────────────────────────────────────┘
```

---

## 🚀 **Implementation Phases**

### **Phase 2A: Foundation (Week 1)**
- [ ] Backend provider architecture
- [ ] Database schema updates
- [ ] Basic webhook infrastructure
- [ ] Frontend provider dashboard

### **Phase 2B: Spotify Integration (Week 1-2)**
- [ ] Spotify API client implementation
- [ ] OAuth flow integration
- [ ] Custom scraper Docker integration
- [ ] Webhook events for Spotify

### **Phase 2C: Frontend Management (Week 2)**
- [ ] API key management UI
- [ ] Webhook event logging
- [ ] Scraper health monitoring
- [ ] Provider testing interface

### **Phase 2D: Multi-Provider (Week 3)**
- [ ] Instagram API integration
- [ ] YouTube API integration
- [ ] Unified provider interface
- [ ] Cross-provider analytics

### **Phase 2E: Production Optimization (Week 3-4)**
- [ ] Error handling & retry logic
- [ ] Performance monitoring
- [ ] Security hardening
- [ ] Documentation & testing

---

## 🔐 **Security Considerations**

### **API Key Management**
- Encrypted storage in database
- Frontend never sees raw keys
- Rotation capability
- Audit logging

### **Webhook Security**
- HMAC signature verification
- Rate limiting
- IP whitelisting for n8n
- Event payload validation

### **Scraper Security**
- Sandboxed container execution
- Resource limits
- Anti-detection measures
- Proxy rotation capability

---

## 📈 **Success Metrics**

### **Technical KPIs**
- Provider API success rate > 99%
- Webhook delivery success > 95%
- Scraper uptime > 98%
- Average response time < 2s

### **User Experience**
- One-click provider connection
- Real-time status updates
- Clear error messaging
- Comprehensive event logging

---

This architecture provides a unified management layer for all external integrations while maintaining your local-to-production development flow. Ready to start with Phase 2A?
