import { motion, AnimatePresence } from 'framer-motion';
import { Users, Sparkles, Check, RotateCcw, Shield, Code, Palette, Database, Brain, X } from 'lucide-react';
import { TeamMemberCard } from './TeamMemberCard';

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

interface TeamBuilderPanelProps {
  team: SwarmMember[];
  pricing?: PricingEstimate | null;
  aiMessage?: string;
  onRemoveMember: (id: string) => void;
  onReplaceMember: (id: string) => void;
  onConfirm: () => void;
  onRegenerate: () => void;
  onCancel: () => void;
  isReplacing?: string | null;
  projectTitle?: string;
}

// Categorize skills for coverage visualization
const skillDomains = [
  { key: 'frontend', label: 'Frontend', icon: Palette, keywords: ['react', 'vue', 'angular', 'css', 'html', 'tailwind', 'ui', 'ux', 'design', 'figma', 'frontend', 'next', 'svelte'] },
  { key: 'backend', label: 'Backend', icon: Code, keywords: ['node', 'python', 'java', 'go', 'rust', 'ruby', 'php', 'backend', 'express', 'django', 'flask', 'api', 'rest', 'graphql'] },
  { key: 'data', label: 'Data', icon: Database, keywords: ['sql', 'postgres', 'mongodb', 'redis', 'database', 'data', 'analytics', 'elasticsearch', 'mysql'] },
  { key: 'devops', label: 'DevOps', icon: Shield, keywords: ['aws', 'azure', 'gcp', 'docker', 'kubernetes', 'ci', 'cd', 'devops', 'terraform', 'linux', 'cloud'] },
  { key: 'ai', label: 'AI/ML', icon: Brain, keywords: ['machine learning', 'ml', 'ai', 'deep learning', 'nlp', 'tensorflow', 'pytorch', 'llm', 'gpt'] },
];

function getSkillCoverage(team: SwarmMember[]) {
  const allSkills = team.flatMap(m => m.skills.map(s => s.toLowerCase()));
  return skillDomains.map(domain => {
    const matched = domain.keywords.filter(kw => allSkills.some(s => s.includes(kw)));
    const coverage = Math.min(100, (matched.length / Math.max(2, domain.keywords.length * 0.3)) * 100);
    return { ...domain, coverage: Math.round(coverage), matchCount: matched.length };
  });
}

export function TeamBuilderPanel({
  team,
  pricing,
  aiMessage,
  onRemoveMember,
  onReplaceMember,
  onConfirm,
  onRegenerate,
  onCancel,
  isReplacing,
  projectTitle,
}: TeamBuilderPanelProps) {
  const coverage = getSkillCoverage(team);
  const highConfidence = team.filter(m => m.match_confidence === 'high').length;
  const totalYears = team.reduce((sum, m) => sum + (m.years_experience || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="w-full"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">
              {projectTitle ? `Team for "${projectTitle}"` : 'Your Assembled Team'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {team.length} member{team.length !== 1 ? 's' : ''} • {highConfidence} strong match{highConfidence !== 1 ? 'es' : ''} • {totalYears}y combined experience
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="p-2 rounded-lg hover:bg-secondary/50 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* AI Message */}
      {aiMessage && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4 p-3 rounded-xl bg-primary/5 border border-primary/10 text-sm text-foreground/80 leading-relaxed"
        >
          <Sparkles className="w-4 h-4 text-primary inline mr-2" />
          {aiMessage}
        </motion.div>
      )}

      {/* Skill Coverage Visualization */}
      <div className="mb-4 p-4 rounded-xl bg-card/40 border border-border/30">
        <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Skill Coverage</p>
        <div className="grid grid-cols-5 gap-3">
          {coverage.map((domain) => {
            const Icon = domain.icon;
            return (
              <div key={domain.key} className="text-center">
                <div className="relative w-12 h-12 mx-auto mb-1.5">
                  {/* Circular progress */}
                  <svg className="w-12 h-12 -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="20" fill="none" stroke="hsl(var(--muted))" strokeWidth="3" opacity="0.3" />
                    <motion.circle
                      cx="24" cy="24" r="20" fill="none"
                      stroke={domain.coverage > 60 ? 'hsl(var(--primary))' : domain.coverage > 30 ? 'hsl(var(--accent))' : 'hsl(var(--muted-foreground))'}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={`${(domain.coverage / 100) * 125.6} 125.6`}
                      initial={{ strokeDasharray: '0 125.6' }}
                      animate={{ strokeDasharray: `${(domain.coverage / 100) * 125.6} 125.6` }}
                      transition={{ delay: 0.5, duration: 0.8 }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-foreground/60" />
                  </div>
                </div>
                <p className="text-[10px] font-medium text-muted-foreground">{domain.label}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pricing */}
      {pricing && (
        <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-primary/8 to-accent/8 border border-primary/15 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Estimated Cost</p>
            <p className="text-lg font-bold text-primary">€{pricing.average_price.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Timeline</p>
            <p className="text-lg font-bold text-accent">~{pricing.average_hours}h</p>
          </div>
        </div>
      )}

      {/* Team Members Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        <AnimatePresence mode="popLayout">
          {team.map((member, index) => (
            <TeamMemberCard
              key={member.id}
              member={member}
              index={index}
              onRemove={onRemoveMember}
              onReplace={onReplaceMember}
              isReplacing={isReplacing === member.id}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-border/30">
        <button onClick={onRegenerate} className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-border text-foreground font-medium text-sm hover:border-primary hover:text-primary transition-colors">
          <RotateCcw className="w-4 h-4" />
          Regenerate
        </button>
        <button onClick={onConfirm} className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
          <Check className="w-4 h-4" />
          Confirm & Send
        </button>
      </div>
    </motion.div>
  );
}
