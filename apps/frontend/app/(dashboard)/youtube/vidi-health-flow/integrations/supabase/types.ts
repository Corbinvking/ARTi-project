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
      campaign_milestones: {
        Row: {
          achieved_at: string | null
          campaign_id: string | null
          created_at: string | null
          id: string
          milestone_percentage: number
          notification_sent: boolean | null
          views_at_milestone: number
        }
        Insert: {
          achieved_at?: string | null
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          milestone_percentage: number
          notification_sent?: boolean | null
          views_at_milestone?: number
        }
        Update: {
          achieved_at?: string | null
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          milestone_percentage?: number
          notification_sent?: boolean | null
          views_at_milestone?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_milestones_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_stats_daily: {
        Row: {
          campaign_id: string
          collected_at: string | null
          comments: number | null
          created_at: string | null
          date: string
          id: string
          likes: number | null
          subscribers_gained: number | null
          time_of_day: string | null
          total_subscribers: number | null
          views: number | null
          watch_time_minutes: number | null
        }
        Insert: {
          campaign_id: string
          collected_at?: string | null
          comments?: number | null
          created_at?: string | null
          date: string
          id?: string
          likes?: number | null
          subscribers_gained?: number | null
          time_of_day?: string | null
          total_subscribers?: number | null
          views?: number | null
          watch_time_minutes?: number | null
        }
        Update: {
          campaign_id?: string
          collected_at?: string | null
          comments?: number | null
          created_at?: string | null
          date?: string
          id?: string
          likes?: number | null
          subscribers_gained?: number | null
          time_of_day?: string | null
          total_subscribers?: number | null
          views?: number | null
          watch_time_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_stats_daily_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          artist_tier: number | null
          ask_for_access: boolean | null
          calculated_vendor_payment: number | null
          campaign_name: string
          channel_id: string | null
          client_id: string | null
          comment_server: string | null
          comments_7_days: number | null
          comments_sheet_url: string | null
          confirm_start_date: boolean | null
          created_at: string
          current_comments: number | null
          current_likes: number | null
          current_views: number | null
          custom_service_type: string | null
          desired_daily: number | null
          end_date: string | null
          genre: string | null
          goal_views: number | null
          id: string
          impression_ctr: number | null
          in_fixer: boolean | null
          invoice_status: Database["public"]["Enums"]["invoice_status"] | null
          last_stalling_check: string | null
          last_weekly_update_sent: string | null
          last_youtube_fetch: string | null
          like_server: string | null
          likes_7_days: number | null
          manual_progress: number
          minimum_engagement: number | null
          needs_update: boolean | null
          paid_reach: boolean | null
          payment_calculation_date: string | null
          sale_price: number | null
          salesperson_id: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          service_types: Json | null
          sheet_tier: string | null
          stalling_detected_at: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["campaign_status"] | null
          subscribers_gained: number | null
          subscribers_hidden: boolean | null
          technical_setup_complete: boolean
          total_subscribers: number | null
          updated_at: string
          vendor_paid: boolean
          video_id: string | null
          views_7_days: number | null
          views_stalled: boolean | null
          wait_time_seconds: number | null
          watch_time: number | null
          weekly_update_ready: boolean | null
          weekly_updates_enabled: boolean
          youtube_api_enabled: boolean | null
          youtube_url: string
        }
        Insert: {
          artist_tier?: number | null
          ask_for_access?: boolean | null
          calculated_vendor_payment?: number | null
          campaign_name: string
          channel_id?: string | null
          client_id?: string | null
          comment_server?: string | null
          comments_7_days?: number | null
          comments_sheet_url?: string | null
          confirm_start_date?: boolean | null
          created_at?: string
          current_comments?: number | null
          current_likes?: number | null
          current_views?: number | null
          custom_service_type?: string | null
          desired_daily?: number | null
          end_date?: string | null
          genre?: string | null
          goal_views?: number | null
          id?: string
          impression_ctr?: number | null
          in_fixer?: boolean | null
          invoice_status?: Database["public"]["Enums"]["invoice_status"] | null
          last_stalling_check?: string | null
          last_weekly_update_sent?: string | null
          last_youtube_fetch?: string | null
          like_server?: string | null
          likes_7_days?: number | null
          manual_progress?: number
          minimum_engagement?: number | null
          needs_update?: boolean | null
          paid_reach?: boolean | null
          payment_calculation_date?: string | null
          sale_price?: number | null
          salesperson_id?: string | null
          service_type: Database["public"]["Enums"]["service_type"]
          service_types?: Json | null
          sheet_tier?: string | null
          stalling_detected_at?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          subscribers_gained?: number | null
          subscribers_hidden?: boolean | null
          technical_setup_complete?: boolean
          total_subscribers?: number | null
          updated_at?: string
          vendor_paid?: boolean
          video_id?: string | null
          views_7_days?: number | null
          views_stalled?: boolean | null
          wait_time_seconds?: number | null
          watch_time?: number | null
          weekly_update_ready?: boolean | null
          weekly_updates_enabled?: boolean
          youtube_api_enabled?: boolean | null
          youtube_url: string
        }
        Update: {
          artist_tier?: number | null
          ask_for_access?: boolean | null
          calculated_vendor_payment?: number | null
          campaign_name?: string
          channel_id?: string | null
          client_id?: string | null
          comment_server?: string | null
          comments_7_days?: number | null
          comments_sheet_url?: string | null
          confirm_start_date?: boolean | null
          created_at?: string
          current_comments?: number | null
          current_likes?: number | null
          current_views?: number | null
          custom_service_type?: string | null
          desired_daily?: number | null
          end_date?: string | null
          genre?: string | null
          goal_views?: number | null
          id?: string
          impression_ctr?: number | null
          in_fixer?: boolean | null
          invoice_status?: Database["public"]["Enums"]["invoice_status"] | null
          last_stalling_check?: string | null
          last_weekly_update_sent?: string | null
          last_youtube_fetch?: string | null
          like_server?: string | null
          likes_7_days?: number | null
          manual_progress?: number
          minimum_engagement?: number | null
          needs_update?: boolean | null
          paid_reach?: boolean | null
          payment_calculation_date?: string | null
          sale_price?: number | null
          salesperson_id?: string | null
          service_type?: Database["public"]["Enums"]["service_type"]
          service_types?: Json | null
          sheet_tier?: string | null
          stalling_detected_at?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["campaign_status"] | null
          subscribers_gained?: number | null
          subscribers_hidden?: boolean | null
          technical_setup_complete?: boolean
          total_subscribers?: number | null
          updated_at?: string
          vendor_paid?: boolean
          video_id?: string | null
          views_7_days?: number | null
          views_stalled?: boolean | null
          wait_time_seconds?: number | null
          watch_time?: number | null
          weekly_update_ready?: boolean | null
          weekly_updates_enabled?: boolean
          youtube_api_enabled?: boolean | null
          youtube_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_salesperson_id_fkey"
            columns: ["salesperson_id"]
            isOneToOne: false
            referencedRelation: "salespersons"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          email2: string | null
          email3: string | null
          id: string
          name: string
          updated_at: string
          youtube_access_requested: boolean
          youtube_access_requested_at: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          email2?: string | null
          email3?: string | null
          id?: string
          name: string
          updated_at?: string
          youtube_access_requested?: boolean
          youtube_access_requested_at?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          email2?: string | null
          email3?: string | null
          id?: string
          name?: string
          updated_at?: string
          youtube_access_requested?: boolean
          youtube_access_requested_at?: string | null
        }
        Relationships: []
      }
      data_validation_results: {
        Row: {
          id: string
          issues_found: Json | null
          record_id: string | null
          table_name: string | null
          validated_at: string
          validation_status: string
          validation_type: string
        }
        Insert: {
          id?: string
          issues_found?: Json | null
          record_id?: string | null
          table_name?: string | null
          validated_at?: string
          validation_status: string
          validation_type: string
        }
        Update: {
          id?: string
          issues_found?: Json | null
          record_id?: string | null
          table_name?: string | null
          validated_at?: string
          validation_status?: string
          validation_type?: string
        }
        Relationships: []
      }
      error_monitoring: {
        Row: {
          error_count: number
          error_type: string
          first_occurrence: string
          function_name: string
          id: string
          last_occurrence: string
        }
        Insert: {
          error_count?: number
          error_type: string
          first_occurrence?: string
          function_name: string
          id?: string
          last_occurrence?: string
        }
        Update: {
          error_count?: number
          error_type?: string
          first_occurrence?: string
          function_name?: string
          id?: string
          last_occurrence?: string
        }
        Relationships: []
      }
      onboarding_emails: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          email_type: string
          id: string
          sent_at: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          email_type: string
          id?: string
          sent_at?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          email_type?: string
          id?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_emails_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_audit_log: {
        Row: {
          action: string
          automated: boolean
          campaign_id: string
          created_at: string
          id: string
          new_value: Json | null
          old_value: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          automated?: boolean
          campaign_id: string
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          automated?: boolean
          campaign_id?: string
          created_at?: string
          id?: string
          new_value?: Json | null
          old_value?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      payment_notifications: {
        Row: {
          campaign_ids: string[] | null
          created_at: string
          email_id: string | null
          id: string
          recipient: string
          sent_at: string
          total_amount: number | null
          type: string
        }
        Insert: {
          campaign_ids?: string[] | null
          created_at?: string
          email_id?: string | null
          id?: string
          recipient: string
          sent_at?: string
          total_amount?: number | null
          type: string
        }
        Update: {
          campaign_ids?: string[] | null
          created_at?: string
          email_id?: string | null
          id?: string
          recipient?: string
          sent_at?: string
          total_amount?: number | null
          type?: string
        }
        Relationships: []
      }
      performance_alerts: {
        Row: {
          alert_type: string
          campaign_id: string | null
          created_at: string | null
          current_views: number
          id: string
          percentage_drop: number
          previous_views: number
          resolved_at: string | null
          sent_at: string | null
          threshold_exceeded: number
        }
        Insert: {
          alert_type: string
          campaign_id?: string | null
          created_at?: string | null
          current_views?: number
          id?: string
          percentage_drop?: number
          previous_views?: number
          resolved_at?: string | null
          sent_at?: string | null
          threshold_exceeded: number
        }
        Update: {
          alert_type?: string
          campaign_id?: string | null
          created_at?: string | null
          current_views?: number
          id?: string
          percentage_drop?: number
          previous_views?: number
          resolved_at?: string | null
          sent_at?: string | null
          threshold_exceeded?: number
        }
        Relationships: [
          {
            foreignKeyName: "performance_alerts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_logs: {
        Row: {
          campaign_id: string | null
          id: string
          metric_type: string
          recorded_at: string
          value: number
        }
        Insert: {
          campaign_id?: string | null
          id?: string
          metric_type: string
          recorded_at?: string
          value: number
        }
        Update: {
          campaign_id?: string | null
          id?: string
          metric_type?: string
          recorded_at?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "performance_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_tiers: {
        Row: {
          cost_per_1k_views: number
          created_at: string
          id: string
          service_type: Database["public"]["Enums"]["service_type"]
          tier_max_views: number | null
          tier_min_views: number
          updated_at: string
        }
        Insert: {
          cost_per_1k_views: number
          created_at?: string
          id?: string
          service_type: Database["public"]["Enums"]["service_type"]
          tier_max_views?: number | null
          tier_min_views?: number
          updated_at?: string
        }
        Update: {
          cost_per_1k_views?: number
          created_at?: string
          id?: string
          service_type?: Database["public"]["Enums"]["service_type"]
          tier_max_views?: number | null
          tier_min_views?: number
          updated_at?: string
        }
        Relationships: []
      }
      ratio_fixer_queue: {
        Row: {
          campaign_id: string | null
          created_at: string
          id: string
          priority: Database["public"]["Enums"]["priority_level"] | null
          status: Database["public"]["Enums"]["queue_status"] | null
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          priority?: Database["public"]["Enums"]["priority_level"] | null
          status?: Database["public"]["Enums"]["queue_status"] | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          priority?: Database["public"]["Enums"]["priority_level"] | null
          status?: Database["public"]["Enums"]["queue_status"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratio_fixer_queue_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      salespersons: {
        Row: {
          commission_rate: number | null
          created_at: string
          email: string | null
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          commission_rate?: number | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          commission_rate?: number | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      settings: {
        Row: {
          created_at: string
          email_automations_enabled: boolean
          id: string
          operator_email: string
          stalling_day_threshold: number
          stalling_detection_enabled: boolean
          stalling_view_threshold: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          email_automations_enabled?: boolean
          id?: string
          operator_email?: string
          stalling_day_threshold?: number
          stalling_detection_enabled?: boolean
          stalling_view_threshold?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          email_automations_enabled?: boolean
          id?: string
          operator_email?: string
          stalling_day_threshold?: number
          stalling_detection_enabled?: boolean
          stalling_view_threshold?: number
          updated_at?: string
        }
        Relationships: []
      }
      system_health_logs: {
        Row: {
          checked_at: string
          error_message: string | null
          function_name: string
          id: string
          response_time_ms: number | null
          status: string
        }
        Insert: {
          checked_at?: string
          error_message?: string | null
          function_name: string
          id?: string
          response_time_ms?: number | null
          status: string
        }
        Update: {
          checked_at?: string
          error_message?: string | null
          function_name?: string
          id?: string
          response_time_ms?: number | null
          status?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_total_goal_views: {
        Args: { service_types_json: Json }
        Returns: number
      }
      calculate_vendor_payment: {
        Args: { campaign_uuid: string }
        Returns: Json
      }
      calculate_wow_growth: {
        Args: { campaign_uuid: string }
        Returns: Json
      }
      extract_youtube_video_id: {
        Args: { url: string }
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      validate_pricing_tiers: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      validate_youtube_url: {
        Args: { url: string }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "salesperson"
      campaign_status: "pending" | "active" | "paused" | "complete"
      invoice_status: "tbd" | "sent" | "paid"
      priority_level: "low" | "medium" | "high"
      queue_status: "waiting" | "processing" | "completed" | "failed"
      service_type:
        | "worldwide"
        | "usa"
        | "uk"
        | "canada"
        | "australia"
        | "organic_push"
        | "playlist_push"
        | "ww_display"
        | "us_website"
        | "ww_website"
        | "latam_display"
        | "latam_website"
        | "eur_display"
        | "eur_website"
        | "custom"
        | "asia_website"
        | "youtube_eng_ad"
        | "ww_website_ads"
        | "engagements_only"
        | "us_website_ads"
        | "aus_website"
        | "us_display"
        | "us_eur_website"
        | "us_skip"
        | "ww_skip"
        | "aus_display"
        | "mena_display"
        | "latam_skip"
        | "eur_skip"
        | "aus_skip"
        | "cad_display"
        | "cad_skip"
        | "cad_website"
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
      app_role: ["admin", "manager", "salesperson"],
      campaign_status: ["pending", "active", "paused", "complete"],
      invoice_status: ["tbd", "sent", "paid"],
      priority_level: ["low", "medium", "high"],
      queue_status: ["waiting", "processing", "completed", "failed"],
      service_type: [
        "worldwide",
        "usa",
        "uk",
        "canada",
        "australia",
        "organic_push",
        "playlist_push",
        "ww_display",
        "us_website",
        "ww_website",
        "latam_display",
        "latam_website",
        "eur_display",
        "eur_website",
        "custom",
        "asia_website",
        "youtube_eng_ad",
        "ww_website_ads",
        "engagements_only",
        "us_website_ads",
        "aus_website",
        "us_display",
        "us_eur_website",
        "us_skip",
        "ww_skip",
        "aus_display",
        "mena_display",
        "latam_skip",
        "eur_skip",
        "aus_skip",
        "cad_display",
        "cad_skip",
        "cad_website",
      ],
    },
  },
} as const
