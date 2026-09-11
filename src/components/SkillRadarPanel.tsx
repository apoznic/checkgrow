import { motion, AnimatePresence } from 'framer-motion';
import { X, Zap, Brain, Palette, Code, Users, Database, TrendingUp, Target, Award, Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Skill {
  id: string;
  skill_name: string;
  skill_level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  years_experience: number;
}

interface SkillRadarPanelProps {
  skills: Skill[];
  onRemoveSkill: (id: string) => void;
}

const levelConfig = {
  beginner: { color: 'bg-blue-100 text-blue-700 border-blue-200', bar: 'bg-blue-400', pct: 25, label: 'Beginner' },
  intermediate: { color: 'bg-amber-100 text-amber-700 border-amber-200', bar: 'bg-amber-400', pct: 50, label: 'Intermediate' },
  advanced: { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', bar: 'bg-emerald-500', pct: 75, label: 'Advanced' },
  expert: { color: 'bg-primary/10 text-primary border-primary/20', bar: 'bg-primary', pct: 100, label: 'Expert' },
};

const categoryIcons: Record<string, typeof Code> = {
  'Programming': Code,
  'Design': Palette,
  'Data': Database,
  'Leadership': Users,
  'AI/ML': Brain,
  'Other': Zap,
};

const categoryColors: Record<string, string> = {
  'Programming': 'from-blue-500/20 to-blue-600/5 border-blue-200/50',
  'Design': 'from-pink-500/20 to-pink-600/5 border-pink-200/50',
  'Data': 'from-emerald-500/20 to-emerald-600/5 border-emerald-200/50',
  'Leadership': 'from-amber-500/20 to-amber-600/5 border-amber-200/50',
  'AI/ML': 'from-purple-500/20 to-purple-600/5 border-purple-200/50',
  'Other': 'from-gray-500/20 to-gray-600/5 border-gray-200/50',
};

function categorizeSkill(name: string): string {
  const lower = name.toLowerCase();
  if (/react|node|python|java|typescript|javascript|swift|kotlin|ruby|php|go|rust|c\+\+|c#|html|css|vue|angular|svelte|next|express|django|flask|rails|spring|graphql|rest|api|docker|kubernetes|git|aws|gcp|azure|terraform|webpack|vite/.test(lower)) return 'Programming';
  if (/figma|design|ui|ux|photoshop|illustrator|sketch|canva|typography|wireframe|prototyp|branding/.test(lower)) return 'Design';
  if (/sql|data|analytics|tableau|power bi|excel|pandas|numpy|spark|etl|warehouse|visualization/.test(lower)) return 'Data';
  if (/lead|manage|scrum|agile|kanban|mentor|coach|strategy|product|stakeholder|communication|presentation/.test(lower)) return 'Leadership';
  if (/machine learning|deep learning|ai|nlp|tensorflow|pytorch|gpt|llm|neural|computer vision|artificial intelligence/.test(lower)) return 'AI/ML';
  return 'Other';
}

export function SkillRadarPanel({ skills, onRemoveSkill }: SkillRadarPanelProps) {
  const grouped = skills.reduce<Record<string, Skill[]>>((acc, skill) => {
    const cat = categorizeSkill(skill.skill_name);
    (acc[cat] = acc[cat] || []).push(skill);
    return acc;
  }, {});

  const categories = Object.entries(grouped).sort((a, b) => b[1].length - a[1].length);

  const expertCount = skills.filter(s => s.skill_level === 'expert').length;
  const advancedCount = skills.filter(s => s.skill_level === 'advanced').length;
  const totalYears = skills.reduce((sum, s) => sum + (s.years_experience || 0), 0);
  const profileStrength = Math.min(100, Math.round((skills.length / 20) * 100));
  const maxCategoryCount = categories.length > 0 ? categories[0][1].length : 1;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header with gradient accent */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Skill Radar</h2>
            <p className="text-[11px] text-muted-foreground">Your professional DNA</p>
          </div>
        </div>

        {/* Profile strength — circular gauge */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative w-16 h-16 flex-shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" r="28" fill="none" stroke="hsl(var(--secondary))" strokeWidth="4" />
              <motion.circle
                cx="32" cy="32" r="28" fill="none"
                stroke={profileStrength < 40 ? 'hsl(var(--destructive))' : profileStrength < 70 ? 'hsl(30 60% 50%)' : 'hsl(142 55% 45%)'}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 28}`}
                initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - profileStrength / 100) }}
                transition={{ duration: 1, ease: 'easeOut' }}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-sm font-bold text-foreground">{profileStrength}%</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground mb-1">
              {profileStrength < 40 ? 'Getting Started' : profileStrength < 70 ? 'Growing Profile' : profileStrength < 100 ? 'Strong Profile' : 'Complete! 🎉'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {skills.length < 20 ? `Add ${20 - skills.length} more skills to reach 100%` : 'Your profile is fully mapped!'}
            </p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: skills.length, label: 'Skills', icon: Star },
            { value: expertCount + advancedCount, label: 'Senior', icon: Award },
            { value: categories.length, label: 'Domains', icon: Zap },
          ].map((stat) => (
            <div key={stat.label} className="bg-secondary/40 rounded-xl p-2.5 text-center">
              <stat.icon className="w-3.5 h-3.5 text-muted-foreground mx-auto mb-1" />
              <motion.p
                className="text-lg font-bold text-foreground leading-none"
                key={stat.value}
                initial={{ scale: 1.3, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300 }}
              >
                {stat.value}
              </motion.p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Category breakdown */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide">
        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center mb-4">
              <TrendingUp className="w-10 h-10 text-muted-foreground/30" />
            </div>
            <p className="text-sm font-medium text-muted-foreground mb-1">No skills mapped yet</p>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Start chatting with the AI to discover and log your professional skills
            </p>
          </div>
        ) : (
          <>
            {/* Category bar chart */}
            <div className="space-y-2 mb-4">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Distribution</p>
              {categories.map(([category, catSkills]) => {
                const Icon = categoryIcons[category] || Zap;
                const pct = (catSkills.length / maxCategoryCount) * 100;
                return (
                  <div key={category} className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                    <span className="text-[11px] text-foreground w-20 truncate">{category}</span>
                    <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-primary/60"
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground w-5 text-right">{catSkills.length}</span>
                  </div>
                );
              })}
            </div>

            {/* Skill tags by category */}
            {categories.map(([category, catSkills]) => {
              const Icon = categoryIcons[category] || Zap;
              const colors = categoryColors[category] || categoryColors['Other'];
              return (
                <motion.div
                  key={category}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn("rounded-xl border p-3 bg-gradient-to-br", colors)}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="w-3.5 h-3.5 text-foreground/70" />
                    <span className="text-xs font-semibold text-foreground">{category}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto">{catSkills.length} skill{catSkills.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <AnimatePresence>
                      {catSkills.map((skill) => {
                        const config = levelConfig[skill.skill_level] || levelConfig.intermediate;
                        return (
                          <motion.span
                            key={skill.id}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.8 }}
                            layout
                            className={cn(
                              'group inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border cursor-default transition-all hover:shadow-sm',
                              config.color
                            )}
                          >
                            {skill.skill_name}
                            {skill.years_experience > 0 && (
                              <span className="opacity-50 text-[10px]">{skill.years_experience}y</span>
                            )}
                            <button
                              onClick={() => onRemoveSkill(skill.id)}
                              className="ml-0.5 opacity-0 group-hover:opacity-100 hover:bg-black/10 rounded-full p-0.5 transition-opacity"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </motion.span>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </>
        )}

        {/* Level legend */}
        {skills.length > 0 && (
          <div className="pt-3 border-t border-border">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Experience Levels</p>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(levelConfig).map(([level, config]) => {
                const count = skills.filter(s => s.skill_level === level).length;
                return (
                  <div key={level} className="flex items-center gap-1.5">
                    <div className={cn('w-2 h-2 rounded-full', config.bar)} />
                    <span className="text-[10px] text-muted-foreground">{config.label}</span>
                    <span className="text-[10px] text-muted-foreground/60">({count})</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
