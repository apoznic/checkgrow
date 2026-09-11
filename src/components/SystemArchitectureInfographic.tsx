import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as const } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

/* ── Tiny reusable bits ─────────────────────────── */

function GlowDot({ color }: { color: string }) {
  return (
    <span className="relative flex h-3 w-3">
      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-30 ${color}`} />
      <span className={`relative inline-flex rounded-full h-3 w-3 ${color}`} />
    </span>
  );
}

function DataNode({ label, desc, color }: { label: string; desc: string; color: 'amber' | 'teal' }) {
  const dotColor = color === 'amber' ? 'bg-accent' : 'bg-[hsl(170,35%,55%)]';
  const textColor = color === 'amber' ? 'text-accent' : 'text-[hsl(170,35%,55%)]';
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-1.5"><GlowDot color={dotColor} /></div>
      <div>
        <span className={`font-mono text-xs font-bold tracking-wider ${textColor}`}>{label}</span>
        <span className="block text-[11px] text-muted-foreground/70 leading-tight">{desc}</span>
      </div>
    </div>
  );
}

function ProcessBox({ title, color, children }: { title: string; color: 'amber' | 'teal' | 'purple'; children: React.ReactNode }) {
  const borderColor = color === 'amber' ? 'border-accent/40' : color === 'teal' ? 'border-[hsl(170,35%,55%)]/40' : 'border-purple-400/40';
  const titleColor = color === 'amber' ? 'text-accent' : color === 'teal' ? 'text-[hsl(170,35%,55%)]' : 'text-purple-400';
  return (
    <div className={`rounded-xl border ${borderColor} bg-background/50 backdrop-blur-sm p-4`}>
      <h4 className={`font-mono text-xs font-bold tracking-wider ${titleColor} mb-3`}>{title}</h4>
      <div className="border-t border-border/30 pt-3">
        {children}
      </div>
    </div>
  );
}

function StatPillar({ num, unit, title, desc, color }: { num: string; unit: string; title: string; desc: string; color: string }) {
  return (
    <motion.div variants={fadeUp} className="glass-panel rounded-xl p-5 text-center">
      <div className={`text-3xl font-bold ${color}`}>{num}</div>
      <div className="text-[10px] text-muted-foreground/60 uppercase tracking-wider mb-2">{unit}</div>
      <div className="font-mono text-xs font-bold text-foreground mb-1">{title}</div>
      <p className="text-[11px] text-muted-foreground/70 leading-snug">{desc}</p>
    </motion.div>
  );
}

function FlowStep({ num, title, desc, color }: { num: string; title: string; desc: string; color: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold mb-2 ${color}`}>
        {num}
      </div>
      <span className={`font-mono text-[11px] font-bold tracking-wider mb-1 ${color}`}>{title}</span>
      <span className="text-[10px] text-muted-foreground/60 leading-tight max-w-[100px]">{desc}</span>
    </div>
  );
}

/* ── Main Component ─────────────────────────────── */

