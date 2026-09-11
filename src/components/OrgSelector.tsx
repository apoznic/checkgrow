import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Building2, Check, Loader2, MapPin } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { GlassButton } from '@/components/GlassCard';

interface Cluster {
  id: string;
  name: string;
  description: string | null;
  city: string | null;
  country: string | null;
  logo_url: string | null;
}

interface OrgSelectorProps {
  onSelect: (clusterIds: string[]) => void;
  onCancel: () => void;
}

export function OrgSelector({ onSelect, onCancel }: OrgSelectorProps) {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [selectedClusters, setSelectedClusters] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadClusters();
  }, []);

  const loadClusters = async () => {
    const { data } = await supabase
      .from('clusters')
      .select('id, name, description, city, country, logo_url')
      .order('name');

    if (data) setClusters(data);
    setIsLoading(false);
  };

  const toggleCluster = (clusterId: string) => {
    setSelectedClusters(prev => 
      prev.includes(clusterId)
        ? prev.filter(id => id !== clusterId)
        : [...prev, clusterId]
    );
  };

  const selectAll = () => {
    setSelectedClusters(clusters.map(c => c.id));
  };

  const clearAll = () => {
    setSelectedClusters([]);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-6 max-w-md mx-auto"
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-semibold">Select Organizations</h3>
          <p className="text-sm text-muted-foreground">Choose which talent pools to search</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <button
          onClick={selectAll}
          className="text-xs text-primary hover:underline"
        >
          Select All
        </button>
        <span className="text-muted-foreground">|</span>
        <button
          onClick={clearAll}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Clear All
        </button>
      </div>

      <div className="space-y-2 max-h-64 overflow-y-auto mb-6">
        {clusters.map((cluster) => {
          const hasLocation = cluster.city || cluster.country;
          return (
            <button
              key={cluster.id}
              onClick={() => toggleCluster(cluster.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors ${
                selectedClusters.includes(cluster.id)
                  ? 'bg-primary/10 border border-primary/30'
                  : 'bg-secondary/30 hover:bg-secondary/50 border border-transparent'
              }`}
            >
              <div className={`w-5 h-5 rounded flex items-center justify-center ${
                selectedClusters.includes(cluster.id)
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary'
              }`}>
                {selectedClusters.includes(cluster.id) && (
                  <Check className="w-3 h-3" />
                )}
              </div>
              {cluster.logo_url ? (
                <img src={cluster.logo_url} alt="" className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 text-left">
                <p className="font-medium text-sm">{cluster.name}</p>
                {hasLocation ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {[cluster.city, cluster.country].filter(Boolean).join(', ')}
                  </p>
                ) : cluster.description ? (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {cluster.description}
                  </p>
                ) : (
                  <p className="text-xs text-destructive/70">No location set</p>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-3">
        <GlassButton onClick={onCancel} className="flex-1">
          Cancel
        </GlassButton>
        <GlassButton
          variant="primary"
          onClick={() => onSelect(selectedClusters)}
          className="flex-1"
        >
          {selectedClusters.length === 0 
            ? 'Search All' 
            : `Search ${selectedClusters.length} Org${selectedClusters.length > 1 ? 's' : ''}`
          }
        </GlassButton>
      </div>
    </motion.div>
  );
}
