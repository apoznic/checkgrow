import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { FloatingLayout } from '@/components/FloatingLayout';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
      return;
    }
    if (!loading && user) {
      // Check for pending invite from OAuth redirect
      const pendingInvite = localStorage.getItem('pending_invite_cluster');
      if (pendingInvite) {
        localStorage.removeItem('pending_invite_cluster');
        supabase.functions.invoke('accept-invitation', {
          body: { clusterId: pendingInvite },
        }).then(() => {
          navigateToDashboard();
        }).catch(() => {
          navigateToDashboard();
        });
      } else {
        navigateToDashboard();
      }
    }
  }, [user, loading, navigate]);

  const navigateToDashboard = () => {
    navigate('/admin', { replace: true });
  };

  return (
    <FloatingLayout>
      <div className="min-h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    </FloatingLayout>
  );
}
