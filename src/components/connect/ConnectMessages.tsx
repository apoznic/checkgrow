import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Check, X, UserPlus, ArrowLeft, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Thread {
  id: string;
  other_profile_id: string;
  other_name: string;
  other_avatar: string | null;
  last_message?: string;
  last_at?: string;
  unread: number;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
}

interface PendingRequest {
  id: string;
  sender_profile_id: string;
  sender_name: string;
  sender_avatar: string | null;
  message: string | null;
  created_at: string;
}

interface Props {
  profileId: string;
}

export function ConnectMessages({ profileId }: Props) {
  const { toast } = useToast();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [selectedThread, setSelectedThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, [profileId]);

  useEffect(() => {
    if (!selectedThread) return;
    loadMessages(selectedThread.id);

    const channel = supabase
      .channel(`dm-${selectedThread.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'dm_messages',
        filter: `thread_id=eq.${selectedThread.id}`,
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedThread?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadData = async () => {
    const [threadsRes, requestsRes] = await Promise.all([
      supabase.from('dm_threads' as any).select('*').or(`participant_1.eq.${profileId},participant_2.eq.${profileId}`),
      supabase.from('connect_requests' as any).select('*').eq('receiver_profile_id', profileId).eq('status', 'pending'),
    ]);

    const threadData = (threadsRes.data || []) as any[];
    const requestData = (requestsRes.data || []) as any[];

    // Get all profile IDs we need
    const profileIds = new Set<string>();
    threadData.forEach(t => {
      profileIds.add(t.participant_1 === profileId ? t.participant_2 : t.participant_1);
    });
    requestData.forEach(r => profileIds.add(r.sender_profile_id));

    const ids = Array.from(profileIds);
    let profileMap: Record<string, any> = {};
    if (ids.length > 0) {
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', ids);
      (profilesData || []).forEach(p => { profileMap[p.id] = p; });
    }

    // Build threads
    const enrichedThreads: Thread[] = threadData.map(t => {
      const otherId = t.participant_1 === profileId ? t.participant_2 : t.participant_1;
      const other = profileMap[otherId];
      return {
        id: t.id,
        other_profile_id: otherId,
        other_name: other?.full_name || 'Anonymous',
        other_avatar: other?.avatar_url || null,
        unread: 0,
      };
    });

    // Build pending requests
    const enrichedRequests: PendingRequest[] = requestData.map(r => ({
      id: r.id,
      sender_profile_id: r.sender_profile_id,
      sender_name: profileMap[r.sender_profile_id]?.full_name || 'Anonymous',
      sender_avatar: profileMap[r.sender_profile_id]?.avatar_url || null,
      message: r.message,
      created_at: r.created_at,
    }));

    setThreads(enrichedThreads);
    setPendingRequests(enrichedRequests);
    setLoading(false);
  };

  const loadMessages = async (threadId: string) => {
    const { data } = await (supabase.from('dm_messages' as any) as any)
      .select('*')
      .eq('thread_id', threadId)
      .order('created_at', { ascending: true });
    setMessages((data || []) as Message[]);

    // Mark unread as read
    await (supabase.from('dm_messages' as any) as any)
      .update({ is_read: true })
      .eq('thread_id', threadId)
      .neq('sender_id', profileId)
      .eq('is_read', false);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedThread) return;
    setSending(true);

    await (supabase.from('dm_messages' as any) as any).insert({
      thread_id: selectedThread.id,
      sender_id: profileId,
      content: newMessage.trim(),
    });

    // Update thread timestamp
    await (supabase.from('dm_threads' as any) as any)
      .update({ updated_at: new Date().toISOString() })
      .eq('id', selectedThread.id);

    setNewMessage('');
    setSending(false);
  };

  const handleRespond = async (requestId: string, accept: boolean, senderProfileId: string) => {
    setRespondingId(requestId);

    await (supabase.from('connect_requests' as any) as any)
      .update({ status: accept ? 'accepted' : 'rejected', responded_at: new Date().toISOString() })
      .eq('id', requestId);

    if (accept) {
      // Create DM thread
      const ids = [profileId, senderProfileId].sort();
      await (supabase.from('dm_threads' as any) as any).insert({
        participant_1: ids[0],
        participant_2: ids[1],
      });
      toast({ title: 'Connected! 🤝', description: 'You can now message each other.' });
    } else {
      toast({ title: 'Request declined' });
    }

    setPendingRequests(prev => prev.filter(r => r.id !== requestId));
    if (accept) loadData();
    setRespondingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Chat view
  if (selectedThread) {
    return (
      <div className="bg-card border border-border rounded-2xl flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>
        {/* Chat header */}
        <div className="flex items-center gap-3 p-4 border-b border-border">
          <button onClick={() => setSelectedThread(null)} className="p-1.5 rounded-lg hover:bg-secondary/50 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          {selectedThread.other_avatar ? (
            <img src={selectedThread.other_avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
              {selectedThread.other_name[0]}
            </div>
          )}
          <p className="font-medium text-sm">{selectedThread.other_name}</p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <p className="text-center text-sm text-muted-foreground py-10">
              Say hello! Start the conversation. 👋
            </p>
          )}
          {messages.map(msg => {
            const isMine = msg.sender_id === profileId;
            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[70%] px-3.5 py-2 rounded-2xl text-sm ${
                    isMine
                      ? 'bg-primary text-primary-foreground rounded-br-md'
                      : 'bg-secondary text-secondary-foreground rounded-bl-md'
                  }`}
                >
                  {msg.content}
                  <p className={`text-[10px] mt-1 ${isMine ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-border">
          <div className="flex gap-2">
            <input
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Type a message..."
              className="flex-1 bg-secondary/50 border border-border/30 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <button
              onClick={handleSend}
              disabled={!newMessage.trim() || sending}
              className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-4">
      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-accent" />
            Connection Requests ({pendingRequests.length})
          </h3>
          <div className="space-y-2">
            {pendingRequests.map(req => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 p-3 bg-accent/5 border border-accent/20 rounded-xl"
              >
                {req.sender_avatar ? (
                  <img src={req.sender_avatar} alt="" className="w-10 h-10 rounded-lg object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground">
                    {req.sender_name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{req.sender_name}</p>
                  <p className="text-xs text-muted-foreground">wants to connect</p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => handleRespond(req.id, true, req.sender_profile_id)}
                    disabled={respondingId === req.id}
                    className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleRespond(req.id, false, req.sender_profile_id)}
                    disabled={respondingId === req.id}
                    className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors disabled:opacity-50"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Threads */}
      <div>
        <h3 className="text-sm font-semibold mb-2">Conversations</h3>
        {threads.length === 0 ? (
          <div className="text-center py-16">
            <MessageCircle className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No conversations yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Connect with someone to start chatting!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {threads.map(thread => (
              <button
                key={thread.id}
                onClick={() => setSelectedThread(thread)}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors text-left"
              >
                {thread.other_avatar ? (
                  <img src={thread.other_avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                    {thread.other_name[0]}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{thread.other_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {thread.last_message || 'Start chatting...'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
