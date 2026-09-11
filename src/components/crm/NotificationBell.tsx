import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Check, CheckCheck, Trash2, MessageCircle, AtSign, Sparkles, FolderOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';

interface Notification {
  id: string;
  notification_type: string;
  title: string;
  content: string | null;
  link_type: string | null;
  link_id: string | null;
  is_read: boolean;
  created_at: string;
  sender: { full_name: string | null; avatar_url: string | null } | null;
}

interface NotificationBellProps {
  profileId: string;
  clusterId: string;
  onNavigateToTask?: (taskId: string) => void;
  onNavigateToDeal?: (dealId: string) => void;
}

export function NotificationBell({ profileId, clusterId, onNavigateToTask, onNavigateToDeal }: NotificationBellProps) {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  // Track which notifications were unread when the panel was opened
  const [recentlyUnreadIds, setRecentlyUnreadIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadNotifications();

    const channel = supabase
      .channel(`notifications-${profileId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${profileId}` }, () => loadNotifications())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profileId]);

  const loadNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('id, notification_type, title, content, link_type, link_id, is_read, created_at, sender:sender_id(full_name, avatar_url)')
      .eq('recipient_id', profileId)
      .eq('cluster_id', clusterId)
      .order('created_at', { ascending: false })
      .limit(30);

    if (data) {
      setNotifications(data as unknown as Notification[]);
      setUnreadCount((data as any[]).filter(n => !n.is_read).length);
    }
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    // Remember which ones were unread so we can highlight them
    setRecentlyUnreadIds(new Set(unreadIds));
    // Optimistically update UI immediately
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
    // Persist to DB
    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    setRecentlyUnreadIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleOpenToggle = () => {
    const willOpen = !isOpen;
    if (willOpen) {
      // Mark all as read when opening — stops the red bell immediately
      if (unreadCount > 0) {
        markAllRead();
      }
    } else {
      // When closing, clear the "recently unread" highlights
      setRecentlyUnreadIds(new Set());
    }
    setIsOpen(willOpen);
  };

  const handleClick = (notif: Notification) => {
    // Remove from recently-unread highlights on click
    setRecentlyUnreadIds(prev => {
      const next = new Set(prev);
      next.delete(notif.id);
      return next;
    });
    if (notif.link_type === 'task' && notif.link_id && onNavigateToTask) {
      onNavigateToTask(notif.link_id);
    } else if (notif.link_type === 'deal' && notif.link_id && onNavigateToDeal) {
      onNavigateToDeal(notif.link_id);
    } else if (notif.link_type === 'project' && notif.link_id) {
      navigate(`/project/${notif.link_id}`);
    }
    setIsOpen(false);
  };

  const getIcon = (type: string) => {
    if (type === 'mention') return <AtSign className="w-3.5 h-3.5 text-primary" />;
    if (type === 'project_invite') return <Sparkles className="w-3.5 h-3.5 text-primary" />;
    return <MessageCircle className="w-3.5 h-3.5 text-muted-foreground" />;
  };

  return (
    <div className={`relative z-40 rounded-xl transition-all ${
      unreadCount > 0
        ? 'bg-destructive/10 shadow-[0_0_14px_3px_hsl(var(--destructive)/0.4)] animate-pulse ring-2 ring-destructive/40'
        : ''
    }`} style={unreadCount > 0 ? { animationDuration: '1.5s' } : undefined}>
      <button
        onClick={handleOpenToggle}
        className={`relative p-2 rounded-xl transition-colors ${
          unreadCount > 0
            ? 'hover:bg-destructive/15 text-destructive'
            : 'hover:bg-secondary/50 text-muted-foreground'
        }`}
      >
        <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-destructive' : ''}`} />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center shadow-lg shadow-destructive/40 ring-2 ring-background"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="notifications-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120]"
            onClick={() => { setIsOpen(false); setRecentlyUnreadIds(new Set()); }}
          />
        )}

        {isOpen && (
          <motion.div
            key="notifications-panel"
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-80 max-h-[420px] bg-popover border border-border rounded-xl shadow-xl z-[130] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
              <h3 className="text-sm font-semibold">Notifications</h3>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="py-12 text-center">
                  <Bell className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
                  <p className="text-xs text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                notifications.map(notif => {
                  const wasUnread = recentlyUnreadIds.has(notif.id);
                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleClick(notif)}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-secondary/30 cursor-pointer transition-colors border-b border-border/10 last:border-0 ${
                        wasUnread ? 'bg-primary/5' : ''
                      }`}
                    >
                      <div className="mt-0.5 flex-shrink-0">
                        {notif.sender?.avatar_url ? (
                          <img src={notif.sender.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center">
                            {getIcon(notif.notification_type)}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs leading-snug ${wasUnread ? 'font-medium' : 'text-muted-foreground'}`}>
                          <span className="font-semibold">{notif.sender?.full_name || 'Someone'}</span>
                          {' '}{notif.title}
                        </p>
                        {notif.content && (
                          <p className="text-[10px] text-muted-foreground/70 mt-0.5 line-clamp-1">{notif.content}</p>
                        )}
                        <p className="text-[10px] text-muted-foreground/50 mt-1">
                          {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {wasUnread && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                          className="p-1 opacity-0 hover:opacity-100 group-hover:opacity-60 text-muted-foreground hover:text-destructive transition-all"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
