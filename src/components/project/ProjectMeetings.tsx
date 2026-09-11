import { useEffect, useState } from 'react';
import {
  Plus, Trash2, CalendarClock, CalendarPlus, Pencil, Loader2, X, Check,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProjectTableRealtime } from '@/hooks/useProjectTableRealtime';
import { format, isPast } from 'date-fns';

interface Props {
  projectId: string;
  profileId: string;
}

interface Meeting {
  id: string;
  title: string;
  meeting_at: string;
  location: string | null;
  attendees: string | null;
  notes: string | null;
}

const combineDateTime = (date: string, time: string): string | null => {
  if (!date) return null;
  const parts = date.includes('/') ? date.split('/') : null;
  let iso: Date;
  if (parts && parts.length === 3) {
    const [dd, mm, yyyy] = parts;
    iso = new Date(`${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${time || '00:00'}`);
  } else {
    iso = new Date(`${date}T${time || '00:00'}`);
  }
  return isNaN(iso.getTime()) ? null : iso.toISOString();
};

export function ProjectMeetings({ projectId, profileId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<Meeting[]>([]);

  const [newMeeting, setNewMeeting] = useState({ title: '', date: '', time: '', location: '', attendees: '', notes: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editing, setEditing] = useState({ title: '', date: '', time: '', location: '', attendees: '', notes: '' });

  useEffect(() => { void load(); }, [projectId]);

  useProjectTableRealtime(['project_meetings'], projectId, () => { void load(); });

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('project_meetings')
      .select('*')
      .eq('project_id', projectId)
      .order('meeting_at', { ascending: true });
    setMeetings(data || []);
    setLoading(false);
  };

  const add = async () => {
    if (!newMeeting.title.trim()) {
      toast({ title: 'Title required', variant: 'destructive' }); return;
    }
    const iso = combineDateTime(newMeeting.date, newMeeting.time);
    if (!iso) { toast({ title: 'Date required', description: 'Use dd/mm/yyyy.', variant: 'destructive' }); return; }
    const { error } = await (supabase as any).from('project_meetings').insert({
      project_id: projectId,
      created_by: profileId,
      title: newMeeting.title.trim(),
      meeting_at: iso,
      location: newMeeting.location.trim() || null,
      attendees: newMeeting.attendees.trim() || null,
      notes: newMeeting.notes.trim() || null,
    });
    if (error) { toast({ title: 'Could not add', description: error.message, variant: 'destructive' }); return; }
    setNewMeeting({ title: '', date: '', time: '', location: '', attendees: '', notes: '' });
    toast({ title: 'Meeting added' });
    load();
  };

  const startEdit = (m: Meeting) => {
    const d = new Date(m.meeting_at);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    setEditingId(m.id);
    setEditing({
      title: m.title,
      date: `${dd}/${mm}/${d.getFullYear()}`,
      time: `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`,
      location: m.location || '',
      attendees: m.attendees || '',
      notes: m.notes || '',
    });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    if (!editing.title.trim()) { toast({ title: 'Title required', variant: 'destructive' }); return; }
    const iso = combineDateTime(editing.date, editing.time);
    if (!iso) { toast({ title: 'Invalid date', description: 'Use dd/mm/yyyy.', variant: 'destructive' }); return; }
    const { error } = await (supabase as any).from('project_meetings').update({
      title: editing.title.trim(),
      meeting_at: iso,
      location: editing.location.trim() || null,
      attendees: editing.attendees.trim() || null,
      notes: editing.notes.trim() || null,
    }).eq('id', editingId);
    if (error) { toast({ title: 'Update failed', description: error.message, variant: 'destructive' }); return; }
    setEditingId(null);
    load();
  };

  const remove = async (id: string) => {
    setMeetings(prev => prev.filter(m => m.id !== id));
    await (supabase as any).from('project_meetings').delete().eq('id', id);
  };

  const downloadICS = (m: Meeting) => {
    const start = new Date(m.meeting_at);
    const end = new Date(start.getTime() + 60 * 60 * 1000);
    const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const escape = (s: string) => s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    const desc = [m.notes, m.attendees ? `Attendees: ${m.attendees}` : ''].filter(Boolean).join('\\n\\n');
    const ics = [
      'BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//CheckGrow//Project//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH',
      'BEGIN:VEVENT', `UID:${m.id}@checkgrow.com`, `DTSTAMP:${fmt(new Date())}`,
      `DTSTART:${fmt(start)}`, `DTEND:${fmt(end)}`,
      `SUMMARY:${escape(m.title)}`,
      m.location ? `LOCATION:${escape(m.location)}` : '',
      desc ? `DESCRIPTION:${escape(desc)}` : '',
      'END:VEVENT','END:VCALENDAR',
    ].filter(Boolean).join('\r\n');
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${m.title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().slice(0,40) || 'meeting'}.ics`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;

  const upcoming = meetings.filter(m => !isPast(new Date(m.meeting_at)));
  const past = meetings.filter(m => isPast(new Date(m.meeting_at)));

  return (
    <div className="space-y-4">
      {/* Add meeting form */}
      <div className="rounded-xl border border-border/40 bg-card p-3 space-y-2">
        <input
          value={newMeeting.title}
          onChange={e => setNewMeeting(p => ({ ...p, title: e.target.value }))}
          placeholder="Meeting title"
          className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg"
        />
        <div className="grid grid-cols-2 gap-2">
          <input
            value={newMeeting.date}
            onChange={e => setNewMeeting(p => ({ ...p, date: e.target.value }))}
            placeholder="dd/mm/yyyy"
            className="px-3 py-2 text-sm bg-input border border-border rounded-lg"
          />
          <input
            type="time"
            value={newMeeting.time}
            onChange={e => setNewMeeting(p => ({ ...p, time: e.target.value }))}
            className="px-3 py-2 text-sm bg-input border border-border rounded-lg"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            value={newMeeting.location}
            onChange={e => setNewMeeting(p => ({ ...p, location: e.target.value }))}
            placeholder="Location / link"
            className="px-3 py-2 text-sm bg-input border border-border rounded-lg"
          />
          <input
            value={newMeeting.attendees}
            onChange={e => setNewMeeting(p => ({ ...p, attendees: e.target.value }))}
            placeholder="Attendees"
            className="px-3 py-2 text-sm bg-input border border-border rounded-lg"
          />
        </div>
        <textarea
          value={newMeeting.notes}
          onChange={e => setNewMeeting(p => ({ ...p, notes: e.target.value }))}
          placeholder="Notes (optional)"
          rows={2}
          className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg resize-none"
        />
        <div className="flex justify-end">
          <button onClick={add} className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1">
            <Plus className="w-4 h-4" /> Add meeting
          </button>
        </div>
      </div>

      {/* Meeting lists */}
      {[
        { label: 'Upcoming', items: upcoming },
        { label: 'Past', items: past },
      ].map(section => section.items.length > 0 && (
        <div key={section.label} className="space-y-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 px-1">{section.label}</p>
          {section.items.map(m => {
            const isEditing = editingId === m.id;
            if (isEditing) {
              return (
                <div key={m.id} className="p-3 rounded-xl bg-card border border-primary/40 space-y-2">
                  <input value={editing.title} onChange={e => setEditing(p => ({ ...p, title: e.target.value }))} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg" />
                  <div className="grid grid-cols-2 gap-2">
                    <input value={editing.date} onChange={e => setEditing(p => ({ ...p, date: e.target.value }))} placeholder="dd/mm/yyyy" className="px-3 py-2 text-sm bg-input border border-border rounded-lg" />
                    <input type="time" value={editing.time} onChange={e => setEditing(p => ({ ...p, time: e.target.value }))} className="px-3 py-2 text-sm bg-input border border-border rounded-lg" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input value={editing.location} onChange={e => setEditing(p => ({ ...p, location: e.target.value }))} placeholder="Location / link" className="px-3 py-2 text-sm bg-input border border-border rounded-lg" />
                    <input value={editing.attendees} onChange={e => setEditing(p => ({ ...p, attendees: e.target.value }))} placeholder="Attendees" className="px-3 py-2 text-sm bg-input border border-border rounded-lg" />
                  </div>
                  <textarea value={editing.notes} onChange={e => setEditing(p => ({ ...p, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg resize-none" />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-secondary flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancel</button>
                    <button onClick={saveEdit} className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Save</button>
                  </div>
                </div>
              );
            }
            const d = new Date(m.meeting_at);
            return (
              <div key={m.id} className="group p-3 rounded-xl bg-card border border-border/40 hover:border-primary/30 transition flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <CalendarClock className="w-4 h-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{m.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {format(d, 'dd/MM/yyyy')} · {format(d, 'HH:mm')}
                    {m.location ? ` · ${m.location}` : ''}
                  </p>
                  {m.attendees && <p className="text-[11px] text-muted-foreground">{m.attendees}</p>}
                  {m.notes && <p className="text-xs text-muted-foreground/80 mt-1 whitespace-pre-wrap">{m.notes}</p>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => downloadICS(m)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary p-1" title="Download .ics">
                    <CalendarPlus className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => startEdit(m)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary p-1" title="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => remove(m.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ))}

      {meetings.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border/40 p-6 text-center">
          <CalendarClock className="w-5 h-5 mx-auto text-muted-foreground/40 mb-2" />
          <p className="text-xs text-muted-foreground/70">No meetings scheduled yet.</p>
        </div>
      )}
    </div>
  );
}
