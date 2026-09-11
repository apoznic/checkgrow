import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Printer, Trash2, ArrowLeft, Loader2 } from 'lucide-react';
import { SEO } from '@/components/SEO';
import { EditableText } from '@/components/plan/EditableText';
import { PlanAccessGate } from '@/components/plan/PlanAccessGate';
import { supabase } from '@/integrations/supabase/client';
import { WBS_SEED, buildWeeks, isoWeek } from '@/data/planWbsSeed';

const PLAN_KEY = 'grg-mica-wbs';

interface Row {
  id: string;
  sort_order: number;
  data: {
    code?: string;
    task?: string;
    owner?: string;
    comment?: string;
    weeks?: number[];
  };
}

const isHeading = (code?: string) => !!code && /^\d+\.$/.test(code.trim());

function useWbs() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('plan_items')
      .select('id, sort_order, data')
      .eq('plan_key', PLAN_KEY)
      .order('sort_order');
    setRows((data as Row[]) ?? []);
    return (data ?? []).length;
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id ?? null;
      if (!active) return;
      setUserId(uid);
      const count = await load();
      if (count === 0 && uid) {
        await supabase.from('plan_items').insert(
          WBS_SEED.map((r, i) => ({
            plan_key: PLAN_KEY,
            section: 'wbs',
            sort_order: i,
            data: { code: r.code, task: r.task, owner: r.owner, comment: r.comment ?? '', weeks: r.weeks ?? [] },
          })) as any
        );
        await load();
      }
      if (active) setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [load]);

  const update = async (row: Row, patch: Partial<Row['data']>) => {
    const next = { ...row.data, ...patch };
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, data: next } : r)));
    await supabase.from('plan_items').update({ data: next } as any).eq('id', row.id);
  };

  const add = async (afterSort: number) => {
    await supabase.from('plan_items').insert({
      plan_key: PLAN_KEY,
      section: 'wbs',
      sort_order: afterSort + 0.5,
      data: { code: '', task: 'New task', owner: '', comment: '', weeks: [] },
    } as any);
    await load();
  };

  const remove = async (row: Row) => {
    await supabase.from('plan_items').delete().eq('id', row.id);
    setRows((prev) => prev.filter((r) => r.id !== row.id));
  };

  return { rows, loading, canEdit: !!userId, update, add, remove };
}

