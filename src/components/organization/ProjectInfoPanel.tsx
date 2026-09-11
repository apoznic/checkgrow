import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FileText, Upload, Trash2, Loader2, Save, Link, ExternalLink, Paperclip } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProjectInfoPanelProps {
  projectId: string;
  canEdit: boolean;
  initialDescription: string | null;
  initialRequirements: string | null;
}

interface ProjectResource {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
  resource_type: string;
}

export function ProjectInfoPanel({ projectId, canEdit, initialDescription, initialRequirements }: ProjectInfoPanelProps) {
  const { toast } = useToast();
  const [description, setDescription] = useState(initialDescription || '');
  const [requirements, setRequirements] = useState(initialRequirements || '');
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [resources, setResources] = useState<ProjectResource[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [linkName, setLinkName] = useState('');
  const [showAddLink, setShowAddLink] = useState(false);

  useEffect(() => {
    loadResources();
  }, [projectId]);

  useEffect(() => {
    const descChanged = description !== (initialDescription || '');
    const reqChanged = requirements !== (initialRequirements || '');
    setHasChanges(descChanged || reqChanged);
  }, [description, requirements, initialDescription, initialRequirements]);

  const loadResources = async () => {
    setIsLoadingResources(true);
    const { data } = await (supabase as any)
      .from('project_resources')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    setResources((data as ProjectResource[]) || []);
    setIsLoadingResources(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    const { error } = await supabase
      .from('projects')
      .update({
        description: description.trim() || null,
        requirements: requirements.trim() || null,
      })
      .eq('id', projectId);

    if (error) {
      toast({ title: 'Error saving', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Project info saved ✓' });
      setHasChanges(false);
    }
    setIsSaving(false);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);

    const filePath = `${projectId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('task-attachments')
      .upload(filePath, file);

    if (uploadError) {
      toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
      setIsUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('task-attachments').getPublicUrl(filePath);

    const { error: insertError } = await (supabase as any)
      .from('project_resources')
      .insert({
        project_id: projectId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type || null,
        file_size: file.size,
        resource_type: 'file',
      });

    if (insertError) {
      toast({ title: 'Error saving resource', description: insertError.message, variant: 'destructive' });
    } else {
      toast({ title: 'File uploaded ✓' });
      loadResources();
    }
    setIsUploading(false);
    e.target.value = '';
  };

  const handleAddLink = async () => {
    if (!linkUrl.trim()) return;
    const { error } = await (supabase as any)
      .from('project_resources')
      .insert({
        project_id: projectId,
        file_name: linkName.trim() || linkUrl.trim(),
        file_url: linkUrl.trim().startsWith('http') ? linkUrl.trim() : `https://${linkUrl.trim()}`,
        file_type: 'link',
        resource_type: 'link',
      });

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Link added ✓' });
      setLinkUrl('');
      setLinkName('');
      setShowAddLink(false);
      loadResources();
    }
  };

  const handleDeleteResource = async (id: string) => {
    const { error } = await (supabase as any).from('project_resources').delete().eq('id', id);
    if (!error) {
      setResources(prev => prev.filter(r => r.id !== id));
    }
  };

  const formatSize = (bytes: number | null) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="border-t border-border/30 mt-4 pt-4 space-y-4"
      onClick={e => e.stopPropagation()}
    >
      {/* Description */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
          Description
        </label>
        {canEdit ? (
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Project description, goals, scope..."
            className="w-full min-h-[80px] bg-secondary/30 border border-border/30 rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/50"
          />
        ) : (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {description || 'No description yet.'}
          </p>
        )}
      </div>

      {/* Requirements */}
      <div>
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">
          Requirements
        </label>
        {canEdit ? (
          <textarea
            value={requirements}
            onChange={e => setRequirements(e.target.value)}
            placeholder="Skills needed, tech stack, prerequisites..."
            className="w-full min-h-[60px] bg-secondary/30 border border-border/30 rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-primary/50 placeholder:text-muted-foreground/50"
          />
        ) : (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {requirements || 'No requirements specified.'}
          </p>
        )}
      </div>

      {/* Save button */}
      {canEdit && hasChanges && (
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
          Save Changes
        </button>
      )}

      {/* Resources */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
            <Paperclip className="w-3 h-3" />
            Resources & Files
          </label>
          {canEdit && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAddLink(!showAddLink)}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors"
              >
                <Link className="w-3 h-3" />
                Add Link
              </button>
              <label className="flex items-center gap-1 px-2 py-1 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors cursor-pointer">
                {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                Upload
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
              </label>
            </div>
          )}
        </div>

        {/* Add Link Form */}
        {showAddLink && (
          <div className="flex gap-2 mb-2">
            <input
              value={linkName}
              onChange={e => setLinkName(e.target.value)}
              placeholder="Label (optional)"
              className="flex-1 px-2 py-1.5 text-xs rounded-md bg-secondary/30 border border-border/30 focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <input
              value={linkUrl}
              onChange={e => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className="flex-[2] px-2 py-1.5 text-xs rounded-md bg-secondary/30 border border-border/30 focus:outline-none focus:ring-1 focus:ring-primary/50"
            />
            <button
              onClick={handleAddLink}
              disabled={!linkUrl.trim()}
              className="px-2 py-1.5 text-xs rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              Add
            </button>
          </div>
        )}

        {/* Resource List */}
        {isLoadingResources ? (
          <div className="flex justify-center py-3">
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          </div>
        ) : resources.length === 0 ? (
          <p className="text-xs text-muted-foreground/60 py-2">No resources yet.</p>
        ) : (
          <div className="space-y-1">
            {resources.map(r => (
              <div key={r.id} className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-secondary/30 group text-sm">
                {r.file_type === 'link' ? (
                  <Link className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                )}
                <a
                  href={r.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 truncate text-xs hover:text-primary transition-colors"
                >
                  {r.file_name}
                </a>
                {r.file_size ? (
                  <span className="text-[10px] text-muted-foreground/60">{formatSize(r.file_size)}</span>
                ) : null}
                <ExternalLink className="w-3 h-3 text-muted-foreground/40 flex-shrink-0" />
                {canEdit && (
                  <button
                    onClick={() => handleDeleteResource(r.id)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-all"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
