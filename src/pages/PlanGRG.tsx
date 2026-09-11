import { useState } from 'react';
import {
  Printer,
  Link2,
  Check,
  CalendarDays,
  AlertTriangle,
  Plus,
  Trash2,
  History,
  Pencil,
  Lock,
  Circle,
  CircleDashed,
  CheckCircle2,
} from 'lucide-react';
import { SEO } from '@/components/SEO';
import { EditableText } from '@/components/plan/EditableText';
import { usePlanItems, type PlanItem } from '@/hooks/usePlanItems';
import { MONTHS, type Phase } from '@/data/planGrgSeed';
import { PlanAccessGate } from '@/components/plan/PlanAccessGate';
import { PlanClock, currentMonthIndex } from '@/components/plan/PlanClock';

const PLAN_KEY = 'grg-mica';

const cellClass: Record<Phase, string> = {
  work: 'bg-primary/80',
  buffer: 'bg-primary/30',
  event: 'bg-transparent',
  target: 'bg-transparent',
};

const PHASE_CYCLE: (Phase | null)[] = [null, 'work', 'buffer', 'event', 'target'];

const STATUS_CYCLE = ['not_started', 'in_progress', 'done'] as const;
const STATUS_META: Record<string, { label: string; icon: typeof Circle; className: string }> = {
  not_started: { label: 'Not started', icon: Circle, className: 'text-muted-foreground bg-secondary/50' },
  in_progress: { label: 'In progress', icon: CircleDashed, className: 'text-primary bg-primary/15' },
  done: { label: 'Done', icon: CheckCircle2, className: 'text-emerald-500 bg-emerald-500/15' },
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

const UNTRACKED_NAMES = [/adrian\s*pozni/i];

function isUntrackedName(name: string | null) {
  if (!name) return false;
  return UNTRACKED_NAMES.some((re) => re.test(name));
}

function EditedBy({ item }: { item: PlanItem }) {
  if (!item.updated_by_name || isUntrackedName(item.updated_by_name)) return null;
  return (
    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
      <Pencil className="w-3 h-3" />
      {item.updated_by_name} · {timeAgo(item.updated_at)}
    </span>
  );
}

const DEFAULT_TEAMS = [
  { name: 'Management Board', members: '' },
  { name: 'Legal/Compliance', members: 'Matija, Josip' },
  { name: 'Analytics', members: '' },
  { name: 'Risk', members: '' },
  { name: 'IT / InfoSec', members: '' },
  { name: 'AML officer', members: '' },
  { name: 'Advisory (outside regulated structure)', members: 'F. Šaravanja' },
];

function PlanGRGContent() {
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const { items, revisions: rawRevisions, loading, canEdit, updateField, updateStatus, addItem, removeItem } =
    usePlanItems(PLAN_KEY);

  const revisions = rawRevisions.filter((r) => !isUntrackedName(r.changed_by_name));

  const milestones = items.filter((i) => i.section === 'milestone');
  const gantt = items.filter((i) => i.section === 'gantt');
  const delegation = items.filter((i) => i.section === 'delegation');
  const teams = items.filter((i) => i.section === 'team');
  const risks = items.filter((i) => i.section === 'risk');
  const nowMonthIdx = currentMonthIndex(new Date());

  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cycleCell = (item: PlanItem, index: number) => {
    const cells: (Phase | null)[] = [...(item.data.cells ?? [])];
    const current = cells[index] ?? null;
    const next = PHASE_CYCLE[(PHASE_CYCLE.indexOf(current) + 1) % PHASE_CYCLE.length];
    cells[index] = next;
    updateField(item, 'cells', cells, item.data.label ?? 'Timeline row', `timeline · ${MONTHS[index]}`);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="GRG · MiCA (CASP) project plan — timeline and milestones"
        description="Live project plan for preparing the application dossier for HANFA: milestones M0–M7, timeline Jul 2026 – Feb 2027, task delegation and critical points."
        path="/plan/grg-mica"
        image="/og/plan.jpg"
      />

      {/* Action bar */}
      <div className="sticky top-0 z-40 border-b border-border/40 bg-background/85 backdrop-blur-xl print:hidden">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3 px-4 sm:px-6 h-14">
          <span className="text-sm font-medium truncate">GRG · MiCA (CASP) — project plan</span>
          <div className="flex items-center gap-2">
            <span
              className={`hidden md:flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full ${
                canEdit ? 'bg-primary/15 text-primary' : 'bg-secondary/60 text-muted-foreground'
              }`}
            >
              {canEdit ? <Pencil className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              {canEdit ? 'Editing enabled' : 'Read-only'}
            </span>
            <button
              onClick={() => setShowHistory((s) => !s)}
              className="flex items-center gap-1.5 text-xs sm:text-sm px-3 py-2 rounded-full border border-border hover:bg-secondary/60 transition-colors"
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">History</span>
            </button>
            <button
              onClick={copyLink}
              className="flex items-center gap-1.5 text-xs sm:text-sm px-3 py-2 rounded-full border border-border hover:bg-secondary/60 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Link2 className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy link'}</span>
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 text-xs sm:text-sm px-3 py-2 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">PDF / Print</span>
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-12">
        {/* Header */}
        <header className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Golden Ratio Consultancy d.o.o.</p>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight">MiCA (CASP) — milestones and timeline</h1>
          <p className="text-muted-foreground max-w-2xl">
            Plan for preparing the application dossier for HANFA. Internal working document — not legal advice.
            {canEdit
              ? ' Click any text to edit it; every change is attributed to you and logged in the history.'
              : ' Sign in to the workspace to edit this plan.'}
          </p>
        </header>

        <PlanClock milestones={milestones} />

        {loading && <p className="text-sm text-muted-foreground">Loading plan…</p>}

        {/* Baseline */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">1. Baseline</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { k: 'Scope', v: 'Exchange of crypto-assets for funds and for other crypto-assets (Class 2, Annex IV)' },
              { k: 'Capital requirement', v: 'EUR 125,000 on an ongoing basis' },
              { k: 'Target decision', v: 'January / February 2027' },
            ].map((c) => (
              <div key={c.k} className="glass-panel p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">{c.k}</p>
                <p className="text-sm">{c.v}</p>
              </div>
            ))}
          </div>
          <div className="glass-panel overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-border/50">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-4">
                Statutory deadlines (Art. 63 MiCA)
              </p>
              <div className="space-y-1">
                {[
                  { k: 'Acknowledgement of receipt', v: '5 working days' },
                  { k: 'Completeness check', v: '25 working days' },
                  { k: 'Substantive assessment', v: '40 (exceptionally 60) working days from confirmation of completeness' },
                  { k: 'Request for additional information', v: 'suspends the assessment for up to 20 working days' },
                ].map((d, i, arr) => (
                  <div key={d.k} className="group flex items-start gap-4 py-3 border-b border-border/30 last:border-0">
                    <div className="flex flex-col items-center pt-0.5">
                      <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {i + 1}
                      </span>
                      {i < arr.length - 1 && (
                        <span className="w-px flex-1 min-h-[20px] bg-border/50 my-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{d.k}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">{d.v}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-4 sm:p-5 space-y-3">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">The arithmetic</p>
              <div className="flex flex-wrap items-center gap-2 text-sm">
                {['Submission early Oct 2026', 'Completeness ~ mid-Nov 2026', 'Decision ~ mid-Jan 2027'].map((s, i) => (
                  <span key={s} className="flex items-center gap-2">
                    {i > 0 && <span className="text-muted-foreground">→</span>}
                    <span className="px-2.5 py-1 rounded-full bg-secondary/60 font-medium">{s}</span>
                  </span>
                ))}
              </div>
              <p className="text-muted-foreground">
                With one round of RFIs the decision slips to February 2027. Submitting after mid-October, or multiple RFI
                rounds, makes the target unrealistic.
              </p>
            </div>
          </div>
        </section>

        {/* Milestones */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">2. Milestones</h2>
            {canEdit && (
              <button
                onClick={() =>
                  addItem(
                    'milestone',
                    { code: `M${milestones.length}`, period: 'TBD', title: 'New milestone', body: '', owner: '' },
                    'New milestone'
                  )
                }
                className="print:hidden flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border hover:bg-secondary/60"
              >
                <Plus className="w-3.5 h-3.5" /> Add milestone
              </button>
            )}
          </div>
          <div className="space-y-3">
            {milestones.map((m) => {
              const status = STATUS_META[m.status] ?? STATUS_META.not_started;
              const StatusIcon = status.icon;
              const label = `${m.data.code} · ${m.data.title}`;
              return (
                <div key={m.id} className="glass-panel p-5">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 mb-2">
                    <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-xs font-semibold">
                      <EditableText
                        value={m.data.code ?? ''}
                        canEdit={canEdit}
                        onSave={(v) => updateField(m, 'code', v, label, 'code')}
                      />
                    </span>
                    <h3 className="font-medium">
                      <EditableText
                        value={m.data.title ?? ''}
                        canEdit={canEdit}
                        onSave={(v) => updateField(m, 'title', v, label, 'title')}
                      />
                    </h3>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarDays className="w-3 h-3" />
                      <EditableText
                        value={m.data.period ?? ''}
                        canEdit={canEdit}
                        onSave={(v) => updateField(m, 'period', v, label, 'period')}
                      />
                    </span>
                    <button
                      disabled={!canEdit}
                      onClick={() =>
                        updateStatus(
                          m,
                          STATUS_CYCLE[(STATUS_CYCLE.indexOf(m.status as any) + 1) % STATUS_CYCLE.length],
                          label
                        )
                      }
                      className={`ml-auto flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full ${status.className} ${
                        canEdit ? 'hover:opacity-80' : 'cursor-default'
                      }`}
                    >
                      <StatusIcon className="w-3 h-3" /> {status.label}
                    </button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <EditableText
                      value={m.data.body ?? ''}
                      canEdit={canEdit}
                      multiline
                      onSave={(v) => updateField(m, 'body', v, label, 'description')}
                    />
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3">
                    <p className="text-xs">
                      <span className="text-muted-foreground">Owner: </span>
                      <span className="font-medium">
                        <EditableText
                          value={m.data.owner ?? ''}
                          canEdit={canEdit}
                          onSave={(v) => updateField(m, 'owner', v, label, 'owner')}
                        />
                      </span>
                    </p>
                    <EditedBy item={m} />
                    {canEdit && (
                      <button
                        onClick={() => removeItem(m, label)}
                        className="print:hidden ml-auto text-muted-foreground hover:text-destructive"
                        aria-label="Delete milestone"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Timeline */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">3. Timeline</h2>
            {canEdit && (
              <button
                onClick={() =>
                  addItem('gantt', { label: 'New workstream', cells: MONTHS.map(() => null) }, 'New workstream')
                }
                className="print:hidden flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border hover:bg-secondary/60"
              >
                <Plus className="w-3.5 h-3.5" /> Add row
              </button>
            )}
          </div>
          {canEdit && (
            <p className="text-xs text-muted-foreground print:hidden">
              Click a cell to cycle: empty → intensive work → buffer → event → target.
            </p>
          )}
          <div className="glass-panel p-4 overflow-x-auto">
            <table className="w-full min-w-[760px] text-xs border-collapse">
              <thead>
                <tr>
                  <th className="text-left font-medium text-muted-foreground p-2 w-[280px]">Workstream</th>
                  {MONTHS.map((mo, i) => (
                    <th
                      key={mo}
                      className={`font-medium p-2 text-center ${
                        i === nowMonthIdx ? 'text-primary bg-primary/10 rounded-t-sm' : 'text-muted-foreground'
                      }`}
                    >
                      {mo}
                      {i === nowMonthIdx && <span className="block text-[10px] font-normal">now</span>}
                    </th>
                  ))}
                  {canEdit && <th className="w-8 print:hidden" />}
                </tr>
              </thead>
              <tbody>
                {gantt.map((row) => (
                  <tr key={row.id} className="border-t border-border/40">
                    <td className="p-2 pr-4 align-middle">
                      <EditableText
                        value={row.data.label ?? ''}
                        canEdit={canEdit}
                        onSave={(v) => updateField(row, 'label', v, row.data.label ?? 'Timeline row', 'label')}
                      />
                      <EditedBy item={row} />
                    </td>
                    {MONTHS.map((_, i) => {
                      const c: Phase | null = row.data.cells?.[i] ?? null;
                      return (
                        <td key={i} className={`p-1.5 align-middle ${i === nowMonthIdx ? 'bg-primary/5' : ''}`}>
                          <div
                            role={canEdit ? 'button' : undefined}
                            onClick={() => canEdit && cycleCell(row, i)}
                            className={`h-5 rounded-sm flex items-center justify-center ${
                              canEdit ? 'cursor-pointer hover:ring-1 hover:ring-primary/40' : ''
                            }`}
                          >
                            {c && (
                              <div className={`w-full h-full rounded-sm flex items-center justify-center ${cellClass[c]}`}>
                                {c === 'event' && <span className="text-primary text-[11px]">▲</span>}
                                {c === 'target' && <span className="text-primary text-[13px]">★</span>}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                    {canEdit && (
                      <td className="print:hidden">
                        <button
                          onClick={() => removeItem(row, row.data.label ?? 'Timeline row')}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Delete row"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-3 rounded-sm bg-primary/80 inline-block" /> intensive work
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-3 rounded-sm bg-primary/30 inline-block" /> completion / buffer
            </span>
            <span className="flex items-center gap-1.5">▲ event (meeting / submission)</span>
            <span className="flex items-center gap-1.5">★ target decision</span>
          </div>
        </section>

        {/* Delegation */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">4. Task delegation</h2>
            {canEdit && (
              <button
                onClick={() => addItem('delegation', { pkg: 'New work package', owner: '', support: '' }, 'New work package')}
                className="print:hidden flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border hover:bg-secondary/60"
              >
                <Plus className="w-3.5 h-3.5" /> Add package
              </button>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Ownership is per work package — no single team owns the dossier as a whole. Adrian Poznić is the Head of
            Governance and responsible for the process. Legal/Compliance coordinates assembly and is the point of
            contact with HANFA, while each package owner is accountable for its content. Use the team map below to see
            who sits in which team.
          </p>

          <div className="glass-panel p-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm border-collapse">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="p-2 font-medium">Work package</th>
                  <th className="p-2 font-medium">Owner</th>
                  <th className="p-2 font-medium">Support / input</th>
                  {canEdit && <th className="w-8 print:hidden" />}
                </tr>
              </thead>
              <tbody>
                {delegation.map((d) => (
                  <tr key={d.id} className="border-t border-border/40 align-top">
                    <td className="p-2">
                      <EditableText
                        value={d.data.pkg ?? ''}
                        canEdit={canEdit}
                        multiline
                        onSave={(v) => updateField(d, 'pkg', v, d.data.pkg ?? 'Work package', 'work package')}
                      />
                      <EditedBy item={d} />
                    </td>
                    <td className="p-2 font-medium">
                      <EditableText
                        value={d.data.owner ?? ''}
                        canEdit={canEdit}
                        onSave={(v) => updateField(d, 'owner', v, d.data.pkg ?? 'Work package', 'owner')}
                      />
                    </td>
                    <td className="p-2 text-muted-foreground">
                      <EditableText
                        value={d.data.support ?? ''}
                        canEdit={canEdit}
                        multiline
                        onSave={(v) => updateField(d, 'support', v, d.data.pkg ?? 'Work package', 'support')}
                      />
                    </td>
                    {canEdit && (
                      <td className="p-2 print:hidden">
                        <button
                          onClick={() => removeItem(d, d.data.pkg ?? 'Work package')}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label="Delete package"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Team map */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Team map</h3>
              {canEdit && (
                <div className="flex items-center gap-2 print:hidden">
                  {teams.length === 0 && (
                    <button
                      onClick={() => DEFAULT_TEAMS.forEach((t) => addItem('team', t, t.name))}
                      className="text-xs px-3 py-1.5 rounded-full border border-border hover:bg-secondary/60"
                    >
                      Load default teams
                    </button>
                  )}
                  <button
                    onClick={() => addItem('team', { name: 'New team', members: '' }, 'New team')}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border hover:bg-secondary/60"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add team
                  </button>
                </div>
              )}
            </div>
            {teams.length === 0 ? (
              <p className="text-sm text-muted-foreground">No teams defined yet.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {teams.map((t) => (
                  <div key={t.id} className="glass-panel p-4 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-semibold flex-1">
                        <EditableText
                          value={t.data.name ?? ''}
                          canEdit={canEdit}
                          onSave={(v) => updateField(t, 'name', v, t.data.name ?? 'Team', 'team name')}
                        />
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => removeItem(t, t.data.name ?? 'Team')}
                          className="text-muted-foreground hover:text-destructive print:hidden"
                          aria-label="Delete team"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <EditableText
                        value={t.data.members ?? ''}
                        canEdit={canEdit}
                        multiline
                        onSave={(v) => updateField(t, 'members', v, t.data.name ?? 'Team', 'members')}
                      />
                    </div>
                    <EditedBy item={t} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>


        {/* Critical points */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold">5. Critical points for holding the deadline</h2>
            {canEdit && (
              <button
                onClick={() => addItem('risk', { text: 'New critical point' }, 'New critical point')}
                className="print:hidden flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border border-border hover:bg-secondary/60"
              >
                <Plus className="w-3.5 h-3.5" /> Add point
              </button>
            )}
          </div>
          <ul className="space-y-3">
            {risks.map((r) => (
              <li key={r.id} className="glass-panel p-4 flex gap-3 text-sm">
                <AlertTriangle className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <span className="text-muted-foreground block">
                    <EditableText
                      value={r.data.text ?? ''}
                      canEdit={canEdit}
                      multiline
                      onSave={(v) => updateField(r, 'text', v, 'Critical point', 'text')}
                    />
                  </span>
                  <EditedBy item={r} />
                </div>
                {canEdit && (
                  <button
                    onClick={() => removeItem(r, 'Critical point')}
                    className="print:hidden text-muted-foreground hover:text-destructive shrink-0"
                    aria-label="Delete point"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Change history */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">6. Change history</h2>
          {revisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
          ) : (
            <div className="glass-panel divide-y divide-border/40">
              {(showHistory ? revisions : revisions.slice(0, 8)).map((rev) => (
                <div key={rev.id} className="p-4 text-sm">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span className="font-medium">{rev.changed_by_name ?? 'Someone'}</span>
                    <span className="text-muted-foreground">
                      changed <span className="text-foreground">{rev.field}</span> on{' '}
                      <span className="text-foreground">{rev.item_label ?? 'an item'}</span>
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">{timeAgo(rev.created_at)}</span>
                  </div>
                  {rev.old_value !== rev.new_value && (
                    <p className="mt-1.5 text-xs text-muted-foreground line-clamp-3">
                      {rev.old_value ? <span className="line-through opacity-60">{rev.old_value}</span> : null}{' '}
                      {rev.new_value ? <span className="text-foreground">→ {rev.new_value}</span> : null}
                    </p>
                  )}
                </div>
              ))}
              {revisions.length > 8 && (
                <button
                  onClick={() => setShowHistory((s) => !s)}
                  className="w-full p-3 text-xs text-muted-foreground hover:text-foreground print:hidden"
                >
                  {showHistory ? 'Show less' : `Show all ${revisions.length} changes`}
                </button>
              )}
            </div>
          )}
        </section>

        <footer className="pt-6 border-t border-border/40 text-xs text-muted-foreground">
          Sources: GRG documentation checklist (internal); HANFA — Guide for submitting applications for authorisation
          of crypto-asset service providers; Ordinance OG 95/2025; MiCA Arts. 62–63; CDR (EU) 2025/305; Implementing
          Regulation (EU) 2025/306.
        </footer>
      </main>
    </div>
  );
}

export default function PlanGRG() {
  return (
    <PlanAccessGate>
      <PlanGRGContent />
    </PlanAccessGate>
  );
}
