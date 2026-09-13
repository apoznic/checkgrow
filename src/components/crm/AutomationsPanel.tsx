import { useEffect, useMemo, useState } from 'react';
import {
  Plus, Loader2, Zap, Mail, ListChecks, UserCheck, Flag, Bell, Clock, Trash2, Pencil,
  ArrowUp, ArrowDown, Power, PowerOff, Play, XCircle, ChevronDown, ChevronRight, Webhook, Info,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GlassInput, GlassTextarea } from '@/components/GlassCard';
import { GlassButtonNew } from '@/components/ui/glass-button';
import { GlassSelect } from '@/components/ui/glass-select';

interface AutomationsPanelProps {
  clusterId: string;
  profileId: string;
  canManage: boolean;
}

type StepType = 'email' | 'task' | 'assign' | 'stage' | 'notify' | 'wait';
type ConditionOp = 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'exists' | 'not_exists';

interface Step {
  id: string;
  type: StepType;
  delay_minutes: number;
  subject?: string;
  body?: string;
  title?: string;
  message?: string;
  description?: string;
  assignee_id?: string | null;
  profile_id?: string | null;
  due_in_days?: number;
  priority?: 'low' | 'medium' | 'high';
  stage?: 'lead' | 'negotiation' | 'won';
}

interface Condition { field: string; op: ConditionOp; value: string }

interface Automation {
  id: string;
  name: string;
  description: string | null;
  enabled: boolean;
  trigger_type: 'webhook' | 'any_inbound';
  webhook_id: string | null;
  conditions: Condition[];
  steps: Step[];
  run_count: number;
  last_run_at: string | null;
  created_at: string;
}

interface WebhookOption { id: string; name: string; source_label: string | null }
interface Member { profileId: string; fullName: string }

interface Run {
  id: string;
  automation_id: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  current_step: number;
  next_run_at: string | null;
  started_at: string;
  error: string | null;
  log: { at: string; step: number; type: string; status: string; detail: string }[];
  crm_automations?: { name: string; steps: Step[] } | null;
  crm_deals?: { id: string; title: string } | null;
}

const STEP_META: Record<StepType, { label: string; icon: React.ElementType; hint: string }> = {
  email: { label: 'Send email', icon: Mail, hint: 'Email the lead through your Resend key' },
  task: { label: 'Create task', icon: ListChecks, hint: 'Add a task to a member on the Members board' },
  assign: { label: 'Assign owner', icon: UserCheck, hint: 'Set who owns the lead' },
  stage: { label: 'Move stage', icon: Flag, hint: 'Move the lead in the pipeline' },
  notify: { label: 'Notify member', icon: Bell, hint: 'In-app notification' },
  wait: { label: 'Wait', icon: Clock, hint: 'Pause before the next step' },
};

const OP_OPTIONS: { value: ConditionOp; label: string }[] = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'does not contain' },
  { value: 'exists', label: 'is present' },
  { value: 'not_exists', label: 'is empty' },
];

const DELAY_UNITS = [
  { value: '1', label: 'minutes' },
  { value: '60', label: 'hours' },
  { value: '1440', label: 'days' },
];

