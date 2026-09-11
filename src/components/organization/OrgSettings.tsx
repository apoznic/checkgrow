import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, Trash2, Loader2, ImagePlus, X, Save, MapPin, Tag } from 'lucide-react';
import { PlatformFeeSettings } from './PlatformFeeSettings';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

const SERVICE_CATEGORIES = [
  'IT & Software',
  'Design & Creative',
  'Marketing & PR',
  'Cooking & Catering',
  'Event Management',
  'Consulting',
  'Education & Training',
  'Finance & Accounting',
  'Legal Services',
  'Healthcare',
  'Construction & Architecture',
  'Photography & Video',
  'Music & Entertainment',
  'Sports & Fitness',
  'Other',
];

interface OrgSettingsProps {
  clusterId: string;
  name: string;
  description: string | null;
  logoUrl: string | null;
  city?: string | null;
  country?: string | null;
  address?: string | null;
  category?: string | null;
  platformFeePercent?: number;
  canDelete: boolean;
  onUpdate: () => void;
}

export function OrgSettings({ 
  clusterId, 
  name: initialName, 
  description: initialDescription,
  logoUrl: initialLogo,
  city: initialCity,
  country: initialCountry,
  address: initialAddress,
  category: initialCategory,
  platformFeePercent = 10,
  canDelete,
  onUpdate 
}: OrgSettingsProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription || '');
  const [logoUrl, setLogoUrl] = useState(initialLogo || '');
  const [city, setCity] = useState(initialCity || '');
  const [country, setCountry] = useState(initialCountry || '');
  const [address, setAddress] = useState(initialAddress || '');
  const [category, setCategory] = useState(initialCategory || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const hasChanges = name !== initialName || 
    description !== (initialDescription || '') ||
    logoUrl !== (initialLogo || '') ||
    city !== (initialCity || '') ||
    country !== (initialCountry || '') ||
    address !== (initialAddress || '') ||
    category !== (initialCategory || '');

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: 'Name is required', variant: 'destructive' });
      return;
    }

    setIsSaving(true);

    const { error } = await supabase
      .from('clusters')
      .update({
        name: name.trim(),
        description: description.trim() || null,
        logo_url: logoUrl.trim() || null,
        city: city.trim() || null,
        country: country.trim() || null,
        address: address.trim() || null,
        category: category.trim() || null,
      })
      .eq('id', clusterId);

    setIsSaving(false);

    if (error) {
      toast({ title: 'Error saving', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Organization updated' });
      onUpdate();
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);

    // First delete all related data (cascade should handle most)
    const { error } = await supabase
      .from('clusters')
      .delete()
      .eq('id', clusterId);

    setIsDeleting(false);

    if (error) {
      toast({ 
        title: 'Cannot delete organization', 
        description: error.message,
        variant: 'destructive' 
      });
    } else {
      toast({ title: 'Organization deleted' });
      navigate('/admin');
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: 'Please upload an image', variant: 'destructive' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'Image must be under 2MB', variant: 'destructive' });
      return;
    }

    setIsUploadingLogo(true);

    const fileExt = file.name.split('.').pop();
    const fileName = `${clusterId}-logo-${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('org-logos')
      .upload(fileName, file, { upsert: true });

    if (error) {
      // Try to create bucket if it doesn't exist
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(b => b.name === 'org-logos');
      
      if (!bucketExists) {
        toast({ 
          title: 'Storage not configured', 
          description: 'Please enter a logo URL instead.',
          variant: 'destructive'
        });
        setIsUploadingLogo(false);
        return;
      }
      
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      setIsUploadingLogo(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('org-logos')
      .getPublicUrl(fileName);

    setLogoUrl(publicUrl);
    setIsUploadingLogo(false);
  };

  const [deleteTyped, setDeleteTyped] = useState('');

  const isProfileComplete = !!(name.trim() && description.trim() && city.trim() && country.trim() && logoUrl.trim());

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-lg font-semibold mb-1">Organization Settings</h2>
        <p className="text-sm text-muted-foreground">Manage your organization details</p>
      </div>

      {/* Visibility warning */}
      {!isProfileComplete && (
        <div className="rounded-xl border border-amber-300/50 bg-amber-50/50 dark:bg-amber-950/20 p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Building2 className="w-4 h-4 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Your organization is hidden — no one can join</p>
            <p className="text-xs text-amber-700/70 dark:text-amber-400/70 mt-1">
              Complete all fields below — <strong>name</strong>, <strong>description</strong>, <strong>logo</strong>, <strong>city</strong>, and <strong>country</strong> — to make your organization visible and allow new members to request to join.
            </p>
            <div className="flex flex-wrap gap-2 mt-2">
              {[
                { label: 'Name', done: !!name.trim() },
                { label: 'Description', done: !!description.trim() },
                { label: 'Logo', done: !!logoUrl.trim() },
                { label: 'City', done: !!city.trim() },
                { label: 'Country', done: !!country.trim() },
              ].map(f => (
                <span key={f.label} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
                  f.done 
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' 
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                }`}>
                  {f.done ? '✓' : '○'} {f.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Logo Section */}
      <div className="bg-secondary/20 border border-border rounded-xl p-5">
        <label className="text-sm font-medium mb-3 block">Logo</label>
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-xl bg-secondary/50 border border-border flex items-center justify-center overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="Org logo" className="w-full h-full object-cover" />
            ) : (
              <Building2 className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={logoUrl}
              onChange={e => setLogoUrl(e.target.value)}
              placeholder="Logo URL (e.g., https://example.com/logo.png)"
              className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <label className="inline-flex items-center gap-2 text-sm text-primary cursor-pointer hover:underline">
              <ImagePlus className="w-4 h-4" />
              <span>Upload image</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleLogoUpload}
                className="hidden"
                disabled={isUploadingLogo}
              />
            </label>
            {isUploadingLogo && <Loader2 className="w-4 h-4 animate-spin inline ml-2" />}
          </div>
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="text-sm font-medium mb-2 block">Organization Name *</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="Organization name"
        />
      </div>

      {/* Description */}
      <div>
        <label className="text-sm font-medium mb-2 block">Description</label>
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="w-full bg-secondary/30 border border-border rounded-xl px-4 py-3 h-24 resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
          placeholder="What does your organization do?"
        />
      </div>

      {/* Service Category */}
      <div className="bg-secondary/20 border border-border rounded-xl p-5">
        <label className="text-sm font-medium mb-3 block flex items-center gap-2">
          <Tag className="w-4 h-4" />
          Service Category
        </label>
        <p className="text-xs text-muted-foreground mb-3">
          Choose the category that best describes what your organization offers.
        </p>
        <div className="flex flex-wrap gap-2">
          {SERVICE_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(category === cat ? '' : cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                category === cat
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-secondary/30 text-muted-foreground border-border hover:border-primary/40 hover:text-foreground'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Location Section */}
      <div className="bg-secondary/20 border border-border rounded-xl p-5">
        <label className="text-sm font-medium mb-3 block flex items-center gap-2">
          <MapPin className="w-4 h-4" />
          Location
        </label>
        <p className="text-xs text-muted-foreground mb-4">
          Set your organization's location to enable talent localization preferences.
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">City</label>
            <input
              type="text"
              value={city}
              onChange={e => setCity(e.target.value)}
              placeholder="e.g., San Francisco"
              className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Country</label>
            <input
              type="text"
              value={country}
              onChange={e => setCountry(e.target.value)}
              placeholder="e.g., United States"
              className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="col-span-2">
            <label className="text-xs text-muted-foreground mb-1 block">Address (optional)</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Full address"
              className="w-full bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={!hasChanges || !name.trim() || isSaving}
        className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
      >
        {isSaving ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            <Save className="w-4 h-4" />
            Save Changes
          </>
        )}
      </button>

      {/* Platform Fee Settings */}
      <div className="mt-8">
        <PlatformFeeSettings clusterId={clusterId} currentFee={platformFeePercent} isAdmin={canDelete} />
      </div>

      {/* Danger Zone - hidden behind collapsible */}
      {canDelete && (
        <details className="mt-12">
          <summary className="text-xs text-muted-foreground/50 cursor-pointer hover:text-muted-foreground transition-colors select-none">
            Advanced options
          </summary>
          <div className="border border-destructive/20 rounded-xl p-5 mt-4">
            <h3 className="text-destructive font-medium mb-2">Danger Zone</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Deleting an organization will permanently remove all its members, projects, announcements, 
              and CRM data. This action cannot be undone.
            </p>
            
            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="py-2 px-4 border border-destructive/30 text-destructive/70 rounded-lg text-sm hover:bg-destructive/10 hover:text-destructive transition-colors"
              >
                Delete Organization
              </button>
            ) : (
              <DeleteConfirmation
                name={name}
                isDeleting={isDeleting}
                onCancel={() => setShowDeleteConfirm(false)}
                onConfirm={handleDelete}
              />
            )}
          </div>
        </details>
      )}
    </div>
  );
}

function DeleteConfirmation({ name, isDeleting, onCancel, onConfirm }: {
  name: string;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const [typed, setTyped] = useState('');
  const canDelete = typed === name;

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      className="bg-destructive/10 rounded-lg p-4"
    >
      <p className="text-sm font-medium text-destructive mb-3">
        This will permanently delete <strong>"{name}"</strong> and all its data.
      </p>
      <p className="text-sm text-muted-foreground mb-3">
        Type the organization name to confirm:
      </p>
      <input
        type="text"
        value={typed}
        onChange={e => setTyped(e.target.value)}
        placeholder={name}
        className="w-full bg-secondary/30 border border-destructive/30 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-destructive/50"
      />
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 bg-secondary/50 text-foreground rounded-lg text-sm"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isDeleting || !canDelete}
          className="flex-1 py-2 bg-destructive text-destructive-foreground rounded-lg text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isDeleting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Trash2 className="w-4 h-4" />
              Delete Forever
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
