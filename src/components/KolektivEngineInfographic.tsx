import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users, Sparkles, ArrowRight, User, Zap, Target,
  ChevronRight, Brain, Code, Palette, Shield, Database, Link as LinkIcon
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ── Mock Data ──────────────────────────────────────────────

interface TalentNode {
  id: string;
  name: string;
  role: string;
  skills: string[];
  available: boolean;
}

interface TeamCluster {
  id: string;
  label: string;
  members: TalentNode[];
}

interface MatchedProject {
  title: string;
  team: string[];
  fit: number;
  skills: string[];
}

const clusters: TeamCluster[] = [
  {
    id: 'alpha',
    label: 'Team Alpha · Zagreb',
    members: [
      { id: 'AK', name: 'Ana K.', role: 'Full-Stack Dev', skills: ['React', 'Node.js', 'TypeScript'], available: true },
      { id: 'MR', name: 'Marco R.', role: 'UI Designer', skills: ['Figma', 'Design Systems'], available: true },
      { id: 'SL', name: 'Sophie L.', role: 'Project Manager', skills: ['Agile', 'Scrum'], available: true },
      { id: 'JP', name: 'Jan P.', role: 'ML Engineer', skills: ['Python', 'TensorFlow'], available: false },
    ],
  },
  {
    id: 'beta',
    label: 'Team Beta · Berlin',
    members: [
      { id: 'LH', name: 'Lisa H.', role: 'Brand Designer', skills: ['Branding', 'Illustration'], available: true },
      { id: 'CF', name: 'Clara F.', role: 'UX Researcher', skills: ['User Testing', 'Prototyping'], available: true },
      { id: 'DW', name: 'David W.', role: 'Backend Dev', skills: ['Go', 'PostgreSQL'], available: true },
    ],
  },
  {
    id: 'solo',
    label: 'Solo · Amsterdam',
    members: [
      { id: 'VK', name: 'Viktor K.', role: 'Data Engineer', skills: ['Python', 'dbt', 'BigQuery'], available: true },
      { id: 'HN', name: 'Hana N.', role: 'DevOps', skills: ['Docker', 'AWS', 'Terraform'], available: true },
    ],
  },
];

const matchedProjects: MatchedProject[] = [
  { title: 'E-commerce Platform', team: ['Ana K.', 'Marco R.', 'David W.', 'Hana N.'], fit: 94, skills: ['React', 'Node.js', 'Design Systems', 'AWS'] },
  { title: 'AI Analytics Dashboard', team: ['Jan P.', 'Viktor K.', 'Clara F.'], fit: 88, skills: ['Python', 'TensorFlow', 'User Testing'] },
  { title: 'Brand Identity System', team: ['Lisa H.', 'Clara F.'], fit: 82, skills: ['Branding', 'Illustration', 'Prototyping'] },
];

type Stage = 'supply' | 'processing' | 'demand';

const roleIcons: Record<string, typeof Code> = {
  'Full-Stack Dev': Code,
  'UI Designer': Palette,
  'Project Manager': Target,
  'ML Engineer': Brain,
  'Brand Designer': Palette,
  'UX Researcher': Target,
  'Backend Dev': Code,
  'Data Engineer': Database,
  'DevOps': Shield,
};

