import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Plus, Loader2, Search, MapPin, Clock, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { GlassButton, GlassInput } from '@/components/GlassCard';

interface Cluster {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  city: string | null;
  country: string | null;
}

interface BrowseOrganizationsProps {
  user: any;
  profileId: string | null;
  showCreateModal: boolean;
  setShowCreateModal: (v: boolean) => void;
  newOrgName: string;
  setNewOrgName: (v: string) => void;
  newOrgDescription: string;
  setNewOrgDescription: (v: string) => void;
  isCreatingOrg: boolean;
  handleCreateOrganization: () => void;
  onJoined: () => void;
}

export function BrowseOrganizations({
  user, profileId, showCreateModal, setShowCreateModal,
  newOrgName, setNewOrgName, newOrgDescription, setNewOrgDescription,
  isCreatingOrg, handleCreateOrganization, onJoined,
}: BrowseOrganizationsProps) {
  const { toast } = useToast();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [joiningId, setJoiningId] = useState<string | null>(null);

  useEffect(() => {
    loadClusters();
  }, [profileId]);

  const loadClusters = async () => {
    const [clustersRes, enrollmentsRes] = await Promise.all([
      supabase.from('clusters').select('id, name, description, logo_url, city, country').order('name'),
      profileId
        ? supabase.from('cluster_enrollments').select('cluster_id, status').eq('profile_id', profileId)
        : Promise.resolve({ data: [] }),
    ]);
    if (clustersRes.data) setClusters(clustersRes.data);
    if (enrollmentsRes.data) {
      const enrollments = enrollmentsRes.data as any[];
      setPendingIds(enrollments.filter(e => e.status === 'pending').map(e => e.cluster_id));
      setMemberIds(enrollments.filter(e => e.status === 'approved').map(e => e.cluster_id));
    }
    setLoading(false);
  };

  const handleJoin = async (clusterId: string) => {
    if (!profileId) return;
    setJoiningId(clusterId);
    const { error } = await supabase.from('cluster_enrollments').insert({
      profile_id: profileId,
      cluster_id: clusterId,
      status: 'pending',
      role: 'member',
    });
    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Already requested', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
      }
    } else {
      toast({ title: 'Request sent!', description: 'Awaiting admin approval.' });
      setPendingIds(prev => [...prev, clusterId]);
    }
    setJoiningId(null);
  };

  const filtered = clusters.filter(c => {
    if (memberIds.includes(c.id)) return false; // hide already-joined
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) ||
      c.description?.toLowerCase().includes(q) ||
      c.city?.toLowerCase().includes(q) ||
      c.country?.toLowerCase().includes(q);
  });

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-1">Join an Organization</h1>
        <p className="text-sm text-muted-foreground">
          Browse organizations and request to join, or start your own.
        </p>
      </div>

      {/* Search + Create row */}
      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search organizations..."
            className="pl-10"
          />
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Create</span>
        </button>
      </div>

      {/* Cluster list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <Building2 className="w-10 h-10 mx-auto mb-3 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {search ? 'No organizations match your search.' : 'No organizations available yet.'}
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-4 text-sm text-primary hover:underline"
          >
            Create your own →
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((cluster, i) => {
            const isPending = pendingIds.includes(cluster.id);
            const location = [cluster.city, cluster.country].filter(Boolean).join(', ');
            return (
              <motion.div
                key={cluster.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02 }}
                className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:bg-card/80 transition-colors"
              >
                {cluster.logo_url ? (
                  <img src={cluster.logo_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{cluster.name}</p>
                  {location && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      {location}
                    </p>
                  )}
                  {!location && cluster.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{cluster.description}</p>
                  )}
                </div>
                {isPending ? (
                  <span className="text-xs text-muted-foreground flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-secondary/60 whitespace-nowrap">
                    <Clock className="w-3 h-3" />
                    Pending
                  </span>
                ) : (
                  <button
                    onClick={() => handleJoin(cluster.id)}
                    disabled={joiningId === cluster.id}
                    className="text-xs font-medium px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors whitespace-nowrap disabled:opacity-50"
                  >
                    {joiningId === cluster.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      'Join'
                    )}
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-6"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-card border border-border rounded-2xl p-6 w-full max-w-md shadow-lg"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold mb-1">Create Organization</h2>
              <p className="text-sm text-muted-foreground mb-5">Start a new talent cluster</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Name</label>
                  <GlassInput
                    value={newOrgName}
                    onChange={e => setNewOrgName(e.target.value)}
                    placeholder="e.g., Tech Innovators"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Description (optional)</label>
                  <textarea
                    value={newOrgDescription}
                    onChange={e => setNewOrgDescription(e.target.value)}
                    placeholder="What does your organization focus on?"
                    className="w-full h-20 bg-secondary/50 border border-border/30 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-5">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-border hover:bg-secondary/50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateOrganization}
                  disabled={!newOrgName.trim() || isCreatingOrg}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCreatingOrg ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />Creating...</>
                  ) : (
                    'Create'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
