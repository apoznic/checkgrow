import { useEffect, useState } from 'react';
import { Loader2, Send, ListChecks, Mail, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GlassButton } from '@/components/GlassCard';

interface TaskItem {
  id: string;
  title: string;
  status: string;
  priority: string;
  due_date: string | null;
  project_name: string;
}

interface Recipient {
  profileId: string;
  name: string;
  email: string;
  tasks: TaskItem[];
}

function renderEmailHtml(r: Recipient, clusterName: string) {
  const byProject = new Map<string, TaskItem[]>();
  for (const t of r.tasks) {
    if (!byProject.has(t.project_name)) byProject.set(t.project_name, []);
    byProject.get(t.project_name)!.push(t);
  }
  const sections = Array.from(byProject.entries())
    .map(([projectName, ts]) => {
      const rows = ts
        .map((t) => {
          const due = t.due_date
            ? `<span style="color:#888;font-size:12px;"> · due ${new Date(t.due_date).toLocaleDateString()}</span>`
            : '';
          const prio = t.priority && t.priority !== 'medium'
            ? `<span style="background:#f3f3f3;color:#666;font-size:11px;padding:2px 6px;border-radius:4px;margin-left:6px;">${t.priority}</span>`
            : '';
          return `<li style="margin:6px 0;color:#333;">${t.title}${prio}${due}</li>`;
        })
        .join('');
      return `<div style="margin:20px 0;"><h3 style="font-size:14px;color:#1a1612;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px;">${projectName}</h3><ul style="padding-left:20px;margin:0;">${rows}</ul></div>`;
    })
    .join('');

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;color:#1a1612;background:#fff;">
    <h1 style="font-size:22px;margin:0 0 8px;">Hi ${r.name},</h1>
    <p style="color:#555;margin:0 0 24px;">Here's a snapshot of your open tasks across ${clusterName}.</p>
    <div style="background:#fafaf8;border:1px solid #eee;border-radius:12px;padding:20px;">
      <p style="margin:0 0 4px;font-size:13px;color:#888;">${r.tasks.length} open task${r.tasks.length === 1 ? '' : 's'}</p>
      ${sections}
    </div>
    <p style="color:#888;font-size:12px;margin-top:24px;">Sent from ${clusterName} · CheckGrow</p>
  </div>`;
}

export function TaskRemindersPanel({ clusterId }: { clusterId: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [clusterName, setClusterName] = useState<string>('your organization');

  useEffect(() => {
    supabase.from('clusters').select('name').eq('id', clusterId).single()
      .then(({ data }) => { if (data?.name) setClusterName(data.name); });
  }, [clusterId]);

  const loadPreview = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('send-task-reminders', {
      body: { clusterId, mode: 'preview' },
    });
    if (error) {
      toast({ title: 'Failed to load preview', description: error.message, variant: 'destructive' });
    } else {
      setRecipients(data?.recipients || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPreview();
  }, [clusterId]);

  const handleSend = async () => {
    if (!confirm(`Send task reminder emails to ${recipients.length} member${recipients.length === 1 ? '' : 's'}?`)) return;
    setSending(true);
    const { data, error } = await supabase.functions.invoke('send-task-reminders', {
      body: { clusterId, mode: 'send' },
    });
    if (error || data?.error) {
      toast({ title: 'Failed to send', description: data?.error || error?.message, variant: 'destructive' });
    } else {
      toast({ title: `📧 Sent ${data.sent}/${data.total} reminder emails` });
      if (data.errors?.length) {
        console.warn('Email errors:', data.errors);
      }
    }
    setSending(false);
  };

  const totalTasks = recipients.reduce((s, r) => s + r.tasks.length, 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Task Reminders</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Email every member a digest of their open tasks across all projects in this organization.
          </p>
        </div>
        <GlassButton
          variant="primary"
          onClick={handleSend}
          disabled={sending || recipients.length === 0}
        >
          {sending ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
          ) : (
            <><Send className="w-4 h-4 mr-2" />Send to {recipients.length}</>
          )}
        </GlassButton>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
            <Mail className="w-3.5 h-3.5" />Recipients
          </div>
          <div className="text-2xl font-semibold mt-1">{recipients.length}</div>
        </div>
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
            <ListChecks className="w-3.5 h-3.5" />Open tasks
          </div>
          <div className="text-2xl font-semibold mt-1">{totalTasks}</div>
        </div>
        <div className="glass-panel p-4">
          <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide">
            Avg / person
          </div>
          <div className="text-2xl font-semibold mt-1">
            {recipients.length ? (totalTasks / recipients.length).toFixed(1) : '0'}
          </div>
        </div>
      </div>

      {recipients.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <ListChecks className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No members have open tasks right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
          {/* Recipient list */}
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground uppercase tracking-wide px-1">
              Recipients ({recipients.length})
            </p>
            <div className="space-y-1 max-h-[600px] overflow-y-auto pr-1">
              {recipients.map((r) => {
                const active = (previewId ?? recipients[0]?.profileId) === r.profileId;
                return (
                  <button
                    key={r.profileId}
                    onClick={() => setPreviewId(r.profileId)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      active
                        ? 'border-primary/40 bg-primary/5'
                        : 'border-border/30 hover:bg-secondary/30'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate">{r.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{r.email}</div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground flex-shrink-0">
                        {r.tasks.length}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Email preview */}
          {(() => {
            const r = recipients.find((x) => x.profileId === previewId) ?? recipients[0];
            if (!r) return null;
            const subject = `📋 Your open tasks in ${clusterName} (${r.tasks.length})`;
            return (
              <div className="glass-panel overflow-hidden flex flex-col">
                <div className="border-b border-border/30 p-4 space-y-1 bg-secondary/20">
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">Email preview</div>
                  <div className="text-sm"><span className="text-muted-foreground">To: </span>{r.email}</div>
                  <div className="text-sm"><span className="text-muted-foreground">Subject: </span>{subject}</div>
                </div>
                <iframe
                  title={`Preview ${r.email}`}
                  srcDoc={renderEmailHtml(r, clusterName)}
                  className="w-full bg-white border-0"
                  style={{ height: 560 }}
                  sandbox=""
                />
              </div>
            );
          })()}
        </div>
      )}

      <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm">
        <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
        <p className="text-muted-foreground">
          Emails are sent via the organization's Resend integration. Each member only sees their own tasks.
        </p>
      </div>
    </div>
  );
}