const STAGE_OPTIONS = [
  { value: 'lead', label: 'Lead' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
];

const RUN_STYLE: Record<Run['status'], string> = {
  running: 'bg-accent text-accent-foreground',
  completed: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-600',
  cancelled: 'bg-secondary text-muted-foreground',
};

const newId = () => Math.random().toString(36).slice(2, 10);

const splitDelay = (minutes: number): { amount: number; unit: string } => {
  if (minutes > 0 && minutes % 1440 === 0) return { amount: minutes / 1440, unit: '1440' };
  if (minutes > 0 && minutes % 60 === 0) return { amount: minutes / 60, unit: '60' };
  return { amount: minutes, unit: '1' };
};

const delayLabel = (minutes: number) => {
  if (!minutes) return 'immediately';
  const { amount, unit } = splitDelay(minutes);
  const name = DELAY_UNITS.find(u => u.value === unit)?.label || 'minutes';
  return `after ${amount} ${amount === 1 ? name.replace(/s$/, '') : name}`;
};

const emptyForm = (): { name: string; description: string; trigger_type: 'webhook' | 'any_inbound'; webhook_id: string; conditions: Condition[]; steps: Step[] } => ({
  name: '',
  description: '',
  trigger_type: 'any_inbound',
  webhook_id: '',
  conditions: [],
  steps: [
    { id: newId(), type: 'email', delay_minutes: 0, subject: 'Thanks for reaching out, {{first_name}}', body: 'Hi {{first_name}},\n\nThanks for getting in touch with {{org_name}}. We received your request and will get back to you shortly.\n\nBest regards' },
    { id: newId(), type: 'task', delay_minutes: 0, title: 'Call {{name}} ({{company}})', due_in_days: 1, priority: 'high' },
  ],
});

/**
 * Automations tab: contact loops that start when a lead arrives from a source
 * and run a timed sequence of emails, tasks, assignments, and notifications.
 */
export function AutomationsPanel({ clusterId, profileId, canManage }: AutomationsPanelProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookOption[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [editing, setEditing] = useState<{ id: string | null; form: ReturnType<typeof emptyForm> } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedRun, setExpandedRun] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showVars, setShowVars] = useState(false);

  useEffect(() => {
    loadAll();
    const channel = supabase
      .channel(`crm-automations-${clusterId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_automation_runs', filter: `cluster_id=eq.${clusterId}` }, () => { loadRuns(); loadAutomations(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterId]);

  const loadAll = async () => {
    setIsLoading(true);
    await Promise.all([loadAutomations(), loadWebhooks(), loadMembers(), loadRuns()]);
    setIsLoading(false);
  };

  const loadAutomations = async () => {
    const { data, error } = await supabase
      .from('crm_automations')
      .select('id, name, description, enabled, trigger_type, webhook_id, conditions, steps, run_count, last_run_at, created_at')
      .eq('cluster_id', clusterId)
      .order('created_at', { ascending: true });
    if (error) { toast({ title: 'Could not load automations', description: error.message, variant: 'destructive' }); return; }
    setAutomations((data || []) as unknown as Automation[]);
  };

  const loadWebhooks = async () => {
    const { data } = await supabase.from('crm_webhooks').select('id, name, source_label').eq('cluster_id', clusterId).order('created_at');
    setWebhooks((data || []) as WebhookOption[]);
  };

  const loadMembers = async () => {
    const { data } = await supabase
      .from('cluster_enrollments')
      .select('profile_id, profiles ( full_name )')
      .eq('cluster_id', clusterId)
      .eq('status', 'approved');
    setMembers(
      (data || [])
        .map((r: { profile_id: string; profiles: { full_name: string | null } | null }) => ({ profileId: r.profile_id, fullName: r.profiles?.full_name || 'Unnamed member' }))
        .sort((a: Member, b: Member) => a.fullName.localeCompare(b.fullName)),
    );
  };

  const loadRuns = async () => {
    const { data } = await supabase
      .from('crm_automation_runs')
      .select('id, automation_id, status, current_step, next_run_at, started_at, error, log, crm_automations ( name, steps ), crm_deals ( id, title )')
      .eq('cluster_id', clusterId)
      .order('started_at', { ascending: false })
      .limit(40);
    setRuns((data || []) as unknown as Run[]);
  };

  // ---- Editor helpers ----
  const startCreate = () => setEditing({ id: null, form: emptyForm() });
  const startEdit = (a: Automation) => setEditing({
    id: a.id,
    form: {
      name: a.name, description: a.description || '', trigger_type: a.trigger_type, webhook_id: a.webhook_id || '',
      conditions: a.conditions || [], steps: (a.steps || []).map(s => ({ ...s, id: s.id || newId() })),
    },
  });
  const updateForm = (patch: Partial<ReturnType<typeof emptyForm>>) => setEditing(e => (e ? { ...e, form: { ...e.form, ...patch } } : e));
  const updateStep = (id: string, patch: Partial<Step>) => updateForm({ steps: editing!.form.steps.map(s => (s.id === id ? { ...s, ...patch } : s)) });
  const moveStep = (index: number, dir: -1 | 1) => {
    const steps = [...editing!.form.steps];
    const target = index + dir;
    if (target < 0 || target >= steps.length) return;
    [steps[index], steps[target]] = [steps[target], steps[index]];
    updateForm({ steps });
  };
  const addStep = (type: StepType) => {
    const base: Step = { id: newId(), type, delay_minutes: type === 'wait' ? 1440 : 0 };
    if (type === 'email') Object.assign(base, { subject: 'Following up, {{first_name}}', body: 'Hi {{first_name}},\n\nJust checking in on your request.\n\nBest regards' });
    if (type === 'task') Object.assign(base, { title: 'Follow up with {{name}}', due_in_days: 1, priority: 'medium' });
    if (type === 'notify') Object.assign(base, { title: 'New lead from {{source}}: {{lead_title}}' });
    if (type === 'stage') Object.assign(base, { stage: 'negotiation' });
    updateForm({ steps: [...editing!.form.steps, base] });
  };

  const handleSave = async () => {
    if (!editing) return;
    const f = editing.form;
    if (!f.name.trim()) { toast({ title: 'Give the automation a name', variant: 'destructive' }); return; }
    if (f.trigger_type === 'webhook' && !f.webhook_id) { toast({ title: 'Choose the lead source', variant: 'destructive' }); return; }
    setIsSaving(true);
    const row = {
      cluster_id: clusterId,
      name: f.name.trim(),
      description: f.description.trim() || null,
      trigger_type: f.trigger_type,
      webhook_id: f.trigger_type === 'webhook' ? f.webhook_id : null,
      conditions: f.conditions.filter(c => c.field.trim()) as unknown as import('@/integrations/supabase/types').Json,
      steps: f.steps.map(s => ({ ...s, delay_minutes: Math.max(0, Number(s.delay_minutes) || 0) })) as unknown as import('@/integrations/supabase/types').Json,
    };
    const { error } = editing.id
      ? await supabase.from('crm_automations').update(row).eq('id', editing.id)
      : await supabase.from('crm_automations').insert({ ...row, created_by: profileId });
    setIsSaving(false);
    if (error) { toast({ title: 'Could not save automation', description: error.message, variant: 'destructive' }); return; }
    toast({ title: editing.id ? 'Automation updated' : 'Automation created' });
    setEditing(null);
    loadAutomations();
  };

  const handleToggle = async (a: Automation) => {
    setAutomations(prev => prev.map(x => (x.id === a.id ? { ...x, enabled: !x.enabled } : x)));
    const { error } = await supabase.from('crm_automations').update({ enabled: !a.enabled }).eq('id', a.id);
    if (error) { toast({ title: 'Could not update', description: error.message, variant: 'destructive' }); loadAutomations(); }
  };

  const handleDelete = async (a: Automation) => {
    if (!confirm(`Delete "${a.name}"? Running loops for this automation stop as well.`)) return;
    const { error } = await supabase.from('crm_automations').delete().eq('id', a.id);
    if (error) { toast({ title: 'Could not delete', description: error.message, variant: 'destructive' }); return; }
    setAutomations(prev => prev.filter(x => x.id !== a.id));
    loadRuns();
  };

  const cancelRun = async (run: Run) => {
    await supabase.from('crm_automation_runs').update({ status: 'cancelled', next_run_at: null, completed_at: new Date().toISOString() }).eq('id', run.id);
    loadRuns();
  };

  const runNow = async (run: Run) => {
    setIsProcessing(true);
    await supabase.from('crm_automation_runs').update({ next_run_at: new Date().toISOString() }).eq('id', run.id);
    const { error } = await supabase.functions.invoke('crm-automation-runner', { body: { cluster_id: clusterId } });
    setIsProcessing(false);
    if (error) toast({ title: 'Runner failed', description: error.message, variant: 'destructive' });
    else toast({ title: 'Step executed' });
    loadRuns();
  };

  const memberOptions = useMemo(() => members.map(m => ({ value: m.profileId, label: m.fullName })), [members]);
  const memberName = (id?: string | null) => members.find(m => m.profileId === id)?.fullName || 'Lead owner';
  const webhookOptions = useMemo(() => webhooks.map(w => ({ value: w.id, label: `${w.name}${w.source_label && w.source_label !== w.name ? ` (${w.source_label})` : ''}` })), [webhooks]);
  const triggerSummary = (a: Automation) => {
    const base = a.trigger_type === 'any_inbound' ? 'Any inbound lead' : (webhooks.find(w => w.id === a.webhook_id)?.name || 'Deleted source');
    const conds = (a.conditions || []).length;
    return conds ? `${base} · ${conds} condition${conds === 1 ? '' : 's'}` : base;
  };
  const activeRuns = runs.filter(r => r.status === 'running').length;

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  // ---------------------------------------------------------------- editor
  if (editing) {
    const f = editing.form;
    return (
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="eyebrow mb-1">{editing.id ? 'Edit automation' : 'New automation'}</p>
            <h2 className="text-h4">Contact loop</h2>
          </div>
          <div className="flex gap-2">
            <GlassButtonNew variant="ghost" onClick={() => setEditing(null)}>Cancel</GlassButtonNew>
            <GlassButtonNew variant="primary" onClick={handleSave} isLoading={isSaving}>Save automation</GlassButtonNew>
          </div>
        </div>

        {/* Basics */}
        <div className="glass-panel p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Name</label>
              <GlassInput value={f.name} onChange={e => updateForm({ name: e.target.value })} placeholder="e.g. Website form welcome loop" autoFocus />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
              <GlassInput value={f.description} onChange={e => updateForm({ description: e.target.value })} placeholder="What this loop does" />
            </div>
          </div>
        </div>

        {/* Trigger */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center"><Webhook className="w-4 h-4 text-accent-foreground" /></div>
            <div>
              <h3 className="font-semibold">When a lead arrives from</h3>
              <p className="text-xs text-muted-foreground">Sources are the inbound webhooks in CRM → Inbound leads (Meta lead forms, website forms, custom forms).</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <GlassSelect
              value={f.trigger_type}
              onChange={v => updateForm({ trigger_type: v as 'webhook' | 'any_inbound' })}
              options={[{ value: 'any_inbound', label: 'Any inbound source' }, { value: 'webhook', label: 'A specific source' }]}
            />
            {f.trigger_type === 'webhook' && (
              webhookOptions.length ? (
                <GlassSelect value={f.webhook_id} onChange={v => updateForm({ webhook_id: v })} options={webhookOptions} placeholder="Choose a source" />
              ) : (
                <p className="text-sm text-muted-foreground self-center">No sources yet. Create one in CRM → Inbound leads first.</p>
              )
            )}
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Only when (optional, all must match)</p>
            {f.conditions.map((c, i) => (
              <div key={i} className="flex flex-wrap gap-2 items-center">
                <GlassInput value={c.field} onChange={e => updateForm({ conditions: f.conditions.map((x, j) => (j === i ? { ...x, field: e.target.value } : x)) })} placeholder="field, e.g. form_name" className="w-44" />
                <GlassSelect value={c.op} onChange={v => updateForm({ conditions: f.conditions.map((x, j) => (j === i ? { ...x, op: v as ConditionOp } : x)) })} options={OP_OPTIONS} className="min-w-[160px]" />
                {!['exists', 'not_exists'].includes(c.op) && (
                  <GlassInput value={c.value} onChange={e => updateForm({ conditions: f.conditions.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })} placeholder="value" className="w-48" />
                )}
                <button onClick={() => updateForm({ conditions: f.conditions.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            <GlassButtonNew variant="ghost" size="sm" onClick={() => updateForm({ conditions: [...f.conditions, { field: '', op: 'equals', value: '' }] })} leftIcon={<Plus className="w-3.5 h-3.5" />}>
              Add condition
            </GlassButtonNew>
            <p className="text-xs text-[#9B9B9B]">Fields are matched against the submitted form data plus name, email, company, phone, source, subject, and message.</p>
          </div>
        </div>

        {/* Steps */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center"><Zap className="w-4 h-4 text-accent-foreground" /></div>
            <div>
              <h3 className="font-semibold">Then, step by step</h3>
              <p className="text-xs text-muted-foreground">Each delay counts from the previous step. Use variables like {'{{first_name}}'} in text.</p>
            </div>
          </div>

          <div className="space-y-3">
            {f.steps.map((s, i) => {
              const meta = STEP_META[s.type];
              const Icon = meta.icon;
              const d = splitDelay(s.delay_minutes);
              return (
                <div key={s.id} className="card-outlined p-4 space-y-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-6 h-6 rounded-full bg-secondary text-xs font-semibold flex items-center justify-center">{i + 1}</span>
                    <Icon className="w-4 h-4 text-accent-foreground" />
                    <GlassSelect value={s.type} onChange={v => updateStep(s.id, { type: v as StepType })} options={(Object.keys(STEP_META) as StepType[]).map(t => ({ value: t, label: STEP_META[t].label }))} className="min-w-[160px]" />
                    <span className="text-xs text-muted-foreground">{i === 0 ? 'when the lead arrives, after' : 'then after'}</span>
                    <input
                      type="number" min={0}
                      value={d.amount}
                      onChange={e => updateStep(s.id, { delay_minutes: Math.max(0, Number(e.target.value) || 0) * Number(d.unit) })}
                      className="glass-input w-20"
                    />
                    <GlassSelect value={d.unit} onChange={u => updateStep(s.id, { delay_minutes: d.amount * Number(u) })} options={DELAY_UNITS} className="min-w-[110px]" />
                    <div className="ml-auto flex items-center gap-1">
                      <button onClick={() => moveStep(i, -1)} className="p-1 text-muted-foreground hover:text-foreground" title="Move up"><ArrowUp className="w-4 h-4" /></button>
                      <button onClick={() => moveStep(i, 1)} className="p-1 text-muted-foreground hover:text-foreground" title="Move down"><ArrowDown className="w-4 h-4" /></button>
                      <button onClick={() => updateForm({ steps: f.steps.filter(x => x.id !== s.id) })} className="p-1 text-muted-foreground hover:text-destructive" title="Remove"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>

                  {s.type === 'email' && (
                    <div className="space-y-2">
                      <GlassInput value={s.subject || ''} onChange={e => updateStep(s.id, { subject: e.target.value })} placeholder="Subject" />
                      <GlassTextarea value={s.body || ''} onChange={e => updateStep(s.id, { body: e.target.value })} placeholder="Email body" className="min-h-[120px]" />
                      <p className="text-xs text-[#9B9B9B]">Sent from your organization's Resend sender to the lead's email; replies go to the lead owner.</p>
                    </div>
                  )}
                  {s.type === 'task' && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                      <GlassInput value={s.title || ''} onChange={e => updateStep(s.id, { title: e.target.value })} placeholder="Task title" className="md:col-span-2" />
                      <GlassSelect value={s.assignee_id || ''} onChange={v => updateStep(s.id, { assignee_id: v || null })} options={[{ value: '', label: 'Lead owner' }, ...memberOptions]} />
                      <div className="flex gap-2">
                        <input type="number" min={0} value={s.due_in_days ?? 0} onChange={e => updateStep(s.id, { due_in_days: Number(e.target.value) || 0 })} className="glass-input w-20" title="Due in days" />
                        <GlassSelect value={s.priority || 'medium'} onChange={v => updateStep(s.id, { priority: v as Step['priority'] })} options={[{ value: 'low', label: 'Low' }, { value: 'medium', label: 'Medium' }, { value: 'high', label: 'High' }]} className="flex-1" />
                      </div>
                      <p className="text-xs text-[#9B9B9B] md:col-span-4">Due in N days after this step runs. Shows on the Members board and in the member's My Life.</p>
                    </div>
                  )}
                  {s.type === 'assign' && (
                    <GlassSelect value={s.profile_id || ''} onChange={v => updateStep(s.id, { profile_id: v || null })} options={memberOptions} placeholder="Choose the owner" className="max-w-xs" />
                  )}
                  {s.type === 'stage' && (
                    <GlassSelect value={s.stage || 'negotiation'} onChange={v => updateStep(s.id, { stage: v as Step['stage'] })} options={STAGE_OPTIONS} className="max-w-xs" />
                  )}
                  {s.type === 'notify' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <GlassSelect value={s.profile_id || ''} onChange={v => updateStep(s.id, { profile_id: v || null })} options={[{ value: '', label: 'Lead owner' }, ...memberOptions]} />
                      <GlassInput value={s.title || ''} onChange={e => updateStep(s.id, { title: e.target.value })} placeholder="Notification title" className="md:col-span-2" />
                      <GlassInput value={s.message || ''} onChange={e => updateStep(s.id, { message: e.target.value })} placeholder="Message (optional)" className="md:col-span-3" />
                    </div>
                  )}
                  {s.type === 'wait' && <p className="text-xs text-muted-foreground">Nothing happens; the next step waits for the delay above.</p>}
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            {(Object.keys(STEP_META) as StepType[]).map(t => {
              const Icon = STEP_META[t].icon;
              return (
                <GlassButtonNew key={t} variant="secondary" size="sm" onClick={() => addStep(t)} leftIcon={<Icon className="w-3.5 h-3.5" />} title={STEP_META[t].hint}>
                  {STEP_META[t].label}
                </GlassButtonNew>
              );
            })}
          </div>

          <button onClick={() => setShowVars(v => !v)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <Info className="w-3.5 h-3.5" /> Template variables {showVars ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
          {showVars && (
            <div className="text-xs text-muted-foreground grid grid-cols-2 md:grid-cols-4 gap-1 font-mono">
              {['{{name}}', '{{first_name}}', '{{email}}', '{{phone}}', '{{company}}', '{{source}}', '{{lead_title}}', '{{org_name}}', '{{payload.any_field}}'].map(v => <span key={v}>{v}</span>)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------- list
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Zap className="w-4 h-4" /><span className="text-sm">Automations</span></div>
          <p className="text-2xl font-bold">{automations.length}</p>
          <p className="text-xs text-[#9B9B9B] mt-1">{automations.filter(a => a.enabled).length} active</p>
        </div>
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Play className="w-4 h-4" /><span className="text-sm">Loops running</span></div>
          <p className="text-2xl font-bold">{activeRuns}</p>
          <p className="text-xs text-[#9B9B9B] mt-1">{automations.reduce((s, a) => s + a.run_count, 0)} leads enrolled in total</p>
        </div>
        <div className="glass-panel p-4 md:col-span-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Contact loops per lead source</p>
            <p className="text-xs text-muted-foreground">A lead from a Meta form, website form, or any webhook starts a sequence: emails, tasks, owner, stage, notifications.</p>
          </div>
          {canManage && (
            <GlassButtonNew variant="primary" onClick={startCreate} leftIcon={<Plus className="w-4 h-4" />}>New automation</GlassButtonNew>
          )}
        </div>
      </div>

      {automations.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <Zap className="w-12 h-12 mx-auto mb-3 text-[#9B9B9B]" />
          <p className="font-semibold mb-1">No automations yet</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">Create a loop for a source: welcome email now, a call task tomorrow, a follow-up email in three days.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {automations.map(a => (
            <div key={a.id} className="glass-panel p-5">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{a.name}</h3>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${a.enabled ? 'bg-green-100 text-green-700' : 'bg-secondary text-muted-foreground'}`}>{a.enabled ? 'Active' : 'Paused'}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    <Webhook className="w-3 h-3 inline mr-1" />{triggerSummary(a)} · {a.run_count} enrolled{a.last_run_at ? ` · last ${formatDistanceToNow(new Date(a.last_run_at), { addSuffix: true })}` : ''}
                  </p>
                  {a.description && <p className="text-sm text-muted-foreground mt-1">{a.description}</p>}
                </div>
                {canManage && (
                  <div className="flex items-center gap-1">
                    <GlassButtonNew variant="ghost" size="sm" onClick={() => handleToggle(a)} leftIcon={a.enabled ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}>{a.enabled ? 'Pause' : 'Enable'}</GlassButtonNew>
                    <GlassButtonNew variant="ghost" size="sm" onClick={() => startEdit(a)} leftIcon={<Pencil className="w-3.5 h-3.5" />}>Edit</GlassButtonNew>
                    <GlassButtonNew variant="ghost" size="icon-sm" onClick={() => handleDelete(a)} className="text-muted-foreground hover:text-destructive" title="Delete"><Trash2 className="w-3.5 h-3.5" /></GlassButtonNew>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                {(a.steps || []).map((s, i) => {
                  const Icon = STEP_META[s.type]?.icon || Zap;
                  return (
                    <span key={s.id || i} className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-xs">
                      <Icon className="w-3 h-3 text-accent-foreground" />
                      {STEP_META[s.type]?.label || s.type}
                      <span className="text-[#9B9B9B]">{delayLabel(s.delay_minutes)}</span>
                    </span>
                  );
                })}
                {(a.steps || []).length === 0 && <span className="text-xs text-[#9B9B9B]">No steps</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Runs */}
      <div className="glass-panel">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold">Recent loops</h3>
            <p className="text-xs text-muted-foreground">Delayed steps run every 5 minutes. Use "Run next step" to fire one immediately.</p>
          </div>
          {canManage && activeRuns > 0 && (
            <GlassButtonNew variant="secondary" size="sm" isLoading={isProcessing} onClick={async () => {
              setIsProcessing(true);
              const { error } = await supabase.functions.invoke('crm-automation-runner', { body: { cluster_id: clusterId } });
              setIsProcessing(false);
              if (error) toast({ title: 'Runner failed', description: error.message, variant: 'destructive' });
              loadRuns();
            }} leftIcon={<Play className="w-3.5 h-3.5" />}>Process due steps</GlassButtonNew>
          )}
        </div>
        {runs.length === 0 ? (
          <p className="p-5 text-sm text-muted-foreground">No leads have entered a loop yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {runs.map(run => {
              const total = run.crm_automations?.steps?.length ?? 0;
              const open = expandedRun === run.id;
              return (
                <div key={run.id}>
                  <div className="px-5 py-3 flex items-center gap-3 text-sm">
                    <button onClick={() => setExpandedRun(open ? null : run.id)} className="text-muted-foreground">{open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}</button>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium shrink-0 ${RUN_STYLE[run.status]}`}>{run.status}</span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate"><span className="font-medium">{run.crm_deals?.title || 'Lead'}</span> <span className="text-muted-foreground">· {run.crm_automations?.name}</span></p>
                      <p className="text-xs text-muted-foreground truncate">
                        step {Math.min(run.current_step + (run.status === 'completed' ? 0 : 1), total)}/{total}
                        {run.status === 'running' && run.next_run_at ? ` · next ${formatDistanceToNow(new Date(run.next_run_at), { addSuffix: true })}` : ''}
                        {run.error ? ` · ${run.error}` : ''}
                        {` · started ${formatDistanceToNow(new Date(run.started_at), { addSuffix: true })}`}
                      </p>
                    </div>
                    {canManage && run.status === 'running' && (
                      <>
                        <GlassButtonNew variant="ghost" size="sm" onClick={() => runNow(run)} leftIcon={<Play className="w-3.5 h-3.5" />}>Run next step</GlassButtonNew>
                        <button onClick={() => cancelRun(run)} className="text-muted-foreground hover:text-destructive" title="Cancel loop"><XCircle className="w-4 h-4" /></button>
                      </>
                    )}
                  </div>
                  {open && (
                    <div className="px-12 pb-3 space-y-1">
                      {(run.log || []).length === 0 ? (
                        <p className="text-xs text-muted-foreground">Nothing executed yet.</p>
                      ) : (
                        (run.log || []).map((l, i) => (
                          <p key={i} className="text-xs text-muted-foreground">
                            <span className={`font-medium ${l.status === 'error' ? 'text-destructive' : l.status === 'skipped' ? 'text-amber-600' : 'text-green-700'}`}>{l.status}</span>
                            {' · '}step {l.step + 1} {STEP_META[l.type as StepType]?.label || l.type} · {l.detail} · {formatDistanceToNow(new Date(l.at), { addSuffix: true })}
                          </p>
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
