import { motion } from 'framer-motion';
import { User, Briefcase, CheckCircle2, XCircle, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { GlassButton } from '@/components/GlassCard';

interface Invitation {
  id: string;
  role_in_project: string | null;
  status: string | null;
  created_at: string;
  projects: {
    id: string;
    title: string;
    description: string | null;
    owner_id: string;
    profiles: {
      full_name: string | null;
      avatar_url: string | null;
    };
  };
}

interface TeamInvitationProps {
  invitation: Invitation;
  onAccept: () => void;
  onDecline: () => void;
  isLoading?: boolean;
}

export function TeamInvitation({ invitation, onAccept, onDecline, isLoading }: TeamInvitationProps) {
  const owner = invitation.projects.profiles;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel p-5"
    >
      <div className="flex items-start gap-4">
        {/* Owner Avatar */}
        {owner.avatar_url ? (
          <img
            src={owner.avatar_url}
            alt={owner.full_name || 'Project owner'}
            className="w-12 h-12 rounded-xl object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold">{invitation.projects.title}</h3>
          <p className="text-sm text-muted-foreground mb-2">
            From {owner.full_name || 'Project Owner'}
          </p>

          {invitation.projects.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {invitation.projects.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
            <div className="flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5" />
              <span>{invitation.role_in_project || 'Team Member'}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDistanceToNow(new Date(invitation.created_at), { addSuffix: true })}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <GlassButton
              variant="primary"
              onClick={onAccept}
              disabled={isLoading}
              className="flex-1"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Accept
            </GlassButton>
            <GlassButton
              onClick={onDecline}
              disabled={isLoading}
              className="flex-1"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Decline
            </GlassButton>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
