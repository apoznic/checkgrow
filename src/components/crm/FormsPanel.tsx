import { useEffect, useState } from 'react';
import {
  Plus, Loader2, FormInput, Copy, Check, Trash2, Power, PowerOff, Pencil, Code2, ExternalLink,
  ArrowUp, ArrowDown, X, Eye, Link2, ChevronDown, ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GlassInput } from '@/components/GlassCard';
import { GlassButtonNew } from '@/components/ui/glass-button';
import { GlassSelect } from '@/components/ui/glass-select';

interface FormsPanelProps {
  clusterId: string;
  profileId: string;
  canManage: boolean;
  onOpenDeal?: (dealId: string) => void;
}

type FieldType = 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'hidden';

interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  map_to?: string;
  value?: string;
  width?: 'full' | 'half';
}

interface FormSettings {
  title?: string;
  description?: string;
  submit_label?: string;
  success_message?: string;
  redirect_url?: string;
  accent?: string;
  campaign?: string;
  consent_text?: string;
  background?: 'card' | 'transparent';
}

interface FormRow {
  id: string;
  webhook_id: string;
  public_id: string;
  name: string;
  enabled: boolean;
  fields: FormField[];
  settings: FormSettings;
  submissions_count: number;
  last_submission_at: string | null;
  created_at: string;
}

interface SubmissionRow {
  id: string;
  status: string;
  error: string | null;
  payload: Record<string, unknown>;
  deal_id: string | null;
  created_at: string;
  crm_deals?: { id: string; title: string } | null;
}

const FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-form`;

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Short text' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'textarea', label: 'Long text' },
  { value: 'select', label: 'Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'hidden', label: 'Hidden value' },
];

const MAP_TARGETS: { value: string; label: string }[] = [
  { value: 'name', label: 'Lead name' },
  { value: 'first_name', label: 'First name' },
  { value: 'last_name', label: 'Last name' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone' },
  { value: 'company', label: 'Company' },
  { value: 'position', label: 'Job title' },
  { value: 'subject', label: 'Lead title' },
  { value: 'message', label: 'Message' },
  { value: 'value', label: 'Value / budget' },
  { value: 'custom', label: 'Extra field (kept as attribute)' },
];

const DEFAULT_MAP: Record<FieldType, string> = { text: 'custom', email: 'email', phone: 'phone', textarea: 'message', select: 'custom', checkbox: 'custom', hidden: 'custom' };

const newId = () => 'f_' + Math.random().toString(36).slice(2, 8);
// Supabase's Json type has an index signature our interfaces lack; round-trip through JSON to satisfy it.
const asJson = (v: unknown) => JSON.parse(JSON.stringify(v));
const randomToken = () => Array.from(crypto.getRandomValues(new Uint8Array(24))).map(b => b.toString(16).padStart(2, '0')).join('');

const STARTER_FIELDS: FormField[] = [
  { id: newId(), type: 'text', label: 'Name', placeholder: 'Your name', required: true, map_to: 'name', width: 'half' },
  { id: newId(), type: 'email', label: 'Email', placeholder: 'you@company.com', required: true, map_to: 'email', width: 'half' },
  { id: newId(), type: 'phone', label: 'Phone', placeholder: '+385 …', map_to: 'phone', width: 'half' },
  { id: newId(), type: 'text', label: 'Company', map_to: 'company', width: 'half' },
  { id: newId(), type: 'textarea', label: 'How can we help?', map_to: 'message' },
];

const DEFAULT_SETTINGS: FormSettings = { title: 'Get in touch', description: '', submit_label: 'Send', success_message: "Thanks! We'll be in touch shortly.", accent: '#2A2722', background: 'card' };

interface Draft { name: string; source_label: string; fields: FormField[]; settings: FormSettings }

const embedSnippet = (publicId: string) =>
  `<div data-checkgrow-form="${publicId}"></div>\n<script async src="${FUNCTIONS_BASE}/${publicId}/embed.js"></script>`;
const iframeSnippet = (publicId: string) =>
  `<iframe src="${window.location.origin}/f/${publicId}" style="width:100%;max-width:600px;height:640px;border:0" loading="lazy" title="Contact form"></iframe>`;

/** Preview that mirrors the embed script's layout. */
function FormPreview({ fields, settings }: { fields: FormField[]; settings: FormSettings }) {
  const accent = settings.accent || '#2A2722';
  return (
    <div className={`max-w-[560px] ${settings.background === 'transparent' ? '' : 'rounded-2xl border border-border bg-white p-6'}`}>
      {settings.title && <h3 className="text-xl font-semibold mb-1">{settings.title}</h3>}
      {settings.description && <p className="text-sm text-muted-foreground mb-4">{settings.description}</p>}
      <div className="grid grid-cols-2 gap-3">
        {fields.filter(f => f.type !== 'hidden').map(f => (
          <div key={f.id} className={`flex flex-col gap-1 ${f.width === 'half' ? 'col-span-1' : 'col-span-2'}`}>
            {f.type === 'checkbox' ? (
              <label className="flex items-start gap-2 text-sm"><input type="checkbox" disabled className="mt-0.5" /> {f.label}{f.required && <span className="text-red-600"> *</span>}</label>
            ) : (
              <>
                <label className="text-[13px] font-medium">{f.label}{f.required && <span className="text-red-600"> *</span>}</label>
                {f.type === 'textarea' ? (
                  <textarea disabled placeholder={f.placeholder} className="w-full rounded-lg border border-[#D9D9D3] bg-white px-3 py-2 text-sm min-h-[80px]" />
                ) : f.type === 'select' ? (
                  <select disabled className="w-full rounded-lg border border-[#D9D9D3] bg-white px-3 py-2 text-sm"><option>{f.placeholder || 'Choose…'}</option>{(f.options || []).map(o => <option key={o}>{o}</option>)}</select>
                ) : (
                  <input disabled placeholder={f.placeholder} className="w-full rounded-lg border border-[#D9D9D3] bg-white px-3 py-2 text-sm" />
                )}
              </>
            )}
          </div>
        ))}
        {settings.consent_text && <p className="col-span-2 text-xs text-muted-foreground">{settings.consent_text}</p>}
        <button type="button" disabled className="col-span-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white" style={{ background: accent }}>{settings.submit_label || 'Send'}</button>
      </div>
    </div>
  );
}

/**
 * Forms: build a lead form, embed it on any site (script or iframe) or share
 * the hosted page. Submissions become leads through the form's own inbound
 * webhook, so stage, owner, source and automations apply.
 */
export function FormsPanel({ clusterId, profileId, canManage, onOpenDeal }: FormsPanelProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [forms, setForms] = useState<FormRow[]>([]);
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [embedId, setEmbedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submissions, setSubmissions] = useState<Record<string, SubmissionRow[]>>({});
  const [previewTab, setPreviewTab] = useState<'fields' | 'settings'>('fields');

  useEffect(() => {
    loadForms().then(() => setIsLoading(false));
    const channel = supabase
      .channel(`crm-forms-${clusterId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_forms', filter: `cluster_id=eq.${clusterId}` }, () => loadForms())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clusterId]);

  const loadForms = async () => {
    const { data, error } = await supabase
      .from('crm_forms')
      .select('id, webhook_id, public_id, name, enabled, fields, settings, submissions_count, last_submission_at, created_at')
      .eq('cluster_id', clusterId)
      .order('created_at', { ascending: true });
    if (error) { toast({ title: 'Could not load forms', description: error.message, variant: 'destructive' }); return; }
    setForms((data || []) as unknown as FormRow[]);
  };

  const loadSubmissions = async (form: FormRow) => {
    const { data } = await supabase
      .from('crm_webhook_events')
      .select('id, status, error, payload, deal_id, created_at, crm_deals ( id, title )')
      .eq('webhook_id', form.webhook_id)
      .order('created_at', { ascending: false })
      .limit(25);
    setSubmissions(prev => ({ ...prev, [form.id]: (data || []) as unknown as SubmissionRow[] }));
  };

  const startNew = () => {
    setEditing({ id: null, draft: { name: 'Website contact form', source_label: 'Website', fields: STARTER_FIELDS.map(f => ({ ...f, id: newId() })), settings: { ...DEFAULT_SETTINGS } } });
    setPreviewTab('fields');
  };
  const startEdit = (form: FormRow) => {
    setEditing({ id: form.id, draft: { name: form.name, source_label: '', fields: form.fields.map(f => ({ ...f })), settings: { ...DEFAULT_SETTINGS, ...form.settings } } });
    setPreviewTab('fields');
  };
  const patchDraft = (patch: Partial<Draft>) => setEditing(e => (e ? { ...e, draft: { ...e.draft, ...patch } } : e));
  const patchField = (id: string, patch: Partial<FormField>) => patchDraft({ fields: editing!.draft.fields.map(f => (f.id === id ? { ...f, ...patch } : f)) });
  const moveField = (index: number, dir: -1 | 1) => {
    const fields = [...editing!.draft.fields];
    const j = index + dir;
    if (j < 0 || j >= fields.length) return;
    [fields[index], fields[j]] = [fields[j], fields[index]];
    patchDraft({ fields });
  };
  const addField = (type: FieldType) => {
    const label = { text: 'Text', email: 'Email', phone: 'Phone', textarea: 'Message', select: 'Choose an option', checkbox: 'I agree', hidden: 'hidden_value' }[type];
    patchDraft({ fields: [...editing!.draft.fields, { id: newId(), type, label, required: false, map_to: DEFAULT_MAP[type], options: type === 'select' ? ['Option A', 'Option B'] : undefined, width: 'full' }] });
  };

  const validateDraft = (d: Draft): string | null => {
    if (!d.name.trim()) return 'Give the form a name.';
    if (d.fields.length === 0) return 'Add at least one field.';
    for (const f of d.fields) if (!f.label.trim()) return 'Every field needs a label.';
    const identity = d.fields.some(f => ['name', 'first_name', 'email', 'phone', 'company'].includes(f.map_to || ''));
    if (!identity) return 'Map at least one field to name, email, phone or company so a lead can be created.';
    if (d.settings.redirect_url && !/^https?:\/\//i.test(d.settings.redirect_url)) return 'The redirect URL must start with https://';
    return null;
  };

  const handleSave = async () => {
    if (!editing) return;
    const problem = validateDraft(editing.draft);
    if (problem) { toast({ title: 'Check the form', description: problem, variant: 'destructive' }); return; }
    setIsSaving(true);
    const d = editing.draft;
    const cleanFields = d.fields.map(f => ({ ...f, label: f.label.trim(), options: f.type === 'select' ? (f.options || []).map(o => o.trim()).filter(Boolean) : undefined }));
    if (editing.id) {
      const { error } = await supabase.from('crm_forms').update({ name: d.name.trim(), fields: asJson(cleanFields), settings: asJson(d.settings) }).eq('id', editing.id);
      setIsSaving(false);
      if (error) { toast({ title: 'Could not save', description: error.message, variant: 'destructive' }); return; }
      await supabase.from('crm_webhooks').update({ name: `Form: ${d.name.trim()}` }).eq('id', forms.find(f => f.id === editing.id)?.webhook_id || '');
    } else {
      const { data: hook, error: hookError } = await supabase.from('crm_webhooks').insert({
        cluster_id: clusterId, name: `Form: ${d.name.trim()}`, source_label: d.source_label.trim() || 'Website', created_by: profileId, token: randomToken(),
      }).select('id').single();
      if (hookError || !hook) { setIsSaving(false); toast({ title: 'Could not create the form', description: hookError?.message, variant: 'destructive' }); return; }
      const { error } = await supabase.from('crm_forms').insert({
        cluster_id: clusterId, webhook_id: hook.id, name: d.name.trim(), fields: asJson(cleanFields), settings: asJson(d.settings), created_by: profileId,
      });
      setIsSaving(false);
      if (error) { await supabase.from('crm_webhooks').delete().eq('id', hook.id); toast({ title: 'Could not create the form', description: error.message, variant: 'destructive' }); return; }
      toast({ title: 'Form created', description: 'Grab the embed code to put it on your site.' });
    }
    setEditing(null);
    loadForms();
  };

  const handleToggle = async (form: FormRow) => {
    setForms(prev => prev.map(f => (f.id === form.id ? { ...f, enabled: !f.enabled } : f)));
    const { error } = await supabase.from('crm_forms').update({ enabled: !form.enabled }).eq('id', form.id);
    if (error) { toast({ title: 'Could not update', description: error.message, variant: 'destructive' }); loadForms(); }
  };

  const handleDelete = async (form: FormRow) => {
    if (!confirm(`Delete "${form.name}"? Embedded copies stop working; leads already collected stay in the CRM.`)) return;
    const { error } = await supabase.from('crm_webhooks').delete().eq('id', form.webhook_id); // cascades to the form
    if (error) { toast({ title: 'Could not delete', description: error.message, variant: 'destructive' }); return; }
    setForms(prev => prev.filter(f => f.id !== form.id));
  };

  const copy = async (key: string, text: string) => {
    try { await navigator.clipboard.writeText(text); setCopied(key); setTimeout(() => setCopied(null), 1500); }
    catch { toast({ title: 'Copy failed', description: 'Select the text and copy it manually.', variant: 'destructive' }); }
  };

  const toggleExpanded = (form: FormRow) => {
    const next = expandedId === form.id ? null : form.id;
    setExpandedId(next);
    if (next && !submissions[form.id]) loadSubmissions(form);
  };

  const totalSubmissions = forms.reduce((s, f) => s + f.submissions_count, 0);

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  // ---------- Builder ----------
  if (editing) {
    const d = editing.draft;
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="eyebrow mb-1">{editing.id ? 'Edit form' : 'New form'}</p>
            <h3 className="text-h4">Build the form</h3>
          </div>
          <div className="flex gap-2">
            <GlassButtonNew variant="ghost" onClick={() => setEditing(null)}>Cancel</GlassButtonNew>
            <GlassButtonNew variant="primary" onClick={handleSave} isLoading={isSaving}>{editing.id ? 'Save changes' : 'Create form'}</GlassButtonNew>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
          {/* Left: fields & settings */}
          <div className="space-y-4">
            <div className="rounded-2xl bg-card shadow-sm p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Form name (internal)</label>
                  <GlassInput value={d.name} onChange={e => patchDraft({ name: e.target.value })} placeholder="e.g. Website contact form" />
                </div>
                {!editing.id && (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Source label on leads</label>
                    <GlassInput value={d.source_label} onChange={e => patchDraft({ source_label: e.target.value })} placeholder="e.g. Website" />
                  </div>
                )}
              </div>
            </div>

            <div className="inline-flex items-center gap-1 rounded-lg bg-secondary p-1">
              {(['fields', 'settings'] as const).map(t => (
                <button key={t} onClick={() => setPreviewTab(t)} className={`rounded-md px-3 py-1.5 text-xs font-medium ${previewTab === t ? 'bg-card shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                  {t === 'fields' ? `Fields (${d.fields.length})` : 'Settings & style'}
                </button>
              ))}
            </div>

            {previewTab === 'fields' ? (
              <div className="space-y-2">
                {d.fields.map((f, i) => (
                  <div key={f.id} className="rounded-2xl bg-card shadow-sm p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <button onClick={() => moveField(i, -1)} disabled={i === 0} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                        <button onClick={() => moveField(i, 1)} disabled={i === d.fields.length - 1} className="text-muted-foreground hover:text-foreground disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                      </div>
                      <GlassInput value={f.label} onChange={e => patchField(f.id, { label: e.target.value })} placeholder="Label" className="flex-1 h-9" />
                      <GlassSelect value={f.type} onChange={v => patchField(f.id, { type: v as FieldType, map_to: DEFAULT_MAP[v as FieldType], options: v === 'select' ? (f.options || ['Option A', 'Option B']) : undefined })} options={FIELD_TYPES} className="w-36" />
                      <button onClick={() => patchDraft({ fields: d.fields.filter(x => x.id !== f.id) })} className="text-muted-foreground hover:text-destructive" title="Remove field"><X className="w-4 h-4" /></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pl-6">
                      {f.type !== 'hidden' && f.type !== 'checkbox' && (
                        <GlassInput value={f.placeholder || ''} onChange={e => patchField(f.id, { placeholder: e.target.value })} placeholder="Placeholder (optional)" className="h-9 text-xs" />
                      )}
                      {f.type === 'hidden' && (
                        <GlassInput value={f.value || ''} onChange={e => patchField(f.id, { value: e.target.value })} placeholder="Value to send" className="h-9 text-xs" />
                      )}
                      {f.type === 'select' && (
                        <GlassInput value={(f.options || []).join(', ')} onChange={e => patchField(f.id, { options: e.target.value.split(',').map(s => s.trimStart()) })} placeholder="Options, comma separated" className="h-9 text-xs" />
                      )}
                      <GlassSelect value={f.map_to || 'custom'} onChange={v => patchField(f.id, { map_to: v })} options={MAP_TARGETS} className="text-xs" />
                      <div className="flex items-center gap-3 text-xs">
                        {f.type !== 'hidden' && (
                          <label className="flex items-center gap-1.5"><input type="checkbox" checked={!!f.required} onChange={e => patchField(f.id, { required: e.target.checked })} className="rounded border-border" /> Required</label>
                        )}
                        {f.type !== 'hidden' && (
                          <label className="flex items-center gap-1.5"><input type="checkbox" checked={f.width === 'half'} onChange={e => patchField(f.id, { width: e.target.checked ? 'half' : 'full' })} className="rounded border-border" /> Half width</label>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex flex-wrap gap-1.5">
                  {FIELD_TYPES.map(t => (
                    <button key={t.value} onClick={() => addField(t.value)} className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium hover:bg-secondary">
                      <Plus className="w-3 h-3" /> {t.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-card shadow-sm p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Title shown above the form</label>
                  <GlassInput value={d.settings.title || ''} onChange={e => patchDraft({ settings: { ...d.settings, title: e.target.value } })} placeholder="Get in touch" />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Description (optional)</label>
                  <GlassInput value={d.settings.description || ''} onChange={e => patchDraft({ settings: { ...d.settings, description: e.target.value } })} placeholder="We reply within one business day." />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Button label</label>
                  <GlassInput value={d.settings.submit_label || ''} onChange={e => patchDraft({ settings: { ...d.settings, submit_label: e.target.value } })} placeholder="Send" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Accent colour</label>
                  <div className="flex items-center gap-2">
                    <input type="color" value={d.settings.accent || '#2A2722'} onChange={e => patchDraft({ settings: { ...d.settings, accent: e.target.value } })} className="h-10 w-12 rounded-md border border-border bg-card p-1" />
                    <GlassInput value={d.settings.accent || ''} onChange={e => patchDraft({ settings: { ...d.settings, accent: e.target.value } })} placeholder="#2A2722" className="font-mono text-xs" />
                  </div>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Message after sending</label>
                  <GlassInput value={d.settings.success_message || ''} onChange={e => patchDraft({ settings: { ...d.settings, success_message: e.target.value } })} placeholder="Thanks! We'll be in touch shortly." />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Or redirect to a page after sending (optional)</label>
                  <GlassInput value={d.settings.redirect_url || ''} onChange={e => patchDraft({ settings: { ...d.settings, redirect_url: e.target.value } })} placeholder="https://yoursite.com/thank-you" className="font-mono text-xs" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Campaign tag on leads (optional)</label>
                  <GlassInput value={d.settings.campaign || ''} onChange={e => patchDraft({ settings: { ...d.settings, campaign: e.target.value } })} placeholder="e.g. Autumn landing page" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Background</label>
                  <GlassSelect value={d.settings.background || 'card'} onChange={v => patchDraft({ settings: { ...d.settings, background: v as 'card' | 'transparent' } })} options={[{ value: 'card', label: 'White card' }, { value: 'transparent', label: 'Transparent (blend into the page)' }]} />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground">Consent / privacy note under the fields (optional)</label>
                  <GlassInput value={d.settings.consent_text || ''} onChange={e => patchDraft({ settings: { ...d.settings, consent_text: e.target.value } })} placeholder="By sending this form you agree to be contacted about your request." />
                </div>
              </div>
            )}
          </div>

          {/* Right: live preview */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5"><Eye className="w-3.5 h-3.5" /> Preview</p>
            <div className="rounded-2xl bg-[#F0F0EC] p-6 xl:sticky xl:top-4">
              <FormPreview fields={d.fields} settings={d.settings} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---------- List ----------
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><FormInput className="w-4 h-4" /><span className="text-sm">Forms</span></div>
          <p className="text-2xl font-bold">{forms.length}</p>
          <p className="text-xs text-[#9B9B9B] mt-1">{forms.filter(f => f.enabled).length} live</p>
        </div>
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 text-muted-foreground mb-1"><Link2 className="w-4 h-4" /><span className="text-sm">Submissions</span></div>
          <p className="text-2xl font-bold">{totalSubmissions}</p>
        </div>
        <div className="glass-panel p-4 md:col-span-2 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold">Collect leads from any website</p>
            <p className="text-xs text-muted-foreground">Build a form, paste two lines of code on your site (or share the hosted page). Every submission becomes a lead.</p>
          </div>
          {canManage && <GlassButtonNew variant="primary" onClick={startNew} leftIcon={<Plus className="w-4 h-4" />}>New form</GlassButtonNew>}
        </div>
      </div>

      {forms.length === 0 ? (
        <div className="glass-panel p-12 text-center">
          <FormInput className="w-12 h-12 mx-auto mb-3 text-[#9B9B9B]" />
          <p className="font-semibold mb-1">No forms yet</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">Create one, then embed it on your website, landing page or blog. Leads land in the pipeline with the form's name as source.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {forms.map(form => {
            const open = expandedId === form.id;
            const rows = submissions[form.id] || [];
            const showEmbed = embedId === form.id;
            const pageUrl = `${window.location.origin}/f/${form.public_id}`;
            return (
              <div key={form.id} className="glass-panel">
                <div className="p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{form.name}</h3>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${form.enabled ? 'bg-green-100 text-green-700' : 'bg-secondary text-muted-foreground'}`}>{form.enabled ? 'Live' : 'Closed'}</span>
                        <span className="text-xs text-muted-foreground">{form.fields.length} field{form.fields.length === 1 ? '' : 's'}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {form.submissions_count} submission{form.submissions_count === 1 ? '' : 's'}
                        {form.last_submission_at ? ` · last ${formatDistanceToNow(new Date(form.last_submission_at), { addSuffix: true })}` : ' · nothing received yet'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-wrap">
                      <GlassButtonNew variant={showEmbed ? 'primary' : 'secondary'} size="sm" onClick={() => setEmbedId(showEmbed ? null : form.id)} leftIcon={<Code2 className="w-3.5 h-3.5" />}>Embed code</GlassButtonNew>
                      <a href={pageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 h-8 rounded-lg px-2.5 text-xs font-medium hover:bg-secondary"><ExternalLink className="w-3.5 h-3.5" /> Open page</a>
                      {canManage && (
                        <>
                          <GlassButtonNew variant="ghost" size="sm" onClick={() => startEdit(form)} leftIcon={<Pencil className="w-3.5 h-3.5" />}>Edit</GlassButtonNew>
                          <GlassButtonNew variant="ghost" size="sm" onClick={() => handleToggle(form)} leftIcon={form.enabled ? <PowerOff className="w-3.5 h-3.5" /> : <Power className="w-3.5 h-3.5" />}>{form.enabled ? 'Close' : 'Open'}</GlassButtonNew>
                          <GlassButtonNew variant="ghost" size="icon-sm" onClick={() => handleDelete(form)} title="Delete form" className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></GlassButtonNew>
                        </>
                      )}
                    </div>
                  </div>

                  {showEmbed && (
                    <div className="card-tinted p-4 space-y-3 text-sm">
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-xs">1. Paste where the form should appear (recommended)</p>
                          <button onClick={() => copy(`s-${form.id}`, embedSnippet(form.public_id))} className="inline-flex items-center gap-1 text-xs font-medium hover:underline">{copied === `s-${form.id}` ? <><Check className="w-3.5 h-3.5 text-green-600" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}</button>
                        </div>
                        <pre className="rounded-lg bg-[#2A2722] text-[#F7F7F5] p-3 text-[11px] overflow-x-auto font-mono whitespace-pre-wrap break-all">{embedSnippet(form.public_id)}</pre>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-xs">2. Or embed as an iframe (Webflow, Wix, Squarespace, WordPress)</p>
                          <button onClick={() => copy(`i-${form.id}`, iframeSnippet(form.public_id))} className="inline-flex items-center gap-1 text-xs font-medium hover:underline">{copied === `i-${form.id}` ? <><Check className="w-3.5 h-3.5 text-green-600" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}</button>
                        </div>
                        <pre className="rounded-lg bg-[#2A2722] text-[#F7F7F5] p-3 text-[11px] overflow-x-auto font-mono whitespace-pre-wrap break-all">{iframeSnippet(form.public_id)}</pre>
                      </div>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-xs">3. Or share the hosted page</p>
                          <button onClick={() => copy(`p-${form.id}`, pageUrl)} className="inline-flex items-center gap-1 text-xs font-medium hover:underline">{copied === `p-${form.id}` ? <><Check className="w-3.5 h-3.5 text-green-600" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}</button>
                        </div>
                        <input readOnly value={pageUrl} onFocus={e => e.currentTarget.select()} className="glass-input font-mono text-xs" />
                      </div>
                      <p className="text-[11px] text-muted-foreground">The script picks up UTM parameters and the page URL automatically and stores them on the lead. Spam is filtered with a hidden field and a minimum fill time. Works on any site; no CORS setup needed.</p>
                    </div>
                  )}
                </div>

                <button onClick={() => toggleExpanded(form)} className="w-full flex items-center gap-2 px-5 py-2.5 border-t border-border text-xs font-medium text-muted-foreground hover:bg-secondary transition-colors">
                  {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                  Recent submissions
                </button>
                {open && (
                  <div className="border-t border-border divide-y divide-border">
                    {rows.length === 0 ? (
                      <p className="p-4 text-xs text-muted-foreground">No submissions yet. Open the hosted page and send a test.</p>
                    ) : rows.map(ev => {
                      const p = ev.payload || {};
                      const preview = [p.name, p.email, p.company].filter(Boolean).join(' · ');
                      return (
                        <div key={ev.id} className="px-5 py-3 flex items-center gap-3 text-sm">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium shrink-0 ${ev.status === 'created' ? 'bg-green-100 text-green-700' : ev.status === 'duplicate' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-600'}`}>{ev.status}</span>
                          <div className="flex-1 min-w-0">
                            <p className="truncate">{ev.crm_deals?.title || preview || 'Submission'}</p>
                            <p className="text-xs text-muted-foreground truncate">{formatDistanceToNow(new Date(ev.created_at), { addSuffix: true })}{p.page_url ? ` · ${String(p.page_url)}` : ''}{ev.error ? ` · ${ev.error}` : ''}</p>
                          </div>
                          {ev.deal_id && onOpenDeal && (
                            <button onClick={() => onOpenDeal(ev.deal_id!)} className="text-muted-foreground hover:text-foreground shrink-0" title="Open lead"><ExternalLink className="w-4 h-4" /></button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
