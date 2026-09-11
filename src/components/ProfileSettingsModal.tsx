import { useState } from 'react';
import { X, Linkedin, Link as LinkIcon, Loader2 } from 'lucide-react';
import { GlassCard, GlassInput, GlassButton } from '@/components/GlassCard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Profile {
  id: string;
  full_name: string | null;
  bio: string | null;
  portfolio_url: string | null;
  linkedin_url: string | null;
  avatar_url: string | null;
  is_available: boolean;
  availability_note: string | null;
}

interface ProfileSettingsModalProps {
  profile: Profile;
  onClose: () => void;
  onUpdate: (updates: Partial<Profile>) => void;
}

export function ProfileSettingsModal({ profile, onClose, onUpdate }: ProfileSettingsModalProps) {
  const [linkedinUrl, setLinkedinUrl] = useState(profile.linkedin_url || '');
  const [portfolioUrl, setPortfolioUrl] = useState(profile.portfolio_url || '');
  const [bio, setBio] = useState(profile.bio || '');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = {
        linkedin_url: linkedinUrl || null,
        portfolio_url: portfolioUrl || null,
        bio: bio || null,
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', profile.id);

      if (error) throw error;

      onUpdate(updates);
      toast({
        title: 'Profile updated',
        description: 'Your profile has been saved successfully.',
      });
      onClose();
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Save failed',
        description: 'There was an error saving your profile.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <GlassCard className="relative w-full max-w-md p-6" hover={false}>
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-xl font-semibold mb-6">Profile Settings</h2>

        <div className="space-y-4">
          {/* LinkedIn URL */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-2">
              <Linkedin className="w-4 h-4" />
              LinkedIn Profile URL <span className="text-primary">*</span>
            </label>
            <GlassInput
              type="url"
              placeholder="https://linkedin.com/in/yourprofile"
              value={linkedinUrl}
              onChange={(e) => setLinkedinUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Required for matching with projects
            </p>
          </div>

          {/* Portfolio URL */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Portfolio URL
            </label>
            <GlassInput
              type="url"
              placeholder="https://yourportfolio.com"
              value={portfolioUrl}
              onChange={(e) => setPortfolioUrl(e.target.value)}
            />
          </div>

          {/* Bio */}
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Bio</label>
            <textarea
              className="w-full px-4 py-3 rounded-xl bg-secondary/30 border border-border/50 backdrop-blur-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all resize-none"
              rows={3}
              placeholder="Tell us about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          {/* Save Button */}
          <GlassButton
            variant="primary"
            className="w-full mt-4"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Save Changes'
            )}
          </GlassButton>
        </div>
      </GlassCard>
    </div>
  );
}
