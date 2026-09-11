import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, ExternalLink, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface StripeConnectSetupProps {
  profileId: string;
}

export function StripeConnectSetup({ profileId }: StripeConnectSetupProps) {
  const { toast } = useToast();
  const [status, setStatus] = useState<{
    connected: boolean;
    charges_enabled?: boolean;
    payouts_enabled?: boolean;
    onboarding_complete?: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => { checkStatus(); }, []);

  const checkStatus = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-onboard', {
        body: { action: 'status' },
      });
      if (error) throw error;
      setStatus(data);
    } catch {
      setStatus({ connected: false });
    }
    setIsLoading(false);
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-onboard', {
        body: { action: 'create' },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
    setIsConnecting(false);
  };

  const openDashboard = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('stripe-connect-onboard', {
        body: { action: 'dashboard' },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (isLoading) {
    return <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" /> Checking payment setup...</div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <CreditCard className="w-5 h-5 text-primary" />
        <h4 className="font-medium">Payment Setup</h4>
      </div>

      {!status?.connected ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Connect your Stripe account to receive payments for completed tasks.
          </p>
          <Button onClick={handleConnect} disabled={isConnecting} className="gap-2">
            {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
            Connect Stripe Account
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {status.onboarding_complete ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertCircle className="w-4 h-4 text-yellow-500" />
            )}
            <span className="text-sm">
              {status.onboarding_complete
                ? 'Stripe account connected and ready'
                : 'Stripe account needs to complete onboarding'}
            </span>
          </div>

          <div className="flex gap-2">
            {!status.onboarding_complete && (
              <Button size="sm" onClick={handleConnect} className="gap-1">
                <ExternalLink className="w-3 h-3" /> Complete Setup
              </Button>
            )}
            {status.onboarding_complete && (
              <Button size="sm" variant="secondary" onClick={openDashboard} className="gap-1">
                <ExternalLink className="w-3 h-3" /> Stripe Dashboard
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={checkStatus}>
              Refresh Status
            </Button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
