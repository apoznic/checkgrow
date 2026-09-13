import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, User, Calendar, DollarSign, MessageSquare, Send,
  Users, Trophy, TrendingUp, FileText, Archive, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GlassButtonNew } from '@/components/ui/glass-button';
import { MentionInput } from './MentionInput';
import { CRMDeal, DealStage } from './types';
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

interface OrgMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface DealDetailModalProps {
  deal: CRMDeal;
  profileId: string;
  clusterId: string;
  orgMembers: OrgMember[];
  onClose: () => void;
  onEdit: (deal: CRMDeal) => void;
  onManageMembers: (deal: CRMDeal) => void;
  canManage: boolean;
}

const stageConfig: Record<DealStage, { label: string; color: string; bgColor: string; icon: React.ElementType }> = {
  lead: { label: 'Lead', color: 'text-slate-400', bgColor: 'bg-slate-500/20', icon: TrendingUp },
  negotiation: { label: 'Negotiation', color: 'text-amber-400', bgColor: 'bg-amber-500/20', icon: Users },
  won: { label: 'Won', color: 'text-green-400', bgColor: 'bg-green-500/20', icon: Trophy },
  lost: { label: 'Lost', color: 'text-red-400', bgColor: 'bg-red-500/20', icon: X },
  archived: { label: 'Archived', color: 'text-zinc-500', bgColor: 'bg-zinc-500/20', icon: Archive },
};

