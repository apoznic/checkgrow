import { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Cluster {
  id: string;
  name: string;
  logo_url: string | null;
  city: string | null;
  country: string | null;
  category: string | null;
}

interface FloatingOrgBubblesProps {
  onSelectCluster?: (clusterId: string) => void;
}

export function FloatingOrgBubbles({ onSelectCluster }: FloatingOrgBubblesProps) {
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('clusters')
        .select('id, name, logo_url, city, country, description, category')
        .order('name');
      if (data) {
        setClusters(
          data.filter(c => c.name?.trim() && c.description?.trim() && c.logo_url?.trim() && c.city?.trim() && c.country?.trim())
        );
      }
    };
    load();
  }, []);

  if (clusters.length === 0) return null;

  const handleClick = (clusterId: string) => {
    if (onSelectCluster) {
      onSelectCluster(clusterId);
    } else {
      navigate(`/demand?cluster=${clusterId}`);
    }
  };

  // Sizes based on index for visual variety
  const sizes = [72, 64, 56, 68, 60, 52, 66, 58];

  return (
    <div className="w-full max-w-5xl mx-auto mt-6 sm:mt-8">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 text-center">
        Browse Organizations
      </h2>
      <div className="flex flex-wrap justify-center gap-4 sm:gap-6">
        {clusters.map((cluster, i) => {
          const size = sizes[i % sizes.length];
          return (
            <BubbleItem
              key={cluster.id}
              cluster={cluster}
              size={size}
              index={i}
              onClick={() => handleClick(cluster.id)}
            />
          );
        })}
      </div>
    </div>
  );
}

function BubbleItem({
  cluster,
  size,
  index,
  onClick,
}: {
  cluster: Cluster;
  size: number;
  index: number;
  onClick: () => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useTransform(y, [-20, 20], [5, -5]);
  const rotateY = useTransform(x, [-20, 20], [-5, 5]);

  return (
    <motion.div
      className="flex flex-col items-center gap-1.5 cursor-grab active:cursor-grabbing select-none"
      initial={{ opacity: 0, scale: 0, y: 30 }}
      animate={{
        opacity: 1,
        scale: 1,
        y: [0, -6, 0],
      }}
      transition={{
        opacity: { delay: index * 0.08, duration: 0.3 },
        scale: { delay: index * 0.08, duration: 0.4, type: 'spring', stiffness: 300 },
        y: {
          delay: index * 0.15 + 0.5,
          duration: 3 + (index % 3),
          repeat: Infinity,
          repeatType: 'reverse',
          ease: 'easeInOut',
        },
      }}
      drag
      dragConstraints={{ left: -60, right: 60, top: -40, bottom: 40 }}
      dragElastic={0.3}
      dragMomentum={false}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => setTimeout(() => setIsDragging(false), 50)}
      style={{ x, y, rotateX, rotateY }}
      whileHover={{ scale: 1.15 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => {
        if (!isDragging) onClick();
      }}
    >
      <div
        className="rounded-full bg-card border-2 border-border/50 shadow-lg hover:shadow-xl hover:border-primary/40 transition-all duration-300 flex items-center justify-center overflow-hidden"
        style={{ width: size, height: size }}
      >
        {cluster.logo_url ? (
          <img
            src={cluster.logo_url}
            alt={cluster.name}
            className="w-full h-full object-cover rounded-full"
            draggable={false}
          />
        ) : (
          <Building2 className="w-1/3 h-1/3 text-muted-foreground" />
        )}
      </div>
      <span className="text-[10px] sm:text-xs font-medium text-muted-foreground text-center max-w-[80px] truncate">
        {cluster.name}
      </span>
      {cluster.category && (
        <span className="text-[9px] text-primary/70 font-medium bg-primary/10 px-1.5 py-0.5 rounded-full truncate max-w-[80px]">
          {cluster.category}
        </span>
      )}
    </motion.div>
  );
}
