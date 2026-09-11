import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Users, Trash2, ArrowRight, FileText } from 'lucide-react';

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

export interface DraftAttempt {
  id: string;
  timestamp: Date;
  prompt: string;
  team: SwarmMember[];
  projectTitle?: string;
  serviceType?: string | null;
}

interface DraftHistoryProps {
  drafts: DraftAttempt[];
  activeDraftId?: string | null;
  onResume: (draft: DraftAttempt) => void;
  onDelete: (id: string) => void;
}

export function DraftHistory({ drafts, activeDraftId, onResume, onDelete }: DraftHistoryProps) {
  if (drafts.length === 0) return null;

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <h4 className="text-sm font-semibold text-muted-foreground">Previous Attempts</h4>
        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-muted text-muted-foreground">
          {drafts.length}
        </span>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        <AnimatePresence>
          {drafts.map((draft) => {
            const isActive = draft.id === activeDraftId;
            const timeAgo = getTimeAgo(draft.timestamp);

            return (
              <motion.div
                key={draft.id}
                layout
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className={`group rounded-xl border p-3 cursor-pointer transition-all duration-200 ${
                  isActive
                    ? 'border-primary/40 bg-primary/5'
                    : 'border-border/30 bg-card/30 hover:border-primary/20 hover:bg-card/50'
                }`}
                onClick={() => onResume(draft)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText className="w-4 h-4 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {draft.projectTitle || draft.prompt.slice(0, 50)}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Users className="w-3 h-3" />
                      <span>{draft.team.length} members</span>
                      <span>•</span>
                      <span>{timeAgo}</span>
                      {draft.serviceType && (
                        <>
                          <span>•</span>
                          <span className="capitalize">{draft.serviceType}</span>
                        </>
                      )}
                    </div>

                    {/* Mini avatar stack */}
                    <div className="flex items-center mt-2 -space-x-2">
                      {draft.team.slice(0, 4).map((m, i) => (
                        <div
                          key={m.id}
                          className="w-6 h-6 rounded-full border-2 border-card bg-primary/10 flex items-center justify-center overflow-hidden"
                        >
                          {m.avatar_url ? (
                            <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[8px] font-bold text-primary">
                              {(m.full_name || '?')[0]}
                            </span>
                          )}
                        </div>
                      ))}
                      {draft.team.length > 4 && (
                        <div className="w-6 h-6 rounded-full border-2 border-card bg-muted flex items-center justify-center">
                          <span className="text-[8px] font-bold text-muted-foreground">+{draft.team.length - 4}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onResume(draft);
                      }}
                      className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                      title="Resume this draft"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(draft.id);
                      }}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      title="Delete draft"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
