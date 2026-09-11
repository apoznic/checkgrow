import { useEffect, useState } from 'react';
import { CheckSquare, Plus, Trash2, Loader2, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProjectTableRealtime } from '@/hooks/useProjectTableRealtime';

interface ChecklistItem {
  id: string;
  question: string;
  created_by: string;
  created_at: string;
}

interface Confirmation {
  id: string;
  item_id: string;
  profile_id: string;
  confirmed_at: string;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
}

interface ProjectChecklistProps {
  projectId: string;
  profileId: string;
}

export function ProjectChecklist({ projectId, profileId }: ProjectChecklistProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [confirmations, setConfirmations] = useState<Confirmation[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [adding, setAdding] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: itemsData } = await (supabase as any)
      .from('project_checklist_items')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    const itemIds = (itemsData || []).map((i: ChecklistItem) => i.id);
    let confs: Confirmation[] = [];
    if (itemIds.length) {
      const { data: confData } = await (supabase as any)
        .from('project_checklist_confirmations')
        .select('*, profiles:profile_id(full_name, avatar_url)')
        .in('item_id', itemIds);
      confs = confData || [];
    }
    setItems(itemsData || []);
    setConfirmations(confs);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [projectId]);

  useProjectTableRealtime(['project_checklist_items', 'project_checklist_confirmations'], projectId, () => { void load(); });

  const handleAdd = async () => {
    const q = newQuestion.trim();
    if (!q) return;
    setAdding(true);
    const { error } = await (supabase as any)
      .from('project_checklist_items')
      .insert({ project_id: projectId, question: q, created_by: profileId });
    setAdding(false);
    if (error) {
      toast({ title: 'Could not add', description: error.message, variant: 'destructive' });
      return;
    }
    setNewQuestion('');
    load();
  };

  const handleDelete = async (id: string) => {
    const { error } = await (supabase as any)
      .from('project_checklist_items').delete().eq('id', id);
    if (error) {
      toast({ title: 'Could not delete', description: error.message, variant: 'destructive' });
      return;
    }
    load();
  };

  const handleToggleConfirm = async (itemId: string, mine: Confirmation | undefined) => {
    if (mine) {
      const { error } = await (supabase as any)
        .from('project_checklist_confirmations').delete().eq('id', mine.id);
      if (error) {
        toast({ title: 'Could not unconfirm', description: error.message, variant: 'destructive' });
        return;
      }
    } else {
      const { error } = await (supabase as any)
        .from('project_checklist_confirmations')
        .insert({ item_id: itemId, profile_id: profileId });
      if (error) {
        toast({ title: 'Could not confirm', description: error.message, variant: 'destructive' });
        return;
      }
    }
    load();
  };

  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <CheckSquare className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold">Confirmation Checklist</h3>
          <p className="text-xs text-muted-foreground">
            Add questions everyone needs to confirm. See who's done what.
          </p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="e.g. Did you sign the NDA?"
          className="flex-1 px-3 py-2 text-sm bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !newQuestion.trim()}
          className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1 text-sm"
        >
          {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground italic text-center py-4">
          No checklist items yet.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const itemConfs = confirmations.filter(c => c.item_id === item.id);
            const mine = itemConfs.find(c => c.profile_id === profileId);
            return (
              <div key={item.id} className="rounded-xl bg-card border border-border p-3">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleToggleConfirm(item.id, mine)}
                    className={`mt-0.5 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors shrink-0 ${
                      mine
                        ? 'bg-primary border-primary text-primary-foreground'
                        : 'border-border hover:border-primary'
                    }`}
                    title={mine ? 'Click to unconfirm' : 'Click to confirm'}
                  >
                    {mine && <Check className="w-4 h-4" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{item.question}</p>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      {itemConfs.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">No confirmations yet</span>
                      ) : (
                        itemConfs.map((c) => (
                          <div
                            key={c.id}
                            className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs"
                            title={`Confirmed ${new Date(c.confirmed_at).toLocaleString()}`}
                          >
                            {c.profiles?.avatar_url ? (
                              <img src={c.profiles.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-primary/20" />
                            )}
                            <span className="font-medium">{c.profiles?.full_name || 'Member'}</span>
                            <Check className="w-3 h-3" />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
                    title="Delete question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
