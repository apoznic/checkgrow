import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, DollarSign, Calendar, User, ChevronRight, 
  MoreVertical, Edit, Trash2, Loader2, X, TrendingUp, 
  LayoutGrid, List, Search, Users, Trophy, Rocket, Table2,
  Check, ArrowRight, ArrowLeft, FolderOpen, PartyPopper,
  MessageSquare, Send, Archive
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GlassInput } from '@/components/GlassCard';
import { GlassButtonNew } from '@/components/ui/glass-button';
import { GlassSelect } from '@/components/ui/glass-select';
import { CRMDeal, DealStage, CRMContact } from './types';
import { MentionInput } from './MentionInput';
import { DealMembersModal } from './DealMembersModal';
import { DealDetailModal } from './DealDetailModal';
import { DealTable } from './DealTable';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface DealComment {
  id: string;
  deal_id: string;
  author_id: string;
  content: string;
  created_at: string;
  profiles?: { id: string; full_name: string | null; avatar_url: string | null };
}

interface DealListProps {
  clusterId: string;
  profileId: string;
  canManage: boolean;
  userRole?: string;
  initialDealId?: string | null;
}

interface OrgMember {
  profile_id: string;
  role: string;
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

const pipelineStages: { value: DealStage; label: string; color: string; bgColor: string; icon: React.ElementType }[] = [
  { value: 'lead', label: 'Lead', color: 'text-slate-400', bgColor: 'bg-slate-500/20', icon: TrendingUp },
  { value: 'negotiation', label: 'Negotiation', color: 'text-amber-400', bgColor: 'bg-amber-500/20', icon: Users },
  { value: 'won', label: 'Won', color: 'text-green-400', bgColor: 'bg-green-500/20', icon: Trophy },
];

const archiveStage = { value: 'archived' as DealStage, label: 'Archive', color: 'text-zinc-500', bgColor: 'bg-zinc-500/20', icon: Archive };

const allStages = [...pipelineStages, archiveStage];

export function DealList({ clusterId, profileId, canManage, userRole, initialDealId }: DealListProps) {
  const { toast } = useToast();
  const [deals, setDeals] = useState<CRMDeal[]>([]);
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [orgMembers, setOrgMembers] = useState<OrgMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<CRMDeal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'kanban' | 'table'>(() => (localStorage.getItem('deals_view_mode') as 'list' | 'kanban' | 'table') || 'table');
  useEffect(() => { localStorage.setItem('deals_view_mode', viewMode); }, [viewMode]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStage, setFilterStage] = useState<DealStage | 'all'>('all');
  const [showArchive, setShowArchive] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<CRMDeal | null>(null);
  const [detailDeal, setDetailDeal] = useState<CRMDeal | null>(null);
  const [draggedDealId, setDraggedDealId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<DealStage | null>(null);

  // Won celebration
  const [wonDeal, setWonDeal] = useState<CRMDeal | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contact_id: '',
    assigned_to: '',
    value: '',
    currency: 'EUR',
    stage: 'lead' as DealStage,
    probability: 20,
    expected_close_date: '',
  });