function PlanWBSInner() {
  const { rows, loading, canEdit, update, add, remove } = useWbs();
  const weeks = useMemo(() => buildWeeks(), []);
  const currentIso = isoWeek(new Date());
  const currentYear = new Date().getFullYear();

  const monthGroups = useMemo(() => {
    const groups: { label: string; span: number }[] = [];
    weeks.forEach((w) => {
      const last = groups[groups.length - 1];
      if (last && last.label === w.monthLabel) last.span += 1;
      else groups.push({ label: w.monthLabel, span: 1 });
    });
    return groups;
  }, [weeks]);

  const toggleWeek = (row: Row, index: number) => {
    const set = new Set(row.data.weeks ?? []);
    if (set.has(index)) set.delete(index);
    else set.add(index);
    update(row, { weeks: [...set].sort((a, b) => a - b) });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="GRG · MiCA work plan (WBS)"
        description="Week-by-week work breakdown structure for the GRG MiCA (CASP) authorisation dossier."
        path="/plan/grg-mica-wbs"
        image="/og/plan.jpg"
      />

      <header className="border-b border-border/60 print:border-none">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center gap-3 justify-between">
          <div>
            <h1 className="text-lg sm:text-xl font-semibold">GRG · MiCA — work plan</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Work breakdown structure, responsibilities and weekly schedule (Jul 2026 – Feb 2027)
            </p>
          </div>
          <div className="flex items-center gap-2 print:hidden">
            <Link
              to="/plan/grg-mica"
              className="h-9 px-3 rounded-full border border-border text-xs flex items-center gap-1.5 hover:bg-secondary/60"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Milestone plan
            </Link>
            <button
              onClick={() => window.print()}
              className="h-9 px-3 rounded-full border border-border text-xs flex items-center gap-1.5 hover:bg-secondary/60"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-2 sm:px-6 py-6">
        {loading ? (
          <div className="py-24 flex justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border/60">
            <table className="text-[11px] border-collapse min-w-max">
              <thead>
                <tr className="bg-secondary/60">
                  <th rowSpan={2} className="sticky left-0 z-10 bg-secondary/60 border-r border-border/60 px-2 py-1.5 text-left font-medium w-14">
                    No.
                  </th>
                  <th rowSpan={2} className="border-r border-border/60 px-2 py-1.5 text-left font-medium min-w-[280px]">
                    Main topic
                  </th>
                  <th rowSpan={2} className="border-r border-border/60 px-2 py-1.5 text-left font-medium min-w-[180px]">
                    Responsible
                  </th>
                  {monthGroups.map((g) => (
                    <th
                      key={g.label}
                      colSpan={g.span}
                      className="border-l border-border/60 px-1 py-1 text-center font-medium whitespace-nowrap"
                    >
                      {g.label}
                    </th>
                  ))}
                  <th rowSpan={2} className="border-l border-border/60 px-2 py-1.5 text-left font-medium min-w-[200px]">
                    Comment
                  </th>
                  {canEdit && <th rowSpan={2} className="px-1 print:hidden" />}
                </tr>
                <tr className="bg-secondary/40">
                  {weeks.map((w) => (
                    <th
                      key={w.index}
                      className={`border-l border-border/40 px-1 py-1 text-[9px] font-normal text-muted-foreground w-6 ${
                        w.iso === currentIso && w.date.getUTCFullYear() === currentYear ? 'bg-primary/20 text-foreground' : ''
                      }`}
                    >
                      {w.iso}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const heading = isHeading(row.data.code);
                  return (
                    <tr
                      key={row.id}
                      className={heading ? 'bg-primary/10 font-semibold' : 'hover:bg-secondary/30 border-t border-border/40'}
                    >
                      <td className={`sticky left-0 z-10 border-r border-border/60 px-2 py-1 align-top ${heading ? 'bg-primary/10' : 'bg-background'}`}>
                        <EditableText
                          value={row.data.code ?? ''}
                          canEdit={canEdit}
                          onSave={(v) => update(row, { code: v })}
                          placeholder="—"
                        />
                      </td>
                      <td className="border-r border-border/60 px-2 py-1 align-top">
                        <EditableText
                          value={row.data.task ?? ''}
                          canEdit={canEdit}
                          onSave={(v) => update(row, { task: v })}
                        />
                      </td>
                      <td className="border-r border-border/60 px-2 py-1 align-top text-muted-foreground">
                        <EditableText
                          value={row.data.owner ?? ''}
                          canEdit={canEdit}
                          onSave={(v) => update(row, { owner: v })}
                          placeholder="—"
                        />
                      </td>
                      {weeks.map((w) => {
                        const marked = (row.data.weeks ?? []).includes(w.index);
                        return (
                          <td key={w.index} className="border-l border-border/40 p-0 text-center">
                            <button
                              type="button"
                              disabled={!canEdit}
                              onClick={() => toggleWeek(row, w.index)}
                              className={`w-full h-6 leading-none ${marked ? 'bg-primary/70' : ''} ${
                                canEdit ? 'hover:bg-primary/30' : ''
                              } transition-colors`}
                              aria-label={`Week ${w.iso} for ${row.data.task}`}
                            >
                              {marked && <span className="text-[9px] text-primary-foreground">x</span>}
                            </button>
                          </td>
                        );
                      })}
                      <td className="border-l border-border/60 px-2 py-1 align-top text-muted-foreground">
                        <EditableText
                          value={row.data.comment ?? ''}
                          canEdit={canEdit}
                          onSave={(v) => update(row, { comment: v })}
                          placeholder="—"
                        />
                      </td>
                      {canEdit && (
                        <td className="px-1 align-top print:hidden">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => add(row.sort_order)}
                              className="p-1 text-muted-foreground hover:text-primary"
                              aria-label="Add row below"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => remove(row)}
                              className="p-1 text-muted-foreground hover:text-destructive"
                              aria-label="Delete row"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] text-muted-foreground mt-4 print:hidden">
          Click any cell to edit. Click a week square to mark or unmark work in that week. Rows numbered like “1.” are
          section headings.
        </p>
      </main>
    </div>
  );
}

export default function PlanWBS() {
  return (
    <PlanAccessGate>
      <PlanWBSInner />
    </PlanAccessGate>
  );
}
