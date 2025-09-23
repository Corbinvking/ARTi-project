# Unified Backend Deployment Guide

This document details the **unified single-container backend architecture** for the ARTi Marketing Platform, aligned with our [north star architecture diagram](Untitled%20diagram%20_%20Mermaid%20Chart-2025-09-21-172437.png) and [application flow](appflow.md). This setup achieves **Day 2 milestone completion** from our [4-day development roadmap](4_day_development_roadmap_internal_marketing_ops_saa_s_pm_plan.md).

## Architecture Overview

The unified backend consolidates **all services** into a single, cohesive Docker container group:
- ✅ **Supabase Stack**: Database, Auth, REST API, Storage, Realtime, Studio
- ✅ **Custom API**: Node.js/Fastify backend with JWT auth
- ✅ **Worker System**: BullMQ + Redis for background jobs
- ✅ **Automation**: n8n for workflows and notifications
- ✅ **Reverse Proxy**: Caddy for unified routing and CORS handling

## Current Implementation Status

### ✅ Completed (Day 1-2)
- **Foundation**: Supabase + Next.js + Node.js API in Docker
- **Authentication**: JWT-based auth with role-based access control (RBAC)
- **Database**: PostgreSQL with Row Level Security (RLS) policies
- **Provider Integration**: Spotify OAuth + metrics sync
- **Data Pipeline**: Worker + Redis for background job processing
- **Frontend**: Complete admin interface with user management

### ✅ Completed (Day 3) - Worker Queue System Achievement
- **Background Jobs**: BullMQ worker system processing metrics sync jobs
- **Redis Integration**: Queue management with job persistence and retry logic
- **Cron Scheduling**: Automated daily metrics sync at 2:00 AM UTC
- **Job Management API**: Manual triggers, status monitoring, and org-scoped jobs
- **Spotify Metrics**: Real metrics fetching and storage in `metrics` table
- **Queue Health**: Worker startup, job processing, and graceful shutdown

### ✅ Completed (Day 3) - Frontend-Backend Integration
- **Authentication System**: Full Supabase Auth integration with fallback logic
- **API Communication**: Next.js proxy routes bypassing CORS restrictions
- **User Management**: Complete admin interface with real-time user CRUD
- **Role-Based UI**: Dynamic tab visibility and permission-based content
- **Real-time Updates**: Frontend syncs with backend state changes
- **Error Handling**: Comprehensive error display and success notifications

### ✅ Completed (Day 3) - Admin User Management System
- **Backend API Endpoints**: Full CRUD operations for user management
- **Frontend Admin Interface**: Complete user management UI
- **CORS Resolution**: Next.js API proxy solution for browser-Docker communication
- **Data Flow Validation**: End-to-end user management working

### 🚧 In Progress (Day 3) - Current Focus
- **LLM Insights Pipeline**: RAG system with pgvector embeddings (Next Priority)
- **n8n Webhook Automation**: Event-driven notification system
- **Provider API Expansion**: Instagram, SoundCloud, YouTube integrations

## Start/Stop Commands

### Quick Start (Recommended)
```bash
# Start entire platform
./start-platform.sh

# Stop entire platform  
./stop-platform.sh
```

### Manual Control
```bash
# Start Supabase services first
npx supabase start

# Start custom services
docker-compose -p arti-marketing-ops -f docker-compose.supabase-project.yml up -d

# Stop custom services
docker-compose -p arti-marketing-ops -f docker-compose.supabase-project.yml down

# Stop Supabase services
npx supabase stop
```

## Service Endpoints

### Unified Entry Point (Port 8080) - Caddy Reverse Proxy
- **Platform Health**: `http://localhost:8080/health`
- **Custom API**: `http://localhost:8080/api/*` → `supabase_api_arti-marketing-ops:3001`
- **Supabase Services**: `http://localhost:8080/rest/v1/` → `supabase_kong_arti-marketing-ops:8000`
- **Authentication**: `http://localhost:8080/auth/*` → `supabase_kong_arti-marketing-ops:8000`
- **Storage**: `http://localhost:8080/storage/*` → `supabase_kong_arti-marketing-ops:8000`
- **n8n Automation**: `http://localhost:8080/n8n/*` → `supabase_n8n_arti-marketing-ops:5678`

### Direct Access (Development)
- **Supabase Studio**: `http://127.0.0.1:54323` (Database Management)
- **n8n Interface**: `http://127.0.0.1:5678` (Automation Designer)  
- **Custom API**: `http://127.0.0.1:3001` (Direct Backend Access)

---

This unified backend successfully implements the target architecture with all core services running in a single, manageable container group. The platform is ready for production deployment and meets all Day 2 objectives from the development roadmap.
