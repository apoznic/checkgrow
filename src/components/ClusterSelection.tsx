import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Check, Loader2, Clock, ArrowLeft, LogOut, Plus, Search } from 'lucide-react';
import { GlassButton, GlassInput } from '@/components/GlassCard';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Cluster {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  city: string | null;
  country: string | null;
}

interface Enrollment {
  cluster_id: string;
  status: string;
  role: string;
  clusters: Cluster;
}

interface ClusterSelectionProps {
  profileId: string;
  onEnrollmentComplete: () => void;
}

export function ClusterSelection({ profileId, onEnrollmentComplete }: ClusterSelectionProps) {
  const { toast } = useToast();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [showJoinMore, setShowJoinMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDescription, setNewOrgDescription] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  useEffect(() => {
    loadData();
  }, [profileId]);

  const loadData = async () => {
    const [clustersRes, enrollmentsRes] = await Promise.all([
      supabase.from('clusters').select('*').order('name'),
      supabase
        .from('cluster_enrollments')
        .select(`
          cluster_id,
          status,
          role,
          clusters (
            id,
            name,
            description,
            logo_url
          )
        `)
        .eq('profile_id', profileId)
    ]);

    if (clustersRes.data) setClusters(clustersRes.data.filter(c => 
      c.name?.trim() && c.description?.trim() && c.logo_url?.trim() && c.city?.trim() && c.country?.trim()
    ));
    if (enrollmentsRes.data) setEnrollments(enrollmentsRes.data as unknown as Enrollment[]);
    
    setIsLoading(false);
  };

  const handleEnroll = async () => {
    if (!selectedCluster) return;

    setIsSubmitting(true);
    const { error } = await supabase
      .from('cluster_enrollments')
      .insert({
        profile_id: profileId,
        cluster_id: selectedCluster,
        status: 'pending',
        role: 'member',
      });

    if (error) {
      if (error.code === '23505') {
        toast({
          title: 'Already enrolled',
          description: 'You have already requested to join this organization.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Enrollment failed',
          description: error.message,
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Enrollment request sent!',
        description: 'Please wait for the organization admin to approve your request.',
      });
      loadData();
      setSelectedCluster(null);
      setShowJoinMore(false);
    }
    setIsSubmitting(false);
  };

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim()) return;
    setIsCreatingOrg(true);

    // Get user_id from auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setIsCreatingOrg(false); return; }

    const { data: newCluster, error: clusterError } = await supabase
      .from('clusters')
      .insert({ name: newOrgName.trim(), description: newOrgDescription.trim() || null })
      .select()
      .single();

    if (clusterError) {
      toast({ title: 'Error creating organization', description: clusterError.message, variant: 'destructive' });
      setIsCreatingOrg(false);
      return;
    }

    await supabase.from('user_roles').insert({ user_id: user.id, role: 'admin', cluster_id: newCluster.id });
    await supabase.from('cluster_enrollments').insert({
      profile_id: profileId,
      cluster_id: newCluster.id,
      status: 'approved',
      role: 'owner',
    });

    toast({ title: 'Organization created! 🎉', description: `${newOrgName} is ready.` });
    setNewOrgName('');
    setNewOrgDescription('');
    setShowCreateModal(false);
    setIsCreatingOrg(false);
    onEnrollmentComplete();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const approvedEnrollments = enrollments.filter(e => e.status === 'approved');
  const pendingEnrollments = enrollments.filter(e => e.status === 'pending');
  const rejectedEnrollments = enrollments.filter(e => e.status === 'rejected');
  const enrolledClusterIds = enrollments.map(e => e.cluster_id);
  const availableClusters = clusters.filter(c => !enrolledClusterIds.includes(c.id)).filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.description?.toLowerCase().includes(q);
  });

  // Navigation header component
  const NavigationHeader = () => (
    <div className="flex items-center justify-between w-full mb-8">
      <Button
        variant="ghost"
        onClick={handleBackToDashboard}
        className="flex items-center gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Dashboard
      </Button>
      <Button
        variant="ghost"
        onClick={handleSignOut}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
      >
        <LogOut className="w-4 h-4" />
        Log out
      </Button>
    </div>
  );

  // If user has approved enrollments, show them with option to join more
  if (approvedEnrollments.length > 0) {
    onEnrollmentComplete();
    return null;
  }

  // Show pending enrollments
  if (pendingEnrollments.length > 0 && !showJoinMore) {
    return (
      <div className="max-w-lg mx-auto">
        <NavigationHeader />
        <div className="text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-accent to-primary flex items-center justify-center"
          >
            <Clock className="w-10 h-10 text-primary-foreground" />
          </motion.div>
          <h2 className="text-2xl font-bold mb-3">Awaiting Approval</h2>
          <p className="text-muted-foreground mb-6">
            Your enrollment requests are pending approval from organization admins.
          </p>
          
          <div className="space-y-3 mb-6">
            {pendingEnrollments.map((enrollment) => (
              <div key={enrollment.cluster_id} className="glass-panel p-4 inline-flex items-center gap-3 w-full">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-medium">{enrollment.clusters.name}</p>
                  <p className="text-xs text-muted-foreground">Pending approval</p>
                </div>
                <Clock className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </div>

          {availableClusters.length > 0 && (
            <GlassButton onClick={() => setShowJoinMore(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Join Another Organization
            </GlassButton>
          )}
        </div>
      </div>
    );
  }

  // Show rejected status with option to try another
  if (rejectedEnrollments.length > 0 && enrollments.length === rejectedEnrollments.length && !showJoinMore) {
    return (
      <div className="max-w-lg mx-auto">
        <NavigationHeader />
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-3 text-destructive">Enrollment Rejected</h2>
          <p className="text-muted-foreground mb-6">
            Your enrollment request was not approved. Please contact the organization admin or try another cluster.
          </p>
          <GlassButton onClick={() => setShowJoinMore(true)}>
            Choose Another Organization
          </GlassButton>
        </div>
      </div>
    );
  }

  // Show organization selection
  return (
    <div className="max-w-2xl mx-auto">
      <NavigationHeader />
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center"
        >
          <Building2 className="w-10 h-10 text-white" />
        </motion.div>
        <h2 className="text-3xl font-bold mb-3">
          {showJoinMore ? 'Join Another' : 'Choose Your'} <span className="gradient-text">Organization</span>
        </h2>
        <p className="text-muted-foreground text-lg">
          Select an organization to join, or create your own.
        </p>
        <GlassButton variant="primary" onClick={() => setShowCreateModal(true)} className="mt-4">
          <Plus className="w-4 h-4 mr-2" />
          Create Organization
        </GlassButton>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search organizations..."
          className="pl-10"
        />
      </div>

      <div className="space-y-3 mb-8">
        {availableClusters.length === 0 ? (
          <div className="glass-panel p-8 text-center">
            <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No organizations match your search.' : 'No more organizations available to join.'}
            </p>
          </div>
        ) : (
          availableClusters.map((cluster, index) => (
            <motion.div
              key={cluster.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <button
                onClick={() => setSelectedCluster(cluster.id)}
                className={`w-full glass-panel p-5 flex items-center gap-4 transition-all ${
                  selectedCluster === cluster.id
                    ? 'ring-2 ring-primary bg-primary/10'
                    : 'hover:bg-secondary/50'
                }`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  selectedCluster === cluster.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
                }`}>
                  {cluster.logo_url ? (
                    <img src={cluster.logo_url} alt={cluster.name} className="w-8 h-8 rounded" />
                  ) : (
                    <Building2 className="w-6 h-6" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <h3 className="font-semibold">{cluster.name}</h3>
                  {cluster.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {cluster.description}
                    </p>
                  )}
                </div>
                {selectedCluster === cluster.id && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-6 h-6 rounded-full bg-primary flex items-center justify-center"
                  >
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </motion.div>
                )}
              </button>
            </motion.div>
          ))
        )}
      </div>

      <div className="flex justify-center gap-3">
        {showJoinMore && (
          <GlassButton onClick={() => setShowJoinMore(false)}>
            Cancel
          </GlassButton>
        )}
        <GlassButton
          variant="primary"
          onClick={handleEnroll}
          disabled={!selectedCluster || isSubmitting}
          className="px-8"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Requesting...
            </>
          ) : (
            'Request to Join'
          )}
        </GlassButton>
      </div>

      {/* Create Organization Modal */}
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
              className="glass-panel p-6 w-full max-w-md"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="font-semibold">Create Organization</h2>
                  <p className="text-sm text-muted-foreground">Build your talent cluster</p>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">Organization Name</label>
                  <GlassInput
                    value={newOrgName}
                    onChange={e => setNewOrgName(e.target.value)}
                    placeholder="e.g., Tech Innovators"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Description (optional)</label>
                  <textarea
                    value={newOrgDescription}
                    onChange={e => setNewOrgDescription(e.target.value)}
                    placeholder="What does your organization focus on?"
                    className="w-full h-24 bg-secondary/50 border border-border/30 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <GlassButton onClick={() => setShowCreateModal(false)} className="flex-1">Cancel</GlassButton>
                <GlassButton
                  variant="primary"
                  onClick={handleCreateOrganization}
                  disabled={!newOrgName.trim() || isCreatingOrg}
                  className="flex-1"
                >
                  {isCreatingOrg ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating...</>
                  ) : (
                    <><Plus className="w-4 h-4 mr-2" />Create</>
                  )}
                </GlassButton>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
