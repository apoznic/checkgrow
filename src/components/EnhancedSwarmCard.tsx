import { motion } from 'framer-motion';
import { User, Sparkles, X, Briefcase, DollarSign, Clock, Users, TrendingUp, Check, Linkedin } from 'lucide-react';
import { GlassButton } from '@/components/GlassCard';

interface SwarmMember {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  role: string;
  skills: string[];
  reason?: string;
  match_confidence?: 'high' | 'medium' | 'low';
  years_experience?: number;
  has_linkedin?: boolean;
}

interface PricingEstimate {
  average_price: number;
  min_price: number;
  max_price: number;
  average_hours: number;
  currency: string;
  service_name: string;
  organizations_count: number;
}

interface EnhancedSwarmCardProps {
  swarm: SwarmMember[];
  location: string;
  pricing?: PricingEstimate | null;
  serviceName?: string;
  onClose: () => void;
  onConfirm: () => void;
}

export function EnhancedSwarmCard({ 
  swarm, 
  location, 
  pricing, 
  serviceName,
  onClose, 
  onConfirm 
}: EnhancedSwarmCardProps) {
  const getConfidenceColor = (confidence?: string) => {
    switch (confidence) {
      case 'high': return 'text-green-500 bg-green-500/10';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10';
      case 'low': return 'text-orange-500 bg-orange-500/10';
      default: return 'text-primary bg-primary/10';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: 20 }}
      className="glass-panel p-8 max-w-2xl w-full mx-auto"
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
          Your <span className="gradient-text">{serviceName || location} Team</span>
        </h2>
        <p className="text-muted-foreground">
          {swarm.length} verified professional{swarm.length !== 1 ? 's' : ''} matched for your project
        </p>
      </div>

      {/* Pricing Estimate Card */}
      {pricing && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-6 p-4 rounded-xl bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-primary/30"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estimated Cost</p>
                <p className="text-xl font-bold text-primary">
                  €{pricing.average_price.toLocaleString()}
                </p>
              </div>
            </div>
            
            <div className="flex gap-4 text-sm">
              <div className="text-center">
                <p className="text-muted-foreground">Range</p>
                <p className="font-medium">
                  €{pricing.min_price.toLocaleString()} - €{pricing.max_price.toLocaleString()}
                </p>
              </div>
              <div className="text-center">
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Timeline</span>
                </div>
                <p className="font-medium">~{pricing.average_hours}h</p>
              </div>
            </div>
          </div>
          
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Based on {pricing.organizations_count} organization{pricing.organizations_count !== 1 ? 's' : ''} pricing data
          </p>
        </motion.div>
      )}

      {/* Team Stack */}
      <div className="space-y-3 mb-8 max-h-[300px] overflow-y-auto pr-2">
        {swarm.map((member, index) => (
          <motion.div
            key={member.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + index * 0.1 }}
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
              {member.has_linkedin && (
                <div className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-[#0077b5] flex items-center justify-center">
                  <Linkedin className="w-2.5 h-2.5 text-white" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold truncate">{member.full_name || 'Team Member'}</p>
                {member.match_confidence && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${getConfidenceColor(member.match_confidence)}`}>
                    {member.match_confidence}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Briefcase className="w-3 h-3" />
                <span>{member.role}</span>
                {member.years_experience && member.years_experience > 0 && (
                  <span className="text-xs">• {member.years_experience}y exp</span>
                )}
              </div>
              {member.reason && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{member.reason}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-1 max-w-[120px]">
              {member.skills.slice(0, 3).map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary truncate max-w-[100px]"
                >
                  {skill}
                </span>
              ))}
              {member.skills.length > 3 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
                  +{member.skills.length - 3}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="flex items-center justify-center gap-6 mb-6 py-3 border-y border-border/30">
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">{swarm.length}</p>
          <p className="text-xs text-muted-foreground">Team Members</p>
        </div>
        <div className="h-8 w-px bg-border/50" />
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">
            {swarm.filter(m => m.match_confidence === 'high').length}
          </p>
          <p className="text-xs text-muted-foreground">High Confidence</p>
        </div>
        {pricing && (
          <>
            <div className="h-8 w-px bg-border/50" />
            <div className="text-center">
              <p className="text-2xl font-bold text-accent">{pricing.average_hours}h</p>
              <p className="text-xs text-muted-foreground">Est. Timeline</p>
            </div>
          </>
        )}
      </div>

      <div className="flex gap-3">
        <GlassButton onClick={onClose} className="flex-1">
          Regenerate
        </GlassButton>
        <GlassButton variant="primary" onClick={onConfirm} className="flex-1">
          <Check className="w-4 h-4 mr-2" />
          Confirm & Create Project
        </GlassButton>
      </div>
    </motion.div>
  );
}
