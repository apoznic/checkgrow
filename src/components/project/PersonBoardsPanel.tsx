import { useEffect, useState } from 'react';
import { Plus, User, Trash2, Loader2, UserPlus, X, Search, Star, Check, Circle, Clock, CheckCircle2, Archive, ArchiveRestore, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProjectTableRealtime } from '@/hooks/useProjectTableRealtime';

interface TeamMember {
  profile_id: string;
  profiles: { id: string; full_name: string | null; avatar_url: string | null };
}

interface KeyPerson {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  notes: string | null;
  contact_id: string | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assigned_to: string | null;
  key_person_id: string | null;
  due_date: string | null;
  created_at: string;
  archived_at?: string | null;
  archived_from?: string | null;
}

interface PersonBoardsPanelProps {
  projectId: string;
  profileId: string;
  clusterId: string | null | undefined;
  teamMembers: TeamMember[];
  canManage: boolean;
}

const statusOrder = ['todo', 'in_progress', 'done'] as const;
const statusConfig: Record<string, { label: string; icon: typeof Circle; color: string }> = {
  todo: { label: 'To Do', icon: Circle, color: 'text-muted-foreground' },
  in_progress: { label: 'In Progress', icon: Clock, color: 'text-amber-500' },
  done: { label: 'Done', icon: CheckCircle2, color: 'text-emerald-500' },
};

