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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_conversations: {
        Row: {
          conversation_type: string
          created_at: string
          id: string
          profile_id: string
          project_id: string | null
        }
        Insert: {
          conversation_type: string
          created_at?: string
          id?: string
          profile_id: string
          project_id?: string | null
        }
        Update: {
          conversation_type?: string
          created_at?: string
          id?: string
          profile_id?: string
          project_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_conversations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      billable_tasks: {
        Row: {
          approved_at: string | null
          assigned_to: string | null
          created_at: string
          created_by: string
          currency: string
          description: string | null
          fixed_price: number
          id: string
          paid_at: string | null
          platform_fee_amount: number | null
          platform_fee_percent: number | null
          project_id: string
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          submitted_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by: string
          currency?: string
          description?: string | null
          fixed_price?: number
          id?: string
          paid_at?: string | null
          platform_fee_amount?: number | null
          platform_fee_percent?: number | null
          project_id: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          submitted_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          description?: string | null
          fixed_price?: number
          id?: string
          paid_at?: string | null
          platform_fee_amount?: number | null
          platform_fee_percent?: number | null
          project_id?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          submitted_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "billable_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billable_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billable_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_events: {
        Row: {
          all_day: boolean
          assigned_to: string | null
          cluster_id: string
          color: string | null
          contact_id: string | null
          created_at: string
          created_by: string
          deal_id: string | null
          description: string | null
          end_date: string | null
          google_event_id: string | null
          id: string
          start_date: string
          synced_at: string | null
          tags: string[] | null
          task_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          all_day?: boolean
          assigned_to?: string | null
          cluster_id: string
          color?: string | null
          contact_id?: string | null
          created_at?: string
          created_by: string
          deal_id?: string | null
          description?: string | null
          end_date?: string | null
          google_event_id?: string | null
          id?: string
          start_date: string
          synced_at?: string | null
          tags?: string[] | null
          task_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          all_day?: boolean
          assigned_to?: string | null
          cluster_id?: string
          color?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string
          deal_id?: string | null
          description?: string | null
          end_date?: string | null
          google_event_id?: string | null
          id?: string
          start_date?: string
          synced_at?: string | null
          tags?: string[] | null
          task_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "crm_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      cluster_calendar_tokens: {
        Row: {
          access_token: string
          calendar_id: string | null
          cluster_id: string
          connected_by: string
          created_at: string
          id: string
          refresh_token: string
          token_expires_at: string
          updated_at: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          cluster_id: string
          connected_by: string
          created_at?: string
          id?: string
          refresh_token: string
          token_expires_at: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          cluster_id?: string
          connected_by?: string
          created_at?: string
          id?: string
          refresh_token?: string
          token_expires_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cluster_calendar_tokens_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: true
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cluster_calendar_tokens_connected_by_fkey"
            columns: ["connected_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cluster_enrollments: {
        Row: {
          cluster_id: string
          id: string
          profile_id: string
          requested_at: string
          reviewed_at: string | null
          reviewed_by: string | null
          role: Database["public"]["Enums"]["org_role"]
          status: Database["public"]["Enums"]["enrollment_status"]
        }
        Insert: {
          cluster_id: string
          id?: string
          profile_id: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: Database["public"]["Enums"]["org_role"]
          status?: Database["public"]["Enums"]["enrollment_status"]
        }
        Update: {
          cluster_id?: string
          id?: string
          profile_id?: string
          requested_at?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          role?: Database["public"]["Enums"]["org_role"]
          status?: Database["public"]["Enums"]["enrollment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "cluster_enrollments_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cluster_enrollments_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cluster_integrations: {
        Row: {
          cluster_id: string
          config: Json | null
          created_at: string | null
          encrypted_key: string
          id: string
          is_active: boolean | null
          service_name: string
          updated_at: string | null
        }
        Insert: {
          cluster_id: string
          config?: Json | null
          created_at?: string | null
          encrypted_key: string
          id?: string
          is_active?: boolean | null
          service_name: string
          updated_at?: string | null
        }
        Update: {
          cluster_id?: string
          config?: Json | null
          created_at?: string | null
          encrypted_key?: string
          id?: string
          is_active?: boolean | null
          service_name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cluster_integrations_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      cluster_invitations: {
        Row: {
          accepted_at: string | null
          cluster_id: string
          created_at: string
          email: string
          id: string
          invited_by: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          cluster_id: string
          created_at?: string
          email: string
          id?: string
          invited_by: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          cluster_id?: string
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "cluster_invitations_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cluster_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cluster_service_pricing: {
        Row: {
          base_price: number
          cluster_id: string
          created_at: string
          currency: string
          description: string | null
          estimated_hours: number | null
          id: string
          service_name: string
          service_type: string
          updated_at: string
        }
        Insert: {
          base_price?: number
          cluster_id: string
          created_at?: string
          currency?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          service_name: string
          service_type: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          cluster_id?: string
          created_at?: string
          currency?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          service_name?: string
          service_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cluster_service_pricing_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      clusters: {
        Row: {
          address: string | null
          category: string | null
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          platform_fee_percent: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          platform_fee_percent?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          category?: string | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          platform_fee_percent?: number
          updated_at?: string
        }
        Relationships: []
      }
      connect_requests: {
        Row: {
          created_at: string
          id: string
          message: string | null
          receiver_profile_id: string
          responded_at: string | null
          sender_profile_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          receiver_profile_id: string
          responded_at?: string | null
          sender_profile_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          receiver_profile_id?: string
          responded_at?: string | null
          sender_profile_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "connect_requests_receiver_profile_id_fkey"
            columns: ["receiver_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "connect_requests_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_comments: {
        Row: {
          author_id: string
          contact_id: string
          content: string
          created_at: string
          id: string
        }
        Insert: {
          author_id: string
          contact_id: string
          content: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string
          contact_id?: string
          content?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_comments_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities: {
        Row: {
          activity_date: string
          activity_type: string
          cluster_id: string
          contact_id: string | null
          content: string | null
          created_at: string
          created_by: string
          deal_id: string | null
          id: string
          subject: string
        }
        Insert: {
          activity_date?: string
          activity_type: string
          cluster_id: string
          contact_id?: string | null
          content?: string | null
          created_at?: string
          created_by: string
          deal_id?: string | null
          id?: string
          subject: string
        }
        Update: {
          activity_date?: string
          activity_type?: string
          cluster_id?: string
          contact_id?: string | null
          content?: string | null
          created_at?: string
          created_by?: string
          deal_id?: string | null
          id?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_contacts: {
        Row: {
          assigned_to: string | null
          cluster_id: string
          company: string | null
          contact_type: Database["public"]["Enums"]["contact_type"]
          created_at: string
          created_by: string
          email: string | null
          id: string
          last_contacted_at: string | null
          lead_status: string | null
          name: string
          next_followup_at: string | null
          notes: string | null
          phone: string | null
          position: string | null
          source: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          cluster_id: string
          company?: string | null
          contact_type?: Database["public"]["Enums"]["contact_type"]
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          last_contacted_at?: string | null
          lead_status?: string | null
          name: string
          next_followup_at?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          cluster_id?: string
          company?: string | null
          contact_type?: Database["public"]["Enums"]["contact_type"]
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          last_contacted_at?: string | null
          lead_status?: string | null
          name?: string
          next_followup_at?: string | null
          notes?: string | null
          phone?: string | null
          position?: string | null
          source?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_contacts_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_deals: {
        Row: {
          approval_status: string
          archived_from: string | null
          assigned_to: string | null
          closed_at: string | null
          cluster_id: string
          contact_id: string | null
          created_at: string
          created_by: string
          currency: string | null
          description: string | null
          expected_close_date: string | null
          finder_bonus_percent: number | null
          id: string
          org_equity: number | null
          org_percentage: number | null
          probability: number | null
          project_id: string | null
          stage: Database["public"]["Enums"]["deal_stage"]
          title: string
          updated_at: string
          value: number | null
        }
        Insert: {
          approval_status?: string
          archived_from?: string | null
          assigned_to?: string | null
          closed_at?: string | null
          cluster_id: string
          contact_id?: string | null
          created_at?: string
          created_by: string
          currency?: string | null
          description?: string | null
          expected_close_date?: string | null
          finder_bonus_percent?: number | null
          id?: string
          org_equity?: number | null
          org_percentage?: number | null
          probability?: number | null
          project_id?: string | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          title: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          approval_status?: string
          archived_from?: string | null
          assigned_to?: string | null
          closed_at?: string | null
          cluster_id?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string
          currency?: string | null
          description?: string | null
          expected_close_date?: string | null
          finder_bonus_percent?: number | null
          id?: string
          org_equity?: number | null
          org_percentage?: number | null
          probability?: number | null
          project_id?: string | null
          stage?: Database["public"]["Enums"]["deal_stage"]
          title?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "crm_deals_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_deals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tasks: {
        Row: {
          actual_hours: number | null
          assigned_to: string
          brief: string | null
          brief_generated_at: string | null
          cluster_id: string
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string
          deal_id: string | null
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          notes: string | null
          priority: string
          status: string
          task_type: string
          title: string
        }
        Insert: {
          actual_hours?: number | null
          assigned_to: string
          brief?: string | null
          brief_generated_at?: string | null
          cluster_id: string
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by: string
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          notes?: string | null
          priority?: string
          status?: string
          task_type?: string
          title: string
        }
        Update: {
          actual_hours?: number | null
          assigned_to?: string
          brief?: string | null
          brief_generated_at?: string | null
          cluster_id?: string
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string
          deal_id?: string | null
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          notes?: string | null
          priority?: string
          status?: string
          task_type?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          deal_id: string
          id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          deal_id: string
          id?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          deal_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_comments_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
        ]
      }
      deal_members: {
        Row: {
          compensation_label: string | null
          compensation_type: string
          compensation_value: number
          created_at: string
          deal_id: string
          equity_percentage: number | null
          id: string
          is_finder_bonus: boolean | null
          monthly_amount: number | null
          one_time_commission: number | null
          profile_id: string
          updated_at: string
        }
        Insert: {
          compensation_label?: string | null
          compensation_type?: string
          compensation_value?: number
          created_at?: string
          deal_id: string
          equity_percentage?: number | null
          id?: string
          is_finder_bonus?: boolean | null
          monthly_amount?: number | null
          one_time_commission?: number | null
          profile_id: string
          updated_at?: string
        }
        Update: {
          compensation_label?: string | null
          compensation_type?: string
          compensation_value?: number
          created_at?: string
          deal_id?: string
          equity_percentage?: number | null
          id?: string
          is_finder_bonus?: boolean | null
          monthly_amount?: number | null
          one_time_commission?: number | null
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "deal_members_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deal_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
          thread_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
          thread_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "dm_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_threads: {
        Row: {
          created_at: string
          id: string
          participant_1: string
          participant_2: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          participant_1: string
          participant_2: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          participant_1?: string
          participant_2?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dm_threads_participant_1_fkey"
            columns: ["participant_1"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_threads_participant_2_fkey"
            columns: ["participant_2"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      google_calendar_tokens: {
        Row: {
          access_token: string
          calendar_id: string | null
          created_at: string
          id: string
          profile_id: string
          refresh_token: string
          token_expires_at: string
          updated_at: string
        }
        Insert: {
          access_token: string
          calendar_id?: string | null
          created_at?: string
          id?: string
          profile_id: string
          refresh_token: string
          token_expires_at: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          calendar_id?: string | null
          created_at?: string
          id?: string
          profile_id?: string
          refresh_token?: string
          token_expires_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_calendar_tokens_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          message_type: string | null
          project_id: string
          sender_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          message_type?: string | null
          project_id: string
          sender_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          message_type?: string | null
          project_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_campaigns: {
        Row: {
          audience_id: string | null
          cluster_id: string
          content: string
          group_id: string | null
          id: string
          recipients_count: number
          sent_at: string
          sent_by: string | null
          subject: string
        }
        Insert: {
          audience_id?: string | null
          cluster_id: string
          content: string
          group_id?: string | null
          id?: string
          recipients_count?: number
          sent_at?: string
          sent_by?: string | null
          subject: string
        }
        Update: {
          audience_id?: string | null
          cluster_id?: string
          content?: string
          group_id?: string | null
          id?: string
          recipients_count?: number
          sent_at?: string
          sent_by?: string | null
          subject?: string
        }
        Relationships: []
      }
      newsletter_contacts: {
        Row: {
          audience_id: string | null
          cluster_id: string
          created_at: string
          email: string
          full_name: string | null
          group_ids: string[]
          id: string
          resend_contact_id: string | null
          unsubscribed: boolean
          updated_at: string
        }
        Insert: {
          audience_id?: string | null
          cluster_id: string
          created_at?: string
          email: string
          full_name?: string | null
          group_ids?: string[]
          id?: string
          resend_contact_id?: string | null
          unsubscribed?: boolean
          updated_at?: string
        }
        Update: {
          audience_id?: string | null
          cluster_id?: string
          created_at?: string
          email?: string
          full_name?: string | null
          group_ids?: string[]
          id?: string
          resend_contact_id?: string | null
          unsubscribed?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      newsletter_groups: {
        Row: {
          cluster_id: string
          color: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
        }
        Insert: {
          cluster_id: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name: string
        }
        Update: {
          cluster_id?: string
          color?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          cluster_id: string
          content: string | null
          created_at: string
          id: string
          is_read: boolean
          link_id: string | null
          link_type: string | null
          notification_type: string
          recipient_id: string
          sender_id: string
          title: string
        }
        Insert: {
          cluster_id: string
          content?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link_id?: string | null
          link_type?: string | null
          notification_type?: string
          recipient_id: string
          sender_id: string
          title: string
        }
        Update: {
          cluster_id?: string
          content?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link_id?: string | null
          link_type?: string | null
          notification_type?: string
          recipient_id?: string
          sender_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_recipient_id_fkey"
            columns: ["recipient_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_announcements: {
        Row: {
          author_id: string
          cluster_id: string
          content: string
          created_at: string
          id: string
          priority: string | null
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          cluster_id: string
          content: string
          created_at?: string
          id?: string
          priority?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          cluster_id?: string
          content?: string
          created_at?: string
          id?: string
          priority?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_announcements_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_announcements_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      org_registries: {
        Row: {
          cluster_id: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          name: string
          position: number
          updated_at: string
          webhook_enabled: boolean
          webhook_last_received_at: string | null
          webhook_token: string | null
        }
        Insert: {
          cluster_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name: string
          position?: number
          updated_at?: string
          webhook_enabled?: boolean
          webhook_last_received_at?: string | null
          webhook_token?: string | null
        }
        Update: {
          cluster_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          name?: string
          position?: number
          updated_at?: string
          webhook_enabled?: boolean
          webhook_last_received_at?: string | null
          webhook_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "org_registries_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      org_registry_columns: {
        Row: {
          created_at: string
          id: string
          key: string
          name: string
          options: Json | null
          position: number
          registry_id: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          name: string
          options?: Json | null
          position?: number
          registry_id: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          name?: string
          options?: Json | null
          position?: number
          registry_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_registry_columns_registry_id_fkey"
            columns: ["registry_id"]
            isOneToOne: false
            referencedRelation: "org_registries"
            referencedColumns: ["id"]
          },
        ]
      }
      org_registry_rows: {
        Row: {
          created_at: string
          created_by: string | null
          data: Json
          id: string
          position: number
          registry_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          position?: number
          registry_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data?: Json
          id?: string
          position?: number
          registry_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_registry_rows_registry_id_fkey"
            columns: ["registry_id"]
            isOneToOne: false
            referencedRelation: "org_registries"
            referencedColumns: ["id"]
          },
        ]
      }
      org_resources: {
        Row: {
          cluster_id: string
          created_at: string
          description: string | null
          id: string
          name: string
          resource_type: string
          uploaded_by: string
          url: string
        }
        Insert: {
          cluster_id: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          resource_type: string
          uploaded_by: string
          url: string
        }
        Update: {
          cluster_id?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          resource_type?: string
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "org_resources_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_resources_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          profile_id: string
          sort_order: number
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          profile_id: string
          sort_order?: number
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          profile_id?: string
          sort_order?: number
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_tasks_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_item_revisions: {
        Row: {
          changed_by: string | null
          changed_by_name: string | null
          created_at: string
          field: string
          id: string
          item_id: string | null
          item_label: string | null
          new_value: string | null
          old_value: string | null
          plan_key: string
        }
        Insert: {
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          field: string
          id?: string
          item_id?: string | null
          item_label?: string | null
          new_value?: string | null
          old_value?: string | null
          plan_key?: string
        }
        Update: {
          changed_by?: string | null
          changed_by_name?: string | null
          created_at?: string
          field?: string
          id?: string
          item_id?: string | null
          item_label?: string | null
          new_value?: string | null
          old_value?: string | null
          plan_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_item_revisions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "plan_items"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_items: {
        Row: {
          created_at: string
          data: Json
          id: string
          plan_key: string
          section: string
          sort_order: number
          status: string
          updated_at: string
          updated_by: string | null
          updated_by_name: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          plan_key?: string
          section: string
          sort_order?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          plan_key?: string
          section?: string
          sort_order?: number
          status?: string
          updated_at?: string
          updated_by?: string | null
          updated_by_name?: string | null
        }
        Relationships: []
      }
      private_link_groups: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          profile_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      private_links: {
        Row: {
          created_at: string
          description: string | null
          group_id: string | null
          id: string
          profile_id: string
          title: string
          url: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          group_id?: string | null
          id?: string
          profile_id: string
          title: string
          url: string
        }
        Update: {
          created_at?: string
          description?: string | null
          group_id?: string | null
          id?: string
          profile_id?: string
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "private_links_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "private_link_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      private_meetings: {
        Row: {
          attendees: string | null
          created_at: string
          id: string
          location: string | null
          meeting_at: string
          notes: string | null
          profile_id: string
          title: string
          updated_at: string
        }
        Insert: {
          attendees?: string | null
          created_at?: string
          id?: string
          location?: string | null
          meeting_at: string
          notes?: string | null
          profile_id: string
          title: string
          updated_at?: string
        }
        Update: {
          attendees?: string | null
          created_at?: string
          id?: string
          location?: string | null
          meeting_at?: string
          notes?: string | null
          profile_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      private_tasks: {
        Row: {
          archived: boolean
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          position: number
          priority: string
          profile_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: string
          profile_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          position?: number
          priority?: string
          profile_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      profile_traits: {
        Row: {
          confidence: string
          confirmed: boolean
          created_at: string
          id: string
          profile_id: string
          source: string
          trait_category: string
          trait_name: string
          updated_at: string
        }
        Insert: {
          confidence?: string
          confirmed?: boolean
          created_at?: string
          id?: string
          profile_id: string
          source?: string
          trait_category: string
          trait_name: string
          updated_at?: string
        }
        Update: {
          confidence?: string
          confirmed?: boolean
          created_at?: string
          id?: string
          profile_id?: string
          source?: string
          trait_category?: string
          trait_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profile_traits_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          availability_note: string | null
          avatar_url: string | null
          bio: string | null
          city: string | null
          created_at: string
          full_name: string | null
          id: string
          is_available: boolean | null
          latitude: number | null
          linkedin_url: string | null
          longitude: number | null
          onboarding_completed: boolean | null
          portfolio_url: string | null
          project_types: string[] | null
          updated_at: string
          user_id: string
          user_type: string
          work_experience: string | null
          years_total_experience: number | null
        }
        Insert: {
          availability_note?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_available?: boolean | null
          latitude?: number | null
          linkedin_url?: string | null
          longitude?: number | null
          onboarding_completed?: boolean | null
          portfolio_url?: string | null
          project_types?: string[] | null
          updated_at?: string
          user_id: string
          user_type?: string
          work_experience?: string | null
          years_total_experience?: number | null
        }
        Update: {
          availability_note?: string | null
          avatar_url?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          is_available?: boolean | null
          latitude?: number | null
          linkedin_url?: string | null
          longitude?: number | null
          onboarding_completed?: boolean | null
          portfolio_url?: string | null
          project_types?: string[] | null
          updated_at?: string
          user_id?: string
          user_type?: string
          work_experience?: string | null
          years_total_experience?: number | null
        }
        Relationships: []
      }
      project_activities: {
        Row: {
          activity_type: string
          actor_id: string | null
          created_at: string
          description: string
          id: string
          metadata: Json | null
          project_id: string
        }
        Insert: {
          activity_type: string
          actor_id?: string | null
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          project_id: string
        }
        Update: {
          activity_type?: string
          actor_id?: string | null
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_activities_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_checklist_confirmations: {
        Row: {
          confirmed_at: string
          id: string
          item_id: string
          profile_id: string
        }
        Insert: {
          confirmed_at?: string
          id?: string
          item_id: string
          profile_id: string
        }
        Update: {
          confirmed_at?: string
          id?: string
          item_id?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_checklist_confirmations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "project_checklist_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_checklist_confirmations_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_checklist_items: {
        Row: {
          created_at: string
          created_by: string
          id: string
          project_id: string
          question: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          project_id: string
          question: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          project_id?: string
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_checklist_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_checklist_items_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          project_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          project_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_doc_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          doc_id: string
          id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          doc_id: string
          id?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          doc_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_doc_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_doc_comments_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "project_docs"
            referencedColumns: ["id"]
          },
        ]
      }
      project_doc_images: {
        Row: {
          created_at: string
          doc_id: string
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          doc_id: string
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          doc_id?: string
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "project_doc_images_doc_id_fkey"
            columns: ["doc_id"]
            isOneToOne: false
            referencedRelation: "project_docs"
            referencedColumns: ["id"]
          },
        ]
      }
      project_docs: {
        Row: {
          author_id: string
          content: string | null
          created_at: string
          id: string
          project_id: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content?: string | null
          created_at?: string
          id?: string
          project_id: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string | null
          created_at?: string
          id?: string
          project_id?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_docs_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_docs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_key_people: {
        Row: {
          avatar_url: string | null
          company: string | null
          contact_id: string | null
          created_at: string
          created_by: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          position: number
          project_id: string
          role: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          company?: string | null
          contact_id?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          position?: number
          project_id: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          company?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          position?: number
          project_id?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_key_people_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_key_people_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_link_groups: {
        Row: {
          created_at: string
          created_by: string
          id: string
          name: string
          position: number
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          name: string
          position?: number
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          position?: number
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_link_groups_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_links: {
        Row: {
          added_by: string
          created_at: string
          description: string | null
          group_id: string | null
          id: string
          project_id: string
          title: string
          url: string
          urls: Json | null
        }
        Insert: {
          added_by: string
          created_at?: string
          description?: string | null
          group_id?: string | null
          id?: string
          project_id: string
          title: string
          url: string
          urls?: Json | null
        }
        Update: {
          added_by?: string
          created_at?: string
          description?: string | null
          group_id?: string | null
          id?: string
          project_id?: string
          title?: string
          url?: string
          urls?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "project_links_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_links_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "project_link_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_links_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_meeting_notes: {
        Row: {
          author_id: string
          created_at: string
          decisions: string
          id: string
          meeting_date: string
          next_steps: string
          priority: string
          project_id: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          created_at?: string
          decisions?: string
          id?: string
          meeting_date?: string
          next_steps?: string
          priority?: string
          project_id: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          created_at?: string
          decisions?: string
          id?: string
          meeting_date?: string
          next_steps?: string
          priority?: string
          project_id?: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_meeting_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_meeting_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_meetings: {
        Row: {
          attendees: string | null
          created_at: string
          created_by: string
          id: string
          location: string | null
          meeting_at: string
          notes: string | null
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          attendees?: string | null
          created_at?: string
          created_by: string
          id?: string
          location?: string | null
          meeting_at: string
          notes?: string | null
          project_id: string
          title: string
          updated_at?: string
        }
        Update: {
          attendees?: string | null
          created_at?: string
          created_by?: string
          id?: string
          location?: string | null
          meeting_at?: string
          notes?: string | null
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_milestones: {
        Row: {
          created_at: string
          deadline_type: string | null
          due_date: string
          id: string
          is_billing_trigger: boolean | null
          project_id: string
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          deadline_type?: string | null
          due_date: string
          id?: string
          is_billing_trigger?: boolean | null
          project_id: string
          status?: string
          title: string
        }
        Update: {
          created_at?: string
          deadline_type?: string | null
          due_date?: string
          id?: string
          is_billing_trigger?: boolean | null
          project_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_milestones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_resources: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          project_id: string
          resource_type: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          project_id: string
          resource_type?: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          project_id?: string
          resource_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_resources_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_settings: {
        Row: {
          created_at: string
          hourly_rate: number
          id: string
          project_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          hourly_rate?: number
          id?: string
          project_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          hourly_rate?: number
          id?: string
          project_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_sticky_notes: {
        Row: {
          author_id: string
          color: string
          content: string
          created_at: string
          id: string
          project_id: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          color?: string
          content?: string
          created_at?: string
          id?: string
          project_id: string
          title?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          color?: string
          content?: string
          created_at?: string
          id?: string
          project_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_sticky_notes_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_sticky_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_strategic_goals: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          position: number
          progress: number
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          position?: number
          progress?: number
          project_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          position?: number
          progress?: number
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_strategic_goals_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_task_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          task_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          task_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_task_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "project_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      project_tasks: {
        Row: {
          actual_hours: number | null
          archived_at: string | null
          archived_from: string | null
          assigned_to: string | null
          created_at: string
          description: string | null
          due_date: string | null
          estimated_hours: number | null
          id: string
          key_person_id: string | null
          priority: string
          project_id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          actual_hours?: number | null
          archived_at?: string | null
          archived_from?: string | null
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          key_person_id?: string | null
          priority?: string
          project_id: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          actual_hours?: number | null
          archived_at?: string | null
          archived_from?: string | null
          assigned_to?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          estimated_hours?: number | null
          id?: string
          key_person_id?: string | null
          priority?: string
          project_id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_key_person_id_fkey"
            columns: ["key_person_id"]
            isOneToOne: false
            referencedRelation: "project_key_people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_teams: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          project_id: string
          role_in_project: string | null
          status: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          project_id: string
          role_in_project?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          project_id?: string
          role_in_project?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_teams_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_teams_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_time_entries: {
        Row: {
          billable: boolean
          created_at: string
          description: string | null
          entry_date: string
          hours: number
          id: string
          profile_id: string
          project_id: string
        }
        Insert: {
          billable?: boolean
          created_at?: string
          description?: string | null
          entry_date?: string
          hours?: number
          id?: string
          profile_id: string
          project_id: string
        }
        Update: {
          billable?: boolean
          created_at?: string
          description?: string | null
          entry_date?: string
          hours?: number
          id?: string
          profile_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_time_entries_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          cluster_id: string | null
          created_at: string
          description: string | null
          google_drive_url: string | null
          id: string
          is_forge: boolean
          owner_id: string
          requirements: string | null
          source: string
          status: string | null
          title: string
          updated_at: string
          whatsapp_url: string | null
        }
        Insert: {
          cluster_id?: string | null
          created_at?: string
          description?: string | null
          google_drive_url?: string | null
          id?: string
          is_forge?: boolean
          owner_id: string
          requirements?: string | null
          source?: string
          status?: string | null
          title: string
          updated_at?: string
          whatsapp_url?: string | null
        }
        Update: {
          cluster_id?: string | null
          created_at?: string
          description?: string | null
          google_drive_url?: string | null
          id?: string
          is_forge?: boolean
          owner_id?: string
          requirements?: string | null
          source?: string
          status?: string | null
          title?: string
          updated_at?: string
          whatsapp_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          cluster_id: string
          created_at: string
          id: string
          is_enabled: boolean
          permission_key: string
          role: string
          updated_at: string
        }
        Insert: {
          cluster_id: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          permission_key: string
          role: string
          updated_at?: string
        }
        Update: {
          cluster_id?: string
          created_at?: string
          id?: string
          is_enabled?: boolean
          permission_key?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          skill_level: string | null
          skill_name: string
          years_experience: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          skill_level?: string | null
          skill_name: string
          years_experience?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          skill_level?: string | null
          skill_name?: string
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "skills_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_connect_accounts: {
        Row: {
          charges_enabled: boolean
          created_at: string
          id: string
          onboarding_complete: boolean
          payouts_enabled: boolean
          profile_id: string
          stripe_account_id: string
          updated_at: string
        }
        Insert: {
          charges_enabled?: boolean
          created_at?: string
          id?: string
          onboarding_complete?: boolean
          payouts_enabled?: boolean
          profile_id: string
          stripe_account_id: string
          updated_at?: string
        }
        Update: {
          charges_enabled?: boolean
          created_at?: string
          id?: string
          onboarding_complete?: boolean
          payouts_enabled?: boolean
          profile_id?: string
          stripe_account_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stripe_connect_accounts_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      task_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          task_id: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          task_id: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          task_id?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_attachments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "crm_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      task_comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          task_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          task_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          task_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_comments_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "crm_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      task_ratings: {
        Row: {
          billable_task_id: string
          comment: string | null
          created_at: string
          id: string
          rated_by: string
          rated_profile_id: string
          rating: number
        }
        Insert: {
          billable_task_id: string
          comment?: string | null
          created_at?: string
          id?: string
          rated_by: string
          rated_profile_id: string
          rating: number
        }
        Update: {
          billable_task_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          rated_by?: string
          rated_profile_id?: string
          rating?: number
        }
        Relationships: [
          {
            foreignKeyName: "task_ratings_billable_task_id_fkey"
            columns: ["billable_task_id"]
            isOneToOne: false
            referencedRelation: "billable_tasks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_ratings_rated_by_fkey"
            columns: ["rated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_ratings_rated_profile_id_fkey"
            columns: ["rated_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          cluster_id: string | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          cluster_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          cluster_id?: string | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_admin_manage_project_team: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      delete_project_cascade: {
        Args: { _caller_profile_id: string; _project_id: string }
        Returns: boolean
      }
      email_queue_dispatch: { Args: never; Returns: undefined }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_user_cluster: { Args: { _profile_id: string }; Returns: string }
      has_org_role: {
        Args: {
          _cluster_id: string
          _roles: Database["public"]["Enums"]["org_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_cluster_admin: {
        Args: { _cluster_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_member: {
        Args: { _cluster_id: string; _user_id: string }
        Returns: boolean
      }
      is_project_member: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "member"
      contact_type:
        | "lead"
        | "prospect"
        | "client"
        | "partner"
        | "vendor"
        | "other"
      deal_stage:
        | "lead"
        | "qualified"
        | "proposal"
        | "negotiation"
        | "won"
        | "lost"
        | "archived"
      enrollment_status: "pending" | "approved" | "rejected"
      org_role: "owner" | "admin" | "project_manager" | "participant" | "member"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "member"],
      contact_type: [
        "lead",
        "prospect",
        "client",
        "partner",
        "vendor",
        "other",
      ],
      deal_stage: [
        "lead",
        "qualified",
        "proposal",
        "negotiation",
        "won",
        "lost",
        "archived",
      ],
      enrollment_status: ["pending", "approved", "rejected"],
      org_role: ["owner", "admin", "project_manager", "participant", "member"],
    },
  },
} as const
