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
          source: string | null
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
          source?: string | null
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
          source?: string | null
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
      crm_webhook_events: {
        Row: {
          cluster_id: string
          contact_id: string | null
          created_at: string
          deal_id: string | null
          error: string | null
          external_id: string | null
          id: string
          payload: Json
          status: string
          webhook_id: string
        }
        Insert: {
          cluster_id: string
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          error?: string | null
          external_id?: string | null
          id?: string
          payload?: Json
          status?: string
          webhook_id: string
        }
        Update: {
          cluster_id?: string
          contact_id?: string | null
          created_at?: string
          deal_id?: string | null
          error?: string | null
          external_id?: string | null
          id?: string
          payload?: Json
          status?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_webhook_events_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_webhook_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "crm_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_webhook_events_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "crm_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_webhook_events_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "crm_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_webhooks: {
        Row: {
          cluster_id: string
          created_at: string
          created_by: string | null
          default_assigned_to: string | null
          default_stage: Database["public"]["Enums"]["deal_stage"]
          enabled: boolean
          id: string
          last_received_at: string | null
          name: string
          received_count: number
          source_label: string | null
          token: string
          updated_at: string
        }
        Insert: {
          cluster_id: string
          created_at?: string
          created_by?: string | null
          default_assigned_to?: string | null
          default_stage?: Database["public"]["Enums"]["deal_stage"]
          enabled?: boolean
          id?: string
          last_received_at?: string | null
          name: string
          received_count?: number
          source_label?: string | null
          token?: string
          updated_at?: string
        }
        Update: {
          cluster_id?: string
          created_at?: string
          created_by?: string | null
          default_assigned_to?: string | null
          default_stage?: Database["public"]["Enums"]["deal_stage"]
          enabled?: boolean
          id?: string
          last_received_at?: string | null
          name?: string
          received_count?: number
          source_label?: string | null
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_webhooks_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_webhooks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_webhooks_default_assigned_to_fkey"
            columns: ["default_assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
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
        Relationships: [
          {
            foreignKeyName: "newsletter_campaigns_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_campaigns_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "newsletter_groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_campaigns_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "newsletter_contacts_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "newsletter_groups_cluster_id_fkey"
            columns: ["cluster_id"]
            isOneToOne: false
            referencedRelation: "clusters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "newsletter_groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          notification_type: string
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
          {
            foreignKeyName: "org_registries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
            foreignKeyName: "org_registry_rows_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "org_registry_rows_registry_id_fkey"
            columns: ["registry_id"]
            isOneToOne: false
            referencedRelation: "org_registries"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "private_link_groups_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "private_links_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
        Relationships: [
          {
            foreignKeyName: "private_meetings_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
        Relationships: [
          {
            foreignKeyName: "private_tasks_profile_id_fkey"
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
      bump_webhook_counter: { Args: { _webhook_id: string }; Returns: undefined }
      current_profile_id: { Args: never; Returns: string }
      deal_cluster: { Args: { _deal_id: string }; Returns: string }
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
      is_org_manager: { Args: { _cluster_id: string }; Returns: boolean }
      is_org_member: {
        Args: { _cluster_id: string; _user_id: string }
        Returns: boolean
      }
      registry_cluster: { Args: { _registry_id: string }; Returns: string }
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
