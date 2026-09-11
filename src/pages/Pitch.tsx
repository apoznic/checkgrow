import { motion, useScroll, useTransform } from 'framer-motion';
import { ArrowRight, TrendingUp, Users, Zap, Globe, Target, CheckCircle, BarChart3, DollarSign, Layers, ArrowUpRight, Percent, MapPin, Briefcase, Scissors, Code, Palette, Wrench, Building2, Shield, AlertTriangle, Brain, Database, XCircle, MinusCircle, MessageSquare, Clock, Star, GitBranch, Activity, Cpu, Network, Eye, FileText, CreditCard, PieChart, Sparkles } from 'lucide-react';
import { KolektivEngineInfographic } from '@/components/KolektivEngineInfographic';
import { Logo } from '@/components/Logo';
import { SEO } from '@/components/SEO';
import { useRef } from 'react';


import teamPhoto from '@/assets/team-founders.jpg';
import adrianPhoto from '@/assets/team-adrian.webp';
import carlaPhoto from '@/assets/team-carla.jpg';
import domagojPhoto from '@/assets/team-domagoj.jpg';

const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' as const } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.12 } },
};

function SectionLabel({ children }: { children: string }) {
  return (
    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold tracking-widest uppercase bg-accent/15 text-accent mb-6">
      {children}
    </span>
  );
}

function MetricCard({ value, label, icon: Icon }: { value: string; label: string; icon: any }) {
  return (
    <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-6 text-center">
      <Icon className="w-6 h-6 text-accent mx-auto mb-3" />
      <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </motion.div>
  );
}

function FeatureCheck({ value }: { value: 'yes' | 'partial' | 'no' }) {
  if (value === 'yes') return <CheckCircle className="w-4 h-4 text-accent mx-auto" />;
  if (value === 'partial') return <MinusCircle className="w-4 h-4 text-yellow-500 mx-auto" />;
  return <XCircle className="w-4 h-4 text-muted-foreground/30 mx-auto" />;
}

type CompetitorData = {
  name: string;
  category: string;
  model: string;
  valuation: string;
  aiTeam: 'yes' | 'partial' | 'no';
  crm: 'yes' | 'partial' | 'no';
  collective: 'yes' | 'partial' | 'no';
  compliance: 'yes' | 'partial' | 'no';
  projectOps: 'yes' | 'partial' | 'no';
  highlight?: boolean;
};

function CompetitorRow({ data }: { data: CompetitorData }) {
  const cellClass = data.highlight ? 'font-semibold text-foreground' : 'text-muted-foreground';
  return (
    <tr className={data.highlight ? 'bg-accent/8' : ''}>
      <td className={`py-3 px-4 text-sm ${cellClass} ${data.highlight ? 'font-bold' : ''}`}>
        {data.name}
        <span className="block text-[10px] text-muted-foreground font-normal">{data.category}</span>
      </td>
      <td className={`py-3 px-4 text-sm text-center ${cellClass}`}>{data.model}</td>
      <td className={`py-3 px-4 text-xs text-center ${cellClass}`}>{data.valuation}</td>
      <td className="py-3 px-4 text-center"><FeatureCheck value={data.aiTeam} /></td>
      <td className="py-3 px-4 text-center"><FeatureCheck value={data.crm} /></td>
      <td className="py-3 px-4 text-center"><FeatureCheck value={data.collective} /></td>
      <td className="py-3 px-4 text-center"><FeatureCheck value={data.compliance} /></td>
      <td className="py-3 px-4 text-center"><FeatureCheck value={data.projectOps} /></td>
    </tr>
  );
}

