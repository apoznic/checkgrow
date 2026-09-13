export type ContactType = 'lead' | 'prospect' | 'client' | 'partner' | 'vendor' | 'other';
export type DealStage = 'lead' | 'negotiation' | 'won' | 'lost' | 'archived';

export interface CRMContact {
  id: string;
  cluster_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  position: string | null;
  contact_type: ContactType;
  tags: string[];
  notes: string | null;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  // Lead tracking fields
  lead_status?: string | null;
  last_contacted_at?: string | null;
  next_followup_at?: string | null;
  source?: string | null;
  profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface CRMDeal {
  id: string;
  cluster_id: string;
  contact_id: string | null;
  title: string;
  description: string | null;
  value: number | null;
  currency: string;
  stage: DealStage;
  probability: number;
  expected_close_date: string | null;
  created_by: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  approval_status: string;
  project_id?: string | null;
  archived_from?: string | null;
  source?: string | null;
  campaign?: string | null;
  form_name?: string | null;
  ad_name?: string | null;
  attributes?: Record<string, unknown> | null;
  inbound_webhook_id?: string | null;
  crm_contacts?: CRMContact;
  profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export interface CRMActivity {
  id: string;
  cluster_id: string;
  contact_id: string | null;
  deal_id: string | null;
  activity_type: string;
  subject: string;
  content: string | null;
  activity_date: string;
  created_by: string;
  created_at: string;
  profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  crm_contacts?: {
    id: string;
    name: string;
  };
  crm_deals?: {
    id: string;
    title: string;
  };
}

export interface CRMTask {
  id: string;
  cluster_id: string;
  contact_id: string | null;
  deal_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assigned_to: string;
  created_by: string;
  created_at: string;
  completed_at: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  notes: string | null;
  profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
  crm_contacts?: {
    id: string;
    name: string;
  };
  crm_deals?: {
    id: string;
    title: string;
  };
}
