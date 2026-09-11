import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Link as LinkIcon, File, Plus, Loader2, Trash2, ExternalLink, Pencil, Save, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GlassButton, GlassInput } from '@/components/GlassCard';

interface Resource {
  id: string;
  name: string;
  description: string | null;
  resource_type: string;
  url: string;
  created_at: string;
  uploaded_by: string;
  profiles: {
    full_name: string | null;
  };
}

interface OrgResourcesProps {
  clusterId: string;
  canManage: boolean;
  profileId: string;
}

const RESOURCE_TYPES = [
  { value: 'link', label: 'Link', icon: LinkIcon },
  { value: 'document', label: 'Document', icon: FileText },
  { value: 'file', label: 'File', icon: File },
];

export function OrgResources({ clusterId, canManage, profileId }: OrgResourcesProps) {
  const { toast } = useToast();
  const [resources, setResources] = useState<Resource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [newType, setNewType] = useState('link');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editUrl, setEditUrl] = useState('');
  const [editType, setEditType] = useState('link');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadResources();
  }, [clusterId]);

  const loadResources = async () => {
    setIsLoading(true);
    const { data } = await supabase
      .from('org_resources')
      .select(`id, name, description, resource_type, url, created_at, uploaded_by, profiles:uploaded_by ( full_name )`)
      .eq('cluster_id', clusterId)
      .order('created_at', { ascending: false });

    if (data) setResources(data as unknown as Resource[]);
    setIsLoading(false);
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newUrl.trim()) return;
    setIsCreating(true);

    const { error } = await supabase.from('org_resources').insert({
      cluster_id: clusterId,
      uploaded_by: profileId,
      name: newName.trim(),
      description: newDescription.trim() || null,
      url: newUrl.trim(),
      resource_type: newType,
    });

    if (error) {
      toast({ title: 'Error adding resource', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Resource added!' });
      setNewName(''); setNewDescription(''); setNewUrl(''); setNewType('link');
      setShowCreate(false);
      loadResources();
    }
    setIsCreating(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from('org_resources').delete().eq('id', id);

    if (error) {
      toast({ title: 'Error deleting resource', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Resource deleted' });
      loadResources();
    }
    setDeletingId(null);
  };

  const startEdit = (r: Resource) => {
    setEditingId(r.id);
    setEditName(r.name);
    setEditDescription(r.description || '');
    setEditUrl(r.url);
    setEditType(r.resource_type);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editName.trim() || !editUrl.trim()) return;
    setIsSaving(true);

    const { error } = await supabase
      .from('org_resources')
      .update({
        name: editName.trim(),
        description: editDescription.trim() || null,
        url: editUrl.trim(),
        resource_type: editType,
      })
      .eq('id', editingId);

    if (error) {
      toast({ title: 'Error updating resource', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Resource updated!' });
      cancelEdit();
      loadResources();
    }
    setIsSaving(false);
  };

  const getTypeInfo = (type: string) => RESOURCE_TYPES.find(t => t.value === type) || RESOURCE_TYPES[0];

  const formatUrl = (url: string) => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) return `https://${url}`;
    return url;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Resources</h2>
        {canManage && (
          <GlassButton variant="primary" onClick={() => setShowCreate(true)}>
            <Plus className="w-4 h-4 mr-2" />Add Resource
          </GlassButton>
        )}
      </div>

      {showCreate && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="glass-panel p-6">
          <h3 className="font-medium mb-4">Add Resource</h3>
          <div className="space-y-4">
            <GlassInput value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Resource name" />
            <GlassInput value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="URL (e.g., https://example.com/doc)" />
            <GlassInput value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Description (optional)" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Type:</span>
              {RESOURCE_TYPES.map((type) => (
                <button key={type.value} onClick={() => setNewType(type.value)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${newType === type.value ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
                >{type.label}</button>
              ))}
            </div>
            <div className="flex gap-3">
              <GlassButton onClick={() => setShowCreate(false)}>Cancel</GlassButton>
              <GlassButton variant="primary" onClick={handleCreate} disabled={!newName.trim() || !newUrl.trim() || isCreating}>
                {isCreating ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Adding...</>) : 'Add Resource'}
              </GlassButton>
            </div>
          </div>
        </motion.div>
      )}

      {resources.length === 0 ? (
        <div className="glass-panel p-8 text-center">
          <FileText className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No resources yet</p>
          {canManage && <p className="text-sm text-muted-foreground mt-2">Add links, documents, or files for your team.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.map((resource) => {
            const typeInfo = getTypeInfo(resource.resource_type);
            const TypeIcon = typeInfo.icon;
            const isEditing = editingId === resource.id;

            return (
              <motion.div key={resource.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-panel p-4">
                {isEditing ? (
                  <div className="space-y-3">
                    <GlassInput value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Name" />
                    <GlassInput value={editUrl} onChange={(e) => setEditUrl(e.target.value)} placeholder="URL" />
                    <GlassInput value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description (optional)" />
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">Type:</span>
                      {RESOURCE_TYPES.map((t) => (
                        <button key={t.value} onClick={() => setEditType(t.value)}
                          className={`px-3 py-1 rounded-lg text-sm transition-colors ${editType === t.value ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
                        >{t.label}</button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <GlassButton onClick={cancelEdit}><X className="w-4 h-4 mr-1" />Cancel</GlassButton>
                      <GlassButton variant="primary" onClick={handleSaveEdit} disabled={isSaving || !editName.trim() || !editUrl.trim()}>
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-1" />Save</>}
                      </GlassButton>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <TypeIcon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate">{resource.name}</h3>
                      {resource.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{resource.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-xs text-muted-foreground">{resource.profiles?.full_name || 'Unknown'}</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(resource.created_at), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <a href={formatUrl(resource.url)} target="_blank" rel="noopener noreferrer"
                        className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                        onClick={e => e.stopPropagation()}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      {canManage && (
                        <>
                          <button onClick={() => startEdit(resource)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(resource.id)} disabled={deletingId === resource.id}
                            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          >
                            {deletingId === resource.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
