import { motion } from 'framer-motion';
import { 
  User, CheckCircle2, XCircle, Clock, Mail, Trash2, UserPlus, Hand, Check, X,
  Linkedin, MapPin
} from 'lucide-react';
import { GlassButton } from '@/components/GlassCard';
import { Badge } from '@/components/ui/badge';

interface TeamMember {
  id: string;
  profile_id: string;
  role_in_project: string | null;
  status: string | null;
  profiles: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    linkedin_url?: string | null;
    city?: string | null;
    skills?: {
      id: string;
      skill_name: string;
      skill_level: string | null;
      years_experience: number | null;
    }[];
  };
}

interface TeamStatusDashboardProps {
  team: TeamMember[];
  isOwner: boolean;
  onRemoveMember: (memberId: string) => void;
  onResendInvite?: (memberId: string) => void;
  onApproveApplication?: (memberId: string) => void;
  onDeclineApplication?: (memberId: string) => void;
}

const statusConfig = {
  accepted: { label: 'Accepted', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  applied: { label: 'Applied', icon: Hand, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  declined: { label: 'Declined', icon: XCircle, color: 'text-destructive', bg: 'bg-destructive/10' },
  proposed: { label: 'Pending', icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
};

const skillLevelColor = (level: string | null) => {
  switch (level) {
    case 'expert': return 'border-emerald-500/40 text-emerald-400';
    case 'advanced': return 'border-blue-500/40 text-blue-400';
    case 'intermediate': return 'border-amber-500/40 text-amber-400';
    case 'beginner': return 'border-muted text-muted-foreground';
    default: return 'border-border text-muted-foreground';
  }
};

export function TeamStatusDashboard({ team, isOwner, onRemoveMember, onResendInvite, onApproveApplication, onDeclineApplication }: TeamStatusDashboardProps) {
  const groupedTeam = {
    accepted: team.filter(m => m.status === 'accepted'),
    applied: team.filter(m => m.status === 'applied'),
    proposed: team.filter(m => m.status === 'proposed'),
    declined: team.filter(m => m.status === 'declined'),
  };

  const stats = {
    total: team.length,
    accepted: groupedTeam.accepted.length,
    applied: groupedTeam.applied.length,
    pending: groupedTeam.proposed.length,
    declined: groupedTeam.declined.length,
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'from-primary to-accent' },
          { label: 'Accepted', value: stats.accepted, color: 'from-emerald-500 to-green-600' },
          { label: 'Applied', value: stats.applied, color: 'from-blue-500 to-indigo-500' },
          { label: 'Pending', value: stats.pending, color: 'from-amber-500 to-orange-500' },
          { label: 'Declined', value: stats.declined, color: 'from-rose-500 to-red-500' },
        ].map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="glass-panel p-4 text-center"
          >
            <div className={`text-2xl font-bold bg-gradient-to-br ${stat.color} bg-clip-text text-transparent`}>
              {stat.value}
            </div>
            <div className="text-xs text-muted-foreground">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Team Members by Status */}
      <div className="space-y-4">
        {(Object.keys(groupedTeam) as Array<keyof typeof groupedTeam>).map((status) => {
          const members = groupedTeam[status];
          const config = statusConfig[status];
          const StatusIcon = config.icon;
          const showExpanded = status === 'applied';

          if (members.length === 0) return null;

          return (
            <div key={status} className="space-y-2">
              <div className="flex items-center gap-2 px-2">
                <StatusIcon className={`w-4 h-4 ${config.color}`} />
                <span className="font-medium text-sm">{config.label}</span>
                <span className="text-xs text-muted-foreground">({members.length})</span>
              </div>

              <div className="space-y-2">
                {members.map((member, index) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className={`glass-panel p-4 ${config.bg}`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      {member.profiles.avatar_url ? (
                        <img
                          src={member.profiles.avatar_url}
                          alt={member.profiles.full_name || 'Team member'}
                          className="w-12 h-12 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
                          <User className="w-6 h-6 text-primary" />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">
                            {member.profiles.full_name || 'Team Member'}
                          </p>
                          {showExpanded && member.profiles.linkedin_url && (
                            <a
                              href={member.profiles.linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                              title="View LinkedIn"
                            >
                              <Linkedin className="w-4 h-4" />
                            </a>
                          )}
                          {showExpanded && member.profiles.city && (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3" />
                              {member.profiles.city}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {(member.role_in_project || '').toLowerCase() === 'project_manager' ? '★ Project Manager' : 'Member'}
                        </p>
                        {member.profiles.bio && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {member.profiles.bio}
                          </p>
                        )}
                      </div>

                      {/* Status Badge */}
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-full ${config.bg}`}>
                        <StatusIcon className={`w-3 h-3 ${config.color}`} />
                        <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
                      </div>

                      {/* Actions */}
                      {isOwner && (
                        <div className="flex gap-1">
                          {status === 'applied' && onApproveApplication && onDeclineApplication && (
                            <>
                              <button
                                onClick={() => onApproveApplication(member.id)}
                                className="p-2 rounded-lg hover:bg-emerald-500/10 text-emerald-500 transition-colors"
                                title="Approve application"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onDeclineApplication(member.id)}
                                className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                                title="Decline application"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          {status === 'proposed' && onResendInvite && (
                            <button
                              onClick={() => onResendInvite(member.id)}
                              className="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"
                              title="Resend Invite"
                            >
                              <Mail className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => onRemoveMember(member.id)}
                            className="p-2 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                            title="Remove"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Expanded skills for applied members */}
                    {showExpanded && member.profiles.skills && member.profiles.skills.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/20">
                        <p className="text-xs font-medium text-muted-foreground mb-2">Skills</p>
                        <div className="flex flex-wrap gap-1.5">
                          {member.profiles.skills.map((skill) => (
                            <Badge
                              key={skill.id}
                              variant="outline"
                              className={`text-[10px] px-2 py-0.5 ${skillLevelColor(skill.skill_level)}`}
                            >
                              {skill.skill_name}
                              {skill.years_experience ? ` · ${skill.years_experience}y` : ''}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {team.length === 0 && (
        <div className="text-center py-12">
          <UserPlus className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
          <p className="text-muted-foreground">No team members yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Use the Swarm Generator to find and invite talent
          </p>
        </div>
      )}
    </div>
  );
}