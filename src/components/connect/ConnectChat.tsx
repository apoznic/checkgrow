import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Sparkles, UserPlus, RotateCcw } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

type Msg = { role: 'user' | 'assistant'; content: string };

interface MatchSuggestion {
  profile_id: string;
  reason: string;
  preview_label: string;
}

interface Props {
  profileId: string;
  onConnect: () => void;
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/connect-matchmaker`;

const STORAGE_KEY = 'checkgrow_connect_chat';
const MATCHES_KEY = 'checkgrow_connect_matches';

export function ConnectChat({ profileId, onConnect }: Props) {
  const { toast } = useToast();
  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [matches, setMatches] = useState<MatchSuggestion[]>(() => {
    try {
      const saved = sessionStorage.getItem(MATCHES_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persist to sessionStorage
  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    sessionStorage.setItem(MATCHES_KEY, JSON.stringify(matches));
  }, [matches]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-start conversation only if no history
  useEffect(() => {
    if (messages.length === 0) {
      sendToAI([]);
    }
  }, []);

  const sendToAI = async (conversationMessages: Msg[]) => {
    setIsLoading(true);
    let assistantSoFar = '';
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast({ title: 'Please sign in again', description: 'Your session has expired.', variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({ messages: conversationMessages, profileId }),
      });

      if (!resp.ok || !resp.body) {
        if (resp.status === 401) {
          toast({ title: 'Please sign in again', description: 'Your session is no longer valid.', variant: 'destructive' });
        } else if (resp.status === 429) {
          toast({ title: 'Too many requests', description: 'Please wait a moment.', variant: 'destructive' });
        } else if (resp.status === 402) {
          toast({ title: 'Credits exhausted', variant: 'destructive' });
        } else {
          toast({ title: 'Error connecting to AI', variant: 'destructive' });
        }
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let toolCallArgs = '';
      let isToolCall = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;
            
            // Handle tool calls
            if (delta?.tool_calls) {
              isToolCall = true;
              for (const tc of delta.tool_calls) {
                if (tc.function?.arguments) {
                  toolCallArgs += tc.function.arguments;
                }
              }
              continue;
            }

            const content = delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant') {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                }
                return [...prev, { role: 'assistant', content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Process tool call results
      if (isToolCall && toolCallArgs) {
        try {
          const toolData = JSON.parse(toolCallArgs);
          if (toolData.matches) {
            setMatches(toolData.matches);
          }
        } catch (e) {
          console.error('Failed to parse tool call:', e);
        }
      }
    } catch (e) {
      console.error('Stream error:', e);
      toast({ title: 'Connection error', variant: 'destructive' });
    }

    setIsLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    const userMsg: Msg = { role: 'user', content: input.trim() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setMatches([]);
    await sendToAI(updated);
  };

  const handleConnectRequest = async (targetId: string) => {
    setConnectingId(targetId);
    const { error } = await (supabase.from('connect_requests' as any) as any).insert({
      sender_profile_id: profileId,
      receiver_profile_id: targetId,
      status: 'pending',
    });

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Already sent!' });
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ title: 'Connection request sent! 🤝', description: 'They\'ll see it in their Messages tab.' });
    }
    setConnectingId(null);
  };

  return (
    <div className="bg-card border border-border rounded-2xl flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent/20 to-primary/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-accent" />
        </div>
        <div className="flex-1">
          <h2 className="font-semibold text-sm">CheckGrow Matchmaker</h2>
          <p className="text-xs text-muted-foreground">Tell me what kind of connections you're looking for</p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => {
              sessionStorage.removeItem(STORAGE_KEY);
              sessionStorage.removeItem(MATCHES_KEY);
              setMessages([]);
              setMatches([]);
              setTimeout(() => sendToAI([]), 100);
            }}
            disabled={isLoading}
            className="p-2 rounded-lg hover:bg-secondary/50 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
            title="New conversation"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-md'
                    : 'bg-secondary/70 text-foreground rounded-bl-md'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert [&>p]:mb-2 [&>p:last-child]:mb-0">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-secondary/70">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* Match cards */}
        {matches.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-2"
          >
            <p className="text-xs font-medium text-muted-foreground px-1">Suggested matches:</p>
            {matches.map((match, i) => (
              <motion.div
                key={match.profile_id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-accent/5 border border-accent/20 rounded-xl p-3.5 flex items-center gap-3"
              >
                <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-accent">
                  {match.preview_label[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{match.preview_label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{match.reason}</p>
                </div>
                <button
                  onClick={() => handleConnectRequest(match.profile_id)}
                  disabled={connectingId === match.profile_id}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
                >
                  {connectingId === match.profile_id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <UserPlus className="w-3 h-3" />
                  )}
                  Connect
                </button>
              </motion.div>
            ))}
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Tell me what kind of people you'd like to meet..."
            disabled={isLoading}
            className="flex-1 bg-secondary/50 border border-border/30 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="p-2.5 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          {['Someone from a different city', 'A designer to collaborate with', 'Surprise me!'].map(suggestion => (
            <button
              key={suggestion}
              onClick={() => { setInput(suggestion); inputRef.current?.focus(); }}
              disabled={isLoading}
              className="text-[11px] px-2.5 py-1 rounded-full bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors disabled:opacity-50"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
