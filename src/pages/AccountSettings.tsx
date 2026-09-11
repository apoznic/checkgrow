import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  User, Mail, Linkedin, Link as LinkIcon, MapPin, 
  Save, Loader2, Lock, Eye, EyeOff, Clock, Trash2, AlertTriangle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { AppTopBar } from '@/components/AppTopBar';
import { AvatarUpload } from '@/components/AvatarUpload';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface Profile {
  id: string;
  full_name: string | null;
  bio: string | null;
  portfolio_url: string | null;
  linkedin_url: string | null;
  avatar_url: string | null;
  is_available: boolean;
  availability_note: string | null;
  city: string | null;
}

export default function AccountSettings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile fields
  const [fullName, setFullName] = useState('');
  const [bio, setBio] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [city, setCity] = useState('');
  const [isAvailable, setIsAvailable] = useState(true);
  const [availabilityNote, setAvailabilityNote] = useState('');

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, bio, portfolio_url, linkedin_url, avatar_url, is_available, availability_note, city')
      .eq('user_id', user!.id)
      .single();

    if (!error && data) {
      setProfile(data as Profile);
      setFullName(data.full_name || '');
      setBio(data.bio || '');
      setLinkedinUrl(data.linkedin_url || '');
      setPortfolioUrl(data.portfolio_url || '');
      setCity(data.city || '');
      setIsAvailable(data.is_available ?? true);
      setAvailabilityNote(data.availability_note || '');
    }
    setLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!profile) return;
    setSaving(true);

    const updates = {
      full_name: fullName.trim() || null,
      bio: bio.trim() || null,
      linkedin_url: linkedinUrl.trim() || null,
      portfolio_url: portfolioUrl.trim() || null,
      city: city.trim() || null,
      is_available: isAvailable,
      availability_note: availabilityNote.trim() || null,
    };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', profile.id);

    setSaving(false);

    if (error) {
      toast({ title: 'Error saving profile', description: error.message, variant: 'destructive' });
    } else {
      setProfile(prev => prev ? { ...prev, ...updates } : prev);
      toast({ title: 'Profile updated', description: 'Your changes have been saved.' });
    }
  };

  const handleAvatarUpload = async (url: string) => {
    if (!profile) return;
    await supabase.from('profiles').update({ avatar_url: url }).eq('id', profile.id);
    setProfile(prev => prev ? { ...prev, avatar_url: url } : prev);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 6) {
      toast({ title: 'Password too short', description: 'Must be at least 6 characters.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords don\'t match', variant: 'destructive' });
      return;
    }

    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setChangingPassword(false);

    if (error) {
      toast({ title: 'Error changing password', description: error.message, variant: 'destructive' });
    } else {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast({ title: 'Password updated', description: 'Your password has been changed.' });
    }
  };

  const handleDeleteAccount = async () => {
    setDeletingAccount(true);
    const { error } = await supabase.functions.invoke('delete-account');
    if (error) {
      toast({ title: 'Error deleting account', description: error.message, variant: 'destructive' });
      setDeletingAccount(false);
      return;
    }
    await supabase.auth.signOut();
    navigate('/');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppTopBar
        userName={profile?.full_name}
        avatarUrl={profile?.avatar_url}
      />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-2xl font-bold mb-1">Account Settings</h1>
          <p className="text-sm text-muted-foreground mb-8">Manage your profile and security</p>

          {/* Avatar + Name Section */}
          <div className="flex items-start gap-6 mb-8">
            <AvatarUpload
              userId={user!.id}
              currentAvatarUrl={profile?.avatar_url}
              onUploadComplete={handleAvatarUpload}
              size="lg"
            />
            <div className="flex-1 pt-2">
              <Label htmlFor="fullName" className="mb-2 block">Full Name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Your full name"
              />
              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
                <Mail className="w-3 h-3" />
                {user?.email}
              </p>
            </div>
          </div>

          <Separator className="my-6" />

          {/* Bio */}
          <div className="space-y-4 mb-6">
            <div>
              <Label htmlFor="bio" className="mb-2 block">Bio</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows={3}
              />
            </div>
          </div>

          {/* Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div>
              <Label htmlFor="linkedin" className="mb-2 flex items-center gap-1.5">
                <Linkedin className="w-3.5 h-3.5" />
                LinkedIn URL
              </Label>
              <Input
                id="linkedin"
                type="url"
                value={linkedinUrl}
                onChange={e => setLinkedinUrl(e.target.value)}
                placeholder="https://linkedin.com/in/..."
              />
            </div>
            <div>
              <Label htmlFor="portfolio" className="mb-2 flex items-center gap-1.5">
                <LinkIcon className="w-3.5 h-3.5" />
                Portfolio URL
              </Label>
              <Input
                id="portfolio"
                type="url"
                value={portfolioUrl}
                onChange={e => setPortfolioUrl(e.target.value)}
                placeholder="https://yoursite.com"
              />
            </div>
          </div>

          {/* Location */}
          <div className="mb-6">
            <Label htmlFor="city" className="mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              City
            </Label>
            <Input
              id="city"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="e.g., San Francisco"
            />
          </div>

          {/* Availability */}
          <div className="rounded-xl border border-border bg-secondary/10 p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <Label className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5" />
                Available for work
              </Label>
              <Switch checked={isAvailable} onCheckedChange={setIsAvailable} />
            </div>
            {!isAvailable && (
              <Input
                value={availabilityNote}
                onChange={e => setAvailabilityNote(e.target.value)}
                placeholder="e.g., Available again in March"
                className="mt-2"
              />
            )}
          </div>

          {/* Save Profile Button */}
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Profile
              </>
            )}
          </button>

          <Separator className="my-8" />

          {/* Password Section */}
          <div>
            <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Change Password
            </h2>
            <p className="text-sm text-muted-foreground mb-4">Update your login password</p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="newPassword" className="mb-2 block">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <Label htmlFor="confirmPassword" className="mb-2 block">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                />
              </div>
              <button
                onClick={handleChangePassword}
                disabled={changingPassword || !newPassword || !confirmPassword}
                className="py-2.5 px-6 bg-secondary text-foreground rounded-xl text-sm font-medium disabled:opacity-50 flex items-center gap-2 hover:bg-secondary/80 transition-colors"
              >
                {changingPassword ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Update Password'
                )}
              </button>
            </div>
          </div>

          <Separator className="my-8" />

          {/* Delete Account */}
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-6">
            <h2 className="text-lg font-semibold mb-1 flex items-center gap-2 text-destructive">
              <Trash2 className="w-4 h-4" />
              Delete Account
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="py-2.5 px-6 bg-destructive text-destructive-foreground rounded-xl text-sm font-medium flex items-center gap-2 hover:bg-destructive/90 transition-colors">
                  <Trash2 className="w-4 h-4" />
                  Delete My Account
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                    Are you absolutely sure?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete your account, profile, skills, and all organization memberships. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="my-2">
                  <Label className="text-sm mb-2 block">Type <strong>DELETE</strong> to confirm</Label>
                  <Input
                    value={deleteConfirmText}
                    onChange={e => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setDeleteConfirmText('')}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={deleteConfirmText !== 'DELETE' || deletingAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {deletingAccount ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Delete Account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