export function KolektivEngineInfographic() {
  const [stage, setStage] = useState<Stage>('supply');
  const [selectedCluster, setSelectedCluster] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRunEngine = () => {
    setStage('processing');
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setStage('demand');
    }, 2200);
  };

  const handleReset = () => {
    setStage('supply');
    setSelectedCluster(null);
  };

  const allMembers = clusters.flatMap(c => c.members);
  const availableCount = allMembers.filter(m => m.available).length;

  return (
    <section className="relative px-6 py-20">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-foreground">
            The CheckGrow Engine
          </h2>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            See how solo freelancers and micro-teams become AI-matched project swarms
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-3xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden"
        >
          {/* Stage indicator */}
          <div className="flex border-b border-border">
            {[
              { key: 'supply' as Stage, label: 'Supply Side', sublabel: 'Talent Pool', step: '1' },
              { key: 'processing' as Stage, label: 'AI Engine', sublabel: 'Matching', step: '2' },
              { key: 'demand' as Stage, label: 'Demand Side', sublabel: 'Matched Teams', step: '3' },
            ].map((s, i) => (
              <button
                key={s.key}
                onClick={() => {
                  if (s.key === 'supply') handleReset();
                  else if (s.key === 'demand' && stage === 'demand') return;
                }}
                className={`flex-1 p-4 text-center transition-colors relative ${
                  stage === s.key
                    ? 'bg-primary/5'
                    : 'hover:bg-secondary/50'
                }`}
              >
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    stage === s.key ? 'bg-primary text-primary-foreground' :
                    (stage === 'demand' && s.key === 'supply') || (stage === 'demand' && s.key === 'processing') || (stage === 'processing' && s.key === 'supply')
                      ? 'bg-accent/20 text-accent' : 'bg-secondary text-muted-foreground'
                  }`}>{s.step}</span>
                  <span className={`text-xs font-semibold ${stage === s.key ? 'text-foreground' : 'text-muted-foreground'}`}>
                    {s.label}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground">{s.sublabel}</p>
                {stage === s.key && (
                  <motion.div layoutId="stage-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            ))}
          </div>

          <div className="p-5 md:p-6">
            <AnimatePresence mode="wait">
              {/* ═══ SUPPLY SIDE ═══ */}
              {stage === 'supply' && (
                <motion.div key="supply" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {/* Stats bar */}
                  <div className="flex items-center gap-4 mb-5">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{allMembers.length} members</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-xs text-muted-foreground">{availableCount} available</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <LinkIcon className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{clusters.length} clusters</span>
                    </div>
                  </div>

                  {/* Clusters */}
                  <div className="space-y-3">
                    {clusters.map((cluster) => {
                      const isExpanded = selectedCluster === cluster.id;
                      return (
                        <motion.div
                          key={cluster.id}
                          layout
                          className="rounded-2xl border border-border bg-background/50 overflow-hidden"
                        >
                          <button
                            onClick={() => setSelectedCluster(isExpanded ? null : cluster.id)}
                            className="w-full flex items-center gap-3 p-4 hover:bg-secondary/30 transition-colors"
                          >
                            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                              <Users className="w-4 h-4 text-accent" />
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="text-sm font-semibold text-foreground">{cluster.label}</p>
                              <p className="text-xs text-muted-foreground">{cluster.members.length} members · {cluster.members.filter(m => m.available).length} available</p>
                            </div>
                            <div className="flex -space-x-2 mr-2">
                              {cluster.members.slice(0, 4).map((m) => (
                                <div key={m.id} className={`w-7 h-7 rounded-full border-2 border-card flex items-center justify-center text-[9px] font-bold ${
                                  m.available ? 'bg-accent/10 text-accent' : 'bg-secondary text-muted-foreground'
                                }`}>
                                  {m.id}
                                </div>
                              ))}
                            </div>
                            <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </button>
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-4 space-y-2">
                                  {cluster.members.map((member, i) => {
                                    const Icon = roleIcons[member.role] || User;
                                    return (
                                      <motion.div
                                        key={member.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-card/60"
                                      >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                          member.available ? 'bg-accent/10' : 'bg-secondary'
                                        }`}>
                                          <Icon className={`w-3.5 h-3.5 ${member.available ? 'text-accent' : 'text-muted-foreground'}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2">
                                            <p className="text-sm font-medium text-foreground">{member.name}</p>
                                            {member.available ? (
                                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                            ) : (
                                              <span className="text-[9px] text-muted-foreground/60 bg-secondary px-1.5 py-0.5 rounded">busy</span>
                                            )}
                                          </div>
                                          <p className="text-xs text-muted-foreground">{member.role}</p>
                                        </div>
                                        <div className="flex flex-wrap gap-1 justify-end max-w-[180px]">
                                          {member.skills.map(s => (
                                            <span key={s} className="text-[9px] px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground">{s}</span>
                                          ))}
                                        </div>
                                      </motion.div>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Run Engine CTA */}
                  <div className="flex gap-3 pt-5 mt-5 border-t border-border/30">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={handleRunEngine}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
                    >
                      <Sparkles className="w-4 h-4" />
                      Run AI Matching Engine
                      <ArrowRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </motion.div>
              )}

              {/* ═══ PROCESSING ═══ */}
              {stage === 'processing' && (
                <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-16 text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                    className="w-16 h-16 mx-auto rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center mb-6"
                  >
                    <Sparkles className="w-8 h-8 text-accent" />
                  </motion.div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">AI Engine Processing</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-xs mx-auto">
                    Analyzing {availableCount} available members across {clusters.length} clusters...
                  </p>
                  <div className="max-w-xs mx-auto space-y-3">
                    {[
                      { label: 'Parsing skill profiles', delay: 0 },
                      { label: 'Cross-matching requirements', delay: 0.4 },
                      { label: 'Scoring team compositions', delay: 0.8 },
                      { label: 'Optimizing for fit', delay: 1.2 },
                    ].map((step, i) => (
                      <motion.div
                        key={step.label}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: step.delay }}
                        className="flex items-center gap-3"
                      >
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: step.delay + 0.3 }}
                          className="w-5 h-5 rounded-full bg-accent/15 flex items-center justify-center flex-shrink-0"
                        >
                          <Zap className="w-3 h-3 text-accent" />
                        </motion.div>
                        <span className="text-xs text-muted-foreground">{step.label}</span>
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* ═══ DEMAND SIDE ═══ */}
              {stage === 'demand' && (
                <motion.div key="demand" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">Matched Projects</h3>
                      <p className="text-xs text-muted-foreground">{matchedProjects.length} optimal team compositions found</p>
                    </div>
                    <button onClick={handleReset} className="text-xs text-primary font-medium hover:underline">
                      Run again
                    </button>
                  </div>

                  <div className="space-y-3">
                    {matchedProjects.map((project, i) => (
                      <motion.div
                        key={project.title}
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.15 }}
                        className="rounded-2xl border border-border bg-background/50 p-4"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <div className={`w-2.5 h-2.5 rounded-full ${project.fit > 90 ? 'bg-emerald-500' : project.fit > 85 ? 'bg-accent' : 'bg-amber-500'}`} />
                              <h4 className="text-sm font-semibold text-foreground">{project.title}</h4>
                            </div>
                            <p className="text-xs text-muted-foreground">{project.team.length} members · best available composition</p>
                          </div>
                          <div className="text-right">
                            <motion.p
                              initial={{ scale: 1.3, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: i * 0.15 + 0.2 }}
                              className="text-lg font-bold text-foreground"
                            >
                              {project.fit}%
                            </motion.p>
                            <p className="text-[10px] text-muted-foreground">fit score</p>
                          </div>
                        </div>

                        {/* Team members */}
                        <div className="flex flex-wrap gap-2 mb-3">
                          {project.team.map((name) => (
                            <div key={name} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-card border border-border/50">
                              <div className="w-5 h-5 rounded-full bg-accent/10 flex items-center justify-center">
                                <User className="w-3 h-3 text-accent" />
                              </div>
                              <span className="text-xs font-medium text-foreground">{name}</span>
                            </div>
                          ))}
                        </div>

                        {/* Fit bar */}
                        <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${project.fit}%` }}
                            transition={{ delay: i * 0.15 + 0.3, duration: 0.6 }}
                            className={`h-full rounded-full ${project.fit > 90 ? 'bg-emerald-500/60' : project.fit > 85 ? 'bg-accent/60' : 'bg-amber-500/60'}`}
                          />
                        </div>

                        {/* Skills matched */}
                        <div className="flex flex-wrap gap-1 mt-2">
                          {project.skills.map(s => (
                            <span key={s} className="text-[9px] px-1.5 py-0.5 rounded-md bg-primary/8 text-primary border border-primary/10">{s}</span>
                          ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* CTA */}
                  <div className="flex gap-3 pt-5 mt-5 border-t border-border/30">
                    <Link to="/auth?mode=signup" className="flex-1">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
                      >
                        Build your own swarm
                        <ArrowRight className="w-4 h-4" />
                      </motion.button>
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Demo mode — interactive preview with mock data
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