export function DealDetailModal({ deal, profileId, clusterId, orgMembers, onClose, onEdit, onManageMembers, canManage }: DealDetailModalProps) {
  const { toast } = useToast();
  const [comments, setComments] = useState<DealComment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [draft, setDraft] = useState({
    title: deal.title,
    description: deal.description ?? '',
    value: deal.value != null ? String(deal.value) : '',
    probability: deal.probability,
    expected_close_date: deal.expected_close_date ?? '',
    assigned_to: deal.assigned_to ?? '',
    stage: deal.stage,
  });

  const stage = stageConfig[draft.stage];
  const StageIcon = stage.icon;

  useEffect(() => {
    loadComments();
  }, [deal.id]);

  const persist = async (patch: Record<string, unknown>) => {
    const { error } = await supabase.from('crm_deals').update(patch).eq('id', deal.id);
    if (error) toast({ title: 'Error', description: error.message, variant: 'destructive' });
  };

  const loadComments = async () => {
    setIsLoadingComments(true);
    const { data } = await supabase
      .from('deal_comments')
      .select('*, profiles:author_id(id, full_name, avatar_url)')
      .eq('deal_id', deal.id)
      .order('created_at', { ascending: true });
    if (data) setComments(data as unknown as DealComment[]);
    setIsLoadingComments(false);
  };

  const handleAddComment = async (text: string) => {
    if (!text.trim()) return;
    const { error } = await supabase.from('deal_comments').insert({
      deal_id: deal.id,
      author_id: profileId,
      content: text.trim(),
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      loadComments();

      // Create notifications for deal participants
      const recipientIds = new Set<string>();
      // Notify assigned person
      if (deal.assigned_to && deal.assigned_to !== profileId) {
        recipientIds.add(deal.assigned_to);
      }
      // Notify deal members
      const { data: members } = await supabase
        .from('deal_members')
        .select('profile_id')
        .eq('deal_id', deal.id);
      members?.forEach(m => {
        if (m.profile_id !== profileId) recipientIds.add(m.profile_id);
      });
      // Notify anyone who commented on this deal
      const { data: commenters } = await supabase
        .from('deal_comments')
        .select('author_id')
        .eq('deal_id', deal.id);
      commenters?.forEach(c => {
        if (c.author_id !== profileId) recipientIds.add(c.author_id);
      });

      // Also detect @mentions
      const mentionRegex = /@(\w[\w\s]*?)(?=\s@|\s|$)/g;
      let match;
      while ((match = mentionRegex.exec(text)) !== null) {
        const mentionName = match[1].trim().toLowerCase();
        const mentioned = orgMembers.find(m => m.full_name?.toLowerCase() === mentionName);
        if (mentioned && mentioned.id !== profileId) recipientIds.add(mentioned.id);
      }

      if (recipientIds.size > 0) {
        const notifications = Array.from(recipientIds).map(recipientId => ({
          recipient_id: recipientId,
          sender_id: profileId,
          notification_type: text.includes('@') ? 'mention' : 'comment',
          title: `commented on "${deal.title}"`,
          content: text.trim().substring(0, 200),
          link_type: 'deal',
          link_id: deal.id,
          cluster_id: clusterId,
        }));
        await supabase.from('notifications').insert(notifications);
      }
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    await supabase.from('deal_comments').delete().eq('id', commentId);
    loadComments();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="glass-panel w-full max-w-lg max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 pb-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2">
                {canManage ? (
                  <select
                    value={draft.stage}
                    onChange={e => {
                      const v = e.target.value as DealStage;
                      setDraft(d => ({ ...d, stage: v }));
                      persist({ stage: v });
                    }}
                    className={`text-xs px-2 py-1 rounded-md border-0 ${stage.bgColor} ${stage.color} focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer`}
                  >
                    {(Object.keys(stageConfig) as DealStage[]).map(s => (
                      <option key={s} value={s}>{stageConfig[s].label}</option>
                    ))}
                  </select>
                ) : (
                  <Badge className={`${stage.bgColor} ${stage.color} border-0 text-xs`}>
                    <StageIcon className="w-3 h-3 mr-1" />
                    {stage.label}
                  </Badge>
                )}
                {draft.stage === 'won' && <span className="text-base">🏆</span>}
              </div>
              {canManage ? (
                <Input
                  value={draft.title}
                  onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                  onBlur={() => draft.title.trim() && draft.title !== deal.title && persist({ title: draft.title.trim() })}
                  className="text-lg font-semibold leading-tight h-auto py-1 px-2 -mx-2 border-transparent hover:border-border focus:border-primary bg-transparent"
                />
              ) : (
                <h2 className="text-lg font-semibold leading-tight">{draft.title}</h2>
              )}
            </div>
            <div className="flex items-center gap-1">
              {canManage && (
                <GlassButtonNew variant="ghost" size="icon-sm" onClick={() => { onClose(); onManageMembers(deal); }} title="Manage Members">
                  <Users className="w-4 h-4" />
                </GlassButtonNew>
              )}
              <GlassButtonNew variant="ghost" size="icon-sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </GlassButtonNew>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Key Info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/40">
              <DollarSign className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Value</p>
                {canManage ? (
                  <input
                    type="number"
                    value={draft.value}
                    onChange={e => setDraft(d => ({ ...d, value: e.target.value }))}
                    onBlur={() => persist({ value: draft.value ? parseFloat(draft.value) : null })}
                    placeholder="0"
                    className="w-full text-sm font-semibold text-primary bg-transparent focus:outline-none focus:ring-1 focus:ring-primary rounded px-1"
                  />
                ) : (
                  <p className="text-sm font-semibold text-primary">{draft.value ? `€${parseFloat(draft.value).toLocaleString()}` : '—'}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/40">
              <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Close Date</p>
                {canManage ? (
                  <input
                    type="date"
                    value={draft.expected_close_date}
                    onChange={e => {
                      setDraft(d => ({ ...d, expected_close_date: e.target.value }));
                      persist({ expected_close_date: e.target.value || null });
                    }}
                    className="w-full text-sm font-medium bg-transparent focus:outline-none focus:ring-1 focus:ring-primary rounded px-1"
                  />
                ) : (
                  <p className="text-sm font-medium">{draft.expected_close_date ? format(new Date(draft.expected_close_date), 'MMM d, yyyy') : '—'}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/40">
              <TrendingUp className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Probability</p>
                {canManage ? (
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={draft.probability}
                    onChange={e => setDraft(d => ({ ...d, probability: Number(e.target.value) }))}
                    onBlur={() => persist({ probability: draft.probability })}
                    className="w-full text-sm font-medium bg-transparent focus:outline-none focus:ring-1 focus:ring-primary rounded px-1"
                  />
                ) : (
                  <p className="text-sm font-medium">{draft.probability}%</p>
                )}
              </div>
            </div>
            {deal.crm_contacts && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/40">
                <User className="w-4 h-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Contact</p>
                  <p className="text-sm font-medium truncate">{deal.crm_contacts.name}</p>
                </div>
              </div>
            )}
          </div>

          {/* Responsible Person */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10">
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary overflow-hidden shrink-0">
              {(() => {
                const m = orgMembers.find(om => om.id === draft.assigned_to);
                return m?.avatar_url ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" /> : (m?.full_name?.[0] || '?');
              })()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Responsible</p>
              {canManage ? (
                <select
                  value={draft.assigned_to}
                  onChange={e => {
                    setDraft(d => ({ ...d, assigned_to: e.target.value }));
                    persist({ assigned_to: e.target.value || null });
                  }}
                  className="w-full text-sm font-medium text-primary bg-transparent focus:outline-none focus:ring-1 focus:ring-primary rounded px-1 cursor-pointer"
                >
                  <option value="">Unassigned</option>
                  {orgMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.full_name || 'Unknown'}</option>
                  ))}
                </select>
              ) : (
                <p className="text-sm font-medium text-primary">{orgMembers.find(m => m.id === draft.assigned_to)?.full_name || 'Unassigned'}</p>
              )}
            </div>
          </div>

          {/* Source & attribution */}
          {(() => {
            const flat: [string, string][] = [];
            const walk = (obj: Record<string, unknown>, prefix = '') => {
              for (const [k, v] of Object.entries(obj || {})) {
                if (v === null || v === undefined || v === '') continue;
                const label = prefix ? `${prefix}.${k}` : k;
                if (Array.isArray(v)) flat.push([label, v.map(x => (typeof x === 'object' ? JSON.stringify(x) : String(x))).join(', ')]);
                else if (typeof v === 'object') walk(v as Record<string, unknown>, label);
                else flat.push([label, String(v)]);
              }
            };
            walk((deal.attributes as Record<string, unknown>) || {});
            const primary = [['Source', deal.source], ['Campaign', deal.campaign], ['Form', deal.form_name], ['Ad', deal.ad_name]].filter(([, v]) => v) as [string, string][];
            const skip = new Set(['name', 'email', 'phone', 'company', 'message', 'campaign', 'campaign_name', 'form', 'form_name', 'ad', 'ad_name', 'source', 'subject', 'title', 'id', 'external_id', 'lead_id', 'created_at', 'updated_at', 'sent_at', 'delivery_id', 'event', 'full_name', 'phone_number']);
            const extra = flat.filter(([k]) => !skip.has(k.toLowerCase()));
            if (primary.length === 0 && extra.length === 0) return null;
            return (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Source & attribution</span>
                </div>
                <div className="rounded-xl bg-secondary/30 border border-border/20 p-3 space-y-2">
                  {primary.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {primary.map(([k, v]) => (
                        <span key={k} className="inline-flex items-center gap-1 rounded-full bg-card border border-border px-2 py-0.5 text-xs">
                          <span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {extra.length > 0 && (
                    <div className="max-h-44 overflow-auto rounded-lg border border-border/40 bg-card">
                      <table className="w-full text-xs">
                        <tbody>
                          {extra.map(([k, v]) => (
                            <tr key={k} className="border-b border-border/30 last:border-0 align-top">
                              <td className="px-2 py-1 text-muted-foreground whitespace-nowrap w-[38%]">{k}</td>
                              <td className="px-2 py-1 break-all">{v}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Description */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</span>
            </div>
            {canManage ? (
              <Textarea
                value={draft.description}
                onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                onBlur={() => draft.description !== (deal.description ?? '') && persist({ description: draft.description.trim() || null })}
                placeholder="Add a description..."
                className="min-h-[100px] text-sm bg-secondary/30 border-border/20 rounded-xl resize-none"
              />
            ) : (
              <div className="p-3 rounded-xl bg-secondary/30 border border-border/20">
                <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{draft.description || <span className="text-muted-foreground italic">No description added</span>}</p>
              </div>
            )}
          </div>

          {/* Comments Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Comments ({comments.length})
              </span>
            </div>

            <div className="space-y-3 max-h-60 overflow-y-auto mb-3">
              {isLoadingComments ? (
                <p className="text-xs text-muted-foreground text-center py-4">Loading...</p>
              ) : comments.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No comments yet. Be the first to comment.</p>
              ) : (
                comments.map(comment => (
                  <div key={comment.id} className="flex gap-2.5 group">
                    {comment.profiles?.avatar_url ? (
                      <img src={comment.profiles.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover mt-0.5 shrink-0" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-[9px] font-bold text-primary mt-0.5 shrink-0">
                        {comment.profiles?.full_name?.[0] || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium">{comment.profiles?.full_name || 'Unknown'}</span>
                        <span className="text-[10px] text-muted-foreground">
                          {format(new Date(comment.created_at), 'MMM d, HH:mm')}
                        </span>
                        {comment.author_id === profileId && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="opacity-0 group-hover:opacity-100 ml-auto p-0.5 text-muted-foreground hover:text-destructive transition-all"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-foreground/80 mt-0.5">{comment.content}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <MentionInput
              orgMembers={orgMembers}
              onSubmit={handleAddComment}
              placeholder="Write a comment... use @ to mention"
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