  // Inline new contact creation
  const [showNewContact, setShowNewContact] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactCompany, setNewContactCompany] = useState('');
  const [isCreatingContact, setIsCreatingContact] = useState(false);

  // Comments
  const [commentOpenId, setCommentOpenId] = useState<string | null>(null);
  const [dealComments, setDealComments] = useState<Record<string, DealComment[]>>({});
  const [newComment, setNewComment] = useState('');
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [unreadDealIds, setUnreadDealIds] = useState<Set<string>>(new Set());

  // Team member selection in modal
  const [selectedTeamMembers, setSelectedTeamMembers] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState('');

  useEffect(() => {
    loadDeals();
    loadContacts();
    loadOrgMembers();

    const channel = supabase
      .channel('crm_deals_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_deals', filter: `cluster_id=eq.${clusterId}` }, () => {
        loadDeals();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clusterId]);

  // Auto-open a specific deal when initialDealId is provided
  useEffect(() => {
    if (initialDealId && deals.length > 0 && !detailDeal) {
      const targetDeal = deals.find(d => d.id === initialDealId);
      if (targetDeal) {
        setDetailDeal(targetDeal);
      }
    }
  }, [initialDealId, deals]);

  const loadDeals = async () => {
    const { data, error } = await supabase
      .from('crm_deals')
      .select('*, crm_contacts(id, name), profiles:assigned_to(id, full_name, avatar_url)')
      .eq('cluster_id', clusterId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setDeals(data as unknown as CRMDeal[]);
    }
    setIsLoading(false);
  };

  const loadContacts = async () => {
    const { data } = await supabase
      .from('crm_contacts')
      .select('id, name, company')
      .eq('cluster_id', clusterId);
    if (data) setContacts(data as unknown as CRMContact[]);
  };

  const loadOrgMembers = async () => {
    const { data } = await supabase
      .from('cluster_enrollments')
      .select('profile_id, role, profiles:profile_id(id, full_name, avatar_url)')
      .eq('cluster_id', clusterId)
      .eq('status', 'approved');
    if (data) {
      setOrgMembers(
        data
          .map(m => ({
            profile_id: m.profile_id,
            role: m.role,
            profiles: m.profiles as unknown as OrgMember['profiles'],
          }))
      );
    }
  };

  const loadCommentCounts = async (dealList: CRMDeal[]) => {
    const dealIds = dealList.map(d => d.id);
    if (dealIds.length === 0) return;
    const { data } = await supabase
      .from('deal_comments')
      .select('deal_id')
      .in('deal_id', dealIds);
    if (data) {
      const counts: Record<string, number> = {};
      data.forEach((c: any) => {
        counts[c.deal_id] = (counts[c.deal_id] || 0) + 1;
      });
      setCommentCounts(counts);
    }
  };

  useEffect(() => {
    if (deals.length > 0) {
      loadCommentCounts(deals);
      loadUnreadDeals(deals);
    }
  }, [deals]);

  const loadUnreadDeals = async (dealList: CRMDeal[]) => {
    const dealIds = dealList.map(d => d.id);
    if (dealIds.length === 0) return;
    const { data } = await supabase
      .from('notifications')
      .select('link_id')
      .eq('recipient_id', profileId)
      .eq('is_read', false)
      .eq('link_type', 'deal')
      .in('link_id', dealIds);
    if (data) {
      setUnreadDealIds(new Set(data.map((n: any) => n.link_id)));
    }
  };

  const loadDealComments = async (dealId: string) => {
    const { data } = await supabase
      .from('deal_comments')
      .select('*, profiles:author_id(id, full_name, avatar_url)')
      .eq('deal_id', dealId)
      .order('created_at', { ascending: true });
    if (data) {
      setDealComments(prev => ({ ...prev, [dealId]: data as unknown as DealComment[] }));
    }
  };

  const handleAddComment = async (dealId: string, commentText?: string) => {
    const text = commentText || newComment;
    if (!text.trim()) return;
    const { error } = await supabase.from('deal_comments').insert({
      deal_id: dealId,
      author_id: profileId,
      content: text.trim(),
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setNewComment('');
      loadDealComments(dealId);
      loadCommentCounts(deals);

      // Create notifications for deal participants
      const deal = deals.find(d => d.id === dealId);
      if (deal) {
        const recipientIds = new Set<string>();
        if (deal.assigned_to && deal.assigned_to !== profileId) recipientIds.add(deal.assigned_to);
        const { data: members } = await supabase.from('deal_members').select('profile_id').eq('deal_id', dealId);
        members?.forEach(m => { if (m.profile_id !== profileId) recipientIds.add(m.profile_id); });
        const { data: commenters } = await supabase.from('deal_comments').select('author_id').eq('deal_id', dealId);
        commenters?.forEach(c => { if (c.author_id !== profileId) recipientIds.add(c.author_id); });

        if (recipientIds.size > 0) {
          const notifications = Array.from(recipientIds).map(recipientId => ({
            recipient_id: recipientId,
            sender_id: profileId,
            notification_type: text.includes('@') ? 'mention' : 'comment',
            title: `commented on "${deal.title}"`,
            content: text.trim().substring(0, 200),
            link_type: 'deal',
            link_id: dealId,
            cluster_id: clusterId,
          }));
          await supabase.from('notifications').insert(notifications);
        }
      }
    }
  };

  const handleDeleteComment = async (commentId: string, dealId: string) => {
    await supabase.from('deal_comments').delete().eq('id', commentId);
    loadDealComments(dealId);
    loadCommentCounts(deals);
  };

  const toggleComments = (e: React.MouseEvent, dealId: string) => {
    e.stopPropagation();
    if (commentOpenId === dealId) {
      setCommentOpenId(null);
    } else {
      setCommentOpenId(dealId);
      if (!dealComments[dealId]) loadDealComments(dealId);
    }
  };

  const isManagerRole = ['owner', 'admin', 'project_manager'].includes(userRole || '');

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;
    // Auto-assign to submitter if no responsible person selected
    const assignedTo = formData.assigned_to || profileId;
    setIsSubmitting(true);

    const dealData = {
      cluster_id: clusterId,
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      contact_id: formData.contact_id || null,
      assigned_to: assignedTo,
      value: formData.value ? parseFloat(formData.value) : null,
      currency: formData.currency,
      stage: formData.stage,
      probability: formData.probability,
      expected_close_date: formData.expected_close_date || null,
      created_by: profileId,
      approval_status: isManagerRole ? 'approved' : 'pending',
    };

    if (editingDeal) {
      const { error } = await supabase
        .from('crm_deals')
        .update(dealData)
        .eq('id', editingDeal.id);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Deal updated' });
        closeModal();
        loadDeals();
      }
    } else {
      const { data: newDeal, error } = await supabase
        .from('crm_deals')
        .insert(dealData)
        .select()
        .single();

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else if (newDeal) {
        // Add selected team members as deal members
        if (selectedTeamMembers.length > 0) {
          const memberInserts = selectedTeamMembers.map(pid => ({
            deal_id: newDeal.id,
            profile_id: pid,
            compensation_type: 'percentage',
            compensation_value: 0,
          }));
          await supabase.from('deal_members').insert(memberInserts);
        }
        toast({ 
          title: isManagerRole ? 'Deal created! 🎉' : 'Request submitted! 📩', 
          description: isManagerRole 
            ? `${selectedTeamMembers.length} team members assigned.` 
            : 'Your deal request has been sent to a manager for approval.' 
        });
        closeModal();
        loadDeals();
      }
    }

    setIsSubmitting(false);
  };

  const handleApproveRequest = async (dealId: string) => {
    const { error } = await supabase
      .from('crm_deals')
      .update({ approval_status: 'approved' })
      .eq('id', dealId);
    if (!error) {
      toast({ title: 'Deal approved ✅' });
      loadDeals();
    }
  };

  const handleRejectRequest = async (dealId: string) => {
    const { error } = await supabase
      .from('crm_deals')
      .update({ approval_status: 'rejected' })
      .eq('id', dealId);
    if (!error) {
      toast({ title: 'Deal rejected' });
      loadDeals();
    }
  };

  const handleArchiveTag = async (dealId: string, tag: 'won' | 'lost' | null) => {
    const { error } = await supabase
      .from('crm_deals')
      .update({ archived_from: tag })
      .eq('id', dealId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: tag ? `Tagged as ${tag === 'won' ? 'Won 🏆' : 'Lost ✕'}` : 'Tag removed' });
      loadDeals();
    }
  };

  const handleMarkAsLost = async (dealId: string) => {
    const { error } = await supabase
      .from('crm_deals')
      .update({ stage: 'archived', archived_from: 'lost', closed_at: new Date().toISOString() })
      .eq('id', dealId);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Marked as Lost & archived ✕' });
      loadDeals();
    }
  };

  const handleStageChange = async (dealId: string, newStage: DealStage, currentStage?: DealStage) => {
    const closedAt = newStage === 'won' ? new Date().toISOString() : null;
    const updateData: any = { stage: newStage, closed_at: closedAt };
    
    // When archiving, remember which stage it came from
    if (newStage === 'archived' && currentStage) {
      updateData.archived_from = currentStage;
    } else if (newStage !== 'archived') {
      updateData.archived_from = null;
    }
    
    const { error } = await supabase
      .from('crm_deals')
      .update(updateData)
      .eq('id', dealId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      loadDeals();
      if (newStage === 'won') {
        const deal = deals.find(d => d.id === dealId);
        if (deal) {
          setWonDeal({ ...deal, stage: 'won' });
        }
      }
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('crm_deals').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deal deleted' });
      loadDeals();
    }
  };

  const openEdit = (deal: CRMDeal) => {
    setEditingDeal(deal);
    setFormData({
      title: deal.title,
      description: deal.description || '',
      contact_id: deal.contact_id || '',
      assigned_to: deal.assigned_to || '',
      value: deal.value?.toString() || '',
      currency: deal.currency,
      stage: deal.stage,
      probability: deal.probability,
      expected_close_date: deal.expected_close_date || '',
    });
    setSelectedTeamMembers([]);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDeal(null);
    setFormData({
      title: '',
      description: '',
      contact_id: '',
      assigned_to: '',
      value: '',
      currency: 'EUR',
      stage: 'lead',
      probability: 20,
      expected_close_date: '',
    });
    setSelectedTeamMembers([]);
    setShowNewContact(false);
    setMemberSearch('');
  };

  const openCreate = () => {
    setEditingDeal(null);
    setFormData({
      title: '',
      description: '',
      contact_id: '',
      assigned_to: '',
      value: '',
      currency: 'EUR',
      stage: 'lead',
      probability: 20,
      expected_close_date: '',
    });
    setSelectedTeamMembers([]);
    setShowModal(true);
  };

  const toggleTeamMember = (pid: string) => {
    setSelectedTeamMembers(prev =>
      prev.includes(pid) ? prev.filter(id => id !== pid) : [...prev, pid]
    );
  };

  // Separate pending requests from approved deals
  const pendingRequests = deals.filter(d => d.approval_status === 'pending');
  const rejectedRequests = deals.filter(d => d.approval_status === 'rejected');
  const approvedDeals = deals.filter(d => d.approval_status !== 'pending' && d.approval_status !== 'rejected');

  // Non-managers only see their own deals
  const visibleDeals = isManagerRole 
    ? approvedDeals 
    : approvedDeals.filter(d => d.created_by === profileId);

  const allFilteredDeals = visibleDeals.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.crm_contacts?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStage = filterStage === 'all' || d.stage === filterStage;
    return matchesSearch && matchesStage;
  });

  const archivedDeals = allFilteredDeals.filter(d => d.stage === 'archived');
  const activePipelineDeals = allFilteredDeals.filter(d => d.stage !== 'archived');
  const filteredDeals = showArchive ? archivedDeals : activePipelineDeals;

  const totalValue = activePipelineDeals.reduce((sum, d) => sum + (d.value || 0), 0);
  const wonValue = allFilteredDeals.filter(d => d.stage === 'won' || (d.stage === 'archived' && d.archived_from === 'won')).reduce((sum, d) => sum + (d.value || 0), 0);
  const activeDeals = activePipelineDeals.filter(d => d.stage !== 'won' && d.stage !== 'lost').length;
  const dealsByStage = pipelineStages.reduce((acc, stage) => {
    acc[stage.value] = activePipelineDeals.filter(d => d.stage === stage.value);
    return acc;
  }, {} as Record<DealStage, CRMDeal[]>);
  dealsByStage['archived'] = archivedDeals;

  const filteredOrgMembers = orgMembers.filter(m =>
    m.profiles?.full_name?.toLowerCase().includes(memberSearch.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 border-l-4 border-l-primary">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <Rocket className="w-4 h-4" />
            <span className="text-sm">Active Deals</span>
          </div>
          <p className="text-2xl font-bold">{activeDeals}</p>
          <p className="text-xs text-muted-foreground mt-1">{filteredDeals.length} total</p>
        </div>
        <div className="glass-panel p-4 border-l-4 border-l-blue-500">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">Pipeline Value</span>
          </div>
          <p className="text-2xl font-bold">€{totalValue.toLocaleString()}</p>
        </div>
        <div className="glass-panel p-4 border-l-4 border-l-green-500">
          <div className="flex items-center gap-2 text-green-400 mb-1">
            <Trophy className="w-4 h-4" />
            <span className="text-sm">Won Value</span>
          </div>
          <p className="text-2xl font-bold text-green-400">€{wonValue.toLocaleString()}</p>
        </div>
        <div className="glass-panel p-4 flex items-center justify-center">
          <GlassButtonNew variant="primary" size="default" onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>
            {isManagerRole ? 'New Sales Lead' : 'Submit Request'}
          </GlassButtonNew>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between">
        <div className="flex gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <GlassInput
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search deals..."
              className="pl-10"
            />
          </div>
          <GlassSelect
            value={filterStage}
            onChange={v => setFilterStage(v as DealStage | 'all')}
            options={[
              { value: 'all', label: 'All Stages' },
              ...allStages.map(s => ({ value: s.value, label: s.label }))
            ]}
            className="min-w-[140px]"
          />
        </div>
        <div className="flex gap-2">
          <GlassButtonNew
            variant={showArchive ? 'primary' : 'ghost'}
            size="default"
            onClick={() => setShowArchive(v => !v)}
            leftIcon={<Archive className="w-4 h-4" />}
          >
            {showArchive ? `Archive (${archivedDeals.length})` : `Archive${archivedDeals.length ? ` (${archivedDeals.length})` : ''}`}
          </GlassButtonNew>
          <GlassButtonNew
            variant={viewMode === 'table' ? 'primary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('table')}
            title="Table view"
          >
            <Table2 className="w-4 h-4" />
          </GlassButtonNew>
          <GlassButtonNew
            variant={viewMode === 'list' ? 'primary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </GlassButtonNew>
          <GlassButtonNew
            variant={viewMode === 'kanban' ? 'primary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('kanban')}
          >
            <LayoutGrid className="w-4 h-4" />
          </GlassButtonNew>
        </div>
      </div>

      {/* Pending Requests (visible to managers) */}
      {isManagerRole && pendingRequests.length > 0 && (
        <div className="glass-panel p-4 border-l-4 border-l-amber-500">
          <h3 className="font-semibold mb-3 flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-400">
              {pendingRequests.length}
            </span>
            Pending Approval Requests
          </h3>
          <div className="space-y-3">
            {pendingRequests.map(deal => (
              <div key={deal.id} className="p-4 rounded-xl bg-secondary/30 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetailDeal(deal)}>
                    <p className="font-medium text-sm hover:text-primary transition-colors">{deal.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {deal.value != null && (
                        <span className="text-xs font-medium text-primary">€{deal.value.toLocaleString()}</span>
                      )}
                      {deal.crm_contacts && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {deal.crm_contacts.name}
                        </span>
                      )}
                      {deal.profiles && (
                        <span className="text-xs text-muted-foreground">
                          → {deal.profiles.full_name || 'Unassigned'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <GlassButtonNew variant="ghost" size="sm" onClick={() => handleRejectRequest(deal.id)}>
                      Reject
                    </GlassButtonNew>
                    <GlassButtonNew variant="primary" size="sm" onClick={() => handleApproveRequest(deal.id)}>
                      Approve
                    </GlassButtonNew>
                  </div>
                </div>
                {deal.description && (
                  <div className="p-3 rounded-lg bg-secondary/30 border border-border/20">
                    <p className="text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed">{deal.description}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Non-manager: show their pending requests */}
      {!isManagerRole && pendingRequests.filter(d => d.created_by === profileId).length > 0 && (
        <div className="glass-panel p-4 border-l-4 border-l-amber-500/50">
          <h3 className="font-semibold mb-3 text-sm text-muted-foreground">Your Pending Requests</h3>
          <div className="space-y-2">
            {pendingRequests.filter(d => d.created_by === profileId).map(deal => (
              <div key={deal.id} className="flex items-center justify-between p-3 rounded-xl bg-secondary/30">
                <div>
                  <p className="font-medium text-sm">{deal.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {deal.value ? `€${deal.value.toLocaleString()}` : 'No value'}
                  </p>
                </div>
                <Badge className="bg-amber-500/20 text-amber-400 border-0">Pending</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {viewMode === 'table' ? (
        <DealTable
          deals={filteredDeals}
          stages={allStages}
          canManage={canManage}
          onOpen={deal => setDetailDeal(deal)}
          onEdit={openEdit}
          onDelete={handleDelete}
          onStageChange={handleStageChange}
        />
      ) : viewMode === 'list' ? (
        <div className="space-y-2">
          {filteredDeals.length === 0 ? (
            <div className="glass-panel p-12 text-center">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
              <p className="text-muted-foreground">No deals found</p>
              {canManage && (
                <GlassButtonNew variant="primary" size="lg" className="mt-4" onClick={openCreate} leftIcon={<Plus className="w-4 h-4" />}>
                  Create your first deal
                </GlassButtonNew>
              )}
            </div>
          ) : (
            filteredDeals.map(deal => {
              const stageInfo = allStages.find(s => s.value === deal.stage);
              const StageIcon = stageInfo?.icon || TrendingUp;
              return (
                <motion.div
                  key={deal.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`glass-panel p-4 hover:border-primary/30 transition-all cursor-pointer ${
                    deal.stage === 'won' ? 'border-green-500/30 bg-green-500/5' : ''
                  }`}
                  onClick={() => setDetailDeal(deal)}
                >
                  <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl ${stageInfo?.bgColor} flex items-center justify-center`}>
                    <StageIcon className={`w-5 h-5 ${stageInfo?.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="font-medium truncate">{deal.title}</p>
                      {deal.source && (
                        <span className="mt-1 inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-[10px] font-medium text-accent-foreground">{deal.source}</span>
                      )}
                      <Badge className={`${stageInfo?.bgColor} ${stageInfo?.color} border-0`}>
                        {stageInfo?.label}
                      </Badge>
                      {deal.stage === 'won' && <span className="text-lg">🏆</span>}
                      {deal.stage === 'archived' && (
                        deal.archived_from === 'won' || deal.archived_from === 'lost' ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleArchiveTag(deal.id, null); }}
                            title="Click to remove tag"
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider rotate-[-6deg] shadow-md border-2 hover:scale-110 transition-transform ${
                              deal.archived_from === 'won' ? 'bg-green-500/90 text-white border-green-300' :
                              'bg-red-500/90 text-white border-red-300'
                            }`}
                          >
                            {deal.archived_from === 'won' ? '🏆 Won' : '✕ Lost'}
                          </button>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleArchiveTag(deal.id, 'won'); }}
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-green-500/40 text-green-400 hover:bg-green-500/20 transition-colors"
                            >
                              + Won
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleArchiveTag(deal.id, 'lost'); }}
                              className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-red-500/40 text-red-400 hover:bg-red-500/20 transition-colors"
                            >
                              + Lost
                            </button>
                          </div>
                        )
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      {deal.profiles && (
                        <span className="flex items-center gap-1.5 text-primary font-medium">
                          {deal.profiles.avatar_url ? (
                            <img src={deal.profiles.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                          ) : (
                            <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary">
                              {deal.profiles.full_name?.[0] || '?'}
                            </div>
                          )}
                          {deal.profiles.full_name}
                        </span>
                      )}
                      {deal.crm_contacts && (
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {deal.crm_contacts.name}
                        </span>
                      )}
                      {deal.expected_close_date && (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(deal.expected_close_date), 'MMM d, yyyy')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {deal.value && (
                      <p className="font-semibold text-primary">€{deal.value.toLocaleString()}</p>
                    )}
                    <p className="text-xs text-muted-foreground">{deal.probability}%</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MessageSquare className="w-3.5 h-3.5" />
                      {commentCounts[deal.id] || 0}
                    </span>
                  </div>
                  {isManagerRole && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                        <GlassButtonNew variant="ghost" size="icon-sm">
                          <MoreVertical className="w-4 h-4" />
                        </GlassButtonNew>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(deal); }}>
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedDeal(deal); }}>
                          <Users className="w-4 h-4 mr-2" /> Manage Members
                        </DropdownMenuItem>
                        {deal.stage !== 'won' && deal.stage !== 'lost' && deal.stage !== 'archived' && (
                          <>
                            {pipelineStages.findIndex(s => s.value === deal.stage) > 0 && (
                              <DropdownMenuItem onClick={(e) => { 
                                e.stopPropagation(); 
                                const prevIdx = pipelineStages.findIndex(s => s.value === deal.stage) - 1;
                                if (pipelineStages[prevIdx] && pipelineStages[prevIdx].value !== 'lost') handleStageChange(deal.id, pipelineStages[prevIdx].value, deal.stage);
                              }}>
                                <ArrowLeft className="w-4 h-4 mr-2" /> Move Backward
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStageChange(deal.id, 'won', deal.stage); }}>
                              <Trophy className="w-4 h-4 mr-2 text-green-400" /> Mark as Won
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleMarkAsLost(deal.id); }}>
                              <X className="w-4 h-4 mr-2 text-red-400" /> Mark as Lost
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStageChange(deal.id, 'archived', deal.stage); }}>
                              <Archive className="w-4 h-4 mr-2" /> Archive
                            </DropdownMenuItem>
                          </>
                        )}
                        {(deal.stage === 'won' || deal.stage === 'lost') && (
                          <>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStageChange(deal.id, 'lead', deal.stage); }}>
                              <ArrowLeft className="w-4 h-4 mr-2" /> Reopen as Lead
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStageChange(deal.id, 'archived', deal.stage); }}>
                              <Archive className="w-4 h-4 mr-2" /> Archive
                            </DropdownMenuItem>
                          </>
                        )}
                        {deal.stage === 'archived' && (
                          <>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchiveTag(deal.id, 'won'); }}>
                              <Trophy className="w-4 h-4 mr-2 text-green-400" /> Tag as Won
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchiveTag(deal.id, 'lost'); }}>
                              <X className="w-4 h-4 mr-2 text-red-400" /> Tag as Lost
                            </DropdownMenuItem>
                            {deal.archived_from && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchiveTag(deal.id, null); }}>
                                <X className="w-4 h-4 mr-2" /> Remove Tag
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStageChange(deal.id, 'lead', deal.stage); }}>
                              <ArrowLeft className="w-4 h-4 mr-2" /> Reopen as Lead
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => { e.stopPropagation(); handleDelete(deal.id); }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                  </div>

                </motion.div>
              );
            })
          )}
        </div>
      ) : (
        /* Kanban View */
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {(showArchive ? [archiveStage] : pipelineStages).map(stage => {
              const StageIcon = stage.icon;
              const isArchiveCol = stage.value === 'archived';
              return (
                <div
                  key={stage.value}
                  className={`${isArchiveCol ? 'w-[57rem]' : 'w-72'} transition-all ${
                    dragOverStage === stage.value ? 'ring-2 ring-primary/40 rounded-xl' : ''
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOverStage(stage.value);
                  }}
                  onDragLeave={() => setDragOverStage(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverStage(null);
                    if (draggedDealId && canManage && isManagerRole) {
                      handleStageChange(draggedDealId, stage.value);
                    }
                    setDraggedDealId(null);
                  }}
                >
                  <div className={`flex items-center gap-2 mb-3 p-2 rounded-xl ${stage.bgColor}`}>
                    <StageIcon className={`w-4 h-4 ${stage.color}`} />
                    <span className={`font-medium text-sm ${stage.color}`}>{stage.label}</span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {dealsByStage[stage.value]?.length || 0}
                    </span>
                  </div>
                  <div className={`${isArchiveCol ? 'grid grid-cols-3 gap-3' : 'space-y-3'} min-h-[60px]`}>
                    {dealsByStage[stage.value]?.map(deal => (
                      <motion.div
                        key={deal.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        draggable={canManage && isManagerRole}
                        onDragStart={() => setDraggedDealId(deal.id)}
                        onDragEnd={() => { setDraggedDealId(null); setDragOverStage(null); }}
                        className={`glass-panel p-4 hover:border-primary/30 transition-all ${
                          canManage && isManagerRole ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'
                        } ${deal.stage === 'won' ? 'border-green-500/30' : ''} ${
                          draggedDealId === deal.id ? 'opacity-50 scale-95' : ''
                        } ${unreadDealIds.has(deal.id) ? 'ring-1 ring-primary/40 shadow-[0_0_12px_2px_hsl(var(--primary)/0.25)] animate-pulse' : ''}`}
                        style={unreadDealIds.has(deal.id) ? { animationDuration: '2.5s' } : undefined}
                        onClick={() => {
                          // Mark deal notifications as read
                          if (unreadDealIds.has(deal.id)) {
                            supabase.from('notifications').update({ is_read: true })
                              .eq('recipient_id', profileId).eq('link_type', 'deal').eq('link_id', deal.id).eq('is_read', false)
                              .then(() => setUnreadDealIds(prev => { const n = new Set(prev); n.delete(deal.id); return n; }));
                          }
                          setDetailDeal(deal);
                        }}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{deal.title}</p>
                            {deal.stage === 'archived' && (
                              deal.archived_from === 'won' || deal.archived_from === 'lost' ? (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleArchiveTag(deal.id, null); }}
                                  title="Click to remove tag"
                                  className={`inline-flex mt-1 items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider rotate-[-6deg] shadow-md border-2 hover:scale-110 transition-transform ${
                                    deal.archived_from === 'won' ? 'bg-green-500/90 text-white border-green-300' :
                                    'bg-red-500/90 text-white border-red-300'
                                  }`}
                                >
                                  {deal.archived_from === 'won' ? '🏆 Won' : '✕ Lost'}
                                </button>
                              ) : (
                                <div className="inline-flex mt-1 items-center gap-1">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleArchiveTag(deal.id, 'won'); }}
                                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-green-500/40 text-green-400 hover:bg-green-500/20 transition-colors"
                                  >
                                    + Won
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleArchiveTag(deal.id, 'lost'); }}
                                    className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border border-red-500/40 text-red-400 hover:bg-red-500/20 transition-colors"
                                  >
                                    + Lost
                                  </button>
                                </div>
                              )
                            )}
                          </div>
                          {canManage && isManagerRole && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                                <button className="p-1 hover:bg-secondary/50 rounded">
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(deal); }}>
                                  <Edit className="w-4 h-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setSelectedDeal(deal); }}>
                                  <Users className="w-4 h-4 mr-2" /> Members
                                </DropdownMenuItem>
                                {stage.value !== 'won' && stage.value !== 'lost' && stage.value !== 'archived' && (
                                  <>
                                    {pipelineStages.findIndex(s => s.value === stage.value) > 0 && (
                                      <DropdownMenuItem onClick={(e) => {
                                        e.stopPropagation();
                                        const prevIdx = pipelineStages.findIndex(s => s.value === stage.value) - 1;
                                        const prevStage = pipelineStages[prevIdx]?.value;
                                        if (prevStage && prevStage !== 'lost') handleStageChange(deal.id, prevStage, deal.stage);
                                      }}>
                                        <ArrowLeft className="w-4 h-4 mr-2" /> Move Backward
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={(e) => {
                                      e.stopPropagation();
                                      const nextIdx = pipelineStages.findIndex(s => s.value === stage.value) + 1;
                                      const nextStage = pipelineStages[nextIdx]?.value || 'won';
                                      handleStageChange(deal.id, nextStage, deal.stage);
                                    }}>
                                      <ArrowRight className="w-4 h-4 mr-2" /> Move Forward
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStageChange(deal.id, 'won', deal.stage); }}>
                                      <Trophy className="w-4 h-4 mr-2 text-green-400" /> Won
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleMarkAsLost(deal.id); }}>
                                      <X className="w-4 h-4 mr-2 text-red-400" /> Lost
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStageChange(deal.id, 'archived', deal.stage); }}>
                                      <Archive className="w-4 h-4 mr-2" /> Archive
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {(stage.value === 'won' || stage.value === 'lost') && (
                                  <>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStageChange(deal.id, 'lead', deal.stage); }}>
                                      <ArrowLeft className="w-4 h-4 mr-2" /> Reopen as Lead
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStageChange(deal.id, 'archived', deal.stage); }}>
                                      <Archive className="w-4 h-4 mr-2" /> Archive
                                    </DropdownMenuItem>
                                  </>
                                )}
                                {stage.value === 'archived' && (
                                  <>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchiveTag(deal.id, 'won'); }}>
                                      <Trophy className="w-4 h-4 mr-2 text-green-400" /> Tag as Won
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchiveTag(deal.id, 'lost'); }}>
                                      <X className="w-4 h-4 mr-2 text-red-400" /> Tag as Lost
                                    </DropdownMenuItem>
                                    {deal.archived_from && (
                                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleArchiveTag(deal.id, null); }}>
                                        <X className="w-4 h-4 mr-2" /> Remove Tag
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStageChange(deal.id, 'lead', deal.stage); }}>
                                      <ArrowLeft className="w-4 h-4 mr-2" /> Reopen as Lead
                                    </DropdownMenuItem>
                                  </>
                                )}
                                <DropdownMenuItem 
                                  className="text-destructive"
                                  onClick={(e) => { e.stopPropagation(); handleDelete(deal.id); }}
                                >
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>

                        {deal.crm_contacts && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                            <User className="w-3 h-3" />
                            <span>{deal.crm_contacts.name}</span>
                          </div>
                        )}

                        {/* Responsible person */}
                        {deal.profiles && (
                          <div className="flex items-center gap-2 mb-2 p-1.5 rounded-lg bg-primary/5 border border-primary/10">
                            {deal.profiles.avatar_url ? (
                              <img src={deal.profiles.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                            ) : (
                              <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                                {deal.profiles.full_name?.[0] || '?'}
                              </div>
                            )}
                            <span className="text-xs font-medium text-primary truncate">{deal.profiles.full_name || 'Unassigned'}</span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          {deal.value ? (
                            <span className="text-sm font-semibold text-primary">
                               €{deal.value.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">No value set</span>
                          )}
                          {deal.expected_close_date && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {format(new Date(deal.expected_close_date), 'MMM d')}
                            </span>
                          )}
                        </div>

                        <div className="mt-2">
                          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                            <motion.div 
                              className={`h-full rounded-full ${stage.value === 'won' ? 'bg-green-500' : stage.value === 'lost' ? 'bg-red-500' : 'bg-primary'}`}
                              initial={{ width: 0 }}
                              animate={{ width: `${deal.probability}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground">{deal.probability}%</span>
                        </div>

                        {/* Comment count indicator */}
                        <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                          <MessageSquare className="w-3 h-3" />
                          <span>{commentCounts[deal.id] || 0} comments</span>
                        </div>
                      </motion.div>
                    ))}
                    
                    {dealsByStage[stage.value]?.length === 0 && (
                      <div className={`border border-dashed rounded-xl p-6 text-center transition-colors ${
                        dragOverStage === stage.value ? 'border-primary/50 bg-primary/5' : 'border-border/30'
                      }`}>
                        <p className="text-xs text-muted-foreground">
                          {dragOverStage === stage.value ? 'Drop here' : 'No deals'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg font-semibold">
                    {editingDeal ? 'Edit Sales Lead' : 'New Sales Lead'}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {editingDeal ? 'Update deal details' : 'Create a new deal and assign team members'}
                  </p>
                </div>
                <GlassButtonNew variant="ghost" size="icon-sm" onClick={closeModal}>
                  <X className="w-5 h-5" />
                </GlassButtonNew>
              </div>

              <div className="space-y-5">
                {/* Title */}
                <div>
                  <label className="text-sm font-medium mb-1 block">Title *</label>
                  <GlassInput
                    value={formData.title}
                    onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g., Website redesign for Acme Corp"
                  />
                </div>

                {/* Contact */}
                <div>
                  <label className="text-sm font-medium mb-1 block">Contact</label>
                  {!showNewContact ? (
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <GlassSelect
                          value={formData.contact_id}
                          onChange={v => setFormData(p => ({ ...p, contact_id: v }))}
                          placeholder="Select contact..."
                          options={contacts.map(c => ({ 
                            value: c.id, 
                            label: c.name + (c.company ? ` (${c.company})` : '') 
                          }))}
                        />
                      </div>
                      <GlassButtonNew variant="outline" size="icon" onClick={() => setShowNewContact(true)} title="Create new contact">
                        <Plus className="w-4 h-4" />
                      </GlassButtonNew>
                    </div>
                  ) : (
                    <div className="space-y-2 p-3 rounded-xl bg-secondary/30 border border-border/30">
                      <p className="text-xs font-medium text-muted-foreground">New Contact</p>
                      <GlassInput
                        value={newContactName}
                        onChange={e => setNewContactName(e.target.value)}
                        placeholder="Contact name *"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <GlassInput
                          value={newContactEmail}
                          onChange={e => setNewContactEmail(e.target.value)}
                          placeholder="Email"
                          type="email"
                        />
                        <GlassInput
                          value={newContactPhone}
                          onChange={e => setNewContactPhone(e.target.value)}
                          placeholder="Phone"
                        />
                        <GlassInput
                          value={newContactCompany}
                          onChange={e => setNewContactCompany(e.target.value)}
                          placeholder="Company"
                        />
                      </div>
                      <div className="flex gap-2 justify-end">
                        <GlassButtonNew variant="ghost" size="sm" onClick={() => { setShowNewContact(false); setNewContactName(''); setNewContactEmail(''); setNewContactPhone(''); setNewContactCompany(''); }}>
                          Cancel
                        </GlassButtonNew>
                        <GlassButtonNew
                          variant="primary"
                          size="sm"
                          disabled={!newContactName.trim() || isCreatingContact}
                          isLoading={isCreatingContact}
                          onClick={async () => {
                            setIsCreatingContact(true);
                            const { data, error } = await supabase.from('crm_contacts').insert({
                              cluster_id: clusterId,
                              name: newContactName.trim(),
                              email: newContactEmail.trim() || null,
                              phone: newContactPhone.trim() || null,
                              company: newContactCompany.trim() || null,
                              created_by: profileId,
                              contact_type: 'lead',
                            }).select('id').single();
                            if (!error && data) {
                              setFormData(p => ({ ...p, contact_id: data.id }));
                              loadContacts();
                              setShowNewContact(false);
                              setNewContactName('');
                              setNewContactEmail('');
                              setNewContactPhone('');
                              setNewContactCompany('');
                            }
                            setIsCreatingContact(false);
                          }}
                        >
                          Create & Link
                        </GlassButtonNew>
                      </div>
                    </div>
                  )}
                </div>

                {/* Responsible Person */}
                <div>
                  <label className="text-sm font-medium mb-1 block flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Responsible Person
                  </label>
                  <GlassSelect
                    value={formData.assigned_to}
                    onChange={v => setFormData(p => ({ ...p, assigned_to: v }))}
                    placeholder="Select responsible person..."
                    options={orgMembers.map(m => ({
                      value: m.profile_id,
                      label: m.profiles?.full_name || 'Unnamed',
                    }))}
                  />
                </div>

                {/* Value & Stage Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Value ($)</label>
                    <GlassInput
                      type="number"
                      value={formData.value}
                      onChange={e => setFormData(p => ({ ...p, value: e.target.value }))}
                      placeholder="10000"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Stage</label>
                    <GlassSelect
                      value={formData.stage}
                      onChange={v => setFormData(p => ({ ...p, stage: v as DealStage }))}
                      options={pipelineStages.map(s => ({ value: s.value, label: s.label }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Probability (%)</label>
                    <GlassInput
                      type="number"
                      min="0"
                      max="100"
                      value={formData.probability}
                      onChange={e => setFormData(p => ({ ...p, probability: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Expected Close</label>
                    <GlassInput
                      type="date"
                      value={formData.expected_close_date}
                      onChange={e => setFormData(p => ({ ...p, expected_close_date: e.target.value }))}
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    placeholder="Deal details, scope of work..."
                    className="w-full h-20 bg-secondary/50 border border-border/30 rounded-xl px-4 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                {/* Team Members (only for new deals) */}
                {!editingDeal && (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        Assign Team Members
                      </label>
                      <span className="text-xs text-muted-foreground">
                        {selectedTeamMembers.length} selected
                      </span>
                    </div>

                    {/* Search */}
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <GlassInput
                        value={memberSearch}
                        onChange={e => setMemberSearch(e.target.value)}
                        placeholder="Search organization members..."
                        className="pl-10"
                      />
                    </div>

                    {/* Member List */}
                    <div className="max-h-48 overflow-y-auto space-y-1 rounded-xl bg-secondary/20 p-3">
                      {filteredOrgMembers.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          {memberSearch ? 'No members found' : 'No organization members to assign'}
                        </p>
                      ) : (
                        filteredOrgMembers.map(member => {
                          const isSelected = selectedTeamMembers.includes(member.profile_id);
                          return (
                            <div
                              key={member.profile_id}
                              className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                                isSelected ? 'bg-primary/10 border border-primary/30' : 'hover:bg-secondary/50'
                              }`}
                              onClick={() => toggleTeamMember(member.profile_id)}
                            >
                              {member.profiles?.avatar_url ? (
                                <img src={member.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                                  {member.profiles?.full_name?.[0] || '?'}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{member.profiles?.full_name || 'Unnamed'}</p>
                                <p className="text-xs text-muted-foreground">{member.role}</p>
                              </div>
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                              }`}>
                                {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 mt-6 pt-4 border-t border-border/30">
                <GlassButtonNew variant="ghost" onClick={closeModal} className="flex-1">Cancel</GlassButtonNew>
                <GlassButtonNew
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={!formData.title.trim()}
                  isLoading={isSubmitting}
                  className="flex-1"
                >
                  {editingDeal ? 'Update Deal' : isManagerRole ? 'Create Deal' : 'Submit Request'}
                </GlassButtonNew>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Won Celebration Modal */}
      <AnimatePresence>
        {wonDeal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setWonDeal(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 30 }}
              transition={{ type: 'spring', damping: 15 }}
              className="glass-panel p-8 w-full max-w-md text-center"
              onClick={e => e.stopPropagation()}
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', damping: 10 }}
                className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4"
              >
                <PartyPopper className="w-10 h-10 text-green-400" />
              </motion.div>
              
              <h2 className="text-2xl font-bold mb-2">Deal Won! 🎉</h2>
              <p className="text-muted-foreground mb-1">{wonDeal.title}</p>
              {wonDeal.value && (
                <p className="text-xl font-semibold text-green-400 mb-6">
                  €{wonDeal.value.toLocaleString()}
                </p>
              )}

              <p className="text-sm text-muted-foreground mb-6">
                Nice work. The lead is now marked as won.
              </p>

              <div className="flex gap-3">
                <GlassButtonNew variant="primary" onClick={() => setWonDeal(null)} className="flex-1">
                  Close
                </GlassButtonNew>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Deal Detail Modal */}
      <AnimatePresence>
        {detailDeal && (
          <DealDetailModal
            deal={detailDeal}
            profileId={profileId}
            clusterId={clusterId}
            orgMembers={orgMembers.map(m => ({ id: m.profiles.id, full_name: m.profiles.full_name, avatar_url: m.profiles.avatar_url }))}
            onClose={() => { setDetailDeal(null); }}
            onEdit={(deal) => { setDetailDeal(null); openEdit(deal); }}
            onManageMembers={(deal) => { setDetailDeal(null); setSelectedDeal(deal); }}
            canManage={canManage && isManagerRole}
          />
        )}
      </AnimatePresence>

      {/* Deal Members Modal */}
      <AnimatePresence>
        {selectedDeal && (
          <DealMembersModal
            deal={selectedDeal}
            clusterId={clusterId}
            profileId={profileId}
            onClose={() => setSelectedDeal(null)}
            onUpdate={loadDeals}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
