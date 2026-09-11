import { useEffect, useState } from 'react';
import {
  Plus, Trash2, Link2, ExternalLink, Pencil, Check, X,
  FolderPlus, Folder, ChevronDown, ChevronRight, Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useProjectTableRealtime } from '@/hooks/useProjectTableRealtime';

interface Props {
  projectId: string;
  profileId: string;
}

interface ProjectLink {
  id: string;
  title: string;
  url: string;
  description: string | null;
  group_id: string | null;
  created_at: string;
}

interface LinkGroup {
  id: string;
  name: string;
  position: number;
}

export function ProjectLinks({ projectId, profileId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<ProjectLink[]>([]);
  const [groups, setGroups] = useState<LinkGroup[]>([]);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const [newLink, setNewLink] = useState({ title: '', url: '', description: '', group_id: '' });
  const [newGroupName, setNewGroupName] = useState('');
  const [showNewGroup, setShowNewGroup] = useState(false);

  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [editingLink, setEditingLink] = useState({ title: '', url: '', description: '' });
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  useEffect(() => { void loadAll(); }, [projectId]);

  useProjectTableRealtime(['project_links', 'project_link_groups'], projectId, () => { void loadAll(); });

  const loadAll = async () => {
    setLoading(true);
    await Promise.all([loadLinks(), loadGroups()]);
    setLoading(false);
  };

  const loadLinks = async () => {
    const { data } = await (supabase as any)
      .from('project_links')
      .select('id,title,url,description,group_id,created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    setLinks(data || []);
  };

  const loadGroups = async () => {
    const { data } = await (supabase as any)
      .from('project_link_groups')
      .select('id,name,position')
      .eq('project_id', projectId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true });
    setGroups(data || []);
  };

  const addGroup = async () => {
    const name = newGroupName.trim();
    if (!name) return;
    const { error } = await (supabase as any).from('project_link_groups').insert({
      project_id: projectId, name, position: groups.length, created_by: profileId,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setNewGroupName(''); setShowNewGroup(false);
    loadGroups();
  };

  const deleteGroup = async (id: string) => {
    setGroups(prev => prev.filter(g => g.id !== id));
    setLinks(prev => prev.map(l => l.group_id === id ? { ...l, group_id: null } : l));
    await (supabase as any).from('project_link_groups').delete().eq('id', id);
  };

  const saveGroup = async () => {
    if (!editingGroupId) return;
    const name = editingGroupName.trim();
    if (!name) { setEditingGroupId(null); return; }
    setGroups(prev => prev.map(g => g.id === editingGroupId ? { ...g, name } : g));
    await (supabase as any).from('project_link_groups').update({ name }).eq('id', editingGroupId);
    setEditingGroupId(null);
  };

  const moveLinkToGroup = async (linkId: string, groupId: string | null) => {
    setLinks(prev => prev.map(l => l.id === linkId ? { ...l, group_id: groupId } : l));
    await (supabase as any).from('project_links').update({ group_id: groupId }).eq('id', linkId);
  };

  const addLink = async () => {
    if (!newLink.title.trim() || !newLink.url.trim()) return;
    const { error } = await (supabase as any).from('project_links').insert({
      project_id: projectId,
      added_by: profileId,
      title: newLink.title.trim(),
      url: newLink.url.trim(),
      description: newLink.description.trim() || null,
      group_id: newLink.group_id || null,
    });
    if (error) { toast({ title: 'Error', description: error.message, variant: 'destructive' }); return; }
    setNewLink({ title: '', url: '', description: '', group_id: '' });
    loadLinks();
  };

  const deleteLink = async (id: string) => {
    setLinks(prev => prev.filter(l => l.id !== id));
    await (supabase as any).from('project_links').delete().eq('id', id);
  };

  const startEditLink = (l: ProjectLink) => {
    setEditingLinkId(l.id);
    setEditingLink({ title: l.title, url: l.url, description: l.description || '' });
  };

  const saveEditLink = async () => {
    if (!editingLinkId) return;
    if (!editingLink.title.trim() || !editingLink.url.trim()) {
      toast({ title: 'Title & URL required', variant: 'destructive' }); return;
    }
    const { error } = await (supabase as any).from('project_links').update({
      title: editingLink.title.trim(),
      url: editingLink.url.trim(),
      description: editingLink.description.trim() || null,
    }).eq('id', editingLinkId);
    if (error) { toast({ title: 'Update failed', description: error.message, variant: 'destructive' }); return; }
    setEditingLinkId(null);
    loadLinks();
  };

  const toggleGroup = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) {
    return <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>;
  }

  const renderLink = (link: ProjectLink) => {
    let domain = '';
    try { domain = new URL(link.url).hostname; } catch {}
    const favicon = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=64` : '';
    const isEditing = editingLinkId === link.id;
    if (isEditing) {
      return (
        <div key={link.id} className="p-3 rounded-xl bg-card border border-primary/40 space-y-2">
          <input value={editingLink.title} onChange={e => setEditingLink(p => ({ ...p, title: e.target.value }))} placeholder="Title" className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg" />
          <input value={editingLink.url} onChange={e => setEditingLink(p => ({ ...p, url: e.target.value }))} placeholder="https://…" className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg" />
          <input value={editingLink.description} onChange={e => setEditingLink(p => ({ ...p, description: e.target.value }))} placeholder="Optional note" className="w-full px-3 py-2 text-xs bg-input border border-border rounded-lg" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditingLinkId(null)} className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-secondary flex items-center gap-1"><X className="w-3.5 h-3.5" /> Cancel</button>
            <button onClick={saveEditLink} className="px-3 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Save</button>
          </div>
        </div>
      );
    }
    return (
      <div key={link.id} className="group p-3 rounded-xl bg-card border border-border/40 hover:border-primary/30 transition flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
          {favicon ? <img src={favicon} alt="" className="w-6 h-6 object-contain" /> : <Link2 className="w-4 h-4 text-primary" />}
        </div>
        <div className="flex-1 min-w-0">
          <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium hover:text-primary flex items-center gap-1 truncate">
            {link.title} <ExternalLink className="w-3 h-3 shrink-0" />
          </a>
          <p className="text-[11px] text-muted-foreground truncate">{link.url}</p>
          {link.description && <p className="text-xs text-muted-foreground/80 mt-1">{link.description}</p>}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <select value={link.group_id || ''} onChange={e => moveLinkToGroup(link.id, e.target.value || null)}
            className="opacity-0 group-hover:opacity-100 text-[10px] bg-input border border-border rounded px-1 py-0.5 max-w-[100px]" title="Move to group">
            <option value="">No group</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <button onClick={() => startEditLink(link)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-primary p-1"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={() => deleteLink(link.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      </div>
    );
  };

  const ungrouped = links.filter(l => !l.group_id);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        <button onClick={() => setShowNewGroup(s => !s)}
          className="flex items-center gap-1 px-2 py-1 text-[11px] rounded-md border border-border hover:bg-secondary text-muted-foreground hover:text-foreground transition">
          <FolderPlus className="w-3.5 h-3.5" /> New group
        </button>
      </div>

      {showNewGroup && (
        <div className="flex gap-2">
          <input autoFocus value={newGroupName} onChange={e => setNewGroupName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addGroup(); if (e.key === 'Escape') { setShowNewGroup(false); setNewGroupName(''); } }}
            placeholder="Group name (e.g. Designs, Docs, References)"
            className="flex-1 px-3 py-2 text-sm bg-input border border-border rounded-lg" />
          <button onClick={addGroup} className="px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90">Create</button>
        </div>
      )}

      <div className="rounded-xl border border-border/40 bg-card p-3 space-y-2">
        <div className="flex flex-wrap gap-2">
          <input value={newLink.title} onChange={e => setNewLink(p => ({ ...p, title: e.target.value }))}
            placeholder="Title" className="flex-1 min-w-[120px] px-3 py-2 text-sm bg-input border border-border rounded-lg" />
          <input value={newLink.url} onChange={e => setNewLink(p => ({ ...p, url: e.target.value }))}
            placeholder="https://…" className="flex-[2] min-w-[160px] px-3 py-2 text-sm bg-input border border-border rounded-lg" />
          <button onClick={addLink} className="px-3 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-1">
            <Plus className="w-4 h-4" /> Save
          </button>
        </div>
        <div className="flex gap-2">
          <input value={newLink.description} onChange={e => setNewLink(p => ({ ...p, description: e.target.value }))}
            placeholder="Optional note" className="flex-1 px-3 py-2 text-xs bg-input border border-border rounded-lg" />
          <select value={newLink.group_id} onChange={e => setNewLink(p => ({ ...p, group_id: e.target.value }))}
            className="px-2 py-2 text-xs bg-input border border-border rounded-lg max-w-[160px]">
            <option value="">No group</option>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {groups.map(group => {
          const gLinks = links.filter(l => l.group_id === group.id);
          const isCollapsed = collapsed.has(group.id);
          const isEditingG = editingGroupId === group.id;
          return (
            <div key={group.id} className="rounded-xl border border-border/50 bg-secondary/20 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2 group/g">
                <button onClick={() => toggleGroup(group.id)} className="text-muted-foreground hover:text-foreground">
                  {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                <Folder className="w-4 h-4 text-primary" />
                {isEditingG ? (
                  <input autoFocus value={editingGroupName} onChange={e => setEditingGroupName(e.target.value)}
                    onBlur={saveGroup}
                    onKeyDown={e => { if (e.key === 'Enter') saveGroup(); if (e.key === 'Escape') setEditingGroupId(null); }}
                    className="flex-1 px-2 py-0.5 text-sm bg-input border border-border rounded" />
                ) : (
                  <span className="flex-1 text-sm font-semibold cursor-text"
                    onClick={() => { setEditingGroupId(group.id); setEditingGroupName(group.name); }}>{group.name}</span>
                )}
                <span className="text-[11px] text-muted-foreground">{gLinks.length}</span>
                <button onClick={() => { if (confirm(`Delete group "${group.name}"? Links inside become ungrouped.`)) deleteGroup(group.id); }}
                  className="opacity-0 group-hover/g:opacity-100 text-muted-foreground hover:text-destructive p-1">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {!isCollapsed && (
                <div className="px-2 pb-2 space-y-2">
                  {gLinks.length === 0
                    ? <p className="text-[11px] text-muted-foreground/60 text-center py-2">No links in this group</p>
                    : gLinks.map(renderLink)}
                </div>
              )}
            </div>
          );
        })}

        {ungrouped.length > 0 && (
          <div className="space-y-2">
            {groups.length > 0 && <p className="text-[11px] uppercase tracking-wider text-muted-foreground/70 px-1">Ungrouped</p>}
            {ungrouped.map(renderLink)}
          </div>
        )}

        {links.length === 0 && groups.length === 0 && (
          <div className="rounded-xl border-2 border-dashed border-border/40 p-6 text-center">
            <Link2 className="w-5 h-5 mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-xs text-muted-foreground/70">No links yet. Add your first one above.</p>
          </div>
        )}
      </div>
    </div>
  );
}
