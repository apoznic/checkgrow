import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Building2, Plus, Loader2, Check, Clock, X, LogOut, Users 
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { GlassButton } from '@/components/GlassCard';
import { useAuth } from '@/lib/auth';

interface Cluster {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  city: string | null;
  country: string | null;
}

interface Enrollment {
  id: string;
  cluster_id: string;
  status: string;
  role: string;
  clusters: Cluster;
}

interface OrganizationsTabProps {
  profileId: string;
  onClose?: () => void;
  initialView?: 'my-orgs' | 'join' | 'create';
}

export function OrganizationsTab({ profileId, onClose, initialView = 'my-orgs' }: OrganizationsTabProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [leavingClusterId, setLeavingClusterId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'my-orgs' | 'join' | 'create'>(initialView);

  // Create org form state
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDescription, setNewOrgDescription] = useState('');
  const [newOrgCity, setNewOrgCity] = useState('');
  const [newOrgCountry, setNewOrgCountry] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    loadData();
  }, [profileId]);

  const loadData = async () => {
    setIsLoading(true);
    const [clustersRes, enrollmentsRes] = await Promise.all([
      supabase.from('clusters').select('*').order('name'),
      supabase
        .from('cluster_enrollments')
        .select(`
          id,
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

    if (clustersRes.data) setClusters(clustersRes.data);
    if (enrollmentsRes.data) setEnrollments(enrollmentsRes.data as unknown as Enrollment[]);
    setIsLoading(false);
  };

  const handleJoinRequest = async () => {
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
          title: 'Request failed',
          description: error.message,
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Request sent!',
        description: 'Waiting for admin approval.',
      });
      loadData();
      setSelectedCluster(null);
      setActiveView('my-orgs');
    }
    setIsSubmitting(false);
  };

  const handleCreateOrg = async () => {
    if (!newOrgName.trim() || !user) return;

    setIsCreating(true);
    try {
      // 1. Create the cluster
      const { data: cluster, error: clusterError } = await supabase
        .from('clusters')
        .insert({
          name: newOrgName.trim(),
          description: newOrgDescription.trim() || null,
          city: newOrgCity.trim() || null,
          country: newOrgCountry.trim() || null,
        })
        .select()
        .single();

      if (clusterError) throw clusterError;

      // 2. Add user as admin in user_roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'admin',
          cluster_id: cluster.id,
        });

      if (roleError) throw roleError;

      // 3. Add enrollment as owner
      const { error: enrollError } = await supabase
        .from('cluster_enrollments')
        .insert({
          profile_id: profileId,
          cluster_id: cluster.id,
          status: 'approved',
          role: 'owner',
        });

      if (enrollError) throw enrollError;

      toast({
        title: 'Organization created!',
        description: `${newOrgName} is ready. You are the owner.`,
      });

      // Reset form
      setNewOrgName('');
      setNewOrgDescription('');
      setNewOrgCity('');
      setNewOrgCountry('');
      setActiveView('my-orgs');
      loadData();
      onClose?.();
    } catch (err: any) {
      toast({
        title: 'Failed to create organization',
        description: err.message,
        variant: 'destructive',
      });
    }
    setIsCreating(false);
  };

  const [confirmLeave, setConfirmLeave] = useState<{ id: string; name: string } | null>(null);

  const handleLeaveOrg = async (enrollmentId: string, clusterName: string) => {
    setConfirmLeave({ id: enrollmentId, name: clusterName });
  };

  const confirmLeaveOrg = async () => {
    if (!confirmLeave) return;
    setLeavingClusterId(confirmLeave.id);
    
    const { error } = await supabase
      .from('cluster_enrollments')
      .delete()
      .eq('id', confirmLeave.id);

    if (error) {
      toast({
        title: 'Error leaving organization',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Left organization',
        description: `You have left ${confirmLeave.name}.`,
      });
      loadData();
    }
    setLeavingClusterId(null);
    setConfirmLeave(null);
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
  const enrolledClusterIds = enrollments.map(e => e.cluster_id);
  const availableClusters = clusters.filter(c => 
    !enrolledClusterIds.includes(c.id) &&
    c.name?.trim() && c.description?.trim() && c.logo_url?.trim() && c.city?.trim() && c.country?.trim()
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
            <Check className="w-3 h-3" /> Active
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-accent/10 text-accent">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive">
            <X className="w-3 h-3" /> Rejected
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Header */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setActiveView('my-orgs')}
          className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
            activeView === 'my-orgs'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <Users className="w-4 h-4 inline mr-1.5" />
          My Orgs ({enrollments.length})
        </button>
        <button
          onClick={() => setActiveView('join')}
          className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
            activeView === 'join'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <Plus className="w-4 h-4 inline mr-1.5" />
          Join ({availableClusters.length})
        </button>
        <button
          onClick={() => setActiveView('create')}
          className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
            activeView === 'create'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
          }`}
        >
          <Building2 className="w-4 h-4 inline mr-1.5" />
          Create New
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeView === 'my-orgs' ? (
          <motion.div
            key="my-orgs"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-3"
          >
            {enrollments.length === 0 ? (
              <div className="glass-panel p-8 text-center">
                <Building2 className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                <p className="text-muted-foreground mb-4">You haven't joined any organizations yet.</p>
                <div className="flex gap-3 justify-center">
                  <GlassButton onClick={() => setActiveView('join')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Join
                  </GlassButton>
                  <GlassButton variant="primary" onClick={() => setActiveView('create')}>
                    <Building2 className="w-4 h-4 mr-2" />
                    Create
                  </GlassButton>
                </div>
              </div>
            ) : (
              <>
                {approvedEnrollments.map((enrollment) => (
                  <motion.div
                    key={enrollment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel p-4 flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      {enrollment.clusters.logo_url ? (
                        <img src={enrollment.clusters.logo_url} alt="" className="w-8 h-8 rounded" />
                      ) : (
                        <Building2 className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{enrollment.clusters.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{enrollment.role}</p>
                    </div>
                    {getStatusBadge(enrollment.status)}
                    {enrollment.role !== 'owner' && (
                      <GlassButton
                        onClick={() => handleLeaveOrg(enrollment.id, enrollment.clusters.name)}
                        disabled={leavingClusterId === enrollment.id}
                        className="!px-3 !py-2 hover:!bg-destructive/10 hover:!text-destructive"
                      >
                        {leavingClusterId === enrollment.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <LogOut className="w-4 h-4" />
                        )}
                      </GlassButton>
                    )}
                  </motion.div>
                ))}

                {pendingEnrollments.map((enrollment) => (
                  <motion.div
                    key={enrollment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel p-4 flex items-center gap-4 opacity-75"
                  >
                    <div className="w-12 h-12 rounded-xl bg-accent/20 flex items-center justify-center">
                      {enrollment.clusters.logo_url ? (
                        <img src={enrollment.clusters.logo_url} alt="" className="w-8 h-8 rounded" />
                      ) : (
                        <Building2 className="w-6 h-6 text-accent" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{enrollment.clusters.name}</p>
                      <p className="text-xs text-muted-foreground">Awaiting approval</p>
                    </div>
                    {getStatusBadge(enrollment.status)}
                    <GlassButton
                      onClick={() => handleLeaveOrg(enrollment.id, enrollment.clusters.name)}
                      disabled={leavingClusterId === enrollment.id}
                      className="!px-3 !py-2 hover:!bg-destructive/10 hover:!text-destructive"
                    >
                      {leavingClusterId === enrollment.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </GlassButton>
                  </motion.div>
                ))}
              </>
            )}
          </motion.div>
        ) : activeView === 'join' ? (
          <motion.div
            key="join"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            {availableClusters.length === 0 ? (
              <div className="glass-panel p-8 text-center">
                <Check className="w-12 h-12 mx-auto mb-3 text-primary/50" />
                <p className="text-muted-foreground">You're enrolled in all available organizations!</p>
              </div>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  Select an organization to request membership:
                </p>
                <div className="space-y-2">
                  {availableClusters.map((cluster) => (
                    <button
                      key={cluster.id}
                      onClick={() => setSelectedCluster(cluster.id)}
                      className={`w-full glass-panel p-4 flex items-center gap-4 transition-all ${
                        selectedCluster === cluster.id
                          ? 'ring-2 ring-primary bg-primary/10'
                          : 'hover:bg-secondary/50'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        selectedCluster === cluster.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-muted-foreground'
                      }`}>
                        {cluster.logo_url ? (
                          <img src={cluster.logo_url} alt="" className="w-6 h-6 rounded" />
                        ) : (
                          <Building2 className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <p className="font-medium">{cluster.name}</p>
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
                  ))}
                </div>
                <div className="flex justify-end pt-2">
                  <GlassButton
                    variant="primary"
                    onClick={handleJoinRequest}
                    disabled={!selectedCluster || isSubmitting}
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
              </>
            )}
          </motion.div>
        ) : (
          /* Create New Organization */
          <motion.div
            key="create"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <p className="text-sm text-muted-foreground">
              Create a new organization. You will be the owner with full admin rights.
            </p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Organization Name *</label>
                <input
                  type="text"
                  value={newOrgName}
                  onChange={e => setNewOrgName(e.target.value)}
                  placeholder="e.g. Studio Nova"
                  className="glass-input"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Description</label>
                <textarea
                  value={newOrgDescription}
                  onChange={e => setNewOrgDescription(e.target.value)}
                  placeholder="What does your organization do?"
                  className="glass-input min-h-[80px] resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1 block">City</label>
                  <input
                    type="text"
                    value={newOrgCity}
                    onChange={e => setNewOrgCity(e.target.value)}
                    placeholder="e.g. Zagreb"
                    className="glass-input"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1 block">Country</label>
                  <input
                    type="text"
                    value={newOrgCountry}
                    onChange={e => setNewOrgCountry(e.target.value)}
                    placeholder="e.g. Croatia"
                    className="glass-input"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <GlassButton
                variant="primary"
                onClick={handleCreateOrg}
                disabled={!newOrgName.trim() || isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Organization'
                )}
              </GlassButton>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leave Confirmation Dialog */}
      <AnimatePresence>
        {confirmLeave && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-start justify-center z-[60] p-6 pt-[10vh]"
            onClick={() => setConfirmLeave(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-panel p-6 w-full max-w-sm"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="font-semibold mb-2">Leave Organization?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Are you sure you want to leave <strong>{confirmLeave.name}</strong>? You will need to request to rejoin.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmLeave(null)}
                  className="flex-1 py-2 bg-secondary/50 rounded-xl text-sm font-medium hover:bg-secondary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLeaveOrg}
                  disabled={leavingClusterId === confirmLeave.id}
                  className="flex-1 py-2 bg-destructive text-destructive-foreground rounded-xl text-sm font-medium flex items-center justify-center gap-2 hover:bg-destructive/90 transition-colors"
                >
                  {leavingClusterId === confirmLeave.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Leave'
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
