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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      algorithm_learning_log: {
        Row: {
          algorithm_version: string | null
          campaign_id: string | null
          confidence_score: number | null
          created_at: string
          decision_data: Json | null
          decision_type: string
          id: string
          input_data: Json | null
          performance_impact: number | null
        }
        Insert: {
          algorithm_version?: string | null
          campaign_id?: string | null
          confidence_score?: number | null
          created_at?: string
          decision_data?: Json | null
          decision_type: string
          id?: string
          input_data?: Json | null
          performance_impact?: number | null
        }
        Update: {
          algorithm_version?: string | null
          campaign_id?: string | null
          confidence_score?: number | null
          created_at?: string
          decision_data?: Json | null
          decision_type?: string
          id?: string
          input_data?: Json | null
          performance_impact?: number | null
        }
        Relationships: []
      }
      analytics_notes: {
        Row: {
          campaign_id: string | null
          content: string
          created_at: string
          created_by: string | null
          creator_id: string | null
          id: string
          is_archived: boolean
          note_type: string
          priority: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          creator_id?: string | null
          id?: string
          is_archived?: boolean
          note_type?: string
          priority?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          creator_id?: string | null
          id?: string
          is_archived?: boolean
          note_type?: string
          priority?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaign_ab_tests: {
        Row: {
          algorithm_version_control: string
          algorithm_version_test: string
          conclusion: string | null
          confidence_interval: Json | null
          control_campaigns: string[] | null
          control_metrics: Json | null
          created_at: string
          effect_size: number | null
          hypothesis: string
          id: string
          p_value: number | null
          sample_size_target: number | null
          statistical_power: number | null
          status: string
          test_campaigns: string[] | null
          test_end_date: string | null
          test_metrics: Json | null
          test_name: string
          test_start_date: string
          updated_at: string
          winner: string | null
        }
        Insert: {
          algorithm_version_control: string
          algorithm_version_test: string
          conclusion?: string | null
          confidence_interval?: Json | null
          control_campaigns?: string[] | null
          control_metrics?: Json | null
          created_at?: string
          effect_size?: number | null
          hypothesis: string
          id?: string
          p_value?: number | null
          sample_size_target?: number | null
          statistical_power?: number | null
          status?: string
          test_campaigns?: string[] | null
          test_end_date?: string | null
          test_metrics?: Json | null
          test_name: string
          test_start_date: string
          updated_at?: string
          winner?: string | null
        }
        Update: {
          algorithm_version_control?: string
          algorithm_version_test?: string
          conclusion?: string | null
          confidence_interval?: Json | null
          control_campaigns?: string[] | null
          control_metrics?: Json | null
          created_at?: string
          effect_size?: number | null
          hypothesis?: string
          id?: string
          p_value?: number | null
          sample_size_target?: number | null
          statistical_power?: number | null
          status?: string
          test_campaigns?: string[] | null
          test_end_date?: string | null
          test_metrics?: Json | null
          test_name?: string
          test_start_date?: string
          updated_at?: string
          winner?: string | null
        }
        Relationships: []
      }
      campaign_allocations_performance: {
        Row: {
          actual_cost_per_stream: number | null
          actual_streams: number | null
          allocated_streams: number
          campaign_id: string
          completed_at: string | null
          cost_per_stream: number | null
          created_at: string
          id: string
          paid_amount: number | null
          paid_date: string | null
          payment_method: string | null
          payment_reference: string | null
          payment_status: string | null
          performance_score: number | null
          playlist_id: string
          predicted_streams: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          actual_cost_per_stream?: number | null
          actual_streams?: number | null
          allocated_streams: number
          campaign_id: string
          completed_at?: string | null
          cost_per_stream?: number | null
          created_at?: string
          id?: string
          paid_amount?: number | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          performance_score?: number | null
          playlist_id: string
          predicted_streams: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          actual_cost_per_stream?: number | null
          actual_streams?: number | null
          allocated_streams?: number
          campaign_id?: string
          completed_at?: string | null
          cost_per_stream?: number | null
          created_at?: string
          id?: string
          paid_amount?: number | null
          paid_date?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          payment_status?: string | null
          performance_score?: number | null
          playlist_id?: string
          predicted_streams?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      campaign_compliance_checkpoints: {
        Row: {
          campaign_id: string
          checkpoint_type: string
          completed_date: string | null
          compliance_data: Json | null
          created_at: string
          expected_date: string | null
          id: string
          notes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          checkpoint_type: string
          completed_date?: string | null
          compliance_data?: Json | null
          created_at?: string
          expected_date?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          checkpoint_type?: string
          completed_date?: string | null
          compliance_data?: Json | null
          created_at?: string
          expected_date?: string | null
          id?: string
          notes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaign_creators: {
        Row: {
          approval_notes: string | null
          approval_status: string
          campaign_id: string
          created_at: string
          creator_id: string
          due_date: string | null
          expected_post_date: string | null
          id: string
          instagram_handle: string
          payment_notes: string | null
          payment_status: string
          post_status: string
          post_type: string
          posts_count: number
          rate: number
          updated_at: string
        }
        Insert: {
          approval_notes?: string | null
          approval_status?: string
          campaign_id: string
          created_at?: string
          creator_id: string
          due_date?: string | null
          expected_post_date?: string | null
          id?: string
          instagram_handle: string
          payment_notes?: string | null
          payment_status?: string
          post_status?: string
          post_type?: string
          posts_count?: number
          rate?: number
          updated_at?: string
        }
        Update: {
          approval_notes?: string | null
          approval_status?: string
          campaign_id?: string
          created_at?: string
          creator_id?: string
          due_date?: string | null
          expected_post_date?: string | null
          id?: string
          instagram_handle?: string
          payment_notes?: string | null
          payment_status?: string
          post_status?: string
          post_type?: string
          posts_count?: number
          rate?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_creators_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_creators_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_invoices: {
        Row: {
          amount: number
          campaign_id: string
          created_at: string
          due_date: string
          id: string
          invoice_number: string
          issued_date: string
          notes: string | null
          paid_date: string | null
          payment_method: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          campaign_id: string
          created_at?: string
          due_date?: string
          id?: string
          invoice_number: string
          issued_date?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          campaign_id?: string
          created_at?: string
          due_date?: string
          id?: string
          invoice_number?: string
          issued_date?: string
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaign_posts: {
        Row: {
          campaign_id: string
          content_description: string | null
          created_at: string
          creator_id: string | null
          id: string
          instagram_handle: string
          post_type: string
          post_url: string
          posted_at: string | null
          status: string
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          campaign_id: string
          content_description?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          instagram_handle: string
          post_type?: string
          post_url: string
          posted_at?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          content_description?: string | null
          created_at?: string
          creator_id?: string | null
          id?: string
          instagram_handle?: string
          post_type?: string
          post_url?: string
          posted_at?: string | null
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      campaign_submissions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          campaign_name: string
          client_emails: string[]
          client_name: string
          content_types: string[] | null
          created_at: string
          duration_days: number | null
          id: string
          music_genres: string[] | null
          notes: string | null
          price_paid: number
          rejection_reason: string | null
          salesperson: string
          start_date: string
          status: string
          stream_goal: number
          territory_preferences: string[] | null
          track_url: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          campaign_name: string
          client_emails: string[]
          client_name: string
          content_types?: string[] | null
          created_at?: string
          duration_days?: number | null
          id?: string
          music_genres?: string[] | null
          notes?: string | null
          price_paid: number
          rejection_reason?: string | null
          salesperson: string
          start_date: string
          status?: string
          stream_goal: number
          territory_preferences?: string[] | null
          track_url: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          campaign_name?: string
          client_emails?: string[]
          client_name?: string
          content_types?: string[] | null
          created_at?: string
          duration_days?: number | null
          id?: string
          music_genres?: string[] | null
          notes?: string | null
          price_paid?: number
          rejection_reason?: string | null
          salesperson?: string
          start_date?: string
          status?: string
          stream_goal?: number
          territory_preferences?: string[] | null
          track_url?: string
        }
        Relationships: []
      }
      campaign_vendor_requests: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          playlist_ids: Json
          requested_at: string
          responded_at: string | null
          response_notes: string | null
          status: string
          updated_at: string
          vendor_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          playlist_ids?: Json
          requested_at?: string
          responded_at?: string | null
          response_notes?: string | null
          status?: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          playlist_ids?: Json
          requested_at?: string
          responded_at?: string | null
          response_notes?: string | null
          status?: string
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          algorithm_recommendations: Json | null
          allocated_streams: number | null
          brand_name: string | null
          budget: number
          campaign_type: string
          client: string
          client_id: string | null
          client_name: string | null
          content_types: string[]
          created_at: string
          creator_count: number
          daily_streams: number | null
          description: string | null
          discover_weekly_streams: number | null
          duration_days: number
          external_streaming_data: Json | null
          id: string
          music_genres: string[]
          name: string
          notes: string | null
          pending_operator_review: boolean | null
          post_types: string[]
          public_access_enabled: boolean | null
          public_token: string | null
          radio_streams: number | null
          remaining_streams: number
          results: Json | null
          salesperson: string | null
          selected_creators: Json | null
          selected_playlists: Json
          source: string
          start_date: string
          status: string
          stream_goal: number
          sub_genre: string
          sub_genres: string[] | null
          submission_id: string | null
          territory_preferences: string[]
          totals: Json | null
          track_name: string | null
          track_url: string
          updated_at: string
          vendor_allocations: Json
          weekly_streams: number | null
        }
        Insert: {
          algorithm_recommendations?: Json | null
          allocated_streams?: number | null
          brand_name?: string | null
          budget: number
          campaign_type?: string
          client?: string
          client_id?: string | null
          client_name?: string | null
          content_types?: string[]
          created_at?: string
          creator_count?: number
          daily_streams?: number | null
          description?: string | null
          discover_weekly_streams?: number | null
          duration_days?: number
          external_streaming_data?: Json | null
          id?: string
          music_genres?: string[]
          name: string
          notes?: string | null
          pending_operator_review?: boolean | null
          post_types?: string[]
          public_access_enabled?: boolean | null
          public_token?: string | null
          radio_streams?: number | null
          remaining_streams?: number
          results?: Json | null
          salesperson?: string | null
          selected_creators?: Json | null
          selected_playlists?: Json
          source?: string
          start_date?: string
          status?: string
          stream_goal?: number
          sub_genre?: string
          sub_genres?: string[] | null
          submission_id?: string | null
          territory_preferences?: string[]
          totals?: Json | null
          track_name?: string | null
          track_url?: string
          updated_at?: string
          vendor_allocations?: Json
          weekly_streams?: number | null
        }
        Update: {
          algorithm_recommendations?: Json | null
          allocated_streams?: number | null
          brand_name?: string | null
          budget?: number
          campaign_type?: string
          client?: string
          client_id?: string | null
          client_name?: string | null
          content_types?: string[]
          created_at?: string
          creator_count?: number
          daily_streams?: number | null
          description?: string | null
          discover_weekly_streams?: number | null
          duration_days?: number
          external_streaming_data?: Json | null
          id?: string
          music_genres?: string[]
          name?: string
          notes?: string | null
          pending_operator_review?: boolean | null
          post_types?: string[]
          public_access_enabled?: boolean | null
          public_token?: string | null
          radio_streams?: number | null
          remaining_streams?: number
          results?: Json | null
          salesperson?: string | null
          selected_creators?: Json | null
          selected_playlists?: Json
          source?: string
          start_date?: string
          status?: string
          stream_goal?: number
          sub_genre?: string
          sub_genres?: string[] | null
          submission_id?: string | null
          territory_preferences?: string[]
          totals?: Json | null
          track_name?: string | null
          track_url?: string
          updated_at?: string
          vendor_allocations?: Json
          weekly_streams?: number | null
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
            foreignKeyName: "campaigns_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "campaign_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      client_credits: {
        Row: {
          amount: number
          campaign_id: string | null
          client_id: string
          created_at: string
          id: string
          reason: string | null
        }
        Insert: {
          amount: number
          campaign_id?: string | null
          client_id: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Update: {
          amount?: number
          campaign_id?: string | null
          client_id?: string
          created_at?: string
          id?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_credits_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_credits_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_credits_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_report_settings: {
        Row: {
          branding_settings: Json | null
          client_id: string | null
          created_at: string
          custom_kpis: Json | null
          default_template: string | null
          id: string
          include_benchmarks: boolean | null
          include_predictions: boolean | null
          preferred_format: string | null
          updated_at: string
        }
        Insert: {
          branding_settings?: Json | null
          client_id?: string | null
          created_at?: string
          custom_kpis?: Json | null
          default_template?: string | null
          id?: string
          include_benchmarks?: boolean | null
          include_predictions?: boolean | null
          preferred_format?: string | null
          updated_at?: string
        }
        Update: {
          branding_settings?: Json | null
          client_id?: string | null
          created_at?: string
          custom_kpis?: Json | null
          default_template?: string | null
          id?: string
          include_benchmarks?: boolean | null
          include_predictions?: boolean | null
          preferred_format?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_report_settings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          contact_person: string | null
          created_at: string
          credit_balance: number | null
          emails: string[] | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          contact_person?: string | null
          created_at?: string
          credit_balance?: number | null
          emails?: string[] | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          contact_person?: string | null
          created_at?: string
          credit_balance?: number | null
          emails?: string[] | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      content_verification_logs: {
        Row: {
          campaign_id: string | null
          created_at: string
          id: string
          notes: string | null
          playlist_id: string
          score: number | null
          status: string
          updated_at: string
          verification_data: Json | null
          verification_type: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          playlist_id: string
          score?: number | null
          status?: string
          updated_at?: string
          verification_data?: Json | null
          verification_type: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          playlist_id?: string
          score?: number | null
          status?: string
          updated_at?: string
          verification_data?: Json | null
          verification_type?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      creator_ml_features: {
        Row: {
          avg_engagement_rate: number | null
          avg_performance_vs_prediction: number | null
          campaign_success_rate: number | null
          consistency_score: number | null
          content_type_distribution: Json | null
          created_at: string
          creator_id: string
          engagement_trend_slope: number | null
          engagement_volatility: number | null
          follower_growth_rate: number | null
          genre_affinity_scores: Json | null
          hashtag_effectiveness: Json | null
          id: string
          market_trend_correlation: number | null
          optimal_posting_times: number[] | null
          peak_engagement_rate: number | null
          period_end: string
          period_start: string
          post_frequency: number | null
          seasonal_performance_multiplier: number | null
          updated_at: string
          views_growth_rate: number | null
        }
        Insert: {
          avg_engagement_rate?: number | null
          avg_performance_vs_prediction?: number | null
          campaign_success_rate?: number | null
          consistency_score?: number | null
          content_type_distribution?: Json | null
          created_at?: string
          creator_id: string
          engagement_trend_slope?: number | null
          engagement_volatility?: number | null
          follower_growth_rate?: number | null
          genre_affinity_scores?: Json | null
          hashtag_effectiveness?: Json | null
          id?: string
          market_trend_correlation?: number | null
          optimal_posting_times?: number[] | null
          peak_engagement_rate?: number | null
          period_end: string
          period_start: string
          post_frequency?: number | null
          seasonal_performance_multiplier?: number | null
          updated_at?: string
          views_growth_rate?: number | null
        }
        Update: {
          avg_engagement_rate?: number | null
          avg_performance_vs_prediction?: number | null
          campaign_success_rate?: number | null
          consistency_score?: number | null
          content_type_distribution?: Json | null
          created_at?: string
          creator_id?: string
          engagement_trend_slope?: number | null
          engagement_volatility?: number | null
          follower_growth_rate?: number | null
          genre_affinity_scores?: Json | null
          hashtag_effectiveness?: Json | null
          id?: string
          market_trend_correlation?: number | null
          optimal_posting_times?: number[] | null
          peak_engagement_rate?: number | null
          period_end?: string
          period_start?: string
          post_frequency?: number | null
          seasonal_performance_multiplier?: number | null
          updated_at?: string
          views_growth_rate?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_ml_features_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      creators: {
        Row: {
          audience_territories: string[]
          avg_performance_score: number | null
          base_country: string
          campaign_fit_score: number | null
          carousel_rate: number | null
          content_types: string[]
          created_at: string
          email: string | null
          engagement_rate: number
          followers: number
          id: string
          instagram_handle: string
          median_views_per_video: number
          music_genres: string[]
          reel_rate: number | null
          story_rate: number | null
          updated_at: string
        }
        Insert: {
          audience_territories?: string[]
          avg_performance_score?: number | null
          base_country: string
          campaign_fit_score?: number | null
          carousel_rate?: number | null
          content_types?: string[]
          created_at?: string
          email?: string | null
          engagement_rate?: number
          followers?: number
          id?: string
          instagram_handle: string
          median_views_per_video?: number
          music_genres?: string[]
          reel_rate?: number | null
          story_rate?: number | null
          updated_at?: string
        }
        Update: {
          audience_territories?: string[]
          avg_performance_score?: number | null
          base_country?: string
          campaign_fit_score?: number | null
          carousel_rate?: number | null
          content_types?: string[]
          created_at?: string
          email?: string | null
          engagement_rate?: number
          followers?: number
          id?: string
          instagram_handle?: string
          median_views_per_video?: number
          music_genres?: string[]
          reel_rate?: number | null
          story_rate?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      dashboard_configs: {
        Row: {
          config: Json
          created_at: string
          id: string
          is_default: boolean | null
          is_shared: boolean | null
          name: string
          shared_with: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          config: Json
          created_at?: string
          id?: string
          is_default?: boolean | null
          is_shared?: boolean | null
          name: string
          shared_with?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          config?: Json
          created_at?: string
          id?: string
          is_default?: boolean | null
          is_shared?: boolean | null
          name?: string
          shared_with?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fraud_detection_alerts: {
        Row: {
          alert_type: string
          campaign_id: string | null
          confidence_score: number | null
          created_at: string
          detection_data: Json | null
          id: string
          playlist_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          updated_at: string
          vendor_id: string | null
        }
        Insert: {
          alert_type: string
          campaign_id?: string | null
          confidence_score?: number | null
          created_at?: string
          detection_data?: Json | null
          id?: string
          playlist_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Update: {
          alert_type?: string
          campaign_id?: string | null
          confidence_score?: number | null
          created_at?: string
          detection_data?: Json | null
          id?: string
          playlist_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          updated_at?: string
          vendor_id?: string | null
        }
        Relationships: []
      }
      genre_correlation_matrix: {
        Row: {
          avg_performance_lift: number | null
          correlation_score: number | null
          genre_a: string
          genre_b: string
          id: string
          last_updated: string | null
          sample_size: number | null
          success_rate: number | null
        }
        Insert: {
          avg_performance_lift?: number | null
          correlation_score?: number | null
          genre_a: string
          genre_b: string
          id?: string
          last_updated?: string | null
          sample_size?: number | null
          success_rate?: number | null
        }
        Update: {
          avg_performance_lift?: number | null
          correlation_score?: number | null
          genre_a?: string
          genre_b?: string
          id?: string
          last_updated?: string | null
          sample_size?: number | null
          success_rate?: number | null
        }
        Relationships: []
      }
      market_intelligence: {
        Row: {
          confidence_score: number | null
          content: Json
          created_at: string
          id: string
          intelligence_type: string
          market_impact_score: number | null
          period_end: string | null
          period_start: string | null
          related_creators: string[] | null
          related_genres: string[] | null
          sentiment_score: number | null
          source: string
          topic: string
          trend_direction: string | null
          updated_at: string
        }
        Insert: {
          confidence_score?: number | null
          content?: Json
          created_at?: string
          id?: string
          intelligence_type: string
          market_impact_score?: number | null
          period_end?: string | null
          period_start?: string | null
          related_creators?: string[] | null
          related_genres?: string[] | null
          sentiment_score?: number | null
          source: string
          topic: string
          trend_direction?: string | null
          updated_at?: string
        }
        Update: {
          confidence_score?: number | null
          content?: Json
          created_at?: string
          id?: string
          intelligence_type?: string
          market_impact_score?: number | null
          period_end?: string | null
          period_start?: string | null
          related_creators?: string[] | null
          related_genres?: string[] | null
          sentiment_score?: number | null
          source?: string
          topic?: string
          trend_direction?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      ml_model_versions: {
        Row: {
          accuracy_score: number | null
          control_performance: number | null
          created_at: string
          deployed_at: string | null
          deprecated_at: string | null
          f1_score: number | null
          id: string
          model_type: string
          parameters: Json
          precision_score: number | null
          recall_score: number | null
          statistical_significance: number | null
          status: string
          test_campaigns: number | null
          test_performance: number | null
          training_data_size: number | null
          training_date: string
          updated_at: string
          version_name: string
        }
        Insert: {
          accuracy_score?: number | null
          control_performance?: number | null
          created_at?: string
          deployed_at?: string | null
          deprecated_at?: string | null
          f1_score?: number | null
          id?: string
          model_type: string
          parameters?: Json
          precision_score?: number | null
          recall_score?: number | null
          statistical_significance?: number | null
          status?: string
          test_campaigns?: number | null
          test_performance?: number | null
          training_data_size?: number | null
          training_date?: string
          updated_at?: string
          version_name: string
        }
        Update: {
          accuracy_score?: number | null
          control_performance?: number | null
          created_at?: string
          deployed_at?: string | null
          deprecated_at?: string | null
          f1_score?: number | null
          id?: string
          model_type?: string
          parameters?: Json
          precision_score?: number | null
          recall_score?: number | null
          statistical_significance?: number | null
          status?: string
          test_campaigns?: number | null
          test_performance?: number | null
          training_data_size?: number | null
          training_date?: string
          updated_at?: string
          version_name?: string
        }
        Relationships: []
      }
      payment_history: {
        Row: {
          amount: number
          campaign_id: string
          created_at: string
          id: string
          notes: string | null
          payment_method: string | null
          processed_at: string
          processed_by: string | null
          reference_number: string | null
          updated_at: string
          vendor_id: string
        }
        Insert: {
          amount?: number
          campaign_id: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          processed_at?: string
          processed_by?: string | null
          reference_number?: string | null
          updated_at?: string
          vendor_id: string
        }
        Update: {
          amount?: number
          campaign_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          processed_at?: string
          processed_by?: string | null
          reference_number?: string | null
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      performance_alerts: {
        Row: {
          alert_type: string
          campaign_id: string | null
          created_at: string
          current_value: number | null
          id: string
          is_resolved: boolean | null
          message: string
          resolved_at: string | null
          severity: string
          threshold_value: number | null
        }
        Insert: {
          alert_type: string
          campaign_id?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          is_resolved?: boolean | null
          message: string
          resolved_at?: string | null
          severity: string
          threshold_value?: number | null
        }
        Update: {
          alert_type?: string
          campaign_id?: string | null
          created_at?: string
          current_value?: number | null
          id?: string
          is_resolved?: boolean | null
          message?: string
          resolved_at?: string | null
          severity?: string
          threshold_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_alerts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_alerts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_entries: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          daily_streams: number
          date_recorded: string | null
          id: string
          playlist_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          daily_streams: number
          date_recorded?: string | null
          id?: string
          playlist_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          daily_streams?: number
          date_recorded?: string | null
          id?: string
          playlist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_entries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_entries_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "performance_entries_playlist_id_fkey"
            columns: ["playlist_id"]
            isOneToOne: false
            referencedRelation: "playlists"
            referencedColumns: ["id"]
          },
        ]
      }
      playlist_performance_history: {
        Row: {
          avg_daily_streams: number
          campaign_id: string | null
          created_at: string
          genre_match_score: number | null
          id: string
          peak_streams: number | null
          performance_trend: string | null
          period_end: string
          period_start: string
          playlist_id: string
          reliability_score: number | null
        }
        Insert: {
          avg_daily_streams?: number
          campaign_id?: string | null
          created_at?: string
          genre_match_score?: number | null
          id?: string
          peak_streams?: number | null
          performance_trend?: string | null
          period_end: string
          period_start: string
          playlist_id: string
          reliability_score?: number | null
        }
        Update: {
          avg_daily_streams?: number
          campaign_id?: string | null
          created_at?: string
          genre_match_score?: number | null
          id?: string
          peak_streams?: number | null
          performance_trend?: string | null
          period_end?: string
          period_start?: string
          playlist_id?: string
          reliability_score?: number | null
        }
        Relationships: []
      }
      playlists: {
        Row: {
          avg_daily_streams: number
          created_at: string
          follower_count: number | null
          genres: string[]
          id: string
          name: string
          updated_at: string
          url: string
          vendor_id: string
        }
        Insert: {
          avg_daily_streams?: number
          created_at?: string
          follower_count?: number | null
          genres?: string[]
          id?: string
          name: string
          updated_at?: string
          url: string
          vendor_id: string
        }
        Update: {
          avg_daily_streams?: number
          created_at?: string
          follower_count?: number | null
          genres?: string[]
          id?: string
          name?: string
          updated_at?: string
          url?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "playlists_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      post_analytics: {
        Row: {
          comments: number | null
          created_at: string
          engagement_rate: number | null
          id: string
          likes: number | null
          post_id: string
          recorded_at: string
          saves: number | null
          shares: number | null
          views: number | null
        }
        Insert: {
          comments?: number | null
          created_at?: string
          engagement_rate?: number | null
          id?: string
          likes?: number | null
          post_id: string
          recorded_at?: string
          saves?: number | null
          shares?: number | null
          views?: number | null
        }
        Update: {
          comments?: number | null
          created_at?: string
          engagement_rate?: number | null
          id?: string
          likes?: number | null
          post_id?: string
          recorded_at?: string
          saves?: number | null
          shares?: number | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_analytics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "campaign_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_performance_tracking: {
        Row: {
          algorithm_version: string | null
          campaign_id: string | null
          caption_length: number | null
          comments_total: number | null
          conversion_rate: number | null
          created_at: string
          creator_id: string | null
          engagement_rate_1h: number | null
          engagement_rate_24h: number | null
          engagement_rate_final: number | null
          hashtags: string[] | null
          id: string
          likes_total: number | null
          music_used: string | null
          performance_vs_prediction: number | null
          post_type: string
          post_url: string
          posted_at: string | null
          posting_time: string | null
          predicted_views: number | null
          retention_rate: number | null
          saves_total: number | null
          shares_total: number | null
          updated_at: string
          views_1h: number | null
          views_24h: number | null
          views_7d: number | null
          views_total: number | null
          viral_coefficient: number | null
        }
        Insert: {
          algorithm_version?: string | null
          campaign_id?: string | null
          caption_length?: number | null
          comments_total?: number | null
          conversion_rate?: number | null
          created_at?: string
          creator_id?: string | null
          engagement_rate_1h?: number | null
          engagement_rate_24h?: number | null
          engagement_rate_final?: number | null
          hashtags?: string[] | null
          id?: string
          likes_total?: number | null
          music_used?: string | null
          performance_vs_prediction?: number | null
          post_type: string
          post_url: string
          posted_at?: string | null
          posting_time?: string | null
          predicted_views?: number | null
          retention_rate?: number | null
          saves_total?: number | null
          shares_total?: number | null
          updated_at?: string
          views_1h?: number | null
          views_24h?: number | null
          views_7d?: number | null
          views_total?: number | null
          viral_coefficient?: number | null
        }
        Update: {
          algorithm_version?: string | null
          campaign_id?: string | null
          caption_length?: number | null
          comments_total?: number | null
          conversion_rate?: number | null
          created_at?: string
          creator_id?: string | null
          engagement_rate_1h?: number | null
          engagement_rate_24h?: number | null
          engagement_rate_final?: number | null
          hashtags?: string[] | null
          id?: string
          likes_total?: number | null
          music_used?: string | null
          performance_vs_prediction?: number | null
          post_type?: string
          post_url?: string
          posted_at?: string | null
          posting_time?: string | null
          predicted_views?: number | null
          retention_rate?: number | null
          saves_total?: number | null
          shares_total?: number | null
          updated_at?: string
          views_1h?: number | null
          views_24h?: number | null
          views_7d?: number | null
          views_total?: number | null
          viral_coefficient?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_performance_tracking_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_performance_tracking_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_performance_tracking_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creators"
            referencedColumns: ["id"]
          },
        ]
      }
      report_exports: {
        Row: {
          campaign_id: string | null
          client_id: string | null
          created_at: string
          download_count: number | null
          expires_at: string | null
          file_url: string | null
          format: string
          generated_at: string
          generated_by: string | null
          id: string
          report_type: string
          settings: Json | null
        }
        Insert: {
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string
          download_count?: number | null
          expires_at?: string | null
          file_url?: string | null
          format: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          report_type: string
          settings?: Json | null
        }
        Update: {
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string
          download_count?: number | null
          expires_at?: string | null
          file_url?: string | null
          format?: string
          generated_at?: string
          generated_by?: string | null
          id?: string
          report_type?: string
          settings?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "report_exports_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_exports_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_exports_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      report_schedules: {
        Row: {
          campaign_id: string | null
          client_id: string | null
          created_at: string
          frequency: string
          id: string
          is_active: boolean | null
          last_sent_at: string | null
          next_send_at: string | null
          recipients: string[]
          report_type: string
          template_settings: Json | null
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string
          frequency: string
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          next_send_at?: string | null
          recipients?: string[]
          report_type: string
          template_settings?: Json | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          client_id?: string | null
          created_at?: string
          frequency?: string
          id?: string
          is_active?: boolean | null
          last_sent_at?: string | null
          next_send_at?: string | null
          recipients?: string[]
          report_type?: string
          template_settings?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "report_schedules_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_schedules_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "report_schedules_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_goals: {
        Row: {
          campaigns_target: number
          commission_target: number
          created_at: string
          created_by: string | null
          goal_period_end: string
          goal_period_start: string
          id: string
          is_active: boolean
          revenue_target: number
          salesperson_email: string
          updated_at: string
        }
        Insert: {
          campaigns_target?: number
          commission_target?: number
          created_at?: string
          created_by?: string | null
          goal_period_end: string
          goal_period_start: string
          id?: string
          is_active?: boolean
          revenue_target?: number
          salesperson_email: string
          updated_at?: string
        }
        Update: {
          campaigns_target?: number
          commission_target?: number
          created_at?: string
          created_by?: string | null
          goal_period_end?: string
          goal_period_start?: string
          id?: string
          is_active?: boolean
          revenue_target?: number
          salesperson_email?: string
          updated_at?: string
        }
        Relationships: []
      }
      sales_performance_tracking: {
        Row: {
          actual_campaigns: number
          actual_commission: number
          actual_revenue: number
          calculated_at: string
          created_at: string
          id: string
          salesperson_email: string
          tracking_period_end: string
          tracking_period_start: string
          updated_at: string
        }
        Insert: {
          actual_campaigns?: number
          actual_commission?: number
          actual_revenue?: number
          calculated_at?: string
          created_at?: string
          id?: string
          salesperson_email: string
          tracking_period_end: string
          tracking_period_start: string
          updated_at?: string
        }
        Update: {
          actual_campaigns?: number
          actual_commission?: number
          actual_revenue?: number
          calculated_at?: string
          created_at?: string
          id?: string
          salesperson_email?: string
          tracking_period_end?: string
          tracking_period_start?: string
          updated_at?: string
        }
        Relationships: []
      }
      salespeople: {
        Row: {
          created_at: string
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
          total_approved: number | null
          total_revenue: number | null
          total_submissions: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
          total_approved?: number | null
          total_revenue?: number | null
          total_submissions?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
          total_approved?: number | null
          total_revenue?: number | null
          total_submissions?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      smart_deadlines: {
        Row: {
          algorithm_version: string
          calculated_deadline: string
          calculation_factors: Json
          campaign_id: string
          confidence_score: number | null
          created_at: string
          creator_id: string | null
          id: string
          is_active: boolean
          original_deadline: string | null
          updated_at: string
        }
        Insert: {
          algorithm_version?: string
          calculated_deadline: string
          calculation_factors?: Json
          campaign_id: string
          confidence_score?: number | null
          created_at?: string
          creator_id?: string | null
          id?: string
          is_active?: boolean
          original_deadline?: string | null
          updated_at?: string
        }
        Update: {
          algorithm_version?: string
          calculated_deadline?: string
          calculation_factors?: Json
          campaign_id?: string
          confidence_score?: number | null
          created_at?: string
          creator_id?: string | null
          id?: string
          is_active?: boolean
          original_deadline?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tags: {
        Row: {
          created_at: string
          id: string
          name: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          type: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      team_goals: {
        Row: {
          created_at: string
          created_by: string | null
          current_value: number
          goal_name: string
          goal_period_end: string
          goal_period_start: string
          goal_type: string
          id: string
          is_active: boolean
          target_value: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_value?: number
          goal_name: string
          goal_period_end: string
          goal_period_start: string
          goal_type: string
          id?: string
          is_active?: boolean
          target_value?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_value?: number
          goal_name?: string
          goal_period_end?: string
          goal_period_start?: string
          goal_type?: string
          id?: string
          is_active?: boolean
          target_value?: number
          updated_at?: string
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
      vendor_compliance_scores: {
        Row: {
          campaigns_evaluated: number | null
          content_verification_score: number | null
          created_at: string
          delivery_compliance_score: number | null
          fraud_risk_score: number | null
          id: string
          overall_compliance_score: number | null
          period_end: string
          period_start: string
          updated_at: string
          vendor_id: string
          violations_count: number | null
        }
        Insert: {
          campaigns_evaluated?: number | null
          content_verification_score?: number | null
          created_at?: string
          delivery_compliance_score?: number | null
          fraud_risk_score?: number | null
          id?: string
          overall_compliance_score?: number | null
          period_end: string
          period_start: string
          updated_at?: string
          vendor_id: string
          violations_count?: number | null
        }
        Update: {
          campaigns_evaluated?: number | null
          content_verification_score?: number | null
          created_at?: string
          delivery_compliance_score?: number | null
          fraud_risk_score?: number | null
          id?: string
          overall_compliance_score?: number | null
          period_end?: string
          period_start?: string
          updated_at?: string
          vendor_id?: string
          violations_count?: number | null
        }
        Relationships: []
      }
      vendor_reliability_scores: {
        Row: {
          cost_efficiency: number | null
          created_at: string
          delivery_consistency: number | null
          id: string
          last_updated: string | null
          quality_score: number | null
          response_time_hours: number | null
          stream_accuracy: number | null
          successful_campaigns: number | null
          total_campaigns: number | null
          vendor_id: string
        }
        Insert: {
          cost_efficiency?: number | null
          created_at?: string
          delivery_consistency?: number | null
          id?: string
          last_updated?: string | null
          quality_score?: number | null
          response_time_hours?: number | null
          stream_accuracy?: number | null
          successful_campaigns?: number | null
          total_campaigns?: number | null
          vendor_id: string
        }
        Update: {
          cost_efficiency?: number | null
          created_at?: string
          delivery_consistency?: number | null
          id?: string
          last_updated?: string | null
          quality_score?: number | null
          response_time_hours?: number | null
          stream_accuracy?: number | null
          successful_campaigns?: number | null
          total_campaigns?: number | null
          vendor_id?: string
        }
        Relationships: []
      }
      vendor_users: {
        Row: {
          created_at: string
          id: string
          user_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_users_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          cost_per_1k_streams: number | null
          created_at: string
          id: string
          is_active: boolean
          max_concurrent_campaigns: number
          max_daily_streams: number
          name: string
          updated_at: string
        }
        Insert: {
          cost_per_1k_streams?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          max_concurrent_campaigns?: number
          max_daily_streams?: number
          name: string
          updated_at?: string
        }
        Update: {
          cost_per_1k_streams?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          max_concurrent_campaigns?: number
          max_daily_streams?: number
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      weekly_updates: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          imported_on: string
          notes: string | null
          streams: number
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          imported_on?: string
          notes?: string | null
          streams?: number
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          imported_on?: string
          notes?: string | null
          streams?: number
        }
        Relationships: [
          {
            foreignKeyName: "weekly_updates_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_updates_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          action_data: Json | null
          campaign_id: string | null
          creator_id: string | null
          error_message: string | null
          executed_at: string
          execution_result: string
          id: string
          trigger_data: Json | null
          workflow_rule_id: string
        }
        Insert: {
          action_data?: Json | null
          campaign_id?: string | null
          creator_id?: string | null
          error_message?: string | null
          executed_at?: string
          execution_result: string
          id?: string
          trigger_data?: Json | null
          workflow_rule_id: string
        }
        Update: {
          action_data?: Json | null
          campaign_id?: string | null
          creator_id?: string | null
          error_message?: string | null
          executed_at?: string
          execution_result?: string
          id?: string
          trigger_data?: Json | null
          workflow_rule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_workflow_rule_id_fkey"
            columns: ["workflow_rule_id"]
            isOneToOne: false
            referencedRelation: "workflow_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_rules: {
        Row: {
          action_condition: string | null
          action_field: string
          action_value: string | null
          created_at: string
          created_by: string | null
          description: string | null
          execution_count: number
          id: string
          is_enabled: boolean
          last_executed_at: string | null
          name: string
          trigger_condition: string
          trigger_field: string
          trigger_value: string | null
          updated_at: string
        }
        Insert: {
          action_condition?: string | null
          action_field: string
          action_value?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          execution_count?: number
          id?: string
          is_enabled?: boolean
          last_executed_at?: string | null
          name: string
          trigger_condition: string
          trigger_field: string
          trigger_value?: string | null
          updated_at?: string
        }
        Update: {
          action_condition?: string | null
          action_field?: string
          action_value?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          execution_count?: number
          id?: string
          is_enabled?: boolean
          last_executed_at?: string | null
          name?: string
          trigger_condition?: string
          trigger_field?: string
          trigger_value?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_campaign_creators: {
        Row: {
          approval_status: string | null
          campaign_id: string | null
          created_at: string | null
          due_date: string | null
          expected_post_date: string | null
          id: string | null
          instagram_handle: string | null
          post_status: string | null
          post_type: string | null
          posts_count: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_creators_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_creators_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "public_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      public_campaigns: {
        Row: {
          brand_name: string | null
          content_types: string[] | null
          created_at: string | null
          description: string | null
          duration_days: number | null
          id: string | null
          music_genres: string[] | null
          name: string | null
          post_types: string[] | null
          public_token: string | null
          start_date: string | null
          status: string | null
          stream_goal_display: number | null
          sub_genres: string[] | null
          territory_preferences: string[] | null
          track_name: string | null
          track_url: string | null
        }
        Insert: {
          brand_name?: string | null
          content_types?: string[] | null
          created_at?: string | null
          description?: string | null
          duration_days?: number | null
          id?: string | null
          music_genres?: string[] | null
          name?: string | null
          post_types?: string[] | null
          public_token?: string | null
          start_date?: string | null
          status?: string | null
          stream_goal_display?: number | null
          sub_genres?: string[] | null
          territory_preferences?: string[] | null
          track_name?: string | null
          track_url?: string | null
        }
        Update: {
          brand_name?: string | null
          content_types?: string[] | null
          created_at?: string | null
          description?: string | null
          duration_days?: number | null
          id?: string | null
          music_genres?: string[] | null
          name?: string | null
          post_types?: string[] | null
          public_token?: string | null
          start_date?: string | null
          status?: string | null
          stream_goal_display?: number | null
          sub_genres?: string[] | null
          territory_preferences?: string[] | null
          track_name?: string | null
          track_url?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      ensure_campaign_allocation_records: {
        Args: { p_campaign_id: string }
        Returns: undefined
      }
      get_artist_influence_project_info: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_campaign_invoice_status: {
        Args: { campaign_uuid: string }
        Returns: string
      }
      get_campaign_performance_status: {
        Args: {
          current_streams: number
          duration_days: number
          start_date: string
          stream_goal: number
        }
        Returns: string
      }
      get_current_user_email: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      get_instagram_campaign_project_info: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      get_next_campaign_status: {
        Args: { current_status: string }
        Returns: string
      }
      get_public_campaign_by_token: {
        Args: { token_param: string }
        Returns: {
          brand_name: string
          content_types: string[]
          created_at: string
          description: string
          duration_days: number
          id: string
          music_genres: string[]
          name: string
          post_types: string[]
          public_token: string
          start_date: string
          status: string
          stream_goal_display: number
          sub_genres: string[]
          territory_preferences: string[]
          track_name: string
          track_url: string
        }[]
      }
      get_public_creators: {
        Args: Record<PropertyKey, never>
        Returns: {
          audience_territories: string[]
          base_country: string
          carousel_rate: number
          content_types: string[]
          created_at: string
          engagement_rate: number
          followers: number
          id: string
          instagram_handle: string
          median_views_per_video: number
          music_genres: string[]
          reel_rate: number
          story_rate: number
          updated_at: string
        }[]
      }
      get_spotify_token: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_creator: {
        Args: {
          p_audience_territories: string[]
          p_base_country: string
          p_carousel_rate?: number
          p_content_types: string[]
          p_email?: string
          p_engagement_rate: number
          p_followers: number
          p_instagram_handle: string
          p_median_views_per_video: number
          p_music_genres: string[]
          p_reel_rate: number
          p_story_rate?: number
        }
        Returns: string
      }
      is_salesperson: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_vendor: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      is_vendor_manager: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      regenerate_campaign_public_token: {
        Args: { campaign_id: string }
        Returns: string
      }
      update_playlist_avg_streams: {
        Args: { playlist_uuid: string }
        Returns: undefined
      }
      update_playlist_reliability_score: {
        Args: { playlist_uuid: string }
        Returns: undefined
      }
      update_vendor_reliability_scores: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "manager" | "user" | "salesperson" | "vendor"
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
      app_role: ["admin", "manager", "user", "salesperson", "vendor"],
    },
  },
} as const







