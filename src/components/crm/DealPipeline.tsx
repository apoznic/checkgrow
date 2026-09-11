import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, DollarSign, Calendar, User, ChevronRight, 
  MoreVertical, Edit, Trash2, Loader2, X, TrendingUp,
  MessageSquare, Send, Archive
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GlassButton, GlassInput } from '@/components/GlassCard';
import { CRMDeal, DealStage, CRMContact } from './types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

interface DealComment {
  id: string;
  deal_id: string;
  author_id: string;
  content: string;
  created_at: string;
  profiles?: { id: string; full_name: string | null; avatar_url: string | null };
}

interface DealPipelineProps {
  clusterId: string;
  profileId: string;
  canManage: boolean;
}

const stages: { value: DealStage; label: string; color: string }[] = [
  { value: 'lead', label: 'Lead', color: 'bg-gray-500' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-amber-500' },
  { value: 'won', label: 'Won', color: 'bg-green-500' },
];

export function DealPipeline({ clusterId, profileId, canManage }: DealPipelineProps) {
  const { toast } = useToast();
  const [deals, setDeals] = useState<CRMDeal[]>([]);
  const [contacts, setContacts] = useState<CRMContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingDeal, setEditingDeal] = useState<CRMDeal | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [commentOpenId, setCommentOpenId] = useState<string | null>(null);
  const [dealComments, setDealComments] = useState<Record<string, DealComment[]>>({});
  const [newComment, setNewComment] = useState('');
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    contact_id: '',
    value: '',
    currency: 'EUR',
    stage: 'lead' as DealStage,
    probability: 0,
    expected_close_date: '',
    org_percentage: 0,
    finder_bonus_percent: 15,
  });

  useEffect(() => {
    loadDeals();
    loadContacts();
    loadCommentCounts();

    const channel = supabase
      .channel('crm_deals_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_deals', filter: `cluster_id=eq.${clusterId}` }, () => {
        loadDeals();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [clusterId]);

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

  const loadCommentCounts = async () => {
    const dealIds = deals.map(d => d.id);
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
    if (deals.length > 0) loadCommentCounts();
  }, [deals]);

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

  const handleAddComment = async (dealId: string) => {
    if (!newComment.trim()) return;
    const { error } = await supabase.from('deal_comments').insert({
      deal_id: dealId,
      author_id: profileId,
      content: newComment.trim(),
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setNewComment('');
      loadDealComments(dealId);
      loadCommentCounts();
    }
  };

  const handleDeleteComment = async (commentId: string, dealId: string) => {
    await supabase.from('deal_comments').delete().eq('id', commentId);
    loadDealComments(dealId);
    loadCommentCounts();
  };

  const toggleComments = (dealId: string) => {
    if (commentOpenId === dealId) {
      setCommentOpenId(null);
    } else {
      setCommentOpenId(dealId);
      if (!dealComments[dealId]) loadDealComments(dealId);
    }
  };

  const handleSubmit = async () => {
    if (!formData.title.trim()) return;
    setIsSubmitting(true);

    const dealData = {
      cluster_id: clusterId,
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      contact_id: formData.contact_id || null,
      value: formData.value ? parseFloat(formData.value) : null,
      currency: formData.currency,
      stage: formData.stage,
      probability: formData.probability,
      expected_close_date: formData.expected_close_date || null,
      created_by: profileId,
      org_percentage: formData.org_percentage,
      finder_bonus_percent: formData.finder_bonus_percent,
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
      const { error } = await supabase.from('crm_deals').insert(dealData);

      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Deal created' });
        closeModal();
        loadDeals();
      }
    }

    setIsSubmitting(false);
  };

  const handleStageChange = async (dealId: string, newStage: DealStage) => {
    const closedAt = newStage === 'won' || newStage === 'lost' ? new Date().toISOString() : null;
    const { error } = await supabase
      .from('crm_deals')
      .update({ stage: newStage, closed_at: closedAt })
      .eq('id', dealId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      loadDeals();
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
      value: deal.value?.toString() || '',
      currency: deal.currency,
      stage: deal.stage,
      probability: deal.probability,
      expected_close_date: deal.expected_close_date || '',
      org_percentage: (deal as any).org_percentage || 0,
      finder_bonus_percent: (deal as any).finder_bonus_percent ?? 15,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDeal(null);
    setFormData({
      title: '',
      description: '',
      contact_id: '',
      value: '',
      currency: 'EUR',
      stage: 'lead',
      probability: 0,
      expected_close_date: '',
      org_percentage: 0,
      finder_bonus_percent: 15,
    });
  };

  const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
  const wonValue = deals.filter(d => d.stage === 'won').reduce((sum, d) => sum + (d.value || 0), 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Group deals by stage
  const dealsByStage = stages.reduce((acc, stage) => {
    acc[stage.value] = deals.filter(d => d.stage === stage.value);
    return acc;
  }, {} as Record<DealStage, CRMDeal[]>);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <TrendingUp className="w-4 h-4" />
            <span className="text-sm">Total Deals</span>
          </div>
          <p className="text-2xl font-bold">{deals.length}</p>
        </div>
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">Pipeline Value</span>
          </div>
          <p className="text-2xl font-bold">€{totalValue.toLocaleString()}</p>
        </div>
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 text-green-400 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">Won</span>
          </div>
          <p className="text-2xl font-bold text-green-400">€{wonValue.toLocaleString()}</p>
        </div>
        <div className="glass-panel p-4 flex items-center justify-center">
          {canManage && (
            <GlassButton variant="primary" onClick={() => setShowModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Deal
            </GlassButton>
          )}
        </div>
      </div>

      {/* Pipeline View */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-4 min-w-max">
          {stages.filter(s => s.value !== 'lost').map(stage => (
            <div key={stage.value} className="w-72">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                <span className="font-medium">{stage.label}</span>
                <span className="text-sm text-muted-foreground">({dealsByStage[stage.value]?.length || 0})</span>
              </div>
              <div className="space-y-3">
                {dealsByStage[stage.value]?.map(deal => (
                  <motion.div
                    key={deal.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="font-medium text-sm">{deal.title}</p>
                      {canManage && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1 hover:bg-secondary/50 rounded">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEdit(deal)}>
                              <Edit className="w-4 h-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            {stage.value !== 'won' && (
                              <DropdownMenuItem onClick={() => handleStageChange(deal.id, stages[stages.findIndex(s => s.value === stage.value) + 1]?.value || 'won')}>
                                <ChevronRight className="w-4 h-4 mr-2" /> Move Forward
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDelete(deal.id)}
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

                    <div className="flex items-center justify-between">
                      {deal.value && (
                        <span className="text-sm font-medium text-primary">
                          €{deal.value.toLocaleString()}
                        </span>
                      )}
                      {deal.expected_close_date && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(deal.expected_close_date), 'MMM d')}
                        </span>
                      )}
                    </div>

                    <div className="mt-2">
                      <div className="h-1 bg-secondary rounded-full">
                        <div 
                          className={`h-1 rounded-full ${stage.color}`}
                          style={{ width: `${deal.probability}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted-foreground">{deal.probability}% probability</span>
                    </div>

                    {/* Comment toggle */}
                    <button
                      onClick={() => toggleComments(deal.id)}
                      className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <MessageSquare className="w-3 h-3" />
                      <span>{commentCounts[deal.id] || 0} comments</span>
                    </button>

                    {/* Comment section */}
                    {commentOpenId === deal.id && (
                      <div className="mt-3 border-t border-border/30 pt-3 space-y-2">
                        <div className="max-h-40 overflow-y-auto space-y-2">
                          {(dealComments[deal.id] || []).map(comment => (
                            <div key={comment.id} className="flex gap-2 group">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <span className="text-xs font-medium truncate">
                                    {comment.profiles?.full_name || 'Unknown'}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">
                                    {format(new Date(comment.created_at), 'MMM d, HH:mm')}
                                  </span>
                                </div>
                                <p className="text-xs text-foreground/80">{comment.content}</p>
                              </div>
                              {comment.author_id === profileId && (
                                <button
                                  onClick={() => handleDeleteComment(comment.id, deal.id)}
                                  className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-all"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                          {(dealComments[deal.id] || []).length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-1">No comments yet</p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <input
                            value={newComment}
                            onChange={e => setNewComment(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleAddComment(deal.id)}
                            placeholder="Add comment..."
                            className="flex-1 text-xs bg-secondary/50 border border-border/30 rounded-lg px-2 py-1"
                          />
                          <button
                            onClick={() => handleAddComment(deal.id)}
                            disabled={!newComment.trim()}
                            className="p-1 text-primary hover:text-primary/80 disabled:opacity-50"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-6"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel p-6 w-full max-w-lg"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold">
                  {editingDeal ? 'Edit Deal' : 'Create Deal'}
                </h2>
                <button onClick={closeModal} className="p-1 hover:bg-secondary/50 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1 block">Title *</label>
                  <GlassInput
                    value={formData.title}
                    onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                    placeholder="Deal title"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Contact</label>
                  <select
                    value={formData.contact_id}
                    onChange={e => setFormData(p => ({ ...p, contact_id: e.target.value }))}
                    className="w-full bg-secondary/50 border border-border/30 rounded-xl px-4 py-2 text-sm"
                  >
                    <option value="">Select contact...</option>
                    {contacts.map(c => (
                      <option key={c.id} value={c.id}>{c.name}{c.company ? ` (${c.company})` : ''}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Value</label>
                    <GlassInput
                      type="number"
                      value={formData.value}
                      onChange={e => setFormData(p => ({ ...p, value: e.target.value }))}
                      placeholder="10000"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Stage</label>
                    <select
                      value={formData.stage}
                      onChange={e => setFormData(p => ({ ...p, stage: e.target.value as DealStage }))}
                      className="w-full bg-secondary/50 border border-border/30 rounded-xl px-4 py-2 text-sm"
                    >
                      {stages.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Org Cut (%)</label>
                    <GlassInput
                      type="number"
                      min="0"
                      max="100"
                      value={formData.org_percentage}
                      onChange={e => setFormData(p => ({ ...p, org_percentage: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Finder Bonus (%)</label>
                    <GlassInput
                      type="number"
                      min="0"
                      max="100"
                      value={formData.finder_bonus_percent}
                      onChange={e => setFormData(p => ({ ...p, finder_bonus_percent: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                    placeholder="Deal details..."
                    className="w-full h-20 bg-secondary/50 border border-border/30 rounded-xl px-4 py-2 text-sm resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <GlassButton onClick={closeModal} className="flex-1">Cancel</GlassButton>
                <GlassButton
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={!formData.title.trim() || isSubmitting}
                  className="flex-1"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editingDeal ? 'Update' : 'Create'}
                </GlassButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
