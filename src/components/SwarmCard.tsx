import { motion } from 'framer-motion';
import { User, Sparkles, X, Linkedin, Briefcase } from 'lucide-react';
import { GlassButton } from '@/components/GlassCard';

interface SwarmMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  skills: string[];
  reason?: string;
}

interface SwarmCardProps {
  swarm: SwarmMember[];
  location: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function SwarmCard({ swarm, location, onClose, onConfirm }: SwarmCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="glass-panel p-8 max-w-lg w-full mx-auto"
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="text-center mb-6">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.2 }}
          className="w-16 h-16 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center"
        >
          <Sparkles className="w-8 h-8 text-white" />
        </motion.div>
        <h2 className="text-2xl font-bold mb-2">
          Your <span className="gradient-text">{location} Swarm</span>
        </h2>
        <p className="text-muted-foreground">
          {swarm.length} talents assembled for your project
        </p>
      </div>

      {/* Team Stack */}
      <div className="space-y-3 mb-8">
        {swarm.map((member, index) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            className="swarm-card flex items-center gap-4 p-4"
          >
            <div className="relative">
              {member.avatar_url ? (
                <img
                  src={member.avatar_url}
                  alt={member.full_name || 'Team member'}
                  className="w-12 h-12 rounded-xl object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <span className="text-[10px] font-bold text-white">{index + 1}</span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{member.full_name || 'Team Member'}</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Briefcase className="w-3 h-3" />
                <span>{member.role}</span>
              </div>
              {member.reason && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{member.reason}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-1">
              {member.skills.slice(0, 2).map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                >
                  {skill}
                </span>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex gap-3">
        <GlassButton onClick={onClose} className="flex-1">
          Regenerate
        </GlassButton>
        <GlassButton variant="primary" onClick={onConfirm} className="flex-1">
          <Sparkles className="w-4 h-4 mr-2" />
          Confirm Swarm
        </GlassButton>
      </div>
    </motion.div>
  );
}
