import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, User, Send, Loader2, ChevronRight, ChevronLeft, X } from 'lucide-react';
import { MentionInput } from '@/components/crm/MentionInput';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface Message {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  profiles: {
    full_name: string | null;
    avatar_url: string | null;
  };
}

interface ChatMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface ProjectChatSidebarProps {
  projectId: string;
  profileId: string;
  clusterId?: string;
  chatMembers: ChatMember[];
  isOpen: boolean;
  onToggle: () => void;
  embedded?: boolean;
}

export function ProjectChatSidebar({ projectId, profileId, clusterId, chatMembers, isOpen, onToggle, embedded = false }: ProjectChatSidebarProps) {
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadMessages();
    const channel = supabase
      .channel(`project-chat-sidebar-${projectId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `project_id=eq.${projectId}` }, () => {
        loadMessages();
        if (!isOpen) setUnreadCount(prev => prev + 1);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [projectId, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [isOpen, messages.length]);

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('id, content, created_at, sender_id, profiles:sender_id(full_name, avatar_url)')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data as unknown as Message[]);
  };

  const handleSend = async (text: string) => {
    if (!text.trim() || isSending) return;
    setIsSending(true);
    const { error } = await supabase.from('messages').insert({
      project_id: projectId, sender_id: profileId, content: text.trim(),
    });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      await supabase.from('project_activities').insert({
        project_id: projectId, actor_id: profileId, activity_type: 'message_sent',
        description: 'Sent a message in the project chat',
      });

      // Notify other chat members
      if (clusterId) {
        const notifications = chatMembers
          .filter(m => m.id !== profileId)
          .map(m => ({
            recipient_id: m.id,
            sender_id: profileId,
            notification_type: text.includes('@') ? 'mention' : 'message',
            title: `sent a message in project chat`,
            content: text.trim().substring(0, 200),
            link_type: 'project',
            link_id: projectId,
            cluster_id: clusterId,
          }));
        if (notifications.length > 0) {
          await supabase.from('notifications').insert(notifications);
        }
      }
    }
    setIsSending(false);
  };

  // Render @mentions with highlight
  const renderContent = (content: string) => {
    const parts = content.split(/(@\w[\w\s]*?)(?=\s@|\s|$)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return <span key={i} className="text-primary font-medium bg-primary/10 px-0.5 rounded">{part}</span>;
      }
      return part;
    });
  };

  // Embedded mode: render inline without fixed positioning
  if (embedded) {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2.5">
          <MessageSquare className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold">Chat</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
            {messages.length}
          </span>
        </div>

        {/* Online members strip */}
        {chatMembers.length > 0 && (
          <div className="px-3 py-1.5 border-b border-border/50 flex items-center gap-1 overflow-x-auto">
            {chatMembers.slice(0, 6).map(m => (
              <div key={m.id} title={m.full_name || 'Member'} className="flex-shrink-0">
                {m.avatar_url ? (
                  <img src={m.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover ring-1 ring-border" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-border">
                    <span className="text-[8px] font-medium text-primary">{m.full_name?.[0] || '?'}</span>
                  </div>
                )}
              </div>
            ))}
            {chatMembers.length > 6 && (
              <span className="text-[10px] text-muted-foreground ml-1">+{chatMembers.length - 6}</span>
            )}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="w-6 h-6 mx-auto mb-1 text-muted-foreground/20" />
              <p className="text-[10px] text-muted-foreground">No messages yet</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.sender_id === profileId;
              return (
                <div key={msg.id} className={`flex gap-1.5 ${isMe ? 'flex-row-reverse' : ''}`}>
                  {!isMe && (
                    msg.profiles.avatar_url ? (
                      <img src={msg.profiles.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover flex-shrink-0 mt-0.5" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <User className="w-2.5 h-2.5 text-primary" />
                      </div>
                    )
                  )}
                  <div className={`max-w-[85%] px-2.5 py-1.5 rounded-xl ${
                    isMe
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-secondary rounded-bl-sm'
                  }`}>
                    {!isMe && (
                      <p className="text-[9px] font-medium opacity-70 mb-0.5">{msg.profiles.full_name || 'User'}</p>
                    )}
                    <p className="text-[11px] leading-relaxed">{renderContent(msg.content)}</p>
                    <p className="text-[8px] opacity-50 mt-0.5">{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</p>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-border p-2">
          <div className="px-2 py-1.5 bg-input border border-border rounded-lg focus-within:ring-1 focus-within:ring-ring">
            <MentionInput
              orgMembers={chatMembers}
              onSubmit={handleSend}
              isSubmitting={isSending}
              placeholder="Message..."
            />
          </div>
        </div>
      </div>
    );
  }

  // Original floating mode
  return (
    <>
      {/* Toggle button - always visible */}
      <button
        onClick={onToggle}
        className={`fixed right-0 top-1/2 -translate-y-1/2 z-30 flex items-center gap-1 px-1.5 py-3 rounded-l-lg border border-r-0 border-border transition-all ${
          isOpen ? 'bg-card hover:bg-secondary' : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg'
        }`}
        title={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? (
          <ChevronRight className="w-4 h-4" />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <MessageSquare className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
        )}
      </button>

      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="fixed right-0 top-0 bottom-0 z-20 bg-card border-l border-border flex flex-col shadow-xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-semibold">Project Chat</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
                  {messages.length}
                </span>
              </div>
              <button onClick={onToggle} className="p-1 rounded-lg hover:bg-secondary text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Online members strip */}
            {chatMembers.length > 0 && (
              <div className="px-4 py-2 border-b border-border/50 flex items-center gap-1 overflow-x-auto">
                {chatMembers.slice(0, 8).map(m => (
                  <div key={m.id} title={m.full_name || 'Member'} className="flex-shrink-0">
                    {m.avatar_url ? (
                      <img src={m.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover ring-2 ring-border" />
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center ring-2 ring-border">
                        <span className="text-[9px] font-medium text-primary">{m.full_name?.[0] || '?'}</span>
                      </div>
                    )}
                  </div>
                ))}
                {chatMembers.length > 8 && (
                  <span className="text-[10px] text-muted-foreground ml-1">+{chatMembers.length - 8}</span>
                )}
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 text-muted-foreground/20" />
                  <p className="text-xs text-muted-foreground">No messages yet</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">Start the conversation!</p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.sender_id === profileId;
                  return (
                    <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
                      {!isMe && (
                        msg.profiles.avatar_url ? (
                          <img src={msg.profiles.avatar_url} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-1" />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
                            <User className="w-3 h-3 text-primary" />
                          </div>
                        )
                      )}
                      <div className={`max-w-[80%] px-3 py-2 rounded-2xl ${
                        isMe
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-secondary rounded-bl-md'
                      }`}>
                        {!isMe && (
                          <p className="text-[10px] font-medium opacity-70 mb-0.5">{msg.profiles.full_name || 'User'}</p>
                        )}
                        <p className="text-xs leading-relaxed">{renderContent(msg.content)}</p>
                        <p className="text-[9px] opacity-50 mt-1">{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</p>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-3">
              <div className="px-3 py-2 bg-input border border-border rounded-lg focus-within:ring-1 focus-within:ring-ring">
                <MentionInput
                  orgMembers={chatMembers}
                  onSubmit={handleSend}
                  isSubmitting={isSending}
                  placeholder="Message... @ to mention"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