export function PersonBoardsPanel({ projectId, profileId, clusterId, teamMembers, canManage }: PersonBoardsPanelProps) {
  const { toast } = useToast();
  const [keyPeople, setKeyPeople] = useState<KeyPerson[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [archivedTasks, setArchivedTasks] = useState<Task[]>([]);
  const [showArchive, setShowArchive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contacts, setContacts] = useState<any[]>([]);
  const [contactSearch, setContactSearch] = useState('');
  const [newPerson, setNewPerson] = useState({ name: '', role: '', email: '', phone: '', company: '', notes: '' });
  const [newTaskFor, setNewTaskFor] = useState<{ kind: 'team' | 'key'; id: string } | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [projectId]);

  useProjectTableRealtime(['project_key_people', 'project_tasks'], projectId, () => { void load(); });

  const load = async () => {
    const [kpRes, tRes, aRes] = await Promise.all([
      (supabase as any).from('project_key_people').select('*').eq('project_id', projectId).order('position'),
      (supabase as any).from('project_tasks').select('*').eq('project_id', projectId).is('archived_at', null),
      (supabase as any).from('project_tasks').select('*').eq('project_id', projectId).not('archived_at', 'is', null).order('archived_at', { ascending: false }),
    ]);
    setKeyPeople(kpRes.data || []);
    setTasks(tRes.data || []);
    setArchivedTasks(aRes.data || []);
    setLoading(false);
  };

  const loadContacts = async () => {
    if (!clusterId) return;
    const { data } = await supabase
      .from('crm_contacts')
      .select('id, name, email, phone, company, position')
      .eq('cluster_id', clusterId)
      .order('name');
    setContacts(data || []);
  };

  const addKeyPerson = async (fromContact?: any) => {
    const payload = fromContact ? {
      project_id: projectId,
      contact_id: fromContact.id,
      name: fromContact.name,
      role: fromContact.position || null,
      email: fromContact.email,
      phone: fromContact.phone,
      company: fromContact.company,
      created_by: profileId,
      position: keyPeople.length,
    } : {
      project_id: projectId,
      name: newPerson.name.trim(),
      role: newPerson.role.trim() || null,
      email: newPerson.email.trim() || null,
      phone: newPerson.phone.trim() || null,
      company: newPerson.company.trim() || null,
      notes: newPerson.notes.trim() || null,
      created_by: profileId,
      position: keyPeople.length,
    };
    if (!payload.name) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    const { error } = await (supabase as any).from('project_key_people').insert(payload);
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setNewPerson({ name: '', role: '', email: '', phone: '', company: '', notes: '' });
    setShowAdd(false);
    setShowContactPicker(false);
    load();
  };

  const removeKeyPerson = async (id: string) => {
    if (!confirm('Remove this key person?')) return;
    await (supabase as any).from('project_key_people').delete().eq('id', id);
    load();
  };

  const addTask = async () => {
    if (!newTaskFor || !newTaskTitle.trim()) return;
    const payload: any = {
      project_id: projectId,
      title: newTaskTitle.trim(),
      description: newTaskDesc.trim() || null,
      priority: newTaskPriority,
      status: 'todo',
    };
    if (newTaskFor.kind === 'team') payload.assigned_to = newTaskFor.id;
    else payload.key_person_id = newTaskFor.id;

    // Optimistic insert for snappy UX
    const tempId = `temp-${Date.now()}`;
    const optimistic: Task = {
      id: tempId,
      title: payload.title,
      description: payload.description,
      status: 'todo',
      priority: payload.priority,
      assigned_to: payload.assigned_to ?? null,
      key_person_id: payload.key_person_id ?? null,
      due_date: null,
      created_at: new Date().toISOString(),
      archived_at: null,
      archived_from: null,
    };
    setTasks(prev => [optimistic, ...prev]);
    setNewTaskTitle('');
    setNewTaskDesc('');
    setNewTaskFor(null);
    const { data, error } = await (supabase as any).from('project_tasks').insert(payload).select().single();
    if (error) {
      setTasks(prev => prev.filter(t => t.id !== tempId));
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      return;
    }
    setTasks(prev => prev.map(t => t.id === tempId ? (data as Task) : t));
  };

  const cycleStatus = async (task: Task) => {
    const idx = statusOrder.indexOf(task.status as any);
    const next = statusOrder[(idx + 1) % statusOrder.length];
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: next } : t));
    await (supabase as any).from('project_tasks').update({ status: next }).eq('id', task.id);
  };

  const deleteTask = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setArchivedTasks(prev => prev.filter(t => t.id !== id));
    await (supabase as any).from('project_tasks').delete().eq('id', id);
  };

  const archiveTask = async (task: Task) => {
    setTasks(prev => prev.filter(t => t.id !== task.id));
    const archived = { ...task, archived_at: new Date().toISOString(), archived_from: task.status } as any;
    setArchivedTasks(prev => [archived, ...prev]);
    await (supabase as any).from('project_tasks').update({ archived_at: new Date().toISOString(), archived_from: task.status }).eq('id', task.id);
  };

  const restoreTask = async (task: Task) => {
    setArchivedTasks(prev => prev.filter(t => t.id !== task.id));
    setTasks(prev => [{ ...task, archived_at: null, archived_from: null } as any, ...prev]);
    await (supabase as any).from('project_tasks').update({ archived_at: null, archived_from: null }).eq('id', task.id);
  };

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  const renderColumn = (
    headerKey: string,
    person: { name: string; role?: string | null; avatar?: string | null; isKey: boolean; id: string; meta?: string | null },
    columnTasks: Task[]
  ) => {
    const adding = newTaskFor?.kind === (person.isKey ? 'key' : 'team') && newTaskFor?.id === person.id;
    return (
      <div key={headerKey} className="rounded-xl border border-border bg-card flex flex-col min-h-[280px]">
        <div className="flex items-center gap-2 p-3 border-b border-border">
          {person.avatar ? (
            <img src={person.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
          ) : (
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${person.isKey ? 'bg-amber-500/15' : 'bg-primary/10'}`}>
              {person.isKey ? <Star className="w-4 h-4 text-amber-500" /> : <User className="w-4 h-4 text-primary" />}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{person.name}</p>
            {person.role && <p className="text-[10px] text-muted-foreground truncate">{person.role}</p>}
          </div>
          <span className="text-[10px] text-muted-foreground">{columnTasks.length}</span>
          {person.isKey && canManage && (
            <button onClick={() => removeKeyPerson(person.id)} className="text-muted-foreground hover:text-destructive p-1" title="Remove">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="p-2 space-y-1.5 flex-1">
          {columnTasks.length === 0 && !adding && (
            <p className="text-[10px] text-muted-foreground/60 text-center py-3">No tasks yet</p>
          )}
          {columnTasks.map(task => {
            const cfg = statusConfig[task.status] || statusConfig.todo;
            const Icon = cfg.icon;
            return (
              <div key={task.id} className="group p-2 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition">
                <div className="flex items-start gap-2">
                  <button onClick={() => cycleStatus(task)} title="Cycle status">
                    <Icon className={`w-3.5 h-3.5 ${cfg.color} mt-0.5`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium ${task.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>{task.title}</p>
                    {task.description && <p className="text-[10px] text-muted-foreground mt-0.5">{task.description}</p>}
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                        task.priority === 'high' ? 'bg-destructive/15 text-destructive' :
                        task.priority === 'medium' ? 'bg-amber-500/15 text-amber-600' :
                        'bg-muted text-muted-foreground'
                      }`}>{task.priority}</span>
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex flex-col gap-0.5">
                    <button onClick={() => archiveTask(task)} className="text-muted-foreground hover:text-amber-600" title="Archive">
                      <Archive className="w-3 h-3" />
                    </button>
                    <button onClick={() => deleteTask(task.id)} className="text-muted-foreground hover:text-destructive" title="Delete">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {adding ? (
            <div className="space-y-1.5 p-2 border border-primary/30 rounded-lg bg-card">
              <input
                autoFocus
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder="Task title"
                className="w-full px-2 py-1 text-xs bg-input border border-border rounded"
              />
              <textarea
                value={newTaskDesc}
                onChange={e => setNewTaskDesc(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                className="w-full px-2 py-1 text-xs bg-input border border-border rounded resize-none"
              />
              <div className="flex items-center gap-1.5">
                <select
                  value={newTaskPriority}
                  onChange={e => setNewTaskPriority(e.target.value as any)}
                  className="text-[10px] px-1.5 py-1 bg-input border border-border rounded"
                >
                  <option value="low">low</option>
                  <option value="medium">medium</option>
                  <option value="high">high</option>
                </select>
                <button onClick={addTask} className="ml-auto px-2 py-1 text-[10px] rounded bg-primary text-primary-foreground hover:bg-primary/90">Add</button>
                <button onClick={() => { setNewTaskFor(null); setNewTaskTitle(''); setNewTaskDesc(''); }} className="px-2 py-1 text-[10px] rounded border border-border hover:bg-secondary">Cancel</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setNewTaskFor({ kind: person.isKey ? 'key' : 'team', id: person.id })}
              className="w-full flex items-center justify-center gap-1 py-1.5 text-[11px] rounded-lg border border-dashed border-border hover:border-primary/40 hover:bg-secondary/30 text-muted-foreground hover:text-primary transition"
            >
              <Plus className="w-3 h-3" /> Add task
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Add Key Person controls */}
      {canManage && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => { setShowAdd(s => !s); setShowContactPicker(false); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-secondary"
          >
            <UserPlus className="w-3.5 h-3.5" /> Add key person
          </button>
          {clusterId && (
            <button
              onClick={() => { setShowContactPicker(s => !s); setShowAdd(false); if (!contacts.length) loadContacts(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-secondary"
            >
              <Search className="w-3.5 h-3.5" /> From contacts
            </button>
          )}
        </div>
      )}

      {showAdd && (
        <div className="p-3 rounded-xl border border-primary/30 bg-card space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <input value={newPerson.name} onChange={e => setNewPerson(p => ({ ...p, name: e.target.value }))} placeholder="Full name *" className="px-3 py-2 text-sm bg-input border border-border rounded-lg" />
            <input value={newPerson.role} onChange={e => setNewPerson(p => ({ ...p, role: e.target.value }))} placeholder="Role / title" className="px-3 py-2 text-sm bg-input border border-border rounded-lg" />
            <input value={newPerson.company} onChange={e => setNewPerson(p => ({ ...p, company: e.target.value }))} placeholder="Company" className="px-3 py-2 text-sm bg-input border border-border rounded-lg" />
            <input value={newPerson.email} onChange={e => setNewPerson(p => ({ ...p, email: e.target.value }))} placeholder="Email" className="px-3 py-2 text-sm bg-input border border-border rounded-lg" />
            <input value={newPerson.phone} onChange={e => setNewPerson(p => ({ ...p, phone: e.target.value }))} placeholder="Phone" className="px-3 py-2 text-sm bg-input border border-border rounded-lg" />
          </div>
          <textarea value={newPerson.notes} onChange={e => setNewPerson(p => ({ ...p, notes: e.target.value }))} placeholder="Notes" rows={2} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg resize-none" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-secondary">Cancel</button>
            <button onClick={() => addKeyPerson()} className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90">Add person</button>
          </div>
        </div>
      )}

      {showContactPicker && (
        <div className="p-3 rounded-xl border border-primary/30 bg-card space-y-2">
          <input value={contactSearch} onChange={e => setContactSearch(e.target.value)} placeholder="Search contacts..." className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg" />
          <div className="max-h-48 overflow-y-auto space-y-1">
            {contacts.filter(c => c.name?.toLowerCase().includes(contactSearch.toLowerCase())).map(c => (
              <button key={c.id} onClick={() => addKeyPerson(c)} className="w-full text-left flex items-center gap-2 p-2 rounded-lg hover:bg-secondary transition">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="w-3.5 h-3.5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{[c.position, c.company].filter(Boolean).join(' · ')}</p>
                </div>
                <Check className="w-3.5 h-3.5 text-primary" />
              </button>
            ))}
            {contacts.length === 0 && <p className="text-xs text-muted-foreground text-center py-3">No contacts found</p>}
          </div>
        </div>
      )}

      {/* Vertically aligned columns: team members + key people */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 items-start">
        {teamMembers.map(m => renderColumn(
          `t-${m.profile_id}`,
          { name: m.profiles.full_name || 'Member', avatar: m.profiles.avatar_url, isKey: false, id: m.profile_id, role: 'Team' },
          tasks.filter(t => t.assigned_to === m.profile_id)
        ))}
        {keyPeople.map(kp => renderColumn(
          `k-${kp.id}`,
          { name: kp.name, role: [kp.role, kp.company].filter(Boolean).join(' · ') || 'Key person', avatar: null, isKey: true, id: kp.id },
          tasks.filter(t => t.key_person_id === kp.id)
        ))}
      </div>

      {teamMembers.length === 0 && keyPeople.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border/40 p-8 text-center">
          <Star className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">No team members or key people yet</p>
          <p className="text-[11px] text-muted-foreground/60 mt-1">Add a key person above to start tracking work for them.</p>
        </div>
      )}

      {/* Archive */}
      <div className="rounded-xl border border-border bg-card/50">
        <button
          onClick={() => setShowArchive(s => !s)}
          className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-secondary/30 transition"
        >
          <div className="flex items-center gap-2">
            <Archive className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold">Archive</span>
            <span className="text-[10px] text-muted-foreground">{archivedTasks.length}</span>
          </div>
          {showArchive ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
        </button>
        {showArchive && (
          <div className="px-3 pb-3 space-y-1.5">
            {archivedTasks.length === 0 ? (
              <p className="text-[11px] text-muted-foreground/60 text-center py-3">No archived tasks</p>
            ) : archivedTasks.map(task => {
              const assignee = task.assigned_to ? teamMembers.find(m => m.profile_id === task.assigned_to)?.profiles.full_name : null;
              const kp = task.key_person_id ? keyPeople.find(k => k.id === task.key_person_id)?.name : null;
              return (
                <div key={task.id} className="group flex items-start gap-2 p-2 rounded-lg bg-secondary/20 hover:bg-secondary/40">
                  <CheckCircle2 className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium line-through text-muted-foreground">{task.title}</p>
                    {task.description && <p className="text-[10px] text-muted-foreground/70 mt-0.5">{task.description}</p>}
                    <div className="flex items-center gap-2 mt-1">
                      {(assignee || kp) && (
                        <span className="text-[9px] text-muted-foreground/70">→ {assignee || kp}</span>
                      )}
                      {task.archived_from && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{task.archived_from}</span>
                      )}
                    </div>
                  </div>
                  <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                    <button onClick={() => restoreTask(task)} className="text-muted-foreground hover:text-primary" title="Restore">
                      <ArchiveRestore className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => deleteTask(task.id)} className="text-muted-foreground hover:text-destructive" title="Delete">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
