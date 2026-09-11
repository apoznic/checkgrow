import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Subscribe to realtime changes on one or more project-scoped tables and invoke
 * the callback whenever any change occurs. Filters by `project_id=eq.{projectId}`.
 */
export function useProjectTableRealtime(
  tables: string[],
  projectId: string | null | undefined,
  onChange: () => void,
) {
  useEffect(() => {
    if (!projectId) return;
    const channel = supabase.channel(`pt-rt-${projectId}-${tables.join('-')}-${Math.random().toString(36).slice(2, 7)}`);
    tables.forEach((table) => {
      (channel as any).on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `project_id=eq.${projectId}` },
        () => onChange(),
      );
    });
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, tables.join('|')]);
}
