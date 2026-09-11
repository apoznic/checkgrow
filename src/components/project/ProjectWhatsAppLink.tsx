import { useState } from 'react';
import { ExternalLink, Edit3, Save, X, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  projectId: string;
  whatsappUrl: string | null;
  canManage: boolean;
  onUpdated?: (url: string | null) => void;
}

export function ProjectWhatsAppLink({ projectId, whatsappUrl, canManage, onUpdated }: Props) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(whatsappUrl || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const newUrl = value.trim() || null;
    const { error } = await (supabase as any)
      .from('projects')
      .update({ whatsapp_url: newUrl })
      .eq('id', projectId);
    setSaving(false);
    if (error) {
      toast({ title: 'Error saving', description: error.message, variant: 'destructive' });
      return;
    }
    setEditing(false);
    onUpdated?.(newUrl);
    toast({ title: newUrl ? 'WhatsApp link saved' : 'WhatsApp link removed' });
  };

  return (
    <div className="rounded-2xl border-2 border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 via-card to-card p-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="w-14 h-14 rounded-xl bg-[#25D366] shadow-sm flex items-center justify-center shrink-0">
          <svg viewBox="0 0 24 24" className="w-8 h-8" fill="white" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold">WhatsApp</h3>
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 font-semibold">
              Project Chat
            </span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Pin the project's WhatsApp group — quick async chat with the team on the go.
          </p>

          {editing ? (
            <div className="flex gap-2">
              <input
                type="url"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="https://chat.whatsapp.com/..."
                className="flex-1 px-3 py-2 text-sm bg-input border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                autoFocus
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-3 py-2 rounded-lg bg-[#25D366] text-white hover:bg-[#1fbe5a] disabled:opacity-50 flex items-center gap-1 text-sm"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save
              </button>
              <button
                onClick={() => { setEditing(false); setValue(whatsappUrl || ''); }}
                className="px-3 py-2 rounded-lg hover:bg-secondary text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : whatsappUrl ? (
            <div className="flex items-center gap-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center gap-2 px-4 py-3 rounded-xl bg-card border border-border hover:border-emerald-500/40 hover:shadow-md transition-all group"
              >
                <ExternalLink className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-sm font-medium truncate group-hover:text-emerald-700 transition-colors">
                  {whatsappUrl}
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
              className="w-full px-4 py-3 rounded-xl border-2 border-dashed border-emerald-500/30 text-sm text-emerald-700 font-medium hover:bg-emerald-500/5 transition-colors"
            >
              + Add WhatsApp link
            </button>
          ) : (
            <p className="text-xs text-muted-foreground italic">No WhatsApp link added yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
