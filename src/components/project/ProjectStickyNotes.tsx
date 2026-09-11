import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProjectTableRealtime } from '@/hooks/useProjectTableRealtime';
import { NOTE_THEMES, DEFAULT_NOTE_COLOR, normalizeNoteColor, getNoteTheme, sortNotesByRecent } from './sticky-notes/constants';
import type { StickyNoteData, StickyNoteColor } from './sticky-notes/types';

interface Props {
  projectId: string;
  profileId: string;
}

const AUTOSAVE_DELAY = 600;

export function ProjectStickyNotes({ projectId, profileId }: Props) {
  const { toast } = useToast();
  const [notes, setNotes] = useState<StickyNoteData[]>([]);
  const [loading, setLoading] = useState(true);
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const loadNotes = useCallback(async () => {
    const { data, error } = await supabase
      .from('project_sticky_notes')
      .select('*, profiles:author_id(full_name, avatar_url)')
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false });
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setNotes(sortNotesByRecent((data as StickyNoteData[]) ?? []));
    setLoading(false);
  }, [projectId, toast]);

  useEffect(() => {
    setLoading(true);
    void loadNotes();
    return () => { Object.values(timers.current).forEach(clearTimeout); };
  }, [loadNotes]);

  useProjectTableRealtime(['project_sticky_notes'], projectId, () => { void loadNotes(); });

  const addNote = async () => {
    const color: StickyNoteColor = NOTE_THEMES[notes.length % NOTE_THEMES.length].value;
    const { data, error } = await supabase
      .from('project_sticky_notes')
      .insert({ project_id: projectId, author_id: profileId, title: '', content: '', color })
      .select('*, profiles:author_id(full_name, avatar_url)')
      .single();
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setNotes(prev => [data as StickyNoteData, ...prev]);
    // Auto-focus the new note
    setTimeout(() => {
      const el = document.querySelector<HTMLTextAreaElement>(`textarea[data-note-id="${(data as any).id}"]`);
      el?.focus();
    }, 50);
  };

  const updateLocal = (id: string, patch: Partial<StickyNoteData>) => {
    setNotes(prev => prev.map(n => n.id === id ? { ...n, ...patch } : n));
  };

  const scheduleSave = (id: string, patch: Partial<StickyNoteData>) => {
    if (timers.current[id]) clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(async () => {
      await supabase.from('project_sticky_notes').update({
        ...patch,
        updated_at: new Date().toISOString(),
      }).eq('id', id);
    }, AUTOSAVE_DELAY);
  };

  const deleteNote = async (id: string) => {
    if (timers.current[id]) clearTimeout(timers.current[id]);
    setNotes(prev => prev.filter(n => n.id !== id));
    await supabase.from('project_sticky_notes').delete().eq('id', id);
  };

  const setColor = (id: string, color: StickyNoteColor) => {
    updateLocal(id, { color });
    scheduleSave(id, { color });
  };

  if (loading) {
    return <div className="text-xs text-muted-foreground py-4 text-center">Loading notes…</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{notes.length} {notes.length === 1 ? 'note' : 'notes'} · click any note to edit</p>
        <button
          onClick={addNote}
          className="px-3 py-1.5 text-xs rounded-full bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> New note
        </button>
      </div>

      {notes.length === 0 ? (
        <button
          onClick={addNote}
          className="w-full rounded-xl border-2 border-dashed border-border/40 p-8 text-center hover:border-primary/40 hover:bg-primary/5 transition"
        >
          <Plus className="w-5 h-5 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-xs text-muted-foreground">Click to add your first sticky note</p>
        </button>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {notes.map(note => {
            const theme = getNoteTheme(normalizeNoteColor(note.color));
            return (
              <div
                key={note.id}
                className="group relative rounded-xl border shadow-sm transition hover:shadow-md flex flex-col"
                style={{
                  backgroundColor: `hsl(${theme.surface})`,
                  borderColor: `hsl(${theme.border})`,
                  minHeight: '180px',
                }}
              >
                <div className="h-1.5 rounded-t-xl" style={{ backgroundColor: `hsl(${theme.accent})` }} />
                <div className="flex-1 p-3 flex flex-col gap-2">
                  <input
                    defaultValue={note.title || ''}
                    placeholder="Title"
                    onChange={e => { updateLocal(note.id, { title: e.target.value }); scheduleSave(note.id, { title: e.target.value }); }}
                    className="bg-transparent text-sm font-semibold focus:outline-none placeholder:text-foreground/30"
                    style={{ color: `hsl(${theme.text})` }}
                  />
                  <textarea
                    data-note-id={note.id}
                    defaultValue={note.content || ''}
                    placeholder="Write something..."
                    onChange={e => { updateLocal(note.id, { content: e.target.value }); scheduleSave(note.id, { content: e.target.value }); }}
                    className="flex-1 bg-transparent text-sm leading-relaxed focus:outline-none resize-none placeholder:text-foreground/30"
                    style={{ color: `hsl(${theme.text})` }}
                  />
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex gap-1">
                      {NOTE_THEMES.map(t => (
                        <button
                          key={t.value}
                          onClick={() => setColor(note.id, t.value)}
                          className={`w-3 h-3 rounded-full border ${note.color === t.value ? 'ring-1 ring-foreground/40' : ''}`}
                          style={{ backgroundColor: `hsl(${t.accent})`, borderColor: `hsl(${t.border})` }}
                          title={t.label}
                          aria-label={t.label}
                        />
                      ))}
                    </div>
                    <span className="text-[10px] opacity-60 truncate" style={{ color: `hsl(${theme.text})` }}>
                      {note.profiles?.full_name || ''}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => deleteNote(note.id)}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 rounded-md bg-background/70 hover:bg-destructive/10 hover:text-destructive transition"
                  title="Delete note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
