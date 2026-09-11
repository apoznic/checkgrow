import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { MILESTONES, GANTT, DELEGATION, RISKS } from '@/data/planGrgSeed';

export type PlanSection = 'milestone' | 'gantt' | 'delegation' | 'risk' | 'team';

// People whose edits are not tracked in the change history
const UNTRACKED = [/adrian\s*pozni/i];

export interface PlanItem {
  id: string;
  section: PlanSection;
  sort_order: number;
  status: string;
  data: Record<string, any>;
  updated_by_name: string | null;
  updated_at: string;
}

export interface PlanRevision {
  id: string;
  item_label: string | null;
  field: string;
  old_value: string | null;
  new_value: string | null;
  changed_by_name: string | null;
  created_at: string;
}

export function usePlanItems(planKey: string) {
  const [items, setItems] = useState<PlanItem[]>([]);
  const [revisions, setRevisions] = useState<PlanRevision[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('Someone');

  const load = useCallback(async () => {
    const [{ data: rows, error }, { data: revs }] = await Promise.all([
      supabase.from('plan_items').select('*').eq('plan_key', planKey).order('sort_order'),
      supabase
        .from('plan_item_revisions')
        .select('*')
        .eq('plan_key', planKey)
        .order('created_at', { ascending: false })
        .limit(60),
    ]);
    if (!error) setItems((rows as PlanItem[]) ?? []);
    setRevisions((revs as PlanRevision[]) ?? []);
    return { count: (rows ?? []).length, error };
  }, [planKey]);

  const seed = useCallback(async () => {
    const rows = [
      ...MILESTONES.map((m, i) => ({
        plan_key: planKey,
        section: 'milestone',
        sort_order: i,
        data: { code: m.id, period: m.period, title: m.title, body: m.body, owner: m.owner },
      })),
      ...GANTT.map((g, i) => ({
        plan_key: planKey,
        section: 'gantt',
        sort_order: i,
        data: { label: g.label, cells: g.cells },
      })),
      ...DELEGATION.map((d, i) => ({
        plan_key: planKey,
        section: 'delegation',
        sort_order: i,
        data: { pkg: d.pkg, owner: d.owner, support: d.support },
      })),
      ...RISKS.map((r, i) => ({
        plan_key: planKey,
        section: 'risk',
        sort_order: i,
        data: { text: r },
      })),
    ];
    await supabase.from('plan_items').insert(rows as any);
  }, [planKey]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      if (!active) return;
      setUserId(uid);
      if (uid) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', uid)
          .maybeSingle();
        if (active) setUserName(profile?.full_name || auth.user?.email || 'Someone');
      }
      const { count, error } = await load();
      if (count === 0 && !error && uid) {
        await seed();
        await load();
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [load, seed]);

  useEffect(() => {
    const channel = supabase
      .channel(`plan-${planKey}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plan_items' }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [planKey, load]);

  const isUntracked = UNTRACKED.some((re) => re.test(userName));

  const logRevision = async (
    itemId: string | null,
    itemLabel: string,
    field: string,
    oldValue: string,
    newValue: string
  ) => {
    if (isUntracked) return;
    await supabase.from('plan_item_revisions').insert({
      plan_key: planKey,
      item_id: itemId,
      item_label: itemLabel,
      field,
      old_value: oldValue?.slice(0, 500) ?? null,
      new_value: newValue?.slice(0, 500) ?? null,
      changed_by: userId,
      changed_by_name: userName,
    } as any);
  };

  const attribution = isUntracked ? null : userName;

  const updateField = async (item: PlanItem, field: string, value: any, label: string, fieldLabel?: string) => {
    const nextData = { ...item.data, [field]: value };
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, data: nextData, updated_by_name: attribution } : i)));
    await supabase
      .from('plan_items')
      .update({ data: nextData, updated_by: userId, updated_by_name: attribution } as any)
      .eq('id', item.id);
    await logRevision(
      item.id,
      label,
      fieldLabel ?? field,
      typeof item.data[field] === 'string' ? item.data[field] : JSON.stringify(item.data[field] ?? ''),
      typeof value === 'string' ? value : JSON.stringify(value)
    );
    await load();
  };

  const updateStatus = async (item: PlanItem, status: string, label: string) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, status, updated_by_name: attribution } : i)));
    await supabase
      .from('plan_items')
      .update({ status, updated_by: userId, updated_by_name: attribution } as any)
      .eq('id', item.id);
    await logRevision(item.id, label, 'status', item.status, status);
    await load();
  };

  const addItem = async (section: PlanSection, data: Record<string, any>, label: string) => {
    const sortOrder = items.filter((i) => i.section === section).length;
    const { data: inserted } = await supabase
      .from('plan_items')
      .insert({
        plan_key: planKey,
        section,
        sort_order: sortOrder,
        data,
        updated_by: userId,
        updated_by_name: attribution,
      } as any)
      .select()
      .maybeSingle();
    if (inserted) await logRevision((inserted as any).id, label, 'created', '', label);
    await load();
  };

  const removeItem = async (item: PlanItem, label: string) => {
    await logRevision(null, label, 'deleted', label, '');
    await supabase.from('plan_items').delete().eq('id', item.id);
    await load();
  };

  return {
    items,
    revisions,
    loading,
    canEdit: !!userId,
    userName,
    updateField,
    updateStatus,
    addItem,
    removeItem,
    reload: load,
  };
}
