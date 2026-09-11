import { useState } from 'react';
import { ExternalLink, Edit3, Save, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProjectDriveLinkProps {
  projectId: string;
  driveUrl: string | null;
  canManage: boolean;
  onUpdated?: (url: string | null) => void;
}

export function ProjectDriveLink({ projectId, driveUrl, canManage, onUpdated }: ProjectDriveLinkProps) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(driveUrl || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const newUrl = value.trim() || null;
    const { error } = await (supabase as any)
      .from('projects')
      .update({ google_drive_url: newUrl })
      .eq('id', projectId);
    setSaving(false);
    if (error) {
      toast({ title: 'Error saving', description: error.message, variant: 'destructive' });
      return;
    }
    setEditing(false);
    onUpdated?.(newUrl);
    toast({ title: newUrl ? 'Drive link saved' : 'Drive link removed' });
  };

  return (
    <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-card to-card p-5 shadow-sm">
      <div className="flex items-start gap-4">
        {/* Google Drive icon (colored triangle motif) */}
        <div className="w-14 h-14 rounded-xl bg-white/90 shadow-sm flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" className="w-8 h-8" aria-hidden="true">
            <path fill="#0066DA" d="M2.5 17.5 5 21.5h14L16.5 17.5z" />
            <path fill="#00AC47" d="M9.5 2.5 2.5 14.5l3.5 6 7-12z" />
            <path fill="#EA4335" d="M14.5 2.5h-5l7 12h5z" />
            <path fill="#FFBA00" d="m21.5 14.5-3.5 6-3.5-6z" />
            <path fill="#2684FC" d="m6 20.5 3.5-6h-7z" />
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold">Google Drive</h3>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-primary/10 text-primary font-semibold">
              Project Folder
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Pin the main Drive folder for this project — assets, briefs, contracts, exports.
          </p>

          {editing ? (
            <div className="flex gap-2">
              <input
                type="url"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="https://drive.google.com/drive/folders/..."
                className="flex-1 px-3 py-2 text-sm bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1 text-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
              <button
                onClick={() => { setEditing(false); setValue(driveUrl || ''); }}
                className="px-3 py-2 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : driveUrl ? (
            <div className="flex items-center gap-2">
              <a
                href={driveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all group"
              >
                <ExternalLink className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                  {driveUrl}
                </span>
              </a>
              {canManage && (
                <button
                  onClick={() => setEditing(true)}
                  className="px-3 py-3 rounded-xl hover:bg-secondary text-muted-foreground hover:text-foreground"
                  title="Edit"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : canManage ? (
            <button
              onClick={() => setEditing(true)}
              className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-primary/30 text-sm text-primary font-medium hover:bg-primary/5 transition-colors"
            >
              + Add Google Drive link
            </button>
          ) : (
            <p className="text-xs text-muted-foreground italic">No Drive link added yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
