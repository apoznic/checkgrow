import { useState } from 'react';
import { FloatingLayout } from '@/components/FloatingLayout';
import { AppTopBar } from '@/components/AppTopBar';
import { SEO } from '@/components/SEO';
import { BrowseOrganizations } from '@/components/organization/BrowseOrganizations';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useEffect } from 'react';

export default function JoinKolektiv() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [profileId, setProfileId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(searchParams.get('create') === 'true');
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDescription, setNewOrgDescription] = useState('');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()
        .then(({ data }) => {
          if (data) setProfileId(data.id);
        });
    }
  }, [user]);

  const handleCreateOrganization = async () => {
    if (!newOrgName.trim() || !user?.id || !profileId) return;

    setIsCreatingOrg(true);

    const { data: newCluster, error: clusterError } = await supabase
      .from('clusters')
      .insert({
        name: newOrgName.trim(),
        description: newOrgDescription.trim() || null,
      })
      .select()
      .single();

    if (clusterError) {
      toast({ title: 'Error creating organization', description: clusterError.message, variant: 'destructive' });
      setIsCreatingOrg(false);
      return;
    }

    await supabase.from('user_roles').insert({
      user_id: user.id,
      role: 'admin',
      cluster_id: newCluster.id,
    });

    await supabase.from('cluster_enrollments').insert({
      profile_id: profileId,
      cluster_id: newCluster.id,
      status: 'approved',
      role: 'owner',
    });

    toast({ title: 'Organization created! 🎉', description: `${newOrgName} is now ready.` });
    setNewOrgName('');
    setNewOrgDescription('');
    setShowCreateModal(false);
    setIsCreatingOrg(false);
    navigate('/admin');
  };

  return (
    <FloatingLayout>
      <SEO title="Join an Organization — Discover Organizations" description="Browse and request membership in organizations — distributed teams and agencies on CheckGrow." path="/join-kolektiv" image="/og/join.jpg" />
      <AppTopBar />
      <BrowseOrganizations
        user={user}
        profileId={profileId}
        showCreateModal={showCreateModal}
        setShowCreateModal={setShowCreateModal}
        newOrgName={newOrgName}
        setNewOrgName={setNewOrgName}
        newOrgDescription={newOrgDescription}
        setNewOrgDescription={setNewOrgDescription}
        isCreatingOrg={isCreatingOrg}
        handleCreateOrganization={handleCreateOrganization}
        onJoined={() => navigate('/admin')}
      />
    </FloatingLayout>
  );
}