export function SystemArchitectureInfographic() {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-80px' }}
      variants={stagger}
      className="space-y-10"
    >
      {/* Header */}
      <motion.div variants={fadeUp} className="text-center">
        <h3 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">System Architecture</h3>
        <p className="text-sm text-muted-foreground mt-1">How supply meets demand through Compatibility Intelligence</p>
      </motion.div>

      {/* Three-column layout */}
      <motion.div variants={fadeUp} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ── SUPPLY AGENT ── */}
        <div className="space-y-4">
          <div className="text-center mb-2">
            <span className="font-mono text-sm font-bold text-accent tracking-wider">SUPPLY AGENT</span>
            <span className="block text-[11px] text-muted-foreground/60">Talent Intelligence</span>
          </div>

          <div className="glass-panel rounded-xl p-4 space-y-0">
            <DataNode label="ONBOARDING WIZARD" desc="Skills, experience, rates" color="amber" />
            <DataNode label="CHAT PROFILING" desc="Personality, work style" color="amber" />
            <DataNode label="PROJECT HISTORY" desc="Past deliveries, ratings" color="amber" />
            <DataNode label="INTERACTION DATA" desc="Chat patterns, response time" color="amber" />
            <DataNode label="AVAILABILITY" desc="Schedule, timezone, capacity" color="amber" />
          </div>

          <ProcessBox title="SKILL MAPPER" color="amber">
            <div className="space-y-1.5">
              {['Technical Skills', 'Domain Expertise', 'Soft Skills', 'Tools & Platforms', 'Languages', 'Certifications'].map((s, i) => (
                <div key={s} className="flex items-center gap-2">
                  <span className="text-[10px] text-muted-foreground/40 font-mono w-5">[{String(i + 1).padStart(2, '0')}]</span>
                  <span className="text-[11px] text-muted-foreground/70 flex-1">{s}</span>
                  <div className="h-1.5 rounded-full bg-accent/20 flex-1 max-w-[80px]">
                    <div className="h-full rounded-full bg-accent/60" style={{ width: `${50 + (i % 3) * 18}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </ProcessBox>

          <ProcessBox title="TRAIT EXTRACTOR" color="amber">
            <div className="space-y-1">
              {[
                ['Leadership', 'HIGH', 'confirmed'],
                ['Communication', 'HIGH', 'ai-inferred'],
                ['Detail-oriented', 'MED', 'confirmed'],
                ['Creative thinking', 'MED', 'ai-inferred'],
                ['Adaptability', 'HIGH', 'confirmed'],
              ].map(([trait, conf, src]) => (
                <div key={trait} className="flex items-center gap-2 text-[11px]">
                  <span className="text-muted-foreground/70 flex-1">{trait}</span>
                  <span className={conf === 'HIGH' ? 'text-accent font-mono text-[10px]' : 'text-muted-foreground/40 font-mono text-[10px]'}>{conf}</span>
                  <span className="text-muted-foreground/30 text-[9px]">{src}</span>
                </div>
              ))}
            </div>
          </ProcessBox>
        </div>

        {/* ── AI ENGINE (center) ── */}
        <div className="space-y-4 flex flex-col items-center">
          <div className="text-center mb-2">
            <span className="font-mono text-sm font-bold text-purple-400 tracking-wider">AI ENGINE</span>
            <span className="block text-[11px] text-muted-foreground/60">Compatibility Intelligence</span>
          </div>

          {/* Concentric rings visualization */}
          <div className="relative w-52 h-52 flex items-center justify-center my-4">
            {[96, 76, 56, 36].map((size, i) => (
              <div
                key={size}
                className="absolute rounded-full border border-purple-400/20"
                style={{ width: size * 2, height: size * 2 }}
              />
            ))}
            <div className="w-10 h-10 rounded-full bg-purple-500/30 flex items-center justify-center z-10 backdrop-blur-sm border border-purple-400/40">
              <span className="text-[11px] font-bold text-purple-300">AI</span>
            </div>
            {/* Orbiting labels */}
            {[
              { label: 'SKILLS', top: '2%', left: '30%' },
              { label: 'CHEMISTRY', top: '10%', left: '72%' },
              { label: 'HISTORY', top: '45%', left: '88%' },
              { label: 'PRICING', top: '78%', left: '72%' },
              { label: 'BEHAVIOR', top: '88%', left: '30%' },
              { label: 'CONTEXT', top: '55%', left: '0%' },
              { label: 'TIMING', top: '15%', left: '2%' },
            ].map((item) => (
              <span
                key={item.label}
                className="absolute text-[8px] font-mono text-purple-400/50 tracking-wider"
                style={{ top: item.top, left: item.left }}
              >
                {item.label}
              </span>
            ))}
          </div>

          {/* Dashed flow indicators */}
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground/40">
            <span className="text-accent">Supply →</span>
            <span className="border-t border-dashed border-muted-foreground/20 flex-1 min-w-[40px]" />
            <span className="text-purple-400">Engine</span>
            <span className="border-t border-dashed border-muted-foreground/20 flex-1 min-w-[40px]" />
            <span className="text-[hsl(170,35%,55%)]">→ Demand</span>
          </div>

          {/* Learning loop */}
          <ProcessBox title="CONTINUOUS LEARNING LOOP" color="purple">
            <div className="flex flex-wrap justify-center gap-2">
              {[
                { label: 'Execute', color: 'text-[hsl(170,35%,55%)]' },
                { label: 'Capture', color: 'text-purple-400' },
                { label: 'Analyze', color: 'text-purple-400' },
                { label: 'Refine', color: 'text-purple-400' },
                { label: 'Match', color: 'text-accent' },
              ].map((step, i) => (
                <div key={step.label} className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${step.color === 'text-accent' ? 'bg-accent' : step.color === 'text-purple-400' ? 'bg-purple-400' : 'bg-[hsl(170,35%,55%)]'}`} />
                  <span className={`text-[10px] font-mono ${step.color}`}>{step.label}</span>
                  {i < 4 && <span className="text-muted-foreground/20 text-[10px]">→</span>}
                </div>
              ))}
            </div>
          </ProcessBox>
        </div>

        {/* ── DEMAND AGENT ── */}
        <div className="space-y-4">
          <div className="text-center mb-2">
            <span className="font-mono text-sm font-bold text-[hsl(170,35%,55%)] tracking-wider">DEMAND AGENT</span>
            <span className="block text-[11px] text-muted-foreground/60">Project Assembly</span>
          </div>

          <div className="glass-panel rounded-xl p-4 space-y-0">
            <DataNode label="PROJECT BRIEF" desc="Scope, timeline, budget" color="teal" />
            <DataNode label="ROLE REQUIREMENTS" desc="Skills needed per role" color="teal" />
            <DataNode label="TEAM SIZE" desc="Headcount, structure" color="teal" />
            <DataNode label="PRICING MODEL" desc="Fixed, hourly, equity" color="teal" />
            <DataNode label="INDUSTRY CONTEXT" desc="Sector, compliance needs" color="teal" />
          </div>

          <ProcessBox title="TEAM FORMATION" color="teal">
            <div className="space-y-1.5">
              {[
                'Parse requirements into role slots',
                'Define skill weights per role',
                'Set chemistry constraints',
                'Calculate budget allocation',
                'Generate candidate shortlist',
                'Score & rank team compositions',
              ].map((step, i) => (
                <div key={step} className="flex items-center gap-2 text-[11px]">
                  <span className="text-[hsl(170,35%,55%)] font-mono text-[10px]">{'>'}{i + 1}</span>
                  <span className="text-muted-foreground/70">{step}</span>
                </div>
              ))}
            </div>
          </ProcessBox>

          <ProcessBox title="ASSEMBLED TEAM" color="teal">
            <div className="space-y-1">
              {[
                ['Lead Developer', '96%', 'assigned'],
                ['UI/UX Designer', '91%', 'assigned'],
                ['Backend Engineer', '88%', 'pending'],
                ['Project Manager', '94%', 'assigned'],
                ['QA Specialist', '85%', 'matching'],
              ].map(([role, score, status]) => (
                <div key={role} className="flex items-center gap-2 text-[11px]">
                  <span className="text-muted-foreground/70 flex-1">{role}</span>
                  <span className="text-[hsl(170,35%,55%)] font-mono text-[10px]">{score}</span>
                  <span className={`text-[9px] ${status === 'assigned' ? 'text-[hsl(170,35%,55%)]' : 'text-muted-foreground/30'}`}>{status}</span>
                </div>
              ))}
            </div>
          </ProcessBox>
        </div>
      </motion.div>

      {/* ── Compatibility Intelligence Pillars ── */}
      <motion.div variants={fadeUp}>
        <div className="text-center mb-6">
          <span className="font-mono text-sm font-bold text-purple-400 tracking-wider">COMPATIBILITY INTELLIGENCE</span>
          <span className="block text-[11px] text-muted-foreground/60">The Data Moat</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatPillar num="2.4M+" unit="data points" title="TEAM CHEMISTRY" desc="Interaction patterns between members across projects" color="text-purple-400" />
          <StatPillar num="180K+" unit="skill nodes" title="SKILL GRAPHS" desc="Verified capabilities mapped to outcomes and peer validation" color="text-purple-400" />
          <StatPillar num="890K+" unit="signals" title="BEHAVIORAL META" desc="Response patterns, work rhythms, communication style" color="text-purple-400" />
          <StatPillar num="45K+" unit="transactions" title="PRICING SIGNALS" desc="Market rates, project demand, budget correlation" color="text-purple-400" />
        </div>
      </motion.div>

      {/* ── End-to-End Data Flow ── */}
      <motion.div variants={fadeUp}>
        <div className="text-center mb-6">
          <span className="font-mono text-sm font-bold text-foreground tracking-wider">END-TO-END DATA FLOW</span>
        </div>
        <div className="flex items-start justify-between gap-2 overflow-x-auto pb-2">
          <FlowStep num="01" title="INGEST" desc="Onboarding, chat, project history" color="text-accent border-accent" />
          <div className="border-t border-dashed border-muted-foreground/15 flex-1 mt-4 min-w-[16px]" />
          <FlowStep num="02" title="EXTRACT" desc="Skills, traits, behavioral signals" color="text-accent border-accent" />
          <div className="border-t border-dashed border-muted-foreground/15 flex-1 mt-4 min-w-[16px]" />
          <FlowStep num="03" title="ANALYZE" desc="AI scoring, compatibility mapping" color="text-purple-400 border-purple-400" />
          <div className="border-t border-dashed border-muted-foreground/15 flex-1 mt-4 min-w-[16px]" />
          <FlowStep num="04" title="MATCH" desc="Team composition, role optimization" color="text-purple-400 border-purple-400" />
          <div className="border-t border-dashed border-muted-foreground/15 flex-1 mt-4 min-w-[16px]" />
          <FlowStep num="05" title="ASSEMBLE" desc="Project kickoff, team deployment" color="text-[hsl(170,35%,55%)] border-[hsl(170,35%,55%)]" />
          <div className="border-t border-dashed border-muted-foreground/15 flex-1 mt-4 min-w-[16px]" />
          <FlowStep num="06" title="LEARN" desc="Outcome tracking, model refinement" color="text-[hsl(170,35%,55%)] border-[hsl(170,35%,55%)]" />
        </div>
      </motion.div>

      {/* ── Operational Layer ── */}
      <motion.div variants={fadeUp}>
        <div className="text-center mb-6">
          <span className="font-mono text-sm font-bold text-foreground tracking-wider">OPERATIONAL LAYER</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ProcessBox title="PROJECT OPS" color="teal">
            <ul className="space-y-1.5 text-[11px] text-muted-foreground/70">
              {['Task management', 'Time tracking', 'Milestones', 'Wiki & Docs', 'Sticky notes'].map(i => <li key={i}>{i}</li>)}
            </ul>
          </ProcessBox>
          <ProcessBox title="CRM ENGINE" color="amber">
            <ul className="space-y-1.5 text-[11px] text-muted-foreground/70">
              {['Deal pipeline', 'Contact book', 'Activity log', 'Calendar sync', 'Lead generation'].map(i => <li key={i}>{i}</li>)}
            </ul>
          </ProcessBox>
          <ProcessBox title="PAYOUTS" color="purple">
            <ul className="space-y-1.5 text-[11px] text-muted-foreground/70">
              {['Stripe Connect', 'Platform fees', 'Revenue splits', 'Invoice automation', 'Task-based billing'].map(i => <li key={i}>{i}</li>)}
            </ul>
          </ProcessBox>
        </div>
      </motion.div>
    </motion.div>
  );
}
