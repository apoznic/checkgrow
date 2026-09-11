import { motion } from 'framer-motion';
import { User, Briefcase, Linkedin, X, RefreshCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

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

interface TeamMemberCardProps {
  member: SwarmMember;
  index: number;
  onRemove: (id: string) => void;
  onReplace: (id: string) => void;
  isReplacing?: boolean;
}

export function TeamMemberCard({ member, index, onRemove, onReplace, isReplacing }: TeamMemberCardProps) {
  const [expanded, setExpanded] = useState(false);

  const confidenceConfig = {
    high: { color: 'bg-emerald-500', text: 'text-emerald-400', label: 'Strong Match', pct: 90 },
    medium: { color: 'bg-amber-500', text: 'text-amber-400', label: 'Good Match', pct: 70 },
    low: { color: 'bg-orange-500', text: 'text-orange-400', label: 'Partial Match', pct: 45 },
  };

  const conf = confidenceConfig[member.match_confidence || 'medium'];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ delay: index * 0.08 }}
      className="group relative rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm hover:border-primary/30 transition-all duration-300"
    >
      {/* Match confidence bar at top */}
      <div className="h-1 rounded-t-2xl overflow-hidden bg-muted/30">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${conf.pct}%` }}
          transition={{ delay: index * 0.08 + 0.3, duration: 0.6 }}
          className={`h-full ${conf.color}`}
        />
      </div>

      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            {member.avatar_url ? (
              <img
                src={member.avatar_url}
                alt={member.full_name || 'Team member'}
                className="w-14 h-14 rounded-xl object-cover ring-2 ring-border/30"
              />
            ) : (
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center ring-2 ring-border/30">
                <User className="w-7 h-7 text-primary" />
              </div>
            )}
            <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
              <span className="text-[10px] font-bold text-white">{index + 1}</span>
            </div>
            {member.has_linkedin && (
              <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-[#0077b5] flex items-center justify-center shadow-sm">
                <Linkedin className="w-3 h-3 text-white" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-foreground truncate">{member.full_name || 'Team Member'}</h4>
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                member.match_confidence === 'high' ? 'text-emerald-600 border-emerald-200 bg-emerald-50' :
                member.match_confidence === 'low' ? 'text-orange-600 border-orange-200 bg-orange-50' :
                'text-amber-600 border-amber-200 bg-amber-50'
              }`}>
                {conf.label}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-sm text-muted-foreground">
              <Briefcase className="w-3.5 h-3.5" />
              <span>{member.role}</span>
              {member.years_experience && member.years_experience > 0 && (
                <span className="text-xs opacity-70">• {member.years_experience}y exp</span>
              )}
            </div>

            {/* Skills */}
            <div className="flex flex-wrap gap-1 mt-2">
              {member.skills.slice(0, expanded ? undefined : 4).map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-0.5 rounded-md text-xs font-medium bg-primary/8 text-primary border border-primary/10"
                >
                  {skill}
                </span>
              ))}
              {!expanded && member.skills.length > 4 && (
                <button
                  onClick={() => setExpanded(true)}
                  className="px-2 py-0.5 rounded-md text-xs font-medium bg-muted text-muted-foreground hover:bg-muted/80 transition-colors"
                >
                  +{member.skills.length - 4} more
                </button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onReplace(member.id)}
              disabled={isReplacing}
              className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
              title="Find replacement"
            >
              <RefreshCcw className={`w-4 h-4 ${isReplacing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => onRemove(member.id)}
              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              title="Remove from team"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Expandable reason */}
        {member.reason && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full text-left"
          >
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {expanded ? 'Hide details' : 'Why this match?'}
          </button>
        )}

        {expanded && member.reason && (
          <motion.p
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-2 text-xs text-muted-foreground leading-relaxed pl-2 border-l-2 border-primary/20"
          >
            {member.reason}
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
