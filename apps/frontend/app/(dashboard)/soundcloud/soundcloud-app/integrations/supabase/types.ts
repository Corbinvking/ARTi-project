export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      analytics_aggregations: {
        Row: {
          calculated_at: string | null
          created_at: string | null
          dimensions: Json | null
          granularity: string
          id: string
          metric_name: string
          metric_value: number
          period_end: string
          period_start: string
        }
        Insert: {
          calculated_at?: string | null
          created_at?: string | null
          dimensions?: Json | null
          granularity?: string
          id?: string
          metric_name: string
          metric_value: number
          period_end: string
          period_start: string
        }
        Update: {
          calculated_at?: string | null
          created_at?: string | null
          dimensions?: Json | null
          granularity?: string
          id?: string
          metric_name?: string
          metric_value?: number
          period_end?: string
          period_start?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          context: Json | null
          event_name: string
          event_type: string
          id: string
          properties: Json | null
          session_id: string | null
          timestamp: string | null
          user_id: string | null
        }
        Insert: {
          context?: Json | null
          event_name: string
          event_type: string
          id?: string
          properties?: Json | null
          session_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Update: {
          context?: Json | null
          event_name?: string
          event_type?: string
          id?: string
          properties?: Json | null
          session_id?: string | null
          timestamp?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      attribution_snapshots: {
        Row: {
          collected_at: string | null
          collection_source: string | null
          comments: number | null
          day_index: number
          followers: number | null
          id: string
          likes: number | null
          metadata: Json | null
          parent_id: string
          parent_type: string
          plays: number | null
          reposts: number | null
          snapshot_date: string
        }
        Insert: {
          collected_at?: string | null
          collection_source?: string | null
          comments?: number | null
          day_index: number
          followers?: number | null
          id?: string
          likes?: number | null
          metadata?: Json | null
          parent_id: string
          parent_type: string
          plays?: number | null
          reposts?: number | null
          snapshot_date: string
        }
        Update: {
          collected_at?: string | null
          collection_source?: string | null
          comments?: number | null
          day_index?: number
          followers?: number | null
          id?: string
          likes?: number | null
          metadata?: Json | null
          parent_id?: string
          parent_type?: string
          plays?: number | null
          reposts?: number | null
          snapshot_date?: string
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          id: string
          ip_address: unknown | null
          resource_id: string | null
          resource_type: string
          risk_score: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type: string
          risk_score?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string
          risk_score?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      automation_health: {
        Row: {
          automation_name: string
          created_at: string
          error_count: number | null
          id: string
          last_error_at: string | null
          last_error_message: string | null
          last_run_at: string | null
          last_success_at: string | null
          status: string
          success_count: number | null
          total_runs: number | null
          updated_at: string
        }
        Insert: {
          automation_name: string
          created_at?: string
          error_count?: number | null
          id?: string
          last_error_at?: string | null
          last_error_message?: string | null
          last_run_at?: string | null
          last_success_at?: string | null
          status?: string
          success_count?: number | null
          total_runs?: number | null
          updated_at?: string
        }
        Update: {
          automation_name?: string
          created_at?: string
          error_count?: number | null
          id?: string
          last_error_at?: string | null
          last_error_message?: string | null
          last_run_at?: string | null
          last_success_at?: string | null
          status?: string
          success_count?: number | null
          total_runs?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      automation_logs: {
        Row: {
          bounced_at: string | null
          clicked_at: string | null
          created_at: string | null
          delivered_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          opened_at: string | null
          parent_id: string | null
          parent_type: string | null
          provider_message_id: string | null
          recipient_email: string
          recipient_member_id: string | null
          retry_count: number | null
          sent_at: string | null
          status: Database["public"]["Enums"]["automation_status"] | null
          subject: string | null
          template_key: string
          variables_used: Json | null
        }
        Insert: {
          bounced_at?: string | null
          clicked_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          parent_id?: string | null
          parent_type?: string | null
          provider_message_id?: string | null
          recipient_email: string
          recipient_member_id?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["automation_status"] | null
          subject?: string | null
          template_key: string
          variables_used?: Json | null
        }
        Update: {
          bounced_at?: string | null
          clicked_at?: string | null
          created_at?: string | null
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          parent_id?: string | null
          parent_type?: string | null
          provider_message_id?: string | null
          recipient_email?: string
          recipient_member_id?: string | null
          retry_count?: number | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["automation_status"] | null
          subject?: string | null
          template_key?: string
          variables_used?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "automation_logs_recipient_member_id_fkey"
            columns: ["recipient_member_id"]
            isOneToOne: false
            referencedRelation: "member_performance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "automation_logs_recipient_member_id_fkey"
            columns: ["recipient_member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_templates: {
        Row: {
          body_html: string
          body_text: string | null
          created_at: string | null
          created_by: string | null
          enabled: boolean | null
          id: string
          name: string
          subject: string
          template_key: string
          trigger_events: string[] | null
          updated_at: string | null
          updated_by: string | null
          variables: Json | null
        }
        Insert: {
          body_html: string
          body_text?: string | null
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          id?: string
          name: string
          subject: string
          template_key: string
          trigger_events?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
          variables?: Json | null
        }
        Update: {
          body_html?: string
          body_text?: string | null
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          id?: string
          name?: string
          subject?: string
          template_key?: string
          trigger_events?: string[] | null
          updated_at?: string | null
          updated_by?: string | null
          variables?: Json | null
        }
        Relationships: []
      }
      avoid_list_items: {
        Row: {
          avoided_handle: string
          created_at: string | null
          id: string
          member_id: string
          platform: string | null
          reason: string | null
        }
        Insert: {
          avoided_handle: string
          created_at?: string | null
          id?: string
          member_id: string
          platform?: string | null
          reason?: string | null
        }
        Update: {
          avoided_handle?: string
          created_at?: string | null
          id?: string
          member_id?: string
          platform?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "avoid_list_items_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_performance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "avoid_list_items_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_automations: {
        Row: {
          automation_name: string
          campaign_id: string | null
          created_at: string
          error_message: string | null
          executed_at: string | null
          id: string
          result: Json | null
          scheduled_at: string | null
          status: string
          trigger_type: string
          updated_at: string
        }
        Insert: {
          automation_name: string
          campaign_id?: string | null
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          result?: Json | null
          scheduled_at?: string | null
          status?: string
          trigger_type: string
          updated_at?: string
        }
        Update: {
          automation_name?: string
          campaign_id?: string | null
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          id?: string
          result?: Json | null
          scheduled_at?: string | null
          status?: string
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_automations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "soundcloud_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_receipt_links: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          proof_url: string | null
          reach_amount: number
          scheduled_date: string | null
          status: string
          submission_id: string | null
          supporter_handle: string | null
          supporter_name: string | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          proof_url?: string | null
          reach_amount?: number
          scheduled_date?: string | null
          status?: string
          submission_id?: string | null
          supporter_handle?: string | null
          supporter_name?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          proof_url?: string | null
          reach_amount?: number
          scheduled_date?: string | null
          status?: string
          submission_id?: string | null
          supporter_handle?: string | null
          supporter_name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_receipt_links_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          artist_name: string
          attribution_end_date: string | null
          baseline_captured_at: string | null
          client_id: string | null
          created_at: string | null
          created_by: string | null
          date_requested: string | null
          end_date: string | null
          goal_reposts: number | null
          id: string
          invoice_status: string | null
          ip_tracking_url: string | null
          metadata: Json | null
          notes: string | null
          price_usd: number | null
          salesperson_id: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["campaign_status"] | null
          submission_date: string | null
          track_name: string
          track_url: string
          updated_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          artist_name: string
          attribution_end_date?: string | null
          baseline_captured_at?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date_requested?: string | null
          end_date?: string | null
          goal_reposts?: number | null
          id?: string
          invoice_status?: string | null
          ip_tracking_url?: string | null
          metadata?: Json | null
          notes?: string | null
          price_usd?: number | null
          salesperson_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          submission_date?: string | null
          track_name: string
          track_url: string
          updated_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          artist_name?: string
          attribution_end_date?: string | null
          baseline_captured_at?: string | null
          client_id?: string | null
          created_at?: string | null
          created_by?: string | null
          date_requested?: string | null
          end_date?: string | null
          goal_reposts?: number | null
          id?: string
          invoice_status?: string | null
          ip_tracking_url?: string | null
          metadata?: Json | null
          notes?: string | null
          price_usd?: number | null
          salesperson_id?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          submission_date?: string | null
          track_name?: string
          track_url?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "soundcloud_clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_campaigns_client_id"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company: string | null
          created_at: string | null
          email: string
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string | null
          email: string
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      communication_integrations: {
        Row: {
          bot_token: string | null
          channel: string | null
          created_at: string | null
          created_by: string | null
          enabled: boolean | null
          id: string
          name: string
          notification_types: Json | null
          platform: string
          updated_at: string | null
          webhook_url: string
        }
        Insert: {
          bot_token?: string | null
          channel?: string | null
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          id?: string
          name: string
          notification_types?: Json | null
          platform: string
          updated_at?: string | null
          webhook_url: string
        }
        Update: {
          bot_token?: string | null
          channel?: string | null
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          id?: string
          name?: string
          notification_types?: Json | null
          platform?: string
          updated_at?: string | null
          webhook_url?: string
        }
        Relationships: []
      }
      complaints: {
        Row: {
          ack_sent_at: string | null
          created_at: string | null
          email: string
          id: string
          notes: string | null
          owner_id: string | null
          resend_message_ids: string[] | null
          song_url: string | null
          status: Database["public"]["Enums"]["complaint_status"] | null
          updated_at: string | null
        }
        Insert: {
          ack_sent_at?: string | null
          created_at?: string | null
          email: string
          id?: string
          notes?: string | null
          owner_id?: string | null
          resend_message_ids?: string[] | null
          song_url?: string | null
          status?: Database["public"]["Enums"]["complaint_status"] | null
          updated_at?: string | null
        }
        Update: {
          ack_sent_at?: string | null
          created_at?: string | null
          email?: string
          id?: string
          notes?: string | null
          owner_id?: string | null
          resend_message_ids?: string[] | null
          song_url?: string | null
          status?: Database["public"]["Enums"]["complaint_status"] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          delivered_at: string | null
          error_message: string | null
          id: string
          metadata: Json | null
          opened_at: string | null
          recipient_email: string
          related_object_id: string | null
          related_object_type: string | null
          resend_message_id: string | null
          sent_at: string | null
          status: string
          subject: string | null
          template_data: Json | null
          template_name: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient_email: string
          related_object_id?: string | null
          related_object_type?: string | null
          resend_message_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_data?: Json | null
          template_name: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          error_message?: string | null
          id?: string
          metadata?: Json | null
          opened_at?: string | null
          recipient_email?: string
          related_object_id?: string | null
          related_object_type?: string | null
          resend_message_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string | null
          template_data?: Json | null
          template_name?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          active: boolean
          body_html: string
          body_text: string | null
          created_at: string
          id: string
          name: string
          subject: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          active?: boolean
          body_html: string
          body_text?: string | null
          created_at?: string
          id?: string
          name: string
          subject: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          active?: boolean
          body_html?: string
          body_text?: string | null
          created_at?: string
          id?: string
          name?: string
          subject?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      genre_families: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      inquiries: {
        Row: {
          admitted_at: string | null
          admitted_group: string | null
          created_at: string | null
          email: string
          id: string
          ip_join_confirmed: boolean | null
          member_id: string | null
          name: string
          notes: string | null
          owner_id: string | null
          resend_message_ids: string[] | null
          soundcloud_url: string | null
          status: Database["public"]["Enums"]["inquiry_status"] | null
          updated_at: string | null
        }
        Insert: {
          admitted_at?: string | null
          admitted_group?: string | null
          created_at?: string | null
          email: string
          id?: string
          ip_join_confirmed?: boolean | null
          member_id?: string | null
          name: string
          notes?: string | null
          owner_id?: string | null
          resend_message_ids?: string[] | null
          soundcloud_url?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"] | null
          updated_at?: string | null
        }
        Update: {
          admitted_at?: string | null
          admitted_group?: string | null
          created_at?: string | null
          email?: string
          id?: string
          ip_join_confirmed?: boolean | null
          member_id?: string | null
          name?: string
          notes?: string | null
          owner_id?: string | null
          resend_message_ids?: string[] | null
          soundcloud_url?: string | null
          status?: Database["public"]["Enums"]["inquiry_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_performance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "inquiries_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      integration_status: {
        Row: {
          account_handle: string
          created_at: string | null
          error_count: number | null
          id: string
          last_check_at: string | null
          last_error_message: string | null
          last_success_at: string | null
          member_account_id: string | null
          metadata: Json | null
          platform: string
          reconnect_sent_at: string | null
          status: Database["public"]["Enums"]["connection_status"] | null
          updated_at: string | null
        }
        Insert: {
          account_handle: string
          created_at?: string | null
          error_count?: number | null
          id?: string
          last_check_at?: string | null
          last_error_message?: string | null
          last_success_at?: string | null
          member_account_id?: string | null
          metadata?: Json | null
          platform?: string
          reconnect_sent_at?: string | null
          status?: Database["public"]["Enums"]["connection_status"] | null
          updated_at?: string | null
        }
        Update: {
          account_handle?: string
          created_at?: string | null
          error_count?: number | null
          id?: string
          last_check_at?: string | null
          last_error_message?: string | null
          last_success_at?: string | null
          member_account_id?: string | null
          metadata?: Json | null
          platform?: string
          reconnect_sent_at?: string | null
          status?: Database["public"]["Enums"]["connection_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "integration_status_member_account_id_fkey"
            columns: ["member_account_id"]
            isOneToOne: false
            referencedRelation: "member_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      mail_events: {
        Row: {
          event_type: string
          id: string
          message_id: string
          meta: Json | null
          object_id: string
          object_type: string
          timestamp: string | null
        }
        Insert: {
          event_type: string
          id?: string
          message_id: string
          meta?: Json | null
          object_id: string
          object_type: string
          timestamp?: string | null
        }
        Update: {
          event_type?: string
          id?: string
          message_id?: string
          meta?: Json | null
          object_id?: string
          object_type?: string
          timestamp?: string | null
        }
        Relationships: []
      }
      member_accounts: {
        Row: {
          connection_data: Json | null
          created_at: string | null
          follower_count: number | null
          handle: string
          id: string
          last_synced_at: string | null
          member_id: string
          platform: string
          status: Database["public"]["Enums"]["connection_status"] | null
          updated_at: string | null
        }
        Insert: {
          connection_data?: Json | null
          created_at?: string | null
          follower_count?: number | null
          handle: string
          id?: string
          last_synced_at?: string | null
          member_id: string
          platform: string
          status?: Database["public"]["Enums"]["connection_status"] | null
          updated_at?: string | null
        }
        Update: {
          connection_data?: Json | null
          created_at?: string | null
          follower_count?: number | null
          handle?: string
          id?: string
          last_synced_at?: string | null
          member_id?: string
          platform?: string
          status?: Database["public"]["Enums"]["connection_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_accounts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_performance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "member_accounts_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      member_cohorts: {
        Row: {
          cohort_month: string
          created_at: string | null
          id: string
          last_activity_at: string | null
          member_id: string
          months_active: number[] | null
          total_credits_earned: number | null
          total_submissions: number | null
          total_supports: number | null
          updated_at: string | null
        }
        Insert: {
          cohort_month: string
          created_at?: string | null
          id?: string
          last_activity_at?: string | null
          member_id: string
          months_active?: number[] | null
          total_credits_earned?: number | null
          total_submissions?: number | null
          total_supports?: number | null
          updated_at?: string | null
        }
        Update: {
          cohort_month?: string
          created_at?: string | null
          id?: string
          last_activity_at?: string | null
          member_id?: string
          months_active?: number[] | null
          total_credits_earned?: number | null
          total_submissions?: number | null
          total_supports?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      member_genres: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          genre_family_id: string | null
          id: string
          member_id: string
          subgenre_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          genre_family_id?: string | null
          id?: string
          member_id: string
          subgenre_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          genre_family_id?: string | null
          id?: string
          member_id?: string
          subgenre_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_genres_genre_family_id_fkey"
            columns: ["genre_family_id"]
            isOneToOne: false
            referencedRelation: "genre_families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_genres_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_performance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "member_genres_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_genres_subgenre_id_fkey"
            columns: ["subgenre_id"]
            isOneToOne: false
            referencedRelation: "subgenres"
            referencedColumns: ["id"]
          },
        ]
      }
      member_import_history: {
        Row: {
          completed_at: string | null
          created_at: string | null
          errors: Json | null
          failed_imports: number | null
          filename: string | null
          id: string
          import_data: Json | null
          imported_by: string | null
          status: string | null
          successful_imports: number | null
          total_records: number | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          errors?: Json | null
          failed_imports?: number | null
          filename?: string | null
          id?: string
          import_data?: Json | null
          imported_by?: string | null
          status?: string | null
          successful_imports?: number | null
          total_records?: number | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          errors?: Json | null
          failed_imports?: number | null
          filename?: string | null
          id?: string
          import_data?: Json | null
          imported_by?: string | null
          status?: string | null
          successful_imports?: number | null
          total_records?: number | null
        }
        Relationships: []
      }
      members: {
        Row: {
          classification_source: string | null
          computed_monthly_repost_limit: number | null
          created_at: string | null
          credits_balance: number | null
          credits_cap: number | null
          credits_given: number | null
          credits_monthly_grant: number | null
          credits_used: number | null
          emails: string[] | null
          families: string[] | null
          first_name: string | null
          followers: number | null
          genre_family_id: string | null
          genre_notes: string | null
          groups: string[] | null
          id: string
          influence_planner_status:
            | Database["public"]["Enums"]["influence_planner_status"]
            | null
          last_activity_at: string | null
          last_classified_at: string | null
          last_follower_sync_at: string | null
          last_grant_at: string | null
          last_submission_at: string | null
          manual_genres: string[] | null
          manual_monthly_repost_override: number | null
          monthly_credit_limit: number | null
          monthly_repost_limit: number | null
          name: string
          net_credits: number | null
          override_reason: string | null
          override_set_at: string | null
          override_set_by: string | null
          primary_email: string | null
          reach_factor: number | null
          size_tier: Database["public"]["Enums"]["size_tier"] | null
          soundcloud_followers: number | null
          soundcloud_handle: string | null
          soundcloud_url: string | null
          spotify_handle: string | null
          stage_name: string | null
          status: Database["public"]["Enums"]["member_status"] | null
          subgenres: string[] | null
          submissions_this_month: number | null
          tier_updated_at: string | null
          updated_at: string | null
        }
        Insert: {
          classification_source?: string | null
          computed_monthly_repost_limit?: number | null
          created_at?: string | null
          credits_balance?: number | null
          credits_cap?: number | null
          credits_given?: number | null
          credits_monthly_grant?: number | null
          credits_used?: number | null
          emails?: string[] | null
          families?: string[] | null
          first_name?: string | null
          followers?: number | null
          genre_family_id?: string | null
          genre_notes?: string | null
          groups?: string[] | null
          id?: string
          influence_planner_status?:
            | Database["public"]["Enums"]["influence_planner_status"]
            | null
          last_activity_at?: string | null
          last_classified_at?: string | null
          last_follower_sync_at?: string | null
          last_grant_at?: string | null
          last_submission_at?: string | null
          manual_genres?: string[] | null
          manual_monthly_repost_override?: number | null
          monthly_credit_limit?: number | null
          monthly_repost_limit?: number | null
          name: string
          net_credits?: number | null
          override_reason?: string | null
          override_set_at?: string | null
          override_set_by?: string | null
          primary_email?: string | null
          reach_factor?: number | null
          size_tier?: Database["public"]["Enums"]["size_tier"] | null
          soundcloud_followers?: number | null
          soundcloud_handle?: string | null
          soundcloud_url?: string | null
          spotify_handle?: string | null
          stage_name?: string | null
          status?: Database["public"]["Enums"]["member_status"] | null
          subgenres?: string[] | null
          submissions_this_month?: number | null
          tier_updated_at?: string | null
          updated_at?: string | null
        }
        Update: {
          classification_source?: string | null
          computed_monthly_repost_limit?: number | null
          created_at?: string | null
          credits_balance?: number | null
          credits_cap?: number | null
          credits_given?: number | null
          credits_monthly_grant?: number | null
          credits_used?: number | null
          emails?: string[] | null
          families?: string[] | null
          first_name?: string | null
          followers?: number | null
          genre_family_id?: string | null
          genre_notes?: string | null
          groups?: string[] | null
          id?: string
          influence_planner_status?:
            | Database["public"]["Enums"]["influence_planner_status"]
            | null
          last_activity_at?: string | null
          last_classified_at?: string | null
          last_follower_sync_at?: string | null
          last_grant_at?: string | null
          last_submission_at?: string | null
          manual_genres?: string[] | null
          manual_monthly_repost_override?: number | null
          monthly_credit_limit?: number | null
          monthly_repost_limit?: number | null
          name?: string
          net_credits?: number | null
          override_reason?: string | null
          override_set_at?: string | null
          override_set_by?: string | null
          primary_email?: string | null
          reach_factor?: number | null
          size_tier?: Database["public"]["Enums"]["size_tier"] | null
          soundcloud_followers?: number | null
          soundcloud_handle?: string | null
          soundcloud_url?: string | null
          spotify_handle?: string | null
          stage_name?: string | null
          status?: Database["public"]["Enums"]["member_status"] | null
          subgenres?: string[] | null
          submissions_this_month?: number | null
          tier_updated_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_genre_family_id_fkey"
            columns: ["genre_family_id"]
            isOneToOne: false
            referencedRelation: "genre_families"
            referencedColumns: ["id"]
          },
        ]
      }
      ml_predictions: {
        Row: {
          confidence_score: number | null
          created_at: string
          expires_at: string | null
          id: string
          metadata: Json | null
          model_name: string
          prediction_data: Json
          prediction_type: string
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          confidence_score?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          model_name: string
          prediction_data?: Json
          prediction_type: string
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          confidence_score?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          metadata?: Json | null
          model_name?: string
          prediction_data?: Json
          prediction_type?: string
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      performance_metrics: {
        Row: {
          alert_threshold: number | null
          dimensions: Json | null
          id: string
          metric_name: string
          metric_unit: string | null
          metric_value: number
          service_name: string
          status: string | null
          timestamp: string
        }
        Insert: {
          alert_threshold?: number | null
          dimensions?: Json | null
          id?: string
          metric_name: string
          metric_unit?: string | null
          metric_value: number
          service_name: string
          status?: string | null
          timestamp?: string
        }
        Update: {
          alert_threshold?: number | null
          dimensions?: Json | null
          id?: string
          metric_name?: string
          metric_unit?: string | null
          metric_value?: number
          service_name?: string
          status?: string | null
          timestamp?: string
        }
        Relationships: []
      }
      queue_assignments: {
        Row: {
          completed_at: string | null
          created_at: string
          credits_allocated: number
          id: string
          position: number
          proof_submitted_at: string | null
          proof_url: string | null
          queue_id: string
          status: string
          submission_id: string
          supporter_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          credits_allocated?: number
          id?: string
          position: number
          proof_submitted_at?: string | null
          proof_url?: string | null
          queue_id: string
          status?: string
          submission_id: string
          supporter_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          credits_allocated?: number
          id?: string
          position?: number
          proof_submitted_at?: string | null
          proof_url?: string | null
          queue_id?: string
          status?: string
          submission_id?: string
          supporter_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_assignments_queue_id_fkey"
            columns: ["queue_id"]
            isOneToOne: false
            referencedRelation: "queues"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_assignments_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "queue_assignments_supporter_id_fkey"
            columns: ["supporter_id"]
            isOneToOne: false
            referencedRelation: "member_performance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "queue_assignments_supporter_id_fkey"
            columns: ["supporter_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      queues: {
        Row: {
          approved_at: string | null
          approved_by_id: string | null
          created_at: string
          created_by_id: string | null
          date: string
          filled_slots: number
          id: string
          notes: string | null
          published_at: string | null
          status: string
          total_slots: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by_id?: string | null
          created_at?: string
          created_by_id?: string | null
          date: string
          filled_slots?: number
          id?: string
          notes?: string | null
          published_at?: string | null
          status?: string
          total_slots?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by_id?: string | null
          created_at?: string
          created_by_id?: string | null
          date?: string
          filled_slots?: number
          id?: string
          notes?: string | null
          published_at?: string | null
          status?: string
          total_slots?: number
          updated_at?: string
        }
        Relationships: []
      }
      reporting_configurations: {
        Row: {
          config: Json
          created_at: string | null
          created_by: string | null
          enabled: boolean | null
          format: string | null
          id: string
          last_run_at: string | null
          name: string
          report_type: string
          schedule_config: Json | null
          schedule_type: string | null
          updated_at: string | null
        }
        Insert: {
          config?: Json
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          format?: string | null
          id?: string
          last_run_at?: string | null
          name: string
          report_type: string
          schedule_config?: Json | null
          schedule_type?: string | null
          updated_at?: string | null
        }
        Update: {
          config?: Json
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          format?: string | null
          id?: string
          last_run_at?: string | null
          name?: string
          report_type?: string
          schedule_config?: Json | null
          schedule_type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      repost_credit_ledger: {
        Row: {
          balance_after: number
          change_amount: number
          created_at: string | null
          created_by: string | null
          id: string
          member_id: string
          metadata: Json | null
          reason: string
          reference_id: string | null
          reference_type: string | null
        }
        Insert: {
          balance_after: number
          change_amount: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          member_id: string
          metadata?: Json | null
          reason: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Update: {
          balance_after?: number
          change_amount?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          member_id?: string
          metadata?: Json | null
          reason?: string
          reference_id?: string | null
          reference_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repost_credit_ledger_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_performance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "repost_credit_ledger_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      repost_credit_wallet: {
        Row: {
          balance: number
          cap: number
          created_at: string | null
          id: string
          last_granted_at: string | null
          member_id: string
          monthly_grant: number
          updated_at: string | null
        }
        Insert: {
          balance?: number
          cap?: number
          created_at?: string | null
          id?: string
          last_granted_at?: string | null
          member_id: string
          monthly_grant?: number
          updated_at?: string | null
        }
        Update: {
          balance?: number
          cap?: number
          created_at?: string | null
          id?: string
          last_granted_at?: string | null
          member_id?: string
          monthly_grant?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "repost_credit_wallet_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "member_performance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "repost_credit_wallet_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: true
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      schedules: {
        Row: {
          completed_at: string | null
          created_at: string | null
          credits_allocated: number | null
          error_message: string | null
          id: string
          ip_schedule_id: string | null
          member_account_id: string | null
          parent_id: string
          parent_type: string
          proof_url: string | null
          retry_count: number | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["schedule_status"] | null
          target_handle: string
          updated_at: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          credits_allocated?: number | null
          error_message?: string | null
          id?: string
          ip_schedule_id?: string | null
          member_account_id?: string | null
          parent_id: string
          parent_type: string
          proof_url?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["schedule_status"] | null
          target_handle: string
          updated_at?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          credits_allocated?: number | null
          error_message?: string | null
          id?: string
          ip_schedule_id?: string | null
          member_account_id?: string | null
          parent_id?: string
          parent_type?: string
          proof_url?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["schedule_status"] | null
          target_handle?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "schedules_member_account_id_fkey"
            columns: ["member_account_id"]
            isOneToOne: false
            referencedRelation: "member_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      scraping_history: {
        Row: {
          created_at: string | null
          data_scraped: Json | null
          error_message: string | null
          id: string
          platform: string
          response_time_ms: number | null
          retry_count: number | null
          scraped_at: string | null
          status: string
          target_handle: string | null
          target_type: string
          target_url: string
        }
        Insert: {
          created_at?: string | null
          data_scraped?: Json | null
          error_message?: string | null
          id?: string
          platform?: string
          response_time_ms?: number | null
          retry_count?: number | null
          scraped_at?: string | null
          status?: string
          target_handle?: string | null
          target_type: string
          target_url: string
        }
        Update: {
          created_at?: string | null
          data_scraped?: Json | null
          error_message?: string | null
          id?: string
          platform?: string
          response_time_ms?: number | null
          retry_count?: number | null
          scraped_at?: string | null
          status?: string
          target_handle?: string | null
          target_type?: string
          target_url?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          adjacency_matrix: Json | null
          created_at: string | null
          decision_sla_hours: number | null
          default_reach_factor: number | null
          id: string
          inactivity_days: number | null
          ip_api_key: string | null
          ip_base_url: string | null
          ip_username: string | null
          preview_cache_days: number | null
          proof_sla_hours: number | null
          size_tier_thresholds: Json | null
          slack_channel: string | null
          slack_enabled: boolean | null
          slack_webhook: string | null
          target_band_mode:
            | Database["public"]["Enums"]["target_band_mode"]
            | null
          updated_at: string | null
        }
        Insert: {
          adjacency_matrix?: Json | null
          created_at?: string | null
          decision_sla_hours?: number | null
          default_reach_factor?: number | null
          id?: string
          inactivity_days?: number | null
          ip_api_key?: string | null
          ip_base_url?: string | null
          ip_username?: string | null
          preview_cache_days?: number | null
          proof_sla_hours?: number | null
          size_tier_thresholds?: Json | null
          slack_channel?: string | null
          slack_enabled?: boolean | null
          slack_webhook?: string | null
          target_band_mode?:
            | Database["public"]["Enums"]["target_band_mode"]
            | null
          updated_at?: string | null
        }
        Update: {
          adjacency_matrix?: Json | null
          created_at?: string | null
          decision_sla_hours?: number | null
          default_reach_factor?: number | null
          id?: string
          inactivity_days?: number | null
          ip_api_key?: string | null
          ip_base_url?: string | null
          ip_username?: string | null
          preview_cache_days?: number | null
          proof_sla_hours?: number | null
          size_tier_thresholds?: Json | null
          slack_channel?: string | null
          slack_enabled?: boolean | null
          slack_webhook?: string | null
          target_band_mode?:
            | Database["public"]["Enums"]["target_band_mode"]
            | null
          updated_at?: string | null
        }
        Relationships: []
      }
      soundcloud_campaigns: {
        Row: {
          artist_name: string
          campaign_type: string
          client_id: string
          created_at: string
          goals: number | null
          id: string
          invoice_status: string | null
          metadata: Json | null
          notes: string | null
          playlist_url: string | null
          receipt_url: string | null
          remaining_metrics: number | null
          sales_price: number | null
          salesperson_id: string | null
          start_date: string | null
          status: string
          submission_date: string | null
          track_name: string
          track_url: string
          updated_at: string
          weekly_reporting_enabled: boolean | null
        }
        Insert: {
          artist_name: string
          campaign_type?: string
          client_id: string
          created_at?: string
          goals?: number | null
          id?: string
          invoice_status?: string | null
          metadata?: Json | null
          notes?: string | null
          playlist_url?: string | null
          receipt_url?: string | null
          remaining_metrics?: number | null
          sales_price?: number | null
          salesperson_id?: string | null
          start_date?: string | null
          status?: string
          submission_date?: string | null
          track_name: string
          track_url: string
          updated_at?: string
          weekly_reporting_enabled?: boolean | null
        }
        Update: {
          artist_name?: string
          campaign_type?: string
          client_id?: string
          created_at?: string
          goals?: number | null
          id?: string
          invoice_status?: string | null
          metadata?: Json | null
          notes?: string | null
          playlist_url?: string | null
          receipt_url?: string | null
          remaining_metrics?: number | null
          sales_price?: number | null
          salesperson_id?: string | null
          start_date?: string | null
          status?: string
          submission_date?: string | null
          track_name?: string
          track_url?: string
          updated_at?: string
          weekly_reporting_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "soundcloud_campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "soundcloud_clients"
            referencedColumns: ["id"]
          },
        ]
      }
      soundcloud_clients: {
        Row: {
          contact_info: Json | null
          created_at: string
          email: string
          id: string
          member_id: string | null
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          contact_info?: Json | null
          created_at?: string
          email: string
          id?: string
          member_id?: string | null
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          contact_info?: Json | null
          created_at?: string
          email?: string
          id?: string
          member_id?: string | null
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      subgenres: {
        Row: {
          active: boolean | null
          created_at: string | null
          family_id: string
          id: string
          name: string
          order_index: number | null
          patterns: string[] | null
          updated_at: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          family_id: string
          id?: string
          name: string
          order_index?: number | null
          patterns?: string[] | null
          updated_at?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          family_id?: string
          id?: string
          name?: string
          order_index?: number | null
          patterns?: string[] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subgenres_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "genre_families"
            referencedColumns: ["id"]
          },
        ]
      }
      submissions: {
        Row: {
          alternative_url: string | null
          artist_name: string | null
          auto_shifted: boolean | null
          created_at: string | null
          credits_consumed: number | null
          expected_reach_max: number | null
          expected_reach_min: number | null
          expected_reach_planned: number | null
          family: string | null
          id: string
          ip_schedule_ids: string[] | null
          ip_tracking_url: string | null
          member_id: string
          need_live_link: boolean | null
          notes: string | null
          owner_id: string | null
          qa_flag: boolean | null
          qa_reason: string | null
          release_date: string | null
          resend_message_ids: string[] | null
          scheduled_date: string | null
          secondary_email: string | null
          shift_reason: string | null
          status: Database["public"]["Enums"]["submission_status"] | null
          subgenres: string[] | null
          submitted_at: string | null
          suggested_supporters: string[] | null
          support_date: string | null
          support_url: string | null
          track_name: string | null
          track_url: string
          updated_at: string | null
        }
        Insert: {
          alternative_url?: string | null
          artist_name?: string | null
          auto_shifted?: boolean | null
          created_at?: string | null
          credits_consumed?: number | null
          expected_reach_max?: number | null
          expected_reach_min?: number | null
          expected_reach_planned?: number | null
          family?: string | null
          id?: string
          ip_schedule_ids?: string[] | null
          ip_tracking_url?: string | null
          member_id: string
          need_live_link?: boolean | null
          notes?: string | null
          owner_id?: string | null
          qa_flag?: boolean | null
          qa_reason?: string | null
          release_date?: string | null
          resend_message_ids?: string[] | null
          scheduled_date?: string | null
          secondary_email?: string | null
          shift_reason?: string | null
          status?: Database["public"]["Enums"]["submission_status"] | null
          subgenres?: string[] | null
          submitted_at?: string | null
          suggested_supporters?: string[] | null
          support_date?: string | null
          support_url?: string | null
          track_name?: string | null
          track_url: string
          updated_at?: string | null
        }
        Update: {
          alternative_url?: string | null
          artist_name?: string | null
          auto_shifted?: boolean | null
          created_at?: string | null
          credits_consumed?: number | null
          expected_reach_max?: number | null
          expected_reach_min?: number | null
          expected_reach_planned?: number | null
          family?: string | null
          id?: string
          ip_schedule_ids?: string[] | null
          ip_tracking_url?: string | null
          member_id?: string
          need_live_link?: boolean | null
          notes?: string | null
          owner_id?: string | null
          qa_flag?: boolean | null
          qa_reason?: string | null
          release_date?: string | null
          resend_message_ids?: string[] | null
          scheduled_date?: string | null
          secondary_email?: string | null
          shift_reason?: string | null
          status?: Database["public"]["Enums"]["submission_status"] | null
          subgenres?: string[] | null
          submitted_at?: string | null
          suggested_supporters?: string[] | null
          support_date?: string | null
          support_url?: string | null
          track_name?: string | null
          track_url?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "submissions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "member_performance_summary"
            referencedColumns: ["member_id"]
          },
          {
            foreignKeyName: "submissions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      system_health_scores: {
        Row: {
          component_name: string
          created_at: string
          health_score: number
          id: string
          last_check_at: string
          metrics: Json | null
          status: string
        }
        Insert: {
          component_name: string
          created_at?: string
          health_score: number
          id?: string
          last_check_at?: string
          metrics?: Json | null
          status?: string
        }
        Update: {
          component_name?: string
          created_at?: string
          health_score?: number
          id?: string
          last_check_at?: string
          metrics?: Json | null
          status?: string
        }
        Relationships: []
      }
      target_proposals: {
        Row: {
          conflicts: Json | null
          created_at: string | null
          created_by: string | null
          criteria: Json
          estimated_credits: number | null
          expires_at: string | null
          id: string
          parent_id: string
          parent_type: string
          proposed_targets: Json
          total_capacity: number | null
        }
        Insert: {
          conflicts?: Json | null
          created_at?: string | null
          created_by?: string | null
          criteria?: Json
          estimated_credits?: number | null
          expires_at?: string | null
          id?: string
          parent_id: string
          parent_type: string
          proposed_targets?: Json
          total_capacity?: number | null
        }
        Update: {
          conflicts?: Json | null
          created_at?: string | null
          created_by?: string | null
          criteria?: Json
          estimated_credits?: number | null
          expires_at?: string | null
          id?: string
          parent_id?: string
          parent_type?: string
          proposed_targets?: Json
          total_capacity?: number | null
        }
        Relationships: []
      }
      track_metrics: {
        Row: {
          artist_handle: string | null
          collected_at: string | null
          comment_count: number | null
          id: string
          like_count: number | null
          play_count: number | null
          repost_count: number | null
          source: string | null
          track_title: string | null
          track_url: string
        }
        Insert: {
          artist_handle?: string | null
          collected_at?: string | null
          comment_count?: number | null
          id?: string
          like_count?: number | null
          play_count?: number | null
          repost_count?: number | null
          source?: string | null
          track_title?: string | null
          track_url: string
        }
        Update: {
          artist_handle?: string | null
          collected_at?: string | null
          comment_count?: number | null
          id?: string
          like_count?: number | null
          play_count?: number | null
          repost_count?: number | null
          source?: string | null
          track_title?: string | null
          track_url?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          id: string
          preference_category: string
          preference_key: string
          preference_value: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          preference_category: string
          preference_key: string
          preference_value: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          preference_category?: string
          preference_key?: string
          preference_value?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      webhook_configs: {
        Row: {
          created_at: string | null
          created_by: string | null
          enabled: boolean | null
          events: Json | null
          headers: Json | null
          id: string
          name: string
          retry_attempts: number | null
          secret_token: string | null
          timeout_seconds: number | null
          updated_at: string | null
          url: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          events?: Json | null
          headers?: Json | null
          id?: string
          name: string
          retry_attempts?: number | null
          secret_token?: string | null
          timeout_seconds?: number | null
          updated_at?: string | null
          url: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          enabled?: boolean | null
          events?: Json | null
          headers?: Json | null
          id?: string
          name?: string
          retry_attempts?: number | null
          secret_token?: string | null
          timeout_seconds?: number | null
          updated_at?: string | null
          url?: string
        }
        Relationships: []
      }
    }
    Views: {
      campaign_attribution_analytics: {
        Row: {
          artist_name: string | null
          baseline_comments: number | null
          baseline_date: string | null
          baseline_likes: number | null
          baseline_plays: number | null
          baseline_reposts: number | null
          campaign_id: string | null
          comments_gained: number | null
          cost_per_play: number | null
          cost_per_repost: number | null
          current_comments: number | null
          current_likes: number | null
          current_plays: number | null
          current_reposts: number | null
          days_tracked: number | null
          end_date: string | null
          goal_reposts: number | null
          latest_date: string | null
          likes_gained: number | null
          plays_gained: number | null
          price_usd: number | null
          repost_goal_progress_pct: number | null
          reposts_gained: number | null
          start_date: string | null
          status: Database["public"]["Enums"]["campaign_status"] | null
          track_name: string | null
          track_url: string | null
        }
        Relationships: []
      }
      member_performance_summary: {
        Row: {
          approved_submissions: number | null
          avg_reach: number | null
          completed_assignments: number | null
          days_since_joined: number | null
          member_id: string | null
          name: string | null
          net_credits: number | null
          pending_submissions: number | null
          rejected_submissions: number | null
          size_tier: Database["public"]["Enums"]["size_tier"] | null
          status: Database["public"]["Enums"]["member_status"] | null
          total_queue_assignments: number | null
          total_submissions: number | null
        }
        Relationships: []
      }
      revenue_summary: {
        Row: {
          avg_campaign_value: number | null
          completed_campaigns: number | null
          live_campaigns: number | null
          month: string | null
          scheduled_campaigns: number | null
          total_campaigns: number | null
          total_goal_reposts: number | null
          total_revenue: number | null
          unique_clients: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      calculate_repost_limit: {
        Args: { follower_count: number; manual_override?: number }
        Returns: number
      }
      call_send_notification_email: {
        Args: {
          email_to: string
          notification_message?: string
          notification_title?: string
          notification_type?: string
          related_object_id?: string
          related_object_type?: string
          template_data: Json
          template_name: string
          user_id_param?: string
        }
        Returns: undefined
      }
      check_user_is_member: {
        Args: { _user_email: string }
        Returns: boolean
      }
      get_member_for_user: {
        Args: { _user_email: string }
        Returns: {
          emails: string[]
          id: string
          monthly_submission_limit: number
          name: string
          net_credits: number
          primary_email: string
          size_tier: Database["public"]["Enums"]["size_tier"]
          status: Database["public"]["Enums"]["member_status"]
          submissions_this_month: number
        }[]
      }
      get_member_id_for_user: {
        Args: { _user_id: string }
        Returns: string
      }
      get_user_roles: {
        Args: { _user_id: string }
        Returns: {
          role: Database["public"]["Enums"]["app_role"]
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      log_audit_event: {
        Args: {
          _action: string
          _details?: Json
          _resource_id?: string
          _resource_type: string
          _risk_score?: number
          _user_id: string
        }
        Returns: undefined
      }
      refresh_analytics_views: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      send_notification_email: {
        Args: {
          email_to: string
          notification_message?: string
          notification_title?: string
          notification_type?: Database["public"]["Enums"]["notification_type"]
          target_user_id?: string
          template_data?: Json
          template_name: string
        }
        Returns: undefined
      }
      update_automation_health: {
        Args: {
          _automation_name: string
          _error_message?: string
          _success: boolean
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "member"
      automation_status:
        | "sent"
        | "delivered"
        | "opened"
        | "clicked"
        | "bounced"
        | "failed"
      campaign_status:
        | "intake"
        | "draft"
        | "scheduled"
        | "live"
        | "completed"
        | "paused"
      complaint_status: "todo" | "in_progress" | "done"
      connection_status: "linked" | "reconnect" | "disconnected" | "error"
      influence_planner_status:
        | "hasnt_logged_in"
        | "invited"
        | "disconnected"
        | "connected"
        | "uninterested"
      inquiry_status: "undecided" | "admitted" | "rejected"
      member_status: "active" | "needs_reconnect"
      notification_type:
        | "info"
        | "success"
        | "warning"
        | "error"
        | "submission"
        | "inquiry"
        | "queue"
        | "support"
      schedule_status:
        | "pending"
        | "scheduled"
        | "completed"
        | "failed"
        | "cancelled"
      size_tier: "T1" | "T2" | "T3" | "T4"
      submission_status: "new" | "approved" | "rejected" | "pending" | "qa_flag"
      target_band_mode: "balance" | "size"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "member"],
      automation_status: [
        "sent",
        "delivered",
        "opened",
        "clicked",
        "bounced",
        "failed",
      ],
      campaign_status: [
        "intake",
        "draft",
        "scheduled",
        "live",
        "completed",
        "paused",
      ],
      complaint_status: ["todo", "in_progress", "done"],
      connection_status: ["linked", "reconnect", "disconnected", "error"],
      influence_planner_status: [
        "hasnt_logged_in",
        "invited",
        "disconnected",
        "connected",
        "uninterested",
      ],
      inquiry_status: ["undecided", "admitted", "rejected"],
      member_status: ["active", "needs_reconnect"],
      notification_type: [
        "info",
        "success",
        "warning",
        "error",
        "submission",
        "inquiry",
        "queue",
        "support",
      ],
      schedule_status: [
        "pending",
        "scheduled",
        "completed",
        "failed",
        "cancelled",
      ],
      size_tier: ["T1", "T2", "T3", "T4"],
      submission_status: ["new", "approved", "rejected", "pending", "qa_flag"],
      target_band_mode: ["balance", "size"],
    },
  },
} as const
