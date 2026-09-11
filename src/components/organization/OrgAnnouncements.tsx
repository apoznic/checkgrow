import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Megaphone, Plus, Loader2, Trash2, AlertCircle, Info, AlertTriangle, Pencil, Save, X, Mail, CalendarPlus, Ticket, ExternalLink, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GlassButton, GlassInput } from '@/components/GlassCard';
import { NewsletterPanel } from './NewsletterPanel';
import { TaskRemindersPanel } from './TaskRemindersPanel';
import { ListChecks } from 'lucide-react';

interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: string;
  created_at: string;
  author_id: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface OrgAnnouncementsProps {
  clusterId: string;
  canManage: boolean;
  profileId: string;
  isOwner?: boolean;
}

const PRIORITIES = [
  { value: 'low', label: 'Low', icon: Info, color: 'text-muted-foreground' },
  { value: 'normal', label: 'Normal', icon: Info, color: 'text-blue-500' },
  { value: 'high', label: 'High', icon: AlertTriangle, color: 'text-yellow-500' },
  { value: 'urgent', label: 'Urgent', icon: AlertCircle, color: 'text-destructive' },
];

function ToggleSwitch({ enabled, onToggle, icon: Icon, label }: { enabled: boolean; onToggle: () => void; icon: React.ElementType; label: string }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer group">
      <div
        onClick={onToggle}
        className={`w-10 h-6 rounded-full transition-colors flex items-center px-1 ${
          enabled ? 'bg-primary' : 'bg-secondary'
        }`}
      >
        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${enabled ? 'translate-x-4' : 'translate-x-0'}`} />
      </div>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
          {label}
        </span>
      </div>
    </label>
  );
}

function PriorityPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Priority:</span>
      {PRIORITIES.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className={`px-3 py-1 rounded-lg text-sm transition-colors ${
            value === p.value ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function IntegrationToggles({
  resendConfigured,
  calendarConnected,
  ntherUrl,
  notifyByEmail,
  setNotifyByEmail,
  addToCalendar,
  setAddToCalendar,
  includeNtherLink,
  setIncludeNtherLink,
}: {
  resendConfigured: boolean | null;
  calendarConnected: boolean;
  ntherUrl: string | null;
  notifyByEmail: boolean;
  setNotifyByEmail: (v: boolean) => void;
  addToCalendar: boolean;
  setAddToCalendar: (v: boolean) => void;
  includeNtherLink: boolean;
  setIncludeNtherLink: (v: boolean) => void;
}) {
  return (
    <>
      {resendConfigured === false ? (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-amber-600 dark:text-amber-400">Email notifications unavailable</p>
            <p className="text-muted-foreground mt-0.5">
              To notify members by email, add a Resend API key in your organization's <strong>Integrations</strong> settings.
            </p>
          </div>
        </div>
      ) : (
        <ToggleSwitch enabled={notifyByEmail} onToggle={() => setNotifyByEmail(!notifyByEmail)} icon={Mail} label="Notify all members by email" />
      )}
      {calendarConnected ? (
        <ToggleSwitch enabled={addToCalendar} onToggle={() => setAddToCalendar(!addToCalendar)} icon={CalendarPlus} label="Add to shared calendar" />
      ) : (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/50 border border-border/30">
          <CalendarPlus className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-muted-foreground">
              To add announcements to the shared calendar, connect Google Calendar in <strong>Calendar</strong> settings.
            </p>
          </div>
        </div>
      )}
      {ntherUrl ? (
        <ToggleSwitch enabled={includeNtherLink} onToggle={() => setIncludeNtherLink(!includeNtherLink)} icon={Ticket} label="Include Nther event link" />
      ) : (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-secondary/50 border border-border/30">
          <Ticket className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-muted-foreground">
              To include event links, add your Nther URL in <strong>Integrations</strong> settings.
            </p>
          </div>
        </div>
      )}
    </>
  );
}

export function OrgAnnouncements({ clusterId, canManage, profileId, isOwner }: OrgAnnouncementsProps) {
  const [tab, setTab] = useState<'announcements' | 'newsletter' | 'task-reminders'>(isOwner ? 'newsletter' : canManage ? 'task-reminders' : 'announcements');
  const { toast } = useToast();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newPriority, setNewPriority] = useState('normal');
  const [notifyByEmail, setNotifyByEmail] = useState(false);
  const [addToCalendar, setAddToCalendar] = useState(false);
  const [includeNtherLink, setIncludeNtherLink] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editPriority, setEditPriority] = useState('normal');
  const [editNotifyByEmail, setEditNotifyByEmail] = useState(false);
  const [editAddToCalendar, setEditAddToCalendar] = useState(false);
  const [editIncludeNtherLink, setEditIncludeNtherLink] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [resendConfigured, setResendConfigured] = useState<boolean | null>(null);
  const [calendarConnected, setCalendarConnected] = useState<boolean>(false);
  const [ntherUrl, setNtherUrl] = useState<string | null>(null);

  const checkIntegrationStatus = async () => {
    const { data } = await supabase.functions.invoke('manage-integrations', {
      body: { action: 'list', clusterId },
    });
    if (data?.integrations) {
      const resend = data.integrations.find((i: any) => i.service_name === 'resend' && i.is_active);
      setResendConfigured(!!resend);
      const nther = data.integrations.find((i: any) => i.service_name === 'nther');
      if (nther?.config?.event_url) {
        setNtherUrl(nther.config.event_url);
      }
    } else {
      setResendConfigured(false);
    }
  };

  const checkCalendarConnection = async () => {
    const { data } = await supabase
      .from('cluster_calendar_tokens')
      .select('id')
      .eq('cluster_id', clusterId)
      .maybeSingle();
    setCalendarConnected(!!data);
  };

  useEffect(() => {
    loadAnnouncements();
    checkIntegrationStatus();
    checkCalendarConnection();

    const channel = supabase
      .channel(`org-announcements-${clusterId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'org_announcements',
          filter: `cluster_id=eq.${clusterId}`,
        },
        () => {
          loadAnnouncements();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [clusterId]);

  const loadAnnouncements = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('org_announcements')
      .select(`
        id, title, content, priority, created_at, author_id,
        profiles:author_id ( full_name, avatar_url )
      `)
      .eq('cluster_id', clusterId)
      .order('created_at', { ascending: false });

    if (data) setAnnouncements(data as unknown as Announcement[]);
    setIsLoading(false);
  };

  const getAuthorName = async () => {
    const { data: authorProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', profileId)
      .single();
    return authorProfile?.full_name || 'A team member';
  };

  const sendEmailNotification = async (title: string, content: string, priority: string) => {
    const authorName = await getAuthorName();
    const { data: emailData, error: emailError } = await supabase.functions.invoke('send-announcement-emails', {
      body: { clusterId, title, content, priority, authorName },
    });
    if (emailError || emailData?.error) {
      toast({ title: 'Email notification failed', description: emailData?.error || emailError?.message || 'Unknown error', variant: 'destructive' });
    } else {
      toast({ title: `📧 Email notifications sent to ${emailData?.sent || 'all'} members` });
    }
  };

  const createCalendarEvent = async (title: string, content: string, priority: string) => {
    const now = new Date();
    const endDate = new Date(now.getTime() + 60 * 60 * 1000);
    const { error: calError } = await supabase
      .from('calendar_events')
      .insert({
        cluster_id: clusterId,
        title: `📢 ${title}`,
        description: content,
        start_date: now.toISOString(),
        end_date: endDate.toISOString(),
        all_day: true,
        created_by: profileId,
        color: priority === 'urgent' ? 'red' : priority === 'high' ? 'orange' : 'blue',
      });
    if (calError) {
      toast({ title: 'Calendar event failed', description: calError.message, variant: 'destructive' });
    } else {
      toast({ title: '📅 Calendar event created' });
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setIsCreating(true);

    let finalContent = newContent.trim();
    if (includeNtherLink && ntherUrl) {
      finalContent += `\n\n🎟️ Event link: ${ntherUrl}`;
    }

    const { error } = await supabase
      .from('org_announcements')
      .insert({
        cluster_id: clusterId,
        author_id: profileId,
        title: newTitle.trim(),
        content: finalContent,
        priority: newPriority,
      });

    if (error) {
      toast({ title: 'Error creating announcement', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Announcement posted!' });
      if (notifyByEmail) sendEmailNotification(newTitle.trim(), finalContent, newPriority);
      if (addToCalendar) createCalendarEvent(newTitle.trim(), finalContent, newPriority);

      setNewTitle('');
      setNewContent('');
      setNewPriority('normal');
      setNotifyByEmail(false);
      setAddToCalendar(false);
      setIncludeNtherLink(false);
      setShowCreate(false);
      loadAnnouncements();
    }
    setIsCreating(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from('org_announcements').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error deleting announcement', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Announcement deleted' });
      loadAnnouncements();
    }
    setDeletingId(null);
  };

  const startEdit = (a: Announcement) => {
    setEditingId(a.id);
    setEditTitle(a.title);
    setEditContent(a.content);
    setEditPriority(a.priority || 'normal');
    setEditNotifyByEmail(false);
    setEditAddToCalendar(false);
    setEditIncludeNtherLink(false);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditContent('');
    setEditPriority('normal');
    setEditNotifyByEmail(false);
    setEditAddToCalendar(false);
    setEditIncludeNtherLink(false);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editTitle.trim() || !editContent.trim()) return;
    setIsSaving(true);

    let finalContent = editContent.trim();
    if (editIncludeNtherLink && ntherUrl && !finalContent.includes(ntherUrl)) {
      finalContent += `\n\n🎟️ Event link: ${ntherUrl}`;
    }

    const { error } = await supabase
      .from('org_announcements')
      .update({ title: editTitle.trim(), content: finalContent, priority: editPriority })
      .eq('id', editingId);

    if (error) {
      toast({ title: 'Error updating announcement', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Announcement updated!' });
      if (editNotifyByEmail) sendEmailNotification(editTitle.trim(), finalContent, editPriority);
      if (editAddToCalendar) createCalendarEvent(editTitle.trim(), finalContent, editPriority);
      cancelEdit();
      loadAnnouncements();
    }
    setIsSaving(false);
  };

  const getPriorityInfo = (priority: string) => {
    return PRIORITIES.find(p => p.value === priority) || PRIORITIES[1];
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {(isOwner || canManage) && (
        <div className="flex gap-1 p-1 bg-secondary/40 rounded-xl w-fit">
          {isOwner && (
            <button onClick={() => setTab('newsletter')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition ${tab === 'newsletter' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <Send className="w-4 h-4" />Newsletter
            </button>
          )}
          {canManage && (
            <button onClick={() => setTab('task-reminders')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition ${tab === 'task-reminders' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <ListChecks className="w-4 h-4" />Task Reminders
            </button>
          )}
        </div>
      )}

      {isOwner && tab === 'newsletter' ? (
        <NewsletterPanel clusterId={clusterId} />
      ) : canManage && tab === 'task-reminders' ? (
        <TaskRemindersPanel clusterId={clusterId} />
      ) : (
        <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Announcements</h2>
        <div className="flex items-center gap-2">
          {ntherUrl && (
            <a
              href={ntherUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-pink-500/10 text-pink-500 hover:bg-pink-500/20 transition-colors text-sm font-medium"
            >
              <Ticket className="w-4 h-4" />
              Nther Events
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {canManage && (
            <GlassButton variant="primary" onClick={() => setShowCreate(true)}>
              <Plus className="w-4 h-4 mr-2" />
              New Announcement
            </GlassButton>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="glass-panel p-6"
          >
            <h3 className="font-medium mb-4">New Announcement</h3>
            <div className="space-y-4">
              <GlassInput value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Announcement title" />
              <textarea
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="Write your announcement..."
                className="w-full h-32 bg-secondary/50 border border-border/30 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <PriorityPicker value={newPriority} onChange={setNewPriority} />
              <IntegrationToggles
                resendConfigured={resendConfigured}
                calendarConnected={calendarConnected}
                ntherUrl={ntherUrl}
                notifyByEmail={notifyByEmail}
                setNotifyByEmail={setNotifyByEmail}
                addToCalendar={addToCalendar}
                setAddToCalendar={setAddToCalendar}
                includeNtherLink={includeNtherLink}
                setIncludeNtherLink={setIncludeNtherLink}
              />
              <div className="flex gap-3">
                <GlassButton onClick={() => setShowCreate(false)}>Cancel</GlassButton>
                <GlassButton
                  variant="primary"
                  onClick={handleCreate}
                  disabled={!newTitle.trim() || !newContent.trim() || isCreating}
                >
                  {isCreating ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Posting...</>) : 'Post Announcement'}
                </GlassButton>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {announcements.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <Megaphone className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No announcements yet</p>
          {canManage && (
            <p className="text-sm text-muted-foreground mt-2">Create one to keep your team informed.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => {
            const priorityInfo = getPriorityInfo(announcement.priority);
            const PriorityIcon = priorityInfo.icon;
            const isEditing = editingId === announcement.id;

            return (
              <motion.div key={announcement.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-5">
                {isEditing ? (
                  <div className="space-y-3">
                    <GlassInput value={editTitle} onChange={(e) => setEditTitle(e.target.value)} placeholder="Title" />
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full h-28 bg-secondary/50 border border-border/30 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <PriorityPicker value={editPriority} onChange={setEditPriority} />
                    <div className="pt-2 border-t border-border/30">
                      <p className="text-xs text-muted-foreground mb-3">Actions on save (e.g. send email if not sent initially):</p>
                      <div className="space-y-3">
                        <IntegrationToggles
                          resendConfigured={resendConfigured}
                          calendarConnected={calendarConnected}
                          ntherUrl={ntherUrl}
                          notifyByEmail={editNotifyByEmail}
                          setNotifyByEmail={setEditNotifyByEmail}
                          addToCalendar={editAddToCalendar}
                          setAddToCalendar={setEditAddToCalendar}
                          includeNtherLink={editIncludeNtherLink}
                          setIncludeNtherLink={setEditIncludeNtherLink}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <GlassButton onClick={cancelEdit}><X className="w-4 h-4 mr-1" />Cancel</GlassButton>
                      <GlassButton variant="primary" onClick={handleSaveEdit} disabled={isSaving || !editTitle.trim() || !editContent.trim()}>
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" />Save</>}
                      </GlassButton>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <PriorityIcon className={`w-5 h-5 mt-0.5 ${priorityInfo.color}`} />
                      <div>
                        <h3 className="font-medium">{announcement.title}</h3>
                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{announcement.content}</p>
                        <div className="flex items-center gap-3 mt-3">
                          <span className="text-xs text-muted-foreground">By {announcement.profiles?.full_name || 'Anonymous'}</span>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                    {canManage && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => startEdit(announcement)}
                          className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(announcement.id)}
                          disabled={deletingId === announcement.id}
                          className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          {deletingId === announcement.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
        </div>
      )}
    </div>
  );
}
