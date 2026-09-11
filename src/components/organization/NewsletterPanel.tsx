import { useEffect, useState } from 'react';
import { Loader2, Plus, Send, Tag, Trash2, RefreshCw, Mail, Users, Check, Copy, ChevronDown, ChevronRight, RotateCcw, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GlassButton, GlassInput } from '@/components/GlassCard';
import { NEWSLETTER_TEMPLATES, type TemplateId } from './newsletterTemplates';

interface NewsletterPanelProps {
  clusterId: string;
}

interface ResendAudience { id: string; name: string; created_at?: string }
interface Group { id: string; name: string; color: string | null }
interface Contact { id: string; email: string; full_name: string | null; group_ids: string[]; unsubscribed: boolean; resend_contact_id: string | null }
interface Campaign { id: string; subject: string; content: string; recipients_count: number; sent_at: string; group_id: string | null }

const COLORS = ['amber', 'purple', 'teal', 'rose', 'sky', 'emerald'];

export function NewsletterPanel({ clusterId }: NewsletterPanelProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [audiences, setAudiences] = useState<ResendAudience[]>([]);
  const [audienceId, setAudienceId] = useState<string>('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [view, setView] = useState<'audience' | 'send' | 'history'>('audience');

  // Forms
  const [newAudienceName, setNewAudienceName] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [newContact, setNewContact] = useState({ email: '', name: '' });
  const [campSubject, setCampSubject] = useState('');
  const [campContent, setCampContent] = useState('');
  const [campGroupId, setCampGroupId] = useState<string>('');
  const [templateId, setTemplateId] = useState<TemplateId>('minimal');
  const [sendMode, setSendMode] = useState<'individual' | 'bcc'>('individual');

  // Bulk import
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkGroupId, setBulkGroupId] = useState<string>('');
  const [bulkProgress, setBulkProgress] = useState<{ added: number; failed: number; total: number; skipped: number } | null>(null);

  const [filterGroupId, setFilterGroupId] = useState<string>('');

  useEffect(() => { loadAll(); }, [clusterId]);
  useEffect(() => { if (audienceId) loadContacts(); }, [audienceId]);

  async function loadAll() {
    setLoading(true);
    await Promise.all([loadAudiences(), loadGroups(), loadCampaigns()]);
    setLoading(false);
  }

  async function call(action: string, extra: Record<string, any> = {}) {
    const { data, error } = await supabase.functions.invoke('resend-newsletter', {
      body: { action, clusterId, ...extra },
    });
    if (error) throw new Error(error.message);
    if (data?.error) throw new Error(data.error);
    return data;
  }

  async function loadAudiences() {
    try {
      const data = await call('list_audiences');
      setAudiences(data.audiences || []);
      if (!audienceId && data.audiences?.[0]) setAudienceId(data.audiences[0].id);
    } catch (e) {
      toast({ title: 'Could not load audiences', description: (e as Error).message, variant: 'destructive' });
    }
  }
  async function loadGroups() {
    const { data } = await supabase.from('newsletter_groups').select('*').eq('cluster_id', clusterId).order('name');
    setGroups(data || []);
  }
  async function loadContacts() {
    if (!audienceId) { setContacts([]); return; }
    const { data } = await supabase.from('newsletter_contacts').select('*').eq('cluster_id', clusterId).eq('audience_id', audienceId).order('email');
    setContacts(data || []);
  }
  async function loadCampaigns() {
    const { data } = await supabase.from('newsletter_campaigns').select('*').eq('cluster_id', clusterId).order('sent_at', { ascending: false }).limit(20);
    setCampaigns(data || []);
  }

  async function createAudience() {
    if (!newAudienceName.trim()) return;
    setBusy(true);
    try {
      const data = await call('create_audience', { name: newAudienceName.trim() });
      setNewAudienceName('');
      await loadAudiences();
      if (data.audience?.id) setAudienceId(data.audience.id);
      toast({ title: 'Audience created' });
    } catch (e) { toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }); }
    setBusy(false);
  }

  async function syncContacts() {
    if (!audienceId) return;
    setBusy(true);
    try {
      const data = await call('sync_contacts', { audienceId });
      await loadContacts();
      toast({ title: `Synced ${data.synced} contacts` });
    } catch (e) { toast({ title: 'Sync failed', description: (e as Error).message, variant: 'destructive' }); }
    setBusy(false);
  }

  async function addContact() {
    if (!audienceId || !newContact.email.trim()) return;
    setBusy(true);
    try {
      await call('add_contact', { audienceId, email: newContact.email.trim(), fullName: newContact.name.trim() });
      setNewContact({ email: '', name: '' });
      await loadContacts();
      toast({ title: 'Contact added' });
    } catch (e) { toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }); }
    setBusy(false);
  }

  function parseBulk(text: string): { email: string; fullName?: string }[] {
    const out: { email: string; fullName?: string }[] = [];
    const seen = new Set<string>();
    // Split on newlines, commas, semicolons, tabs
    const chunks = text.split(/[\n;\t]+/).flatMap((line) => {
      // Handle "Name <email>" and "email, Name" and CSV rows
      const trimmed = line.trim();
      if (!trimmed) return [];
      // If the line has an email in angle brackets, treat as one entry
      if (/<[^>]+@[^>]+>/.test(trimmed)) return [trimmed];
      // Otherwise split on comma
      return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    });
    const emailRe = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/;
    let pendingName = '';
    for (const chunk of chunks) {
      const m = chunk.match(emailRe);
      if (!m) {
        // treat as a name for the next email
        pendingName = chunk.replace(/["']/g, '').trim();
        continue;
      }
      const email = m[1].toLowerCase();
      // Name = whatever surrounds the email, minus the email itself and brackets
      let name = chunk.replace(m[0], '').replace(/[<>"']/g, '').trim();
      if (!name && pendingName) { name = pendingName; pendingName = ''; }
      if (seen.has(email)) continue;
      seen.add(email);
      out.push({ email, fullName: name || undefined });
    }
    return out;
  }

  async function bulkImport() {
    if (!audienceId) return;
    const parsed = parseBulk(bulkText);
    if (parsed.length === 0) {
      toast({ title: 'No valid emails found', variant: 'destructive' });
      return;
    }
    if (!confirm(`Import ${parsed.length} contact${parsed.length === 1 ? '' : 's'} into this mailing list?`)) return;
    setBusy(true);
    setBulkProgress({ added: 0, failed: 0, total: parsed.length, skipped: 0 });
    try {
      const data = await call('bulk_add_contacts', {
        audienceId,
        contacts: parsed,
        groupIds: bulkGroupId ? [bulkGroupId] : [],
      });
      setBulkProgress({ added: data.added || 0, failed: data.failed || 0, total: data.total || parsed.length, skipped: data.skipped || 0 });
      await loadContacts();
      toast({
        title: `Imported ${data.added} of ${data.total}`,
        description: data.failed ? `${data.failed} failed${data.skipped ? `, ${data.skipped} skipped (invalid)` : ''}` : (data.skipped ? `${data.skipped} skipped (invalid)` : undefined),
      });
      if (!data.failed) { setBulkText(''); }
    } catch (e) {
      toast({ title: 'Import failed', description: (e as Error).message, variant: 'destructive' });
    }
    setBusy(false);
  }

  async function removeContact(c: Contact) {
    if (!confirm(`Remove ${c.email}?`)) return;
    try {
      await call('remove_contact', { audienceId, contactId: c.id, resendContactId: c.resend_contact_id, email: c.email });
      await loadContacts();
    } catch (e) { toast({ title: 'Error', description: (e as Error).message, variant: 'destructive' }); }
  }

  async function createGroup() {
    if (!newGroupName.trim()) return;
    const color = COLORS[groups.length % COLORS.length];
    const { error } = await supabase.from('newsletter_groups').insert({ cluster_id: clusterId, name: newGroupName.trim(), color });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setNewGroupName('');
    loadGroups();
  }

  async function deleteGroup(id: string) {
    if (!confirm('Delete this group? Contacts will be untagged.')) return;
    await supabase.from('newsletter_groups').delete().eq('id', id);
    // Remove from contact group_ids
    const affected = contacts.filter(c => c.group_ids?.includes(id));
    for (const c of affected) {
      await supabase.from('newsletter_contacts').update({ group_ids: c.group_ids.filter(g => g !== id) }).eq('id', c.id);
    }
    loadGroups(); loadContacts();
  }

  async function toggleContactGroup(contact: Contact, groupId: string) {
    const exists = contact.group_ids?.includes(groupId);
    const next = exists ? contact.group_ids.filter(g => g !== groupId) : [...(contact.group_ids || []), groupId];
    await supabase.from('newsletter_contacts').update({ group_ids: next }).eq('id', contact.id);
    loadContacts();
  }

  async function sendCampaign() {
    if (!campSubject.trim() || !campContent.trim()) return;
    if (!confirm(`Send to ${visibleRecipientsCount} recipient(s)?`)) return;
    setBusy(true);
    try {
      const data = await call('send_campaign', { audienceId, subject: campSubject.trim(), content: campContent.trim(), groupId: campGroupId || undefined, templateId, sendMode });
      toast({ title: `Sent to ${data.sent} recipients`, description: data.failed ? `${data.failed} failed` : undefined });
      setCampSubject(''); setCampContent(''); setCampGroupId('');
      loadCampaigns();
      setView('history');
    } catch (e) { toast({ title: 'Send failed', description: (e as Error).message, variant: 'destructive' }); }
    setBusy(false);
  }

  const filteredContacts = filterGroupId
    ? contacts.filter(c => c.group_ids?.includes(filterGroupId))
    : contacts;

  const visibleRecipientsCount = campGroupId
    ? contacts.filter(c => !c.unsubscribed && c.group_ids?.includes(campGroupId)).length
    : contacts.filter(c => !c.unsubscribed).length;

  if (loading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-1 p-1 bg-secondary/40 rounded-xl w-fit">
        {[
          { id: 'audience', label: 'Audience & Groups', icon: Users },
          { id: 'send', label: 'Send Newsletter', icon: Send },
          { id: 'history', label: 'History', icon: Mail },
        ].map(t => {
          const Icon = t.icon;
          const active = view === t.id;
          return (
            <button key={t.id} onClick={() => setView(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${active ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              <Icon className="w-4 h-4" />{t.label}
            </button>
          );
        })}
      </div>

      {/* Audience selector */}
      {audiences.length === 0 ? (
        <div className="glass-panel p-5">
          <p className="text-sm text-muted-foreground mb-3">No mailing list (audience) yet. Create one to start.</p>
          <div className="flex gap-2">
            <GlassInput value={newAudienceName} onChange={(e) => setNewAudienceName(e.target.value)} placeholder="e.g. CheckGrow Newsletter" />
            <GlassButton variant="primary" onClick={createAudience} disabled={busy || !newAudienceName.trim()}>
              <Plus className="w-4 h-4 mr-1" />Create
            </GlassButton>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-muted-foreground">Mailing list:</span>
          <select value={audienceId} onChange={(e) => setAudienceId(e.target.value)}
            className="bg-secondary/50 border border-border/30 rounded-lg px-3 py-1.5 text-sm">
            {audiences.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <button onClick={syncContacts} disabled={busy} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition">
            <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />Sync from Resend
          </button>
          <div className="flex gap-2 ml-auto">
            <GlassInput value={newAudienceName} onChange={(e) => setNewAudienceName(e.target.value)} placeholder="New audience name" />
            <GlassButton onClick={createAudience} disabled={busy || !newAudienceName.trim()}><Plus className="w-4 h-4" /></GlassButton>
          </div>
        </div>
      )}

      {view === 'audience' && audienceId && (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Groups */}
          <div className="md:col-span-1 space-y-4">
            <div className="glass-panel p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><Tag className="w-4 h-4" />Groups</h3>
              <div className="flex gap-2 mb-3">
                <GlassInput value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} placeholder="Group name" />
                <GlassButton onClick={createGroup} disabled={!newGroupName.trim()}><Plus className="w-4 h-4" /></GlassButton>
              </div>
              <div className="space-y-1">
                <button onClick={() => setFilterGroupId('')}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex justify-between items-center ${!filterGroupId ? 'bg-primary/10 text-primary' : 'hover:bg-secondary/50'}`}>
                  <span>All contacts</span>
                  <span className="text-xs text-muted-foreground">{contacts.length}</span>
                </button>
                {groups.map(g => {
                  const count = contacts.filter(c => c.group_ids?.includes(g.id)).length;
                  const active = filterGroupId === g.id;
                  return (
                    <div key={g.id} className={`flex items-center group rounded-lg ${active ? 'bg-primary/10' : 'hover:bg-secondary/50'}`}>
                      <button onClick={() => setFilterGroupId(g.id)} className={`flex-1 text-left px-3 py-2 text-sm flex justify-between items-center ${active ? 'text-primary' : ''}`}>
                        <span># {g.name}</span>
                        <span className="text-xs text-muted-foreground">{count}</span>
                      </button>
                      <button onClick={() => deleteGroup(g.id)} className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive transition">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
                {groups.length === 0 && <p className="text-xs text-muted-foreground px-3 py-2">No groups yet.</p>}
              </div>
            </div>
          </div>

          {/* Contacts */}
          <div className="md:col-span-2 space-y-4">
            <div className="glass-panel p-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Add contact</h3>
                <button
                  onClick={() => setBulkOpen(o => !o)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {bulkOpen ? 'Close bulk import' : 'Bulk import'}
                </button>
              </div>
              <div className="flex gap-2 flex-wrap">
                <GlassInput value={newContact.email} onChange={(e) => setNewContact(s => ({ ...s, email: e.target.value }))} placeholder="email@example.com" />
                <GlassInput value={newContact.name} onChange={(e) => setNewContact(s => ({ ...s, name: e.target.value }))} placeholder="Full name (optional)" />
                <GlassButton variant="primary" onClick={addContact} disabled={busy || !newContact.email.trim()}>
                  <Plus className="w-4 h-4 mr-1" />Add
                </GlassButton>
              </div>

              {bulkOpen && (
                <div className="mt-4 pt-4 border-t border-border/30 space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Paste emails — one per line, or comma-separated. Optional name supported:
                      <span className="block mt-1 text-[11px] font-mono text-muted-foreground/70">
                        jane@x.com{'\n'}John Doe &lt;john@x.com&gt;{'\n'}mary@x.com, Mary Smith
                      </span>
                    </label>
                    <textarea
                      value={bulkText}
                      onChange={(e) => setBulkText(e.target.value)}
                      placeholder="Paste your list here…"
                      rows={8}
                      className="w-full mt-2 bg-secondary/50 border border-border/30 rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary/40"
                    />
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {groups.length > 0 && (
                      <>
                        <span className="text-xs text-muted-foreground">Add to group:</span>
                        <select
                          value={bulkGroupId}
                          onChange={(e) => setBulkGroupId(e.target.value)}
                          className="bg-secondary/50 border border-border/30 rounded-lg px-3 py-1.5 text-sm"
                        >
                          <option value="">— none —</option>
                          {groups.map(g => <option key={g.id} value={g.id}>#{g.name}</option>)}
                        </select>
                      </>
                    )}
                    <div className="ml-auto flex items-center gap-3">
                      {bulkText.trim() && (
                        <span className="text-xs text-muted-foreground">
                          {parseBulk(bulkText).length} valid email{parseBulk(bulkText).length === 1 ? '' : 's'} detected
                        </span>
                      )}
                      <GlassButton variant="primary" onClick={bulkImport} disabled={busy || !bulkText.trim()}>
                        {busy ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
                        Import
                      </GlassButton>
                    </div>
                  </div>
                  {bulkProgress && (
                    <div className="text-xs text-muted-foreground bg-secondary/30 rounded-lg p-3">
                      Added <span className="text-foreground font-medium">{bulkProgress.added}</span> of {bulkProgress.total}
                      {bulkProgress.failed > 0 && <> · <span className="text-destructive">{bulkProgress.failed} failed</span></>}
                      {bulkProgress.skipped > 0 && <> · {bulkProgress.skipped} skipped (invalid)</>}
                    </div>
                  )}
                </div>
              )}
            </div>


            <div className="glass-panel p-2 max-h-[600px] overflow-y-auto">
              {filteredContacts.length === 0 ? (
                <p className="text-sm text-muted-foreground p-6 text-center">No contacts. Add one above or sync from Resend.</p>
              ) : (
                <div className="divide-y divide-border/30">
                  {filteredContacts.map(c => (
                    <div key={c.id} className="p-3 hover:bg-secondary/30 rounded-lg">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate">{c.full_name || c.email}</span>
                            {c.unsubscribed && <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">unsub</span>}
                          </div>
                          {c.full_name && <p className="text-xs text-muted-foreground truncate">{c.email}</p>}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {groups.map(g => {
                              const tagged = c.group_ids?.includes(g.id);
                              return (
                                <button key={g.id} onClick={() => toggleContactGroup(c, g.id)}
                                  className={`text-[11px] px-2 py-0.5 rounded-full border transition ${tagged ? 'bg-primary/15 border-primary/30 text-primary' : 'border-border/50 text-muted-foreground hover:border-primary/30 hover:text-foreground'}`}>
                                  {tagged && <Check className="w-2.5 h-2.5 inline mr-0.5" />}#{g.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <button onClick={() => removeContact(c)} className="p-1.5 text-muted-foreground hover:text-destructive transition">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'send' && audienceId && (() => {
        const senderName = audiences.find(a => a.id === audienceId)?.name || 'Newsletter';
        const tpl = NEWSLETTER_TEMPLATES.find(t => t.id === templateId) || NEWSLETTER_TEMPLATES[0];
        const previewHtml = tpl.render({ subject: campSubject, content: campContent, senderName });
        return (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="glass-panel p-6 space-y-4">
              <h3 className="font-semibold">Compose newsletter</h3>

              <div>
                <label className="text-xs text-muted-foreground">Design</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {NEWSLETTER_TEMPLATES.map(t => {
                    const active = templateId === t.id;
                    return (
                      <button key={t.id} onClick={() => setTemplateId(t.id)}
                        className={`text-left p-3 rounded-xl border transition ${active ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border/40 hover:border-primary/40 bg-secondary/30'}`}>
                        <div className="text-sm font-medium">{t.name}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{t.description}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Send to</label>
                <select value={campGroupId} onChange={(e) => setCampGroupId(e.target.value)}
                  className="w-full bg-secondary/50 border border-border/30 rounded-xl px-4 py-2.5 text-sm mt-1">
                  <option value="">Everyone ({contacts.filter(c => !c.unsubscribed).length})</option>
                  {groups.map(g => {
                    const n = contacts.filter(c => !c.unsubscribed && c.group_ids?.includes(g.id)).length;
                    return <option key={g.id} value={g.id}>#{g.name} ({n})</option>;
                  })}
                </select>
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Delivery</label>
                <div className="flex gap-1 p-1 bg-secondary/40 rounded-xl w-fit mt-1">
                  <button type="button" onClick={() => setSendMode('individual')}
                    className={`px-3 py-1.5 rounded-lg text-xs transition ${sendMode === 'individual' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    Individual emails
                  </button>
                  <button type="button" onClick={() => setSendMode('bcc')}
                    className={`px-3 py-1.5 rounded-lg text-xs transition ${sendMode === 'bcc' ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                    Single email · BCC all
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {sendMode === 'bcc'
                    ? 'One email sent with every recipient hidden in BCC. Faster but no per-person personalization.'
                    : 'Each recipient gets their own email. Recommended for newsletters.'}
                </p>
              </div>

              <GlassInput value={campSubject} onChange={(e) => setCampSubject(e.target.value)} placeholder="Subject" />
              <textarea value={campContent} onChange={(e) => setCampContent(e.target.value)}
                placeholder="Write your newsletter... (blank line = new paragraph)"
                className="w-full h-56 bg-secondary/50 border border-border/30 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50" />

              <div className="flex justify-between items-center">
                <p className="text-sm text-muted-foreground">Will send to <strong>{visibleRecipientsCount}</strong> contact(s)</p>
                <GlassButton variant="primary" onClick={sendCampaign} disabled={busy || !campSubject.trim() || !campContent.trim() || visibleRecipientsCount === 0}>
                  {busy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}Send Now
                </GlassButton>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-muted-foreground px-1">Live preview · {tpl.name}</p>
              <div className="rounded-xl overflow-hidden border border-border/40 bg-white">
                <iframe title="Newsletter preview" srcDoc={previewHtml} className="w-full h-[680px] bg-white" sandbox="" />
              </div>
            </div>
          </div>
        );
      })()}

      {view === 'history' && (
        <div className="glass-panel p-2 max-w-3xl">
          {campaigns.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">No newsletters sent yet.</p>
          ) : (
            <div className="divide-y divide-border/30">
              {campaigns.map(c => {
                const g = groups.find(gg => gg.id === c.group_id);
                const open = expandedCampaign === c.id;
                return (
                  <div key={c.id} className="p-4">
                    <button
                      onClick={() => setExpandedCampaign(open ? null : c.id)}
                      className="w-full flex items-center justify-between gap-3 text-left"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm truncate">{c.subject}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(c.sent_at).toLocaleString()} • {c.recipients_count} recipient(s)
                          {g && <> • #{g.name}</>}
                        </p>
                      </div>
                      {open ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    </button>

                    {open && (
                      <div className="mt-3 space-y-2">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(c.content || '');
                              toast({ title: 'Body copied to clipboard' });
                            }}
                            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-secondary/60 hover:bg-secondary transition"
                          >
                            <Copy className="w-3 h-3" /> Copy body
                          </button>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(`Subject: ${c.subject}\n\n${c.content || ''}`);
                              toast({ title: 'Subject + body copied' });
                            }}
                            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-secondary/60 hover:bg-secondary transition"
                          >
                            <Copy className="w-3 h-3" /> Copy subject + body
                          </button>
                          <button
                            onClick={() => {
                              setCampSubject(c.subject);
                              setCampContent(c.content || '');
                              setCampGroupId(c.group_id || '');
                              setView('send');
                            }}
                            className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/15 transition"
                          >
                            <RotateCcw className="w-3 h-3" /> Reuse in composer
                          </button>
                        </div>
                        <pre className="text-xs whitespace-pre-wrap font-sans bg-secondary/30 border border-border/30 rounded-lg p-3 max-h-80 overflow-y-auto">
{c.content || <span className="text-muted-foreground italic">(no body stored)</span>}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
