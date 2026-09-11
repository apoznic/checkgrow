import { useState } from 'react';
import { Percent, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

interface PlatformFeeSettingsProps {
  clusterId: string;
  currentFee: number;
  isAdmin: boolean;
}

export function PlatformFeeSettings({ clusterId, currentFee, isAdmin }: PlatformFeeSettingsProps) {
  const { toast } = useToast();
  const [fee, setFee] = useState(currentFee);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (fee < 0 || fee > 100) return;
    setIsSaving(true);
    const { error } = await supabase
      .from('clusters')
      .update({ platform_fee_percent: fee } as any)
      .eq('id', clusterId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Saved', description: `Platform fee set to ${fee}%` });
    }
    setIsSaving(false);
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Percent className="w-4 h-4" />
        Platform fee: {currentFee}%
      </div>
    );
  }

  return (
    <div className="glass-panel p-4">
      <div className="flex items-center gap-2 mb-3">
        <Percent className="w-5 h-5 text-primary" />
        <h4 className="font-medium">Platform Fee</h4>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Percentage deducted from each task payment as the organization's platform fee.
      </p>
      <div className="flex items-center gap-3">
        <input
          type="number"
          min="0"
          max="100"
          step="0.5"
          value={fee}
          onChange={e => setFee(parseFloat(e.target.value) || 0)}
          className="w-24 bg-secondary/30 border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
        <span className="text-sm text-muted-foreground">%</span>
        <Button size="sm" onClick={handleSave} disabled={isSaving || fee === currentFee}>
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
        </Button>
      </div>
    </div>
  );
}
