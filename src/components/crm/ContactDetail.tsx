import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, User, Building, Mail, Phone, Tag, Calendar, MessageSquare, 
  Send, Loader2, Clock, AlertCircle, CheckCircle, TrendingUp, Trash2
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GlassButtonNew } from '@/components/ui/glass-button';
import { GlassSelect } from '@/components/ui/glass-select';
import { Badge } from '@/components/ui/badge';
import { CRMContact, ContactType } from './types';

interface ContactComment {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  profiles?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface ContactDetailProps {
  contact: CRMContact;
  profileId: string;
  canManage: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

const leadStatuses = [
  { value: 'new', label: 'New', color: 'bg-slate-500/20 text-slate-400', icon: AlertCircle },
  { value: 'contacted', label: 'Contacted', color: 'bg-blue-500/20 text-blue-400', icon: Mail },
  { value: 'qualified', label: 'Qualified', color: 'bg-purple-500/20 text-purple-400', icon: CheckCircle },
  { value: 'proposal', label: 'Proposal', color: 'bg-amber-500/20 text-amber-400', icon: TrendingUp },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-orange-500/20 text-orange-400', icon: MessageSquare },
  { value: 'converted', label: 'Converted', color: 'bg-green-500/20 text-green-400', icon: CheckCircle },
  { value: 'lost', label: 'Lost', color: 'bg-red-500/20 text-red-400', icon: X },
];

const contactTypes: { value: ContactType; label: string; color: string }[] = [
  { value: 'lead', label: 'Lead', color: 'bg-primary/20 text-primary' },
  { value: 'prospect', label: 'Prospect', color: 'bg-accent/20 text-accent' },
  { value: 'client', label: 'Client', color: 'bg-green-500/20 text-green-400' },
  { value: 'partner', label: 'Partner', color: 'bg-amber-500/20 text-amber-400' },
  { value: 'vendor', label: 'Vendor', color: 'bg-cyan-500/20 text-cyan-400' },
  { value: 'other', label: 'Other', color: 'bg-muted text-muted-foreground' },
];

export function ContactDetail({ contact, profileId, canManage, onClose, onUpdate }: ContactDetailProps) {
  const { toast } = useToast();
  const [comments, setComments] = useState<ContactComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isSendingComment, setIsSendingComment] = useState(false);
  const [leadStatus, setLeadStatus] = useState(contact.lead_status || 'new');
  const [nextFollowup, setNextFollowup] = useState(contact.next_followup_at || '');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: contact.name,
    email: contact.email || '',
    phone: contact.phone || '',
    company: contact.company || '',
    position: contact.position || '',
    contact_type: contact.contact_type,
    notes: contact.notes || '',
  });

  const handleSaveEdit = async () => {
    if (!editData.name.trim()) return;
    setIsUpdating(true);
    const { error } = await supabase
      .from('crm_contacts')
      .update({
        name: editData.name.trim(),
        email: editData.email.trim() || null,
        phone: editData.phone.trim() || null,
        company: editData.company.trim() || null,
        position: editData.position.trim() || null,
        contact_type: editData.contact_type,
        notes: editData.notes.trim() || null,
      })
      .eq('id', contact.id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Contact updated' });
      setIsEditing(false);
      onUpdate();
    }
    setIsUpdating(false);
  };

  useEffect(() => {
    loadComments();
  }, [contact.id]);

  const loadComments = async () => {
    setIsLoadingComments(true);
    const { data, error } = await supabase
      .from('contact_comments')
      .select('*, profiles:author_id(id, full_name, avatar_url)')
      .eq('contact_id', contact.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setComments(data as unknown as ContactComment[]);
    }
    setIsLoadingComments(false);
  };

  const handleSendComment = async () => {
    if (!newComment.trim()) return;
    setIsSendingComment(true);

    const { error } = await supabase.from('contact_comments').insert({
      contact_id: contact.id,
      author_id: profileId,
      content: newComment.trim(),
    });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      setNewComment('');
      loadComments();
    }
    setIsSendingComment(false);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setIsUpdating(true);
    setLeadStatus(newStatus);

    const { error } = await supabase
      .from('crm_contacts')
      .update({ 
        lead_status: newStatus,
        last_contacted_at: newStatus === 'contacted' ? new Date().toISOString() : contact.last_contacted_at
      })
      .eq('id', contact.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      onUpdate();
    }
    setIsUpdating(false);
  };

  const handleUpdateFollowup = async (date: string) => {
    setNextFollowup(date);
    const { error } = await supabase
      .from('crm_contacts')
      .update({ next_followup_at: date || null })
      .eq('id', contact.id);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      onUpdate();
    }
  };

  const typeInfo = contactTypes.find(t => t.value === contact.contact_type);
  const statusInfo = leadStatuses.find(s => s.value === leadStatus);

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
        className="bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center">
                <User className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold">{isEditing ? editData.name : contact.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {contact.position && <span className="text-sm text-muted-foreground">{contact.position}</span>}
                  {contact.company && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Building className="w-3 h-3" /> {contact.company}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {canManage && !isEditing && (
                <button onClick={() => setIsEditing(true)} className="p-2 hover:bg-secondary/50 rounded-lg text-sm text-primary">
                  Edit
                </button>
              )}
              {canManage && !isEditing && (
                <button
                  onClick={async () => {
                    if (!confirm(`Delete contact "${contact.name}"? This cannot be undone.`)) return;
                    const { error } = await supabase.from('crm_contacts').delete().eq('id', contact.id);
                    if (error) {
                      toast({ title: 'Error', description: error.message, variant: 'destructive' });
                    } else {
                      toast({ title: 'Contact deleted' });
                      onUpdate();
                      onClose();
                    }
                  }}
                  className="p-2 hover:bg-destructive/20 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete contact"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-secondary/50 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tags */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <Badge className={typeInfo?.color}>{typeInfo?.label}</Badge>
            {statusInfo && (
              <Badge className={statusInfo.color}>
                <statusInfo.icon className="w-3 h-3 mr-1" />
                {statusInfo.label}
              </Badge>
            )}
            {contact.tags?.map(tag => (
              <Badge key={tag} variant="outline" className="text-xs">
                <Tag className="w-3 h-3 mr-1" /> {tag}
              </Badge>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Edit Form */}
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground mb-1 block">Name *</label>
                  <input
                    value={editData.name}
                    onChange={e => setEditData(p => ({ ...p, name: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl bg-secondary/30 border border-border/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                  <input
                    type="email"
                    value={editData.email}
                    onChange={e => setEditData(p => ({ ...p, email: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl bg-secondary/30 border border-border/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
                  <input
                    value={editData.phone}
                    onChange={e => setEditData(p => ({ ...p, phone: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl bg-secondary/30 border border-border/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Company</label>
                  <input
                    value={editData.company}
                    onChange={e => setEditData(p => ({ ...p, company: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl bg-secondary/30 border border-border/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Position</label>
                  <input
                    value={editData.position}
                    onChange={e => setEditData(p => ({ ...p, position: e.target.value }))}
                    className="w-full h-10 px-3 rounded-xl bg-secondary/30 border border-border/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Type</label>
                  <GlassSelect
                    value={editData.contact_type}
                    onChange={v => setEditData(p => ({ ...p, contact_type: v as ContactType }))}
                    options={contactTypes.map(t => ({ value: t.value, label: t.label }))}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Notes</label>
                <textarea
                  value={editData.notes}
                  onChange={e => setEditData(p => ({ ...p, notes: e.target.value }))}
                  className="w-full h-20 bg-secondary/30 border border-border/40 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-xl text-sm hover:bg-secondary/50 transition-colors">Cancel</button>
                <button
                  onClick={handleSaveEdit}
                  disabled={!editData.name.trim() || isUpdating}
                  className="px-4 py-2 rounded-xl text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Contact Info */}
              <div className="grid grid-cols-2 gap-4">
                {contact.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <a href={`mailto:${contact.email}`} className="text-primary hover:underline">{contact.email}</a>
                  </div>
                )}
                {contact.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <a href={`tel:${contact.phone}`} className="hover:underline">{contact.phone}</a>
                  </div>
                )}
                {contact.last_contacted_at && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    Last contacted: {formatDistanceToNow(new Date(contact.last_contacted_at), { addSuffix: true })}
                  </div>
                )}
                {contact.source && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingUp className="w-4 h-4" />
                    Source: {contact.source}
                  </div>
                )}
              </div>

              {/* Lead Tracking */}
              {canManage && (
                <div className="bg-secondary/20 rounded-xl p-4 space-y-4">
                  <h3 className="text-sm font-medium">Lead Tracking</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Status</label>
                      <GlassSelect
                        value={leadStatus}
                        onChange={handleUpdateStatus}
                        options={leadStatuses.map(s => ({ value: s.value, label: s.label }))}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Next Follow-up</label>
                      <input
                        type="datetime-local"
                        value={nextFollowup ? nextFollowup.slice(0, 16) : ''}
                        onChange={e => handleUpdateFollowup(e.target.value ? new Date(e.target.value).toISOString() : '')}
                        className="w-full h-10 px-3 rounded-xl bg-secondary/30 border border-border/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Notes */}
              {contact.notes && (
                <div>
                  <h3 className="text-sm font-medium mb-2">Notes</h3>
                  <p className="text-sm text-muted-foreground bg-secondary/20 rounded-xl p-4">{contact.notes}</p>
                </div>
              )}
            </>
          )}

          {/* Comments */}
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Comments ({comments.length})
            </h3>

            {/* Comment Input */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 h-10 px-4 rounded-xl bg-secondary/30 border border-border/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                onKeyDown={e => e.key === 'Enter' && handleSendComment()}
              />
              <GlassButtonNew
                variant="primary"
                size="icon"
                onClick={handleSendComment}
                disabled={!newComment.trim() || isSendingComment}
              >
                {isSendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </GlassButtonNew>
            </div>

            {/* Comments List */}
            {isLoadingComments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : comments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No comments yet</p>
            ) : (
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {comments.map(comment => (
                  <div key={comment.id} className="flex gap-3 p-3 rounded-xl bg-secondary/20">
                    {comment.profiles?.avatar_url ? (
                      <img src={comment.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                        {comment.profiles?.full_name?.[0] || '?'}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium">{comment.profiles?.full_name || 'Unknown'}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