export default function Pitch() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: containerRef });
  const progressWidth = useTransform(scrollYProgress, [0, 1], ['0%', '100%']);

  return (
    <div ref={containerRef} className="min-h-screen bg-background">
      <SEO title="CheckGrow Pitch — The OS for Distributed Teams" description="Investor pitch: how CheckGrow's AI engine powers team formation, shared CRM, and project workspaces for the agency economy." path="/pitch" image="/og/pitch.jpg" />
      {/* Progress bar */}
      <motion.div className="fixed top-0 left-0 h-0.5 bg-accent z-[100]" style={{ width: progressWidth }} />

      {/* Nav */}
      <nav className="sticky top-0 z-50 px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Logo size="sm" />
          <span className="text-xs text-muted-foreground tracking-wide uppercase">Investor Deck · Confidential</span>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6">

        {/* ═══════════ HERO ═══════════ */}
        <motion.section
          className="py-28 md:py-40 relative overflow-hidden"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          {/* Background accent glow */}
          <div className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full bg-accent/8 blur-[120px] pointer-events-none" />
          <div className="absolute -bottom-40 -left-40 w-[400px] h-[400px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

          <motion.div variants={fadeUp} className="relative">
            <SectionLabel>Pre-Seed · €300K · 10% Equity</SectionLabel>
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-5xl md:text-7xl lg:text-[5.5rem] font-bold text-foreground leading-[0.95] mb-8 max-w-5xl relative"
          >
            Agencies are dead.
            <br />
            <span className="gradient-text-warm">They just don't know it yet.</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="text-xl md:text-2xl text-muted-foreground max-w-3xl mb-6 leading-relaxed">
            We built the operating system that lets freelancers operate as agencies — 
            without becoming one. <span className="text-foreground font-medium">AI-assembled teams. One invoice. Zero overhead.</span>
          </motion.p>

          <motion.div variants={fadeUp} className="flex items-center gap-6 mb-12 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span><span className="text-foreground font-semibold">€200K</span> revenue in 90 days</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span><span className="text-foreground font-semibold">Zero</span> payroll costs</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span><span className="text-foreground font-semibold">47</span> professionals onboarded</span>
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="flex flex-wrap gap-4">
            <a href="#traction" className="px-8 py-4 bg-foreground text-background rounded-full font-semibold text-base inline-flex items-center gap-2 hover:opacity-90 transition-opacity">
              See the Proof <ArrowRight className="w-5 h-5" />
            </a>
            <a href="https://ai.checkgrow.com" target="_blank" rel="noopener" className="px-8 py-4 rounded-full font-semibold text-base border-2 border-border text-foreground inline-flex items-center gap-2 hover:bg-secondary transition-colors">
              Try the Product <ArrowUpRight className="w-5 h-5" />
            </a>
          </motion.div>
        </motion.section>

        {/* ═══════════ THE PROBLEM ═══════════ */}
        <motion.section
          className="py-20 border-t border-border"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>The Problem</SectionLabel>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            $1.3 trillion in talent.
            <br />
            <span className="gradient-text-warm">Zero infrastructure to organize it.</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-2xl mb-14">
            The freelance economy exploded. The tools didn't.
          </motion.p>

          {/* Three punchy problem cards — big stat + one-liner */}
          <motion.div variants={stagger} className="grid md:grid-cols-3 gap-8 mb-14">
            {[
              {
                icon: Building2,
                stat: '40–60%',
                hook: 'wasted on overhead',
                punchline: 'Agencies burn half their revenue on layers, offices, and bench time. Freelancers deliver the same — if they had the infra.',
              },
              {
                icon: Brain,
                stat: '0%',
                hook: 'visibility into chemistry',
                punchline: 'CVs don\'t capture communication, reliability, or compatibility. Every hire is a gamble. Every team is a black box.',
              },
              {
                icon: Cpu,
                stat: '∞',
                hook: 'AI can\'t replace trust',
                punchline: 'AI commoditizes remote output. It can\'t replace local presence, trust, relationships. Collectives are the next frontier.',
              },
            ].map((item) => (
              <motion.div key={item.hook} variants={fadeUp} className="glass-panel rounded-2xl p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-accent/10 transition-colors" />
                <item.icon className="w-7 h-7 text-accent mb-5" />
                <div className="text-4xl md:text-5xl font-bold text-foreground mb-1">{item.stat}</div>
                <div className="text-sm font-semibold text-accent uppercase tracking-wider mb-4">{item.hook}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.punchline}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Bottom row — two snappy one-liners */}
          <motion.div variants={stagger} className="grid md:grid-cols-2 gap-6">
            <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-6 flex items-start gap-4">
              <Percent className="w-6 h-6 text-accent shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">Gen Z works for % — not wages</h3>
                <p className="text-sm text-muted-foreground">Equity, rev-share, skin in the game. No infra exists to split revenue by contribution.</p>
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-6 flex items-start gap-4">
              <DollarSign className="w-6 h-6 text-accent shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">Revenue splits kill collaboration</h3>
                <p className="text-sm text-muted-foreground">No fair scoping, no cross-border compliance. Trust breaks before the first deliverable ships.</p>
              </div>
            </motion.div>
          </motion.div>
        </motion.section>

        {/* ═══════════ SOLUTION ═══════════ */}
        <motion.section
          className="py-20 border-t border-border"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>The Solution</SectionLabel>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-5xl font-bold text-foreground mb-4 leading-tight">
            What if freelancers could
            <br />
            <span className="gradient-text-warm">operate like an agency — without becoming one?</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-2xl mb-14">
            CheckGrow is the full stack. From profile to payout.
          </motion.p>

          {/* Big 3 hero capabilities */}
          <motion.div variants={stagger} className="grid md:grid-cols-3 gap-8 mb-14">
            {[
              {
                icon: Brain,
                stat: '<60s',
                hook: 'to assemble a team',
                punchline: 'AI reads skills, personality, and chemistry — then assembles the perfect squad from your talent pool. No calls. No spreadsheets.',
              },
              {
                icon: Layers,
                stat: '1',
                hook: 'platform, zero duct tape',
                punchline: 'CRM, project ops, docs, chat, tasks, billing — everything a collective needs to win and deliver. No Notion + Slack + Trello Frankenstein.',
              },
              {
                icon: Shield,
                stat: '€0',
                hook: 'payroll overhead',
                punchline: 'Automated revenue splits, finders fees, Stripe payouts, cross-border compliance. The messy stuff works by default.',
              },
            ].map((item) => (
              <motion.div key={item.hook} variants={fadeUp} className="glass-panel rounded-2xl p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:bg-accent/10 transition-colors" />
                <item.icon className="w-7 h-7 text-accent mb-5" />
                <div className="text-4xl md:text-5xl font-bold text-foreground mb-1">{item.stat}</div>
                <div className="text-sm font-semibold text-accent uppercase tracking-wider mb-4">{item.hook}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.punchline}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Bottom row — two more capabilities */}
          <motion.div variants={stagger} className="grid md:grid-cols-2 gap-6 mb-10">
            <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-6 flex items-start gap-4">
              <Zap className="w-6 h-6 text-accent shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">AI Supply Agent — knows your people</h3>
                <p className="text-sm text-muted-foreground">Conversational onboarding maps skills, work styles, and traits into rich vector profiles. Your talent pool gets smarter with every member.</p>
              </div>
            </motion.div>
            <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-6 flex items-start gap-4">
              <Target className="w-6 h-6 text-accent shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-foreground mb-1">AI Demand Agent — wins your deals</h3>
                <p className="text-sm text-muted-foreground">Drop a project brief. Get a scored, role-matched team back — with compatibility ratings, availability checks, and one-click proposal.</p>
              </div>
            </motion.div>
          </motion.div>

          {/* Punchline CTA strip */}
          <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-6 md:p-8 bg-gradient-to-r from-accent/5 via-transparent to-accent/5 border-accent/15 text-center">
            <p className="text-lg md:text-xl font-semibold text-foreground">
              Think of it as <span className="text-accent">Shopify for service teams</span> —
              <span className="text-muted-foreground font-normal"> create your collective, plug in AI, start delivering.</span>
            </p>
          </motion.div>
        </motion.section>

        {/* ═══════════ ALTERNATE SOLUTION — OPEN ECOSYSTEM ═══════════ */}
        <motion.section
          className="py-20 border-t border-border"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Open Ecosystem</SectionLabel>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Anyone can create an Organization.{' '}
            <span className="gradient-text-warm">Anyone can find one.</span>
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-3xl mb-12">
            We're not building another gated marketplace. We're building open infrastructure — where every community, co-working hub, or friend group can spin up a professional collective in minutes.
          </motion.p>

          {/* Visual Flow: Create → Grow → Get Found */}
          <motion.div variants={stagger} className="grid md:grid-cols-3 gap-8 mb-14">
            {[
              {
                step: '01',
                icon: Sparkles,
                title: 'Create an Organization',
                desc: 'Any professional can launch a collective — a co-working space, a freelancer guild, a local trades crew. Name it, invite your people, start operating.',
                color: 'text-accent',
                bg: 'from-accent/15 to-accent/5',
                border: 'border-accent/20',
              },
              {
                step: '02',
                icon: Users,
                title: 'Build your talent pool',
                desc: 'Members onboard through our AI Supply Agent — capturing skills, personality, work styles, and availability. The collective gets smarter with every member.',
                color: 'text-primary',
                bg: 'from-primary/15 to-primary/5',
                border: 'border-primary/20',
              },
              {
                step: '03',
                icon: Globe,
                title: 'Get discovered',
                desc: 'Every Organization is listed in a global directory. Companies and project owners browse by location, skill, or industry — and request teams directly.',
                color: 'text-copper-500',
                bg: 'from-copper-500/15 to-copper-500/5',
                border: 'border-copper-500/20',
              },
            ].map((item) => (
              <motion.div key={item.title} variants={fadeUp} className={`glass-panel rounded-2xl p-8 border ${item.border} relative overflow-hidden`}>
                <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl ${item.bg} rounded-bl-full opacity-60`} />
                <span className={`text-5xl font-black ${item.color} opacity-20 absolute top-4 right-6`}>{item.step}</span>
                <item.icon className={`w-8 h-8 ${item.color} mb-4 relative z-10`} />
                <h3 className="font-bold text-foreground text-lg mb-2 relative z-10">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed relative z-10">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Who Creates Organizations */}
          <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-8 md:p-10 mb-10">
            <h3 className="font-bold text-foreground text-xl mb-6 text-center">Who's already building Organizations?</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Building2, label: 'Co-working hubs', example: 'Turn members into a revenue-generating collective' },
                { icon: MapPin, label: 'Local trade crews', example: 'Electricians, plumbers, event staff — organized & bookable' },
                { icon: Briefcase, label: 'Freelancer guilds', example: 'Designers, developers, marketers — stronger together' },
                { icon: Target, label: 'Agency founders', example: 'Zero overhead agency with profit-sharing built in' },
              ].map((item) => (
                <div key={item.label} className="text-center p-4 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors">
                  <item.icon className="w-6 h-6 text-accent mx-auto mb-2" />
                  <p className="font-semibold text-foreground text-sm mb-1">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.example}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Network Effect callout */}
          <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-8 border border-accent/20 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-accent/5 via-transparent to-primary/5" />
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-primary flex items-center justify-center shrink-0">
                <ArrowRight className="w-8 h-8 text-primary-foreground" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="font-bold text-foreground text-lg mb-1">The network effect is the moat</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  Every new Organization adds talent to the global pool. Every project generates data that makes matching smarter. 
                  More collectives → more talent → better teams → more projects → <span className="text-foreground font-semibold">unstoppable flywheel.</span>
                </p>
              </div>
              <div className="flex gap-6 shrink-0 text-center">
                <div>
                  <p className="text-2xl font-black text-accent">∞</p>
                  <p className="text-xs text-muted-foreground">Organizations</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-primary">1</p>
                  <p className="text-xs text-muted-foreground">Platform</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.section>

        {/* ═══════════ WHY NOW ═══════════ */}
        <motion.section
          className="py-20 border-t border-border"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Why Now</SectionLabel>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-6">
            Three irreversible shifts
          </motion.h2>
          <motion.div variants={stagger} className="grid md:grid-cols-3 gap-6 mt-10">
            {[
              {
                icon: Percent,
                title: 'Gen Z works for %, not wages',
                desc: 'Younger generations reject fixed salaries. They want equity, revenue share, and skin in the game. CheckGrow lets collectives split project revenue by contribution — turning every gig into a partnership.',
              },
              {
                icon: MapPin,
                title: 'Localization wins in the AI era',
                desc: 'AI commoditizes remote knowledge work. What can\'t be commoditized? Local presence, trust, and relationships. Gardeners, electricians, event crews — local service collectives are the next frontier.',
              },
              {
                icon: Briefcase,
                title: 'The project economy is here',
                desc: 'Full-time employment is shrinking. Work is reorganizing around projects, not positions. Every industry will need infrastructure to form teams, scope work, and deliver — project by project.',
              },
            ].map((item) => (
              <motion.div key={item.title} variants={fadeUp} className="glass-panel rounded-2xl p-6">
                <item.icon className="w-8 h-8 text-accent mb-4" />
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* ═══════════ VISION: ORGANIZATIONS EVERYWHERE ═══════════ */}
        <motion.section
          className="py-20 border-t border-border"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Vision</SectionLabel>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            There will be millions of organizations
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-2xl mb-10">
            Any group of people with complementary skills can form a collective — bid on projects together, share revenue, and deliver as a team. Not just tech. Every industry.
          </motion.p>
          <motion.div variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { icon: Scissors, label: 'Gardening Collective', example: '"Cut my lawn" → tender goes out, local crew wins the job' },
              { icon: Code, label: 'Dev Agency Collective', example: 'Freelance devs team up to land enterprise contracts' },
              { icon: Palette, label: 'Creative Studio Nova', example: 'Designers, copywriters, videographers pitch as one' },
              { icon: Wrench, label: 'Trades Collective', example: 'Electricians, plumbers, painters bid on renovations together' },
            ].map((item) => (
              <motion.div key={item.label} variants={fadeUp} className="glass-panel rounded-2xl p-5 text-center">
                <item.icon className="w-7 h-7 text-accent mx-auto mb-3" />
                <h3 className="font-semibold text-foreground text-sm mb-1">{item.label}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.example}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* ═══════════ TEAM-AS-A-SERVICE (How it Works) ═══════════ */}
        <motion.section
          className="py-20 border-t border-border"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Team-as-a-Service</SectionLabel>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Four steps. One delivery.
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-2xl mb-10">
            You define the work. We assemble the team. The team delivers as one unit — globally compliant.
          </motion.p>

          <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-6 md:p-8">
            <div className="grid md:grid-cols-4 gap-6">
              {[
                { step: '1', title: 'Define the Work', desc: 'You tell us what needs to be built, fixed, or shipped. Scope, timeline, and outcomes — not job titles.' },
                { step: '2', title: 'Assemble the Team', desc: 'CheckGrow forms a small, vetted team of experts tailored to the project. Each team is built for execution, not headcount.' },
                { step: '3', title: 'Deliver as One Team', desc: 'The team works as a single unit under our delivery model. Coordination, continuity, and accountability are handled for you.' },
                { step: '4', title: 'Stay Globally Compliant', desc: 'CheckGrow manages contracts, payments, and legal compliance across borders. You get global talent without legal or tax risk.' },
              ].map((item) => (
                <div key={item.step} className="text-center md:text-left">
                  <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center mx-auto md:mx-0 mb-3">
                    <span className="text-accent font-bold text-sm">{item.step}</span>
                  </div>
                  <h4 className="font-semibold text-foreground text-sm mb-1">{item.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.section>

        {/* ═══════════ CHECKGROW ENGINE INFOGRAPHIC ═══════════ */}
        <motion.section
          className="py-20 border-t border-border"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>How It Works</SectionLabel>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            From individuals to delivery
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-2xl mb-10">
            Solo freelancers and micro-teams feed their skills into the Supply Agent. When a project comes in, the Demand Agent matches and assembles the perfect team.
          </motion.p>
          <motion.div variants={fadeUp}>
            <KolektivEngineInfographic />
          </motion.div>
        </motion.section>

        {/* ═══════════ PRODUCT — INTERACTIVE DEMOS ═══════════ */}
        <motion.section
          className="py-20 border-t border-border"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Product</SectionLabel>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-2">
            Everything a collective needs — in one platform
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground max-w-2xl mb-6">
            Working demos of our core modules — click to explore.
          </motion.p>
          <motion.div variants={stagger} className="grid md:grid-cols-3 gap-4">
            <motion.div variants={fadeUp} className="glass-panel rounded-xl p-5 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center mb-3">
                <Target className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-bold text-foreground text-sm mb-1">Demand Agent</h3>
              <p className="text-xs text-muted-foreground">AI-powered project scoping, team formation & brief generation</p>
            </motion.div>
            <motion.div variants={fadeUp} className="glass-panel rounded-xl p-5 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center mb-3">
                <Users className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-bold text-foreground text-sm mb-1">Supply Agent</h3>
              <p className="text-xs text-muted-foreground">Skill mapping, availability matching & talent onboarding</p>
            </motion.div>
            <motion.div variants={fadeUp} className="glass-panel rounded-xl p-5 flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-lg bg-accent/15 flex items-center justify-center mb-3">
                <BarChart3 className="w-5 h-5 text-accent" />
              </div>
              <h3 className="font-bold text-foreground text-sm mb-1">AI-Powered CRM</h3>
              <p className="text-xs text-muted-foreground">Deal pipeline, task management & compensation tracking</p>
            </motion.div>
          </motion.div>
        </motion.section>

        {/* ═══════════ TRACTION ═══════════ */}
        <motion.section
          id="traction"
          className="py-20 border-t border-border"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Traction</SectionLabel>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-10">
            Proven model, real revenue
          </motion.h2>
          <motion.div variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard value="€200K" label="Revenue in 3 Months" icon={DollarSign} />
            <MetricCard value="2" label="Collectives Live" icon={Globe} />
            <MetricCard value="100+" label="Active Members" icon={Users} />
            <MetricCard value="<60s" label="AI Team Formation" icon={Zap} />
          </motion.div>

          {/* Origin Story */}
          <motion.div variants={fadeUp} className="mt-8 glass-panel rounded-2xl p-6 md:p-8">
            <h3 className="font-semibold text-foreground mb-2">Origin: The KUT ThinkTank Model</h3>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              CheckGrow was born from the KUT ThinkTank — an NGO-based collective that solved the agency problem by eliminating the need to pay wages. Top talent could earn on top of their 9-to-5 jobs, participating in projects on their own terms. Because every member had skin in the game, <span className="text-foreground font-semibold">everyone became a sales agent</span> — generating <span className="text-foreground font-semibold">€200K in revenue in just 3 months</span>.
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              This proved the core thesis: when you remove the overhead of traditional agencies and let people self-organize around projects with fair revenue splits, teams form faster, sell harder, and deliver better.
            </p>
          </motion.div>

          {/* Live Organizations */}
          <motion.div variants={fadeUp} className="mt-4 grid md:grid-cols-2 gap-4">
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="font-semibold text-foreground">KUT ThinkTank</span>
                <span className="text-xs text-muted-foreground ml-auto">Founding Organization</span>
              </div>
              <p className="text-sm text-muted-foreground">First collective — proved the model generates real revenue with zero overhead. NGO structure solved compliance, members earned through project revenue shares.</p>
            </div>
            <div className="glass-panel rounded-2xl p-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                <span className="font-semibold text-foreground">WESPA</span>
                <span className="text-xs text-muted-foreground ml-auto">Onboarding Now</span>
              </div>
              <p className="text-sm text-muted-foreground">Second organization integration — every community member who wants to participate can join the WESPA organization, validating the multi-org architecture and self-serve onboarding.</p>
            </div>
          </motion.div>
        </motion.section>

        {/* ═══════════ BUSINESS MODEL ═══════════ */}
        <motion.section
          className="py-20 border-t border-border"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Business Model</SectionLabel>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-10">
            Three revenue streams, built for scale
          </motion.h2>

          <motion.div variants={stagger} className="grid md:grid-cols-3 gap-6">
            <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-8">
              <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">5–10% Project Fee</h3>
              <p className="text-muted-foreground leading-relaxed">
                We take 5–10% of every project facilitated through the platform. As organizations grow and run more projects, revenue scales with them — zero marginal cost.
              </p>
            </motion.div>
            <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-8">
              <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center mb-4">
                <DollarSign className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">SaaS — AI-Powered CRM</h3>
              <p className="text-muted-foreground leading-relaxed">
                Monthly subscription for the full AI-powered CRM suite. Predictable recurring revenue that increases with each new organization onboarded.
              </p>
            </motion.div>
            <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-8">
              <div className="w-12 h-12 rounded-xl bg-accent/15 flex items-center justify-center mb-4">
                <Database className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Data — Compatibility Intelligence</h3>
              <p className="text-muted-foreground leading-relaxed">
                Every project generates behavioral metadata: who works well together, which skill combos deliver, and how teams perform. This Compatibility Intelligence becomes a licensable data asset for HR-tech platforms, workforce planners, and enterprise talent acquisition.
              </p>
            </motion.div>
          </motion.div>
        </motion.section>

        {/* ═══════════ COMPETITION — DEEP ANALYSIS ═══════════ */}
        <motion.section
          className="py-20 border-t border-border"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Competitive Landscape</SectionLabel>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            $7.6B market. Nobody owns the collective layer.
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground mb-6 max-w-3xl">
            The freelance platform market hit $7.65B in 2025, growing at 16.7% CAGR to $16.5B by 2030. Today's players fall into four buckets — and none of them serve the collective.
          </motion.p>

          {/* Market Map — 4 quadrants */}
          <motion.div variants={stagger} className="grid md:grid-cols-2 gap-4 mb-10">
            {[
              {
                title: 'EOR & Compliance',
                players: 'Deel · Remote · Oyster HR',
                insight: 'Deel leads at $1.4B ARR, $17.3B valuation. These platforms solve hiring and payroll compliance — but they don\'t form teams, manage projects, or enable collectives. They\'re infrastructure for employers, not for independent teams.',
                gap: 'No team formation, no project delivery, no collective model',
              },
              {
                title: 'Freelance Marketplaces',
                players: 'Upwork · Fiverr · Freelancer · Malt',
                insight: 'Upwork holds 61% market share ($7.3B GSV) but revenue is declining as AI replaces individual gig work. These platforms sell individuals to clients — there\'s no mechanism for freelancers to team up, share revenue, or deliver as a unit.',
                gap: 'Individual-only, race-to-bottom pricing, no team layer',
              },
              {
                title: 'Elite Team Platforms',
                players: 'A.Team · Toptal · Braintrust',
                insight: 'A.Team ($42M revenue, $60M raised) is the closest analog — AI-matched teams of top-tier builders. But they\'re a curated marketplace with heavy markups, not infrastructure for self-organizing collectives. Toptal vets the top 3% but sells individuals.',
                gap: 'Curated, not self-serve. No CRM, no collective ownership',
              },
              {
                title: 'Team Ops & Collective Tools',
                players: 'Collective.work · Teamera · Collective OS',
                insight: 'Collective.work ($8M raised) powers freelancer teams in France. Teamera offers ops analytics for hybrid teams. These are early-stage tools solving pieces of the puzzle — but none offer end-to-end infrastructure from discovery to payout.',
                gap: 'Fragmented tools, no AI matching, no integrated delivery',
              },
            ].map((q) => (
              <motion.div key={q.title} variants={fadeUp} className="glass-panel rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <h3 className="font-bold text-foreground">{q.title}</h3>
                </div>
                <p className="text-xs text-accent font-semibold mb-2">{q.players}</p>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{q.insight}</p>
                <div className="flex items-start gap-2 pt-2 border-t border-border">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 mt-0.5 shrink-0" />
                  <p className="text-xs text-muted-foreground"><span className="font-semibold text-foreground">Gap:</span> {q.gap}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Feature comparison table */}
          <motion.div variants={fadeUp}>
            <h3 className="font-semibold text-foreground mb-4">Head-to-head feature comparison</h3>
          </motion.div>
          <motion.div variants={fadeUp} className="glass-panel rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-border">
                    <th className="py-3 px-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Platform</th>
                    <th className="py-3 px-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Revenue<br/>Model</th>
                    <th className="py-3 px-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Scale</th>
                    <th className="py-3 px-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">AI Team<br/>Formation</th>
                    <th className="py-3 px-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Built-in<br/>CRM</th>
                    <th className="py-3 px-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Collective<br/>First</th>
                    <th className="py-3 px-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Cross-border<br/>Compliance</th>
                    <th className="py-3 px-4 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider text-center">Project<br/>Ops</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <CompetitorRow data={{ name: 'CheckGrow', category: 'Collective OS', model: 'Fee+SaaS+Data', valuation: 'Pre-Seed', aiTeam: 'yes', crm: 'yes', collective: 'yes', compliance: 'yes', projectOps: 'yes', highlight: true }} />
                  <CompetitorRow data={{ name: 'Deel', category: 'EOR / Payroll', model: 'Per-employee', valuation: '$17.3B', aiTeam: 'no', crm: 'no', collective: 'no', compliance: 'yes', projectOps: 'no' }} />
                  <CompetitorRow data={{ name: 'Remote', category: 'EOR / Payroll', model: 'Per-employee', valuation: '$3B', aiTeam: 'no', crm: 'no', collective: 'no', compliance: 'yes', projectOps: 'no' }} />
                  <CompetitorRow data={{ name: 'Oyster HR', category: 'EOR / Payroll', model: 'Per-employee', valuation: '$1B', aiTeam: 'no', crm: 'no', collective: 'no', compliance: 'yes', projectOps: 'no' }} />
                  <CompetitorRow data={{ name: 'Upwork', category: 'Marketplace', model: 'Commission', valuation: '$1.5B mkt cap', aiTeam: 'partial', crm: 'no', collective: 'no', compliance: 'no', projectOps: 'partial' }} />
                  <CompetitorRow data={{ name: 'Fiverr', category: 'Marketplace', model: 'Commission', valuation: '$0.8B mkt cap', aiTeam: 'no', crm: 'no', collective: 'no', compliance: 'no', projectOps: 'no' }} />
                  <CompetitorRow data={{ name: 'Toptal', category: 'Elite Talent', model: 'Markup (40-60%)', valuation: '$~400M', aiTeam: 'no', crm: 'no', collective: 'no', compliance: 'partial', projectOps: 'no' }} />
                  <CompetitorRow data={{ name: 'A.Team', category: 'Elite Teams', model: 'Markup', valuation: '$60M raised', aiTeam: 'yes', crm: 'no', collective: 'no', compliance: 'partial', projectOps: 'partial' }} />
                  <CompetitorRow data={{ name: 'Collective.work', category: 'Freelancer Teams', model: 'Commission', valuation: '$8M raised', aiTeam: 'partial', crm: 'no', collective: 'partial', compliance: 'no', projectOps: 'no' }} />
                  <CompetitorRow data={{ name: 'Braintrust', category: 'Web3 Talent', model: 'Token + Fee', valuation: '$~100M', aiTeam: 'partial', crm: 'no', collective: 'partial', compliance: 'no', projectOps: 'no' }} />
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-border flex items-center gap-6 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3 text-accent" /> Full support</span>
              <span className="flex items-center gap-1"><MinusCircle className="w-3 h-3 text-yellow-500" /> Partial / limited</span>
              <span className="flex items-center gap-1"><XCircle className="w-3 h-3 text-muted-foreground/30" /> Not available</span>
            </div>
          </motion.div>

          {/* Key insight */}
          <motion.div variants={fadeUp} className="mt-6 glass-panel rounded-2xl p-6 border-l-4 border-accent">
            <h4 className="font-bold text-foreground mb-2">The white space</h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              <span className="text-foreground font-semibold">EOR platforms</span> (Deel, Remote, Oyster) solve compliance but don't form teams.
              <span className="text-foreground font-semibold"> Marketplaces</span> (Upwork, Fiverr) sell individuals but can't assemble collectives.
              <span className="text-foreground font-semibold"> Elite platforms</span> (A.Team, Toptal) curate talent but don't give teams ownership.
              <span className="text-foreground font-semibold"> CheckGrow</span> is the first platform where teams own themselves — with AI formation, shared CRM, project ops, and compliant payouts in one stack. We're not competing with Deel on payroll or Upwork on gigs. We're building the missing layer between talent and delivery.
            </p>
          </motion.div>
        </motion.section>

        {/* ═══════════ GO-TO-MARKET ═══════════ */}
        <motion.section
          className="py-20 border-t border-border"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Go-to-Market</SectionLabel>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Co-working spaces first. Then everywhere.
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-2xl mb-10">
            Every co-working space is an organization waiting to happen. We start by partnering with hubs across Europe — turning their communities into execution-ready teams on our platform.
          </motion.p>
          <motion.div variants={stagger} className="grid md:grid-cols-5 gap-4 mt-4">
            {[
              { step: '01', title: 'Co-working Beachhead', desc: 'Partner with co-working spaces to onboard their communities as organizations. Built-in trust, instant talent pools.' },
              { step: '02', title: 'Founder-Led Sales', desc: 'Direct, high-touch outreach to close the first projects. Learn objections, refine pricing, validate delivery.' },
              { step: '03', title: 'Hub Network Effect', desc: 'Each co-working space becomes a distribution node. Members bring clients, spaces bring members. Flywheel spins.' },
              { step: '04', title: 'Trust & Authority', desc: 'Publish case studies and compliance-focused thought leadership. Shift from outbound to inbound demand.' },
              { step: '05', title: 'Vertical Expansion', desc: 'Go deeper into proven industries with repeatable organization setups. Faster sales cycles, improving margins.' },
            ].map((item) => (
              <motion.div key={item.step} variants={fadeUp} className="glass-panel rounded-2xl p-5">
                <span className="text-3xl font-bold text-accent/20">{item.step}</span>
                <h3 className="font-semibold text-foreground mt-2 mb-2 text-sm">{item.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* ═══════════ COMPATIBILITY INTELLIGENCE ═══════════ */}
        <motion.section
          className="py-20 border-t border-border"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Data Moat</SectionLabel>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Learning why people work well together
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-2xl mb-10">
            Every project generates signal. We're building a compatibility engine that learns from real collaboration — not just skills on paper, but how people actually interact, complement each other, and deliver.
          </motion.p>
          <motion.div variants={stagger} className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: Brain,
                title: 'Interaction Patterns',
                desc: 'Track communication cadence, decision-making speed, and collaboration rhythms across every project to surface what makes teams click.',
              },
              {
                icon: Target,
                title: 'Compatibility Scoring',
                desc: 'Build a proprietary model that predicts team success — not just skill match, but personality fit, work style alignment, and trust dynamics.',
              },
              {
                icon: BarChart3,
                title: 'Compounding Intelligence',
                desc: 'Every completed project makes the next team formation smarter. This data moat is impossible to replicate without running real organizations.',
              },
            ].map((item) => (
              <motion.div key={item.title} variants={fadeUp} className="glass-panel rounded-2xl p-6">
                <item.icon className="w-8 h-8 text-accent mb-4" />
                <h3 className="font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* ═══════════ ROADMAP ═══════════ */}
        <motion.section
          className="py-20 border-t border-border"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Roadmap</SectionLabel>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-10">
            From genesis swarm to platformization
          </motion.h2>
          <motion.div variants={stagger} className="grid md:grid-cols-4 gap-4">
            {[
              { year: '2024', phase: 'Foundation', items: ['Launched a curated expert community', 'Vetted and onboarded first high-quality experts', 'Ran small pilot projects manually'] },
              { year: '2025', phase: 'Genesis Swarm', items: ['Formed the first execution-ready swarm', 'Standardized team roles and delivery workflows', 'Implemented transparent revenue split'] },
              { year: 'Now', phase: 'Platformization', items: ['Build tooling for swarm assembly & tracking', 'Introduce compliance & legal tools', 'Start capturing reusable knowledge'] },
              { year: '2026', phase: 'Mitosis', items: ['Expand into multiple regions', 'Scale using performance-based entry', 'Cross-collective team formation'] },
            ].map((item) => (
              <motion.div key={item.year} variants={fadeUp} className="glass-panel rounded-2xl p-5">
                <span className="text-xs font-bold text-accent uppercase tracking-wider">{item.year}</span>
                <h3 className="font-semibold text-foreground mt-1 mb-3">{item.phase}</h3>
                <ul className="space-y-1.5">
                  {item.items.map((line) => (
                    <li key={line} className="text-xs text-muted-foreground flex items-start gap-2">
                      <CheckCircle className="w-3 h-3 text-accent mt-0.5 flex-shrink-0" />
                      {line}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* ═══════════ MARKET SIZE ═══════════ */}
        <motion.section
          className="py-20 border-t border-border"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Market Size</SectionLabel>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-10">
            Massive, fragmented, ready for infrastructure
          </motion.h2>
          <motion.div variants={stagger} className="grid md:grid-cols-3 gap-6">
            <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-8 text-center">
              <div className="text-4xl md:text-5xl font-bold text-foreground mb-2">$300B</div>
              <div className="text-sm font-semibold text-accent mb-2">TAM</div>
              <p className="text-xs text-muted-foreground">Global project-based professional services delivered to SMEs</p>
            </motion.div>
            <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-8 text-center">
              <div className="text-4xl md:text-5xl font-bold text-foreground mb-2">$60B</div>
              <div className="text-sm font-semibold text-accent mb-2">SAM</div>
              <p className="text-xs text-muted-foreground">SMEs (20–200 employees) in Europe & North America</p>
            </motion.div>
            <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-8 text-center">
              <div className="text-4xl md:text-5xl font-bold text-foreground mb-2">€10-30M</div>
              <div className="text-sm font-semibold text-accent mb-2">SOM (3-5 yr)</div>
              <p className="text-xs text-muted-foreground">Achievable by serving a few hundred recurring SME clients</p>
            </motion.div>
          </motion.div>
        </motion.section>

        {/* ═══════════ FINANCIAL PROJECTIONS ═══════════ */}
        <motion.section
          className="py-20 border-t border-border"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Financial Projections</SectionLabel>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Services business → scalable platform
          </motion.h2>
          <motion.div variants={stagger} className="grid md:grid-cols-3 gap-6 mt-10">
            <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-8 text-center">
              <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">€4.5M</div>
              <div className="text-sm text-muted-foreground">Net Revenue by end of 2028</div>
            </motion.div>
            <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-8 text-center">
              <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">€15M</div>
              <div className="text-sm text-muted-foreground">ARR by end of 2028</div>
            </motion.div>
            <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-8 text-center">
              <div className="text-3xl md:text-4xl font-bold text-foreground mb-1">3-5×</div>
              <div className="text-sm text-muted-foreground">Growth YoY</div>
            </motion.div>
          </motion.div>
        </motion.section>

        {/* ═══════════ USE OF FUNDS ═══════════ */}
        <motion.section
          className="py-20 border-t border-border"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Pre-Seed Round</SectionLabel>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            €300K for 10% — fuel the expansion
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground mb-10 max-w-2xl">
            This is a sales-first raise. The product is built — now we need boots on the ground in co-working hubs across Europe.
          </motion.p>
          <motion.div variants={stagger} className="space-y-4">
            {[
              { label: 'Sales & Co-working Expansion', pct: 65, desc: 'Dedicated key account managers embedding CheckGrow into co-working networks — each hub becomes a live organization on the platform', highlight: true },
              { label: 'Product & Engineering', pct: 20, desc: 'AI matching refinement, revenue-share automation, mobile experience' },
              { label: 'Operations & Legal', pct: 15, desc: 'Multi-country compliance, support infrastructure, entity setup' },
            ].map((item) => (
              <motion.div key={item.label} variants={fadeUp} className={`glass-panel rounded-xl p-5 ${item.highlight ? 'ring-1 ring-accent/30' : ''}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">{item.label}</span>
                    {item.highlight && <span className="text-[10px] uppercase tracking-wider font-bold text-accent bg-accent/10 px-2 py-0.5 rounded-full">Primary</span>}
                  </div>
                  <span className="text-accent font-bold">{item.pct}%</span>
                </div>
                <div className="w-full h-2 rounded-full bg-secondary overflow-hidden mb-2">
                  <motion.div
                    className={`h-full rounded-full ${item.highlight ? 'bg-accent' : 'bg-accent/60'}`}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${item.pct}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* ═══════════ TEAM ═══════════ */}
        <motion.section
          className="py-20 border-t border-border"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Team</SectionLabel>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Built by operators, not observers
          </motion.h2>
          <motion.div variants={stagger} className="grid md:grid-cols-3 gap-6 mt-10">
            {[
              { name: 'Adrian Poznić', role: 'CEO', desc: 'Serial founder, PhD candidate, KUT Founder/Managing partner, ex-Meloot, delivered 20+ projects, HNB Scholarship holder/Associate.', photo: adrianPhoto },
              { name: 'Carla Ferreri', role: 'COO', desc: 'Senior Business Development professional with 20+ years of experience, entrepreneur, consultant on complex EU-funded projects', photo: carlaPhoto },
              { name: 'Domagoj Kolega', role: 'CTO', desc: 'Software Engineer, Android Team Lead at Aras™ Digital Products (6+ yrs), MSc Software Engineering from FER', photo: domagojPhoto },
            ].map((member) => (
              <motion.div key={member.name} variants={fadeUp} className="glass-panel rounded-2xl p-6 text-center">
                <div className="w-20 h-20 rounded-full bg-secondary mx-auto mb-4 flex items-center justify-center overflow-hidden">
                  {member.photo ? (
                    <img src={member.photo} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-8 h-8 text-muted-foreground/40" />
                  )}
                </div>
                <h3 className="font-bold text-foreground">{member.name}</h3>
                <span className="text-sm text-accent font-semibold">{member.role}</span>
                <p className="text-xs text-muted-foreground mt-2">{member.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* ═══════════ EXIT STRATEGY ═══════════ */}
        <motion.section
          className="py-20 border-t border-border"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Exit Strategy</SectionLabel>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-3">
            The real asset isn't the platform — it's the data
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground mb-10 max-w-2xl text-lg">
            Every project, every skill mapped, every team formed generates a proprietary signal that no competitor can replicate.
          </motion.p>

          {/* Data moat layers */}
          <motion.div variants={stagger} className="grid md:grid-cols-2 gap-6 mb-12">
            {[
              {
                icon: Brain,
                title: 'Compatibility Intelligence',
                desc: 'Who works well together, why, and under what conditions. Predicted from historical team performance, not self-reported preferences.',
              },
              {
                icon: BarChart3,
                title: 'Skill Graph',
                desc: 'Thousands of skill profiles with verified depth, experience levels, and co-occurrence patterns — a living taxonomy of professional capability.',
              },
              {
                icon: Users,
                title: 'Interaction Patterns',
                desc: 'How users engage: response times, project acceptance rates, collaboration frequency, referral networks — behavioral data that reveals real market dynamics.',
              },
              {
                icon: Layers,
                title: 'Pricing & Demand Signals',
                desc: 'Service pricing across clusters, deal conversion rates, seasonal demand curves — a real-time index of the project economy.',
              },
            ].map((item) => (
              <motion.div key={item.title} variants={fadeUp} className="glass-panel rounded-2xl p-6">
                <item.icon className="w-6 h-6 text-accent mb-3" />
                <h3 className="font-bold text-foreground mb-1">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Acquirer profiles */}
          <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-8">
            <h3 className="font-bold text-foreground mb-1 text-lg">Strategic Acquirer Profiles</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Our data moat compounds with every organization onboarded — making acquisition more valuable over time.
            </p>
            <div className="grid sm:grid-cols-3 gap-6">
              {[
                {
                  category: 'HR-Tech Platforms',
                  examples: 'Deel, Remote, Oyster',
                  why: 'Acquire our Compatibility Intelligence to power smarter contractor matching at scale.',
                },
                {
                  category: 'Freelance Marketplaces',
                  examples: 'Upwork, Toptal, Malt',
                  why: 'Our skill graph and team-chemistry data transforms individual matching into team-level orchestration.',
                },
                {
                  category: 'Consulting & EU Integrators',
                  examples: 'Accenture, Deloitte',
                  why: 'Instant access to pre-vetted, pre-matched distributed teams with proven collaboration history.',
                },
              ].map((a) => (
                <div key={a.category}>
                  <h4 className="font-semibold text-foreground text-sm">{a.category}</h4>
                  <p className="text-xs text-accent font-medium mb-1">{a.examples}</p>
                  <p className="text-xs text-muted-foreground">{a.why}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.section>

        {/* ═══════════ SUPPLY AGENT — How We Map Talent ═══════════ */}
        <motion.section
          className="py-20 border-t border-border"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Supply Agent</SectionLabel>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Every freelancer becomes a rich data profile
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-3xl mb-10">
            The Supply Agent ingests signals from onboarding, chat, and project history — then maps them into skill vectors and behavioral traits that power every match.
          </motion.p>

          <motion.div variants={stagger} className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Data Ingestion */}
            <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-6">
              <Database className="w-6 h-6 text-accent mb-3" />
              <h3 className="font-bold text-foreground mb-3">Data Ingestion</h3>
              <div className="space-y-3">
                {[
                  { label: 'Onboarding Wizard', desc: 'Skills, experience, rates' },
                  { label: 'Chat Profiling', desc: 'Personality, work style' },
                  { label: 'Project History', desc: 'Past deliveries, ratings' },
                  { label: 'Interaction Data', desc: 'Response time, patterns' },
                  { label: 'Availability', desc: 'Schedule, timezone, capacity' },
                  { label: 'Network Graph', desc: 'Connections, endorsements' },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3">
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-accent shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-accent tracking-wide uppercase">{item.label}</span>
                      <span className="block text-xs text-muted-foreground">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Skill Mapper */}
            <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-6">
              <BarChart3 className="w-6 h-6 text-accent mb-3" />
              <h3 className="font-bold text-foreground mb-3">Skill Mapper</h3>
              <div className="space-y-3">
                {[
                  { skill: 'Technical Skills', pct: 92 },
                  { skill: 'Domain Expertise', pct: 78 },
                  { skill: 'Soft Skills', pct: 85 },
                  { skill: 'Tools & Platforms', pct: 88 },
                  { skill: 'Languages', pct: 65 },
                  { skill: 'Certifications', pct: 70 },
                  { skill: 'Leadership', pct: 82 },
                  { skill: 'Creative Thinking', pct: 74 },
                ].map((item, i) => (
                  <div key={item.skill} className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground/40 font-mono w-5">[{String(i + 1).padStart(2, '0')}]</span>
                    <span className="text-xs text-muted-foreground flex-1">{item.skill}</span>
                    <div className="h-1.5 rounded-full bg-accent/15 flex-1 max-w-[80px]">
                      <div className="h-full rounded-full bg-accent/60" style={{ width: `${item.pct}%` }} />
                    </div>
                    <span className="text-[10px] text-accent font-mono w-7 text-right">{item.pct}%</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Trait Extractor */}
            <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-6">
              <Eye className="w-6 h-6 text-accent mb-3" />
              <h3 className="font-bold text-foreground mb-3">Trait Extractor</h3>
              <div className="space-y-3">
                {[
                  { trait: 'Leadership', confidence: 'HIGH', source: 'confirmed' },
                  { trait: 'Communication', confidence: 'HIGH', source: 'ai-inferred' },
                  { trait: 'Detail-oriented', confidence: 'MED', source: 'confirmed' },
                  { trait: 'Creative thinking', confidence: 'MED', source: 'ai-inferred' },
                  { trait: 'Adaptability', confidence: 'HIGH', source: 'confirmed' },
                  { trait: 'Problem solving', confidence: 'HIGH', source: 'ai-inferred' },
                  { trait: 'Time management', confidence: 'MED', source: 'confirmed' },
                  { trait: 'Empathy', confidence: 'HIGH', source: 'ai-inferred' },
                ].map(item => (
                  <div key={item.trait} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground flex-1">{item.trait}</span>
                    <span className={`font-mono font-semibold ${item.confidence === 'HIGH' ? 'text-accent' : 'text-muted-foreground/50'}`}>{item.confidence}</span>
                    <span className="text-muted-foreground/30 text-[10px] w-16 text-right">{item.source}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Output cards */}
          <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-6">
            <h3 className="font-bold text-foreground mb-4">Generated Supply Profile</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[
                { title: 'Skill Vector', desc: '384-dim embedding capturing technical & domain expertise' },
                { title: 'Trait Signature', desc: 'Behavioral fingerprint from chat analysis & project patterns' },
                { title: 'Availability Map', desc: 'Real-time capacity, timezone coverage, schedule flexibility' },
                { title: 'Compatibility Score', desc: 'Pre-computed affinity for 12K+ potential team configurations' },
                { title: 'Rate Intelligence', desc: 'Market-calibrated pricing based on skill-demand curves' },
              ].map(item => (
                <div key={item.title} className="glass-panel rounded-xl p-4 text-center">
                  <span className="text-[10px] font-semibold text-accent tracking-wider uppercase">{item.title}</span>
                  <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.section>

        {/* ═══════════ AI ENGINE — Compatibility Intelligence ═══════════ */}
        <motion.section
          className="py-20 border-t border-border"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>AI Engine</SectionLabel>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Compatibility Intelligence at the core
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-3xl mb-10">
            The engine scores every possible team combination across seven dimensions — skills, chemistry, history, pricing, behavior, context, and timing — then continuously learns from outcomes.
          </motion.p>

          <motion.div variants={stagger} className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Supply Inputs */}
            <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-6">
              <ArrowRight className="w-6 h-6 text-accent mb-3" />
              <h3 className="font-bold text-foreground mb-3">Supply Inputs</h3>
              <div className="space-y-2">
                {[
                  'Skill vectors (384-dim)',
                  'Trait signatures',
                  'Availability maps',
                  'Rate expectations',
                  'Team history graph',
                  'Communication patterns',
                  'Domain embeddings',
                  'Portfolio analysis',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-accent">›</span> {item}
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Matching Core */}
            <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-6 flex flex-col items-center text-center">
              <Cpu className="w-8 h-8 text-purple-400 mb-4" />
              <h3 className="font-bold text-foreground mb-4">Matching Core</h3>
              <div className="relative w-40 h-40 mx-auto mb-4">
                {[70, 56, 42, 28].map((size) => (
                  <div key={size} className="absolute left-1/2 top-1/2 rounded-full border border-purple-400/20" style={{ width: size * 2, height: size * 2, transform: 'translate(-50%, -50%)' }} />
                ))}
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-purple-500/30 border border-purple-400/40 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-purple-300">AI</span>
                </div>
              </div>
              <div className="flex flex-wrap justify-center gap-2">
                {['Skills', 'Chemistry', 'History', 'Pricing', 'Behavior', 'Context', 'Timing'].map(label => (
                  <span key={label} className="text-[10px] font-mono text-purple-400/60 bg-purple-400/10 px-2 py-0.5 rounded-full">{label}</span>
                ))}
              </div>
            </motion.div>

            {/* Demand Inputs */}
            <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-6">
              <Target className="w-6 h-6 text-accent mb-3" />
              <h3 className="font-bold text-foreground mb-3">Demand Inputs</h3>
              <div className="space-y-2">
                {[
                  'Project requirements',
                  'Role specifications',
                  'Budget constraints',
                  'Timeline pressure',
                  'Industry context',
                  'Team size targets',
                  'Chemistry preferences',
                  'Compliance needs',
                ].map(item => (
                  <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="text-accent">›</span> {item}
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Learning loop */}
          <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-6 mb-8">
            <h3 className="font-bold text-foreground mb-4">Continuous Learning Loop</h3>
            <div className="flex flex-wrap items-center justify-center gap-3 md:gap-6">
              {[
                { label: 'Execute', color: 'text-accent bg-accent/10' },
                { label: 'Capture', color: 'text-purple-400 bg-purple-400/10' },
                { label: 'Analyze', color: 'text-purple-400 bg-purple-400/10' },
                { label: 'Refine', color: 'text-purple-400 bg-purple-400/10' },
                { label: 'Match', color: 'text-accent bg-accent/10' },
                { label: 'Deploy', color: 'text-accent bg-accent/10' },
              ].map((step, i) => (
                <div key={step.label} className="flex items-center gap-2">
                  <span className={`text-xs font-mono font-semibold px-3 py-1.5 rounded-full ${step.color}`}>{step.label}</span>
                  {i < 5 && <ArrowRight className="w-3 h-3 text-muted-foreground/30" />}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Data Moat stats */}
          <motion.div variants={stagger} className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: '2.4M+', label: 'Team Chemistry Data Points' },
              { value: '180K+', label: 'Skill Graph Nodes' },
              { value: '890K+', label: 'Behavioral Signals' },
              { value: '45K+', label: 'Pricing Transactions' },
            ].map(stat => (
              <motion.div key={stat.label} variants={fadeUp} className="glass-panel rounded-2xl p-6 text-center">
                <div className="text-3xl md:text-4xl font-bold text-purple-400 mb-1">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.section>

        {/* ═══════════ DEMAND AGENT — Team Assembly ═══════════ */}
        <motion.section
          className="py-20 border-t border-border"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>Demand Agent</SectionLabel>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            From project brief to assembled team in minutes
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-3xl mb-10">
            The Demand Agent parses requirements, defines role slots, and scores every candidate combination — delivering a ranked shortlist of optimal teams.
          </motion.p>

          <motion.div variants={stagger} className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Project Brief */}
            <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-6">
              <FileText className="w-6 h-6 text-accent mb-3" />
              <h3 className="font-bold text-foreground mb-3">Project Brief Parsing</h3>
              <div className="space-y-3">
                {[
                  { label: 'Project Scope', desc: 'Requirements, deliverables, success criteria' },
                  { label: 'Role Requirements', desc: 'Skills needed per role, seniority levels' },
                  { label: 'Team Structure', desc: 'Headcount, hierarchy, collaboration model' },
                  { label: 'Pricing Model', desc: 'Fixed price, hourly, retainer, equity split' },
                  { label: 'Industry Context', desc: 'Sector compliance, regulatory needs' },
                  { label: 'Timeline', desc: 'Milestones, deadlines, sprint planning' },
                ].map(item => (
                  <div key={item.label} className="flex items-start gap-3">
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-accent shrink-0" />
                    <div>
                      <span className="text-xs font-semibold text-accent tracking-wide uppercase">{item.label}</span>
                      <span className="block text-xs text-muted-foreground">{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Team Formation Pipeline */}
            <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-6">
              <GitBranch className="w-6 h-6 text-accent mb-3" />
              <h3 className="font-bold text-foreground mb-3">Team Formation</h3>
              <div className="space-y-3">
                {[
                  'Parse requirements into role slots',
                  'Define skill weights per role',
                  'Set chemistry constraints',
                  'Calculate budget allocation',
                  'Query supply profiles',
                  'Score candidate combinations',
                  'Optimize team composition',
                  'Generate ranked shortlist',
                ].map((step, i) => (
                  <div key={step} className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-accent w-5">{`>${i + 1}`}</span>
                    <span className="text-xs text-muted-foreground">{step}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Assembled Team */}
            <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-6">
              <Users className="w-6 h-6 text-accent mb-3" />
              <h3 className="font-bold text-foreground mb-3">Assembled Team</h3>
              <div className="space-y-3">
                {[
                  { role: 'Lead Developer', score: 96, status: 'assigned' },
                  { role: 'UI/UX Designer', score: 91, status: 'assigned' },
                  { role: 'Backend Engineer', score: 88, status: 'pending' },
                  { role: 'Project Manager', score: 94, status: 'assigned' },
                  { role: 'QA Specialist', score: 85, status: 'matching' },
                  { role: 'DevOps Engineer', score: 90, status: 'assigned' },
                  { role: 'Data Analyst', score: 87, status: 'pending' },
                ].map(item => (
                  <div key={item.role} className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground flex-1">{item.role}</span>
                    <span className="font-mono font-semibold text-accent">{item.score}%</span>
                    <span className={`text-[10px] w-14 text-right ${item.status === 'assigned' ? 'text-accent' : 'text-muted-foreground/40'}`}>{item.status}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>

          {/* Operational Layer */}
          <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-6">
            <h3 className="font-bold text-foreground mb-4">Operational Layer</h3>
            <div className="grid md:grid-cols-3 gap-4">
              {[
                { title: 'Project Ops', icon: Layers, items: ['Task management', 'Time tracking', 'Milestones', 'Wiki & Docs', 'Sticky notes', 'Activity timeline'] },
                { title: 'CRM Engine', icon: BarChart3, items: ['Deal pipeline', 'Contact book', 'Activity log', 'Calendar sync', 'Lead generation', 'Task briefs'] },
                { title: 'Payouts', icon: CreditCard, items: ['Stripe Connect', 'Platform fees', 'Revenue splits', 'Invoice automation', 'Task-based billing', 'Equity tracking'] },
              ].map(panel => (
                <div key={panel.title} className="glass-panel rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <panel.icon className="w-4 h-4 text-accent" />
                    <span className="text-xs font-bold text-foreground tracking-wide uppercase">{panel.title}</span>
                  </div>
                  <div className="space-y-1.5">
                    {panel.items.map(item => (
                      <div key={item} className="text-xs text-muted-foreground">{item}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.section>

        {/* ═══════════ INTERPLAY INFOGRAPHIC — Supply ↔ Demand ═══════════ */}
        <motion.section
          className="py-20 border-t border-border"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp}>
            <SectionLabel>The Full Picture</SectionLabel>
          </motion.div>
          <motion.h2 variants={fadeUp} className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            How supply meets demand
          </motion.h2>
          <motion.p variants={fadeUp} className="text-muted-foreground text-lg max-w-3xl mb-12">
            A continuous feedback loop where talent data and project requirements converge through AI — creating smarter matches with every cycle.
          </motion.p>

          {/* Main interplay diagram */}
          <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-8 md:p-10 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto_1fr] gap-6 md:gap-0 items-start mb-10">
              {/* Supply Column */}
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/15 mb-4">
                  <Database className="w-4 h-4 text-accent" />
                  <span className="text-xs font-bold text-accent tracking-wider uppercase">Supply Agent</span>
                </div>
                <div className="space-y-2">
                  {['Skills & Experience', 'Behavioral Traits', 'Availability', 'Pricing Signals', 'Team History'].map(item => (
                    <div key={item} className="glass-panel rounded-lg px-3 py-2 text-xs text-muted-foreground">{item}</div>
                  ))}
                </div>
              </div>

              {/* Arrow → */}
              <div className="hidden md:flex flex-col items-center justify-center h-full px-4 pt-16">
                <div className="border-t-2 border-dashed border-accent/30 w-8" />
                <span className="text-[9px] font-mono text-accent/50 my-1">profiles</span>
                <ArrowRight className="w-4 h-4 text-accent/40" />
              </div>

              {/* Engine Column */}
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-400/15 mb-4">
                  <Cpu className="w-4 h-4 text-purple-400" />
                  <span className="text-xs font-bold text-purple-400 tracking-wider uppercase">AI Engine</span>
                </div>
                <div className="relative mx-auto w-44 h-44 my-2">
                  {[80, 64, 48, 32].map(r => (
                    <div key={r} className="absolute left-1/2 top-1/2 rounded-full border border-purple-400/15" style={{ width: r * 2, height: r * 2, transform: 'translate(-50%,-50%)' }} />
                  ))}
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-purple-500/25 border border-purple-400/30 flex items-center justify-center">
                    <Brain className="w-4 h-4 text-purple-300" />
                  </div>
                  {[
                    { label: 'SKILLS', angle: 0 },
                    { label: 'CHEMISTRY', angle: 51 },
                    { label: 'HISTORY', angle: 103 },
                    { label: 'PRICING', angle: 154 },
                    { label: 'BEHAVIOR', angle: 206 },
                    { label: 'CONTEXT', angle: 257 },
                    { label: 'TIMING', angle: 309 },
                  ].map(d => {
                    const rad = (d.angle * Math.PI) / 180;
                    const x = 50 + 46 * Math.cos(rad);
                    const y = 50 + 46 * Math.sin(rad);
                    return (
                      <span key={d.label} className="absolute text-[7px] font-mono text-purple-400/50 tracking-wider" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)' }}>
                        {d.label}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Arrow → */}
              <div className="hidden md:flex flex-col items-center justify-center h-full px-4 pt-16">
                <ArrowRight className="w-4 h-4 text-accent/40" />
                <span className="text-[9px] font-mono text-accent/50 my-1">teams</span>
                <div className="border-t-2 border-dashed border-accent/30 w-8" />
              </div>

              {/* Demand Column */}
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/15 mb-4">
                  <Target className="w-4 h-4 text-accent" />
                  <span className="text-xs font-bold text-accent tracking-wider uppercase">Demand Agent</span>
                </div>
                <div className="space-y-2">
                  {['Project Requirements', 'Role Specifications', 'Budget & Timeline', 'Industry Context', 'Team Preferences'].map(item => (
                    <div key={item} className="glass-panel rounded-lg px-3 py-2 text-xs text-muted-foreground">{item}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Feedback loop */}
            <div className="glass-panel rounded-xl p-5">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-bold text-foreground tracking-wide uppercase">Continuous Feedback Loop</span>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4">
                {[
                  { label: 'Project Delivered', color: 'bg-accent/10 text-accent' },
                  { label: 'Outcomes Captured', color: 'bg-purple-400/10 text-purple-400' },
                  { label: 'Models Updated', color: 'bg-purple-400/10 text-purple-400' },
                  { label: 'Profiles Enriched', color: 'bg-accent/10 text-accent' },
                  { label: 'Better Matches', color: 'bg-purple-400/10 text-purple-400' },
                ].map((step, i) => (
                  <div key={step.label} className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono font-semibold px-3 py-1.5 rounded-full ${step.color}`}>{step.label}</span>
                    {i < 4 && <ArrowRight className="w-3 h-3 text-muted-foreground/30 hidden md:block" />}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* End-to-end data flow */}
          <motion.div variants={fadeUp} className="glass-panel rounded-2xl p-6">
            <h3 className="font-bold text-foreground mb-5 text-center">End-to-End Data Flow</h3>
            <div className="flex items-start justify-between gap-2 overflow-x-auto pb-2">
              {[
                { num: '01', title: 'INGEST', desc: 'Onboarding, chat, history', color: 'text-accent border-accent' },
                { num: '02', title: 'EXTRACT', desc: 'Skills, traits, signals', color: 'text-accent border-accent' },
                { num: '03', title: 'ANALYZE', desc: 'AI scoring & mapping', color: 'text-purple-400 border-purple-400' },
                { num: '04', title: 'MATCH', desc: 'Team optimization', color: 'text-purple-400 border-purple-400' },
                { num: '05', title: 'ASSEMBLE', desc: 'Deploy & kickoff', color: 'text-accent border-accent' },
                { num: '06', title: 'LEARN', desc: 'Outcome refinement', color: 'text-purple-400 border-purple-400' },
              ].map((step, i) => (
                <div key={step.num} className="flex items-start gap-2">
                  <div className="flex flex-col items-center text-center min-w-[90px]">
                    <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center text-xs font-bold mb-2 ${step.color}`}>
                      {step.num}
                    </div>
                    <span className={`font-mono text-[10px] font-bold tracking-wider mb-0.5 ${step.color.split(' ')[0]}`}>{step.title}</span>
                    <span className="text-[10px] text-muted-foreground/60 leading-tight">{step.desc}</span>
                  </div>
                  {i < 5 && <div className="border-t border-dashed border-muted-foreground/15 flex-1 mt-4 min-w-[16px]" />}
                </div>
              ))}
            </div>
          </motion.div>
        </motion.section>

        {/* ═══════════ CLOSING CTA ═══════════ */}
        <motion.section
          className="py-20 border-t border-border mb-12"
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={stagger}
        >
          <motion.div variants={fadeUp} className="rounded-3xl p-12 md:p-16 text-center relative overflow-hidden" style={{ background: 'hsl(25, 30%, 25%)' }}>
            <h2 className="text-3xl md:text-5xl font-bold mb-3 text-white">
              Services don't scale.
            </h2>
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white/60">
              Systems do.
            </h2>
            <p className="text-white/70 mb-10 max-w-lg mx-auto text-lg">
              We're raising to build the infrastructure for the project economy — across Europe's local hubs and collectives.
            </p>
            <a
              href="mailto:hello@checkgrow.com"
              className="px-10 py-4 bg-white text-foreground rounded-full font-semibold text-base inline-flex items-center gap-2 shadow-lg hover:shadow-xl transition-shadow"
            >
              Get in Touch
              <ArrowRight className="w-5 h-5" />
            </a>
          </motion.div>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-border">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <p className="text-xs text-muted-foreground">
            Confidential · For investor use only · © 2025 CheckGrow
          </p>
        </div>
      </footer>
    </div>
  );
}
