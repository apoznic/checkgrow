import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Building2, Users, ChevronDown, Sparkles, TrendingUp, Workflow, Share2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

const LINKS = [
  { label: 'Email', href: 'https://email.projektkut.hr', Icon: Mail },
  { label: 'Kolektiv', href: 'https://kolektiv.io', Icon: Building2 },
  { label: 'CRM', href: 'https://crm.projektkut.hr', Icon: Users },
  { label: 'CheckGrow', href: 'https://ai.checkgrow.com/signin', Icon: TrendingUp },
  { label: 'Social', href: 'https://social.projektkut.hr', Icon: Share2 },
  { label: 'n8n', href: 'https://n8n.projektkut.hr/home/workflows', Icon: Workflow },
];


const STORAGE_KEY = 'kut_quicklinks_minimized';

export function KutQuickLinks() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [minimized, setMinimized] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  });

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setShow(false);
      return;
    }
    (async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled || !profile?.id) return;
      const { data } = await supabase
        .from('cluster_enrollments')
        .select('status, clusters!inner(name)')
        .eq('profile_id', profile.id)
        .eq('status', 'approved' as any);
      if (cancelled) return;
      const isKut = (data || []).some((r: any) =>
        (r.clusters?.name || '').toLowerCase().includes('kut')
      );
      setShow(isKut);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggleMinimized = () => {
    setMinimized((m) => {
      const next = !m;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
      } catch {}
      return next;
    });
  };

  if (!show) return null;

  const glassStyle: React.CSSProperties = {
    background:
      'linear-gradient(135deg, hsl(var(--primary) / 0.18), hsl(var(--primary) / 0.06))',
    boxShadow:
      '0 10px 40px -10px hsl(var(--primary) / 0.35), inset 0 1px 0 hsl(0 0% 100% / 0.35)',
  };

  return (
    <div
      className="fixed z-[60] pointer-events-none left-1/2 -translate-x-1/2 bottom-[max(1rem,env(safe-area-inset-bottom))] sm:bottom-6"
      style={{ maxWidth: 'calc(100vw - 1.5rem)' }}
    >
      <AnimatePresence mode="wait" initial={false}>
        {minimized ? (
          <motion.button
            key="mini"
            type="button"
            onClick={toggleMinimized}
            aria-label="Show KUT menu"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            className="pointer-events-auto flex items-center justify-center w-12 h-12 rounded-full border border-white/30 backdrop-blur-2xl text-foreground/85 hover:text-foreground hover:scale-105 active:scale-95 transition-transform"
            style={glassStyle}
          >
            <Sparkles className="w-5 h-5" strokeWidth={1.75} />
          </motion.button>
        ) : (
          <motion.div
            key="full"
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="pointer-events-auto flex items-center gap-1 px-1.5 py-1.5 sm:px-2 sm:py-2 rounded-full border border-white/30 backdrop-blur-2xl"
            style={glassStyle}
          >
            {LINKS.map(({ label, href, Icon }) => (
              <a
                key={href}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col items-center justify-center gap-0.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-foreground/85 hover:text-foreground hover:bg-white/25 transition-all"
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" strokeWidth={1.75} />
                <span className="text-[10px] font-medium tracking-wide">{label}</span>
              </a>
            ))}
            <button
              type="button"
              onClick={toggleMinimized}
              aria-label="Minimize menu"
              className="ml-0.5 flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-full text-foreground/70 hover:text-foreground hover:bg-white/25 transition-all"
            >
              <ChevronDown className="w-4 h-4" strokeWidth={2} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
