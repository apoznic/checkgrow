import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Flag, Calendar, Link as LinkIcon } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProjectTableRealtime } from '@/hooks/useProjectTableRealtime';

interface MeetingNote {
  id: string;
  project_id: string;
  author_id: string;
  meeting_date: string;
  title: string;
  summary: string;
  priority: 'low' | 'medium' | 'high';
  decisions: string;
  next_steps: string;
  created_at: string;
  updated_at: string;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
}

interface Props {
  projectId: string;
  profileId: string;
}

const AUTOSAVE_DELAY = 700;

const PRIORITY_STYLES: Record<string, { label: string; dot: string; ring: string; chip: string }> = {
  high: {
    label: 'High priority',
    dot: 'bg-rose-500',
    ring: 'ring-rose-400/60',
    chip: 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/30',
  },
  medium: {
    label: 'Medium priority',
    dot: 'bg-amber-500',
    ring: 'ring-amber-400/60',
    chip: 'bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  low: {
    label: 'Low priority',
    dot: 'bg-emerald-500',
    ring: 'ring-emerald-400/60',
    chip: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
};

export function MeetingNotesChain({ projectId, profileId }: Props) {
  const { toast } = useToast();
  const [notes, setNotes] = useState<MeetingNote[]>([]);
  const [loading, setLoading] = useState(true);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const load = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from('project_meeting_notes')
      .select('*, profiles:author_id(full_name, avatar_url)')
      .eq('project_id', projectId)
      .order('meeting_date', { ascending: false });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setNotes((data ?? []) as MeetingNote[]);
    setLoading(false);
  }, [projectId, toast]);

  useEffect(() => {
    setLoading(true);
    void load();
    return () => { Object.values(timers.current).forEach(clearTimeout); };
  }, [load]);

  useProjectTableRealtime(['project_meeting_notes'], projectId, () => { void load(); });

  const addNote = async () => {
    const today = new Date().toISOString();
    const { data, error } = await (supabase as any)
      .from('project_meeting_notes')
      .insert({
        project_id: projectId,
        author_id: profileId,
        meeting_date: today,
        title: '',
        summary: '',
        priority: 'medium',
        decisions: '',
        next_steps: '',
      })
      .select('*, profiles:author_id(full_name, avatar_url)')
      .single();
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setNotes(prev => [data as MeetingNote, ...prev]);
    setTimeout(() => {
      document.querySelector<HTMLInputElement>(`input[data-note-title="${(data as any).id}"]`)?.focus();
    }, 50);
  };

  const updateLocal = (id: string, patch: Partial<MeetingNote>) => {
    setNotes(prev => prev.map(n => (n.id === id ? { ...n, ...patch } : n)));
  };

  const scheduleSave = (id: string, patch: Partial<MeetingNote>) => {
    if (timers.current[id]) clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(async () => {
      await (supabase as any)
        .from('project_meeting_notes')
        .update(patch)
        .eq('id', id);
    }, AUTOSAVE_DELAY);
  };

  const deleteNote = async (id: string) => {
    if (!confirm('Delete this meeting note?')) return;
    if (timers.current[id]) clearTimeout(timers.current[id]);
    setNotes(prev => prev.filter(n => n.id !== id));
    await (supabase as any).from('project_meeting_notes').delete().eq('id', id);
  };

  if (loading) {
    return <div className="text-xs text-muted-foreground py-4 text-center">Loading meeting chain…</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {notes.length} {notes.length === 1 ? 'meeting' : 'meetings'} · newest at the top
        </p>
        <button
          onClick={addNote}
          className="px-3 py-1.5 text-xs rounded-full bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> New meeting note
        </button>
      </div>

      {notes.length === 0 ? (
        <button
          onClick={addNote}
          className="w-full rounded-xl border-2 border-dashed border-border/40 p-8 text-center hover:border-primary/40 hover:bg-primary/5 transition"
        >
          <Plus className="w-5 h-5 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-xs text-muted-foreground">Start the chain — add your first meeting note</p>
        </button>
      ) : (
        <div className="relative pl-8">
          {/* Vertical chain line */}
          <div className="absolute left-3 top-2 bottom-2 w-px bg-gradient-to-b from-primary/40 via-border to-transparent" />

          <div className="space-y-4">
            {notes.map((note, idx) => {
              const p = PRIORITY_STYLES[note.priority] || PRIORITY_STYLES.medium;
              const dateValue = note.meeting_date ? format(new Date(note.meeting_date), "yyyy-MM-dd'T'HH:mm") : '';
              return (
                <div key={note.id} className="relative">
                  {/* Chain link dot */}
                  <div className={`absolute -left-[1.35rem] top-5 w-3 h-3 rounded-full ${p.dot} ring-4 ${p.ring} ring-offset-2 ring-offset-background`} />
                  {/* Connector chain icon */}
                  {idx < notes.length - 1 && (
                    <LinkIcon className="absolute -left-[1.1rem] top-[5.5rem] w-2.5 h-2.5 text-muted-foreground/40 rotate-90" />
                  )}

                  <div className="rounded-xl border border-border bg-card shadow-sm hover:shadow-md transition p-4 group">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1 min-w-0 space-y-2">
                        <input
                          data-note-title={note.id}
                          defaultValue={note.title}
                          placeholder="Meeting title (e.g. Weekly sync, Kickoff…)"
                          onChange={e => { updateLocal(note.id, { title: e.target.value }); scheduleSave(note.id, { title: e.target.value }); }}
                          className="bg-transparent text-base font-semibold w-full focus:outline-none placeholder:text-muted-foreground/50"
                        />
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="w-3.5 h-3.5" />
                            <input
                              type="datetime-local"
                              defaultValue={dateValue}
                              onChange={e => {
                                const iso = e.target.value ? new Date(e.target.value).toISOString() : new Date().toISOString();
                                updateLocal(note.id, { meeting_date: iso });
                                scheduleSave(note.id, { meeting_date: iso });
                              }}
                              className="bg-transparent text-xs focus:outline-none"
                            />
                          </div>
                          <select
                            defaultValue={note.priority}
                            onChange={e => {
                              const v = e.target.value as MeetingNote['priority'];
                              updateLocal(note.id, { priority: v });
                              scheduleSave(note.id, { priority: v });
                            }}
                            className={`text-[11px] px-2 py-0.5 rounded-full border focus:outline-none ${p.chip}`}
                          >
                            <option value="high">High priority</option>
                            <option value="medium">Medium priority</option>
                            <option value="low">Low priority</option>
                          </select>
                          {note.profiles?.full_name && (
                            <span className="text-[11px] text-muted-foreground">· {note.profiles.full_name}</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => deleteNote(note.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive transition"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-lg border border-border/60 bg-background/50 p-2.5">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Flag className="w-3 h-3 text-muted-foreground/60" />
                          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">Summary</span>
                        </div>
                        <textarea
                          defaultValue={note.summary}
                          placeholder="What was discussed…"
                          onChange={e => { updateLocal(note.id, { summary: e.target.value }); scheduleSave(note.id, { summary: e.target.value }); }}
                          className="w-full bg-transparent text-sm leading-relaxed focus:outline-none resize-none placeholder:text-muted-foreground/40 min-h-[160px]"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <Field
                          label="Decisions"
                          value={note.decisions}
                          placeholder="What did we decide…"
                          onChange={v => { updateLocal(note.id, { decisions: v }); scheduleSave(note.id, { decisions: v }); }}
                        />
                        <Field
                          label="Next steps"
                          value={note.next_steps}
                          placeholder="Action items, owners…"
                          onChange={v => { updateLocal(note.id, { next_steps: v }); scheduleSave(note.id, { next_steps: v }); }}
                          accentClass="border-primary/30"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label, value, placeholder, onChange, accentClass,
}: { label: string; value: string; placeholder: string; onChange: (v: string) => void; accentClass?: string }) {
  return (
    <div className={`rounded-lg border border-border/60 bg-background/50 p-2.5 ${accentClass || ''}`}>
      <div className="flex items-center gap-1.5 mb-1">
        <Flag className="w-3 h-3 text-muted-foreground/60" />
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">{label}</span>
      </div>
      <textarea
        defaultValue={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-transparent text-sm leading-relaxed focus:outline-none resize-none placeholder:text-muted-foreground/40 min-h-[72px]"
      />
    </div>
  );
}
