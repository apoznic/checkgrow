import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, Building2, MapPin, Check, Shuffle, Loader2, 
  RefreshCcw, Users, ArrowRight, User, Briefcase, Linkedin,
  Shield, Code, Palette, Database, Brain,
  ShoppingCart, Globe, FileText, Bot, Zap, Smartphone
} from 'lucide-react';
import { Link } from 'react-router-dom';

// ── Mock Data ──────────────────────────────────────────────

interface MockOrg {
  id: string;
  name: string;
  city: string;
  country: string;
  logo_url?: string;
}

interface MockMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  skills: string[];
  match_confidence: 'high' | 'medium' | 'low';
  years_experience: number;
  has_linkedin: boolean;
  reason: string;
}

const mockOrgs: MockOrg[] = [
  { id: '1', name: 'TechBridge', city: 'Amsterdam', country: 'Netherlands' },
  { id: '2', name: 'PixelCraft', city: 'Berlin', country: 'Germany' },
  { id: '3', name: 'DataNova', city: 'London', country: 'United Kingdom' },
  { id: '4', name: 'CloudBase', city: 'Paris', country: 'France' },
  { id: '5', name: 'NeuralWorks', city: 'Barcelona', country: 'Spain' },
  { id: '6', name: 'DevHouse', city: 'Zagreb', country: 'Croatia' },
  { id: '7', name: 'Appcraft', city: 'Munich', country: 'Germany' },
  { id: '8', name: 'FlowStudio', city: 'Stockholm', country: 'Sweden' },
  { id: '9', name: 'BitForge', city: 'Lisbon', country: 'Portugal' },
];

const mockTeams: Record<string, MockMember[]> = {
  default: [
    { id: 'm1', full_name: 'Ana Kovačević', avatar_url: null, role: 'Full-Stack Developer', skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL'], match_confidence: 'high', years_experience: 7, has_linkedin: true, reason: 'Expert in React with 7 years of full-stack experience, previously built 3 SaaS platforms.' },
    { id: 'm2', full_name: 'Max Weber', avatar_url: null, role: 'UI/UX Designer', skills: ['Figma', 'Design Systems', 'Prototyping', 'User Research'], match_confidence: 'high', years_experience: 5, has_linkedin: true, reason: 'Award-winning designer with strong portfolio in SaaS and B2B products.' },
    { id: 'm3', full_name: 'Sophie Martin', avatar_url: null, role: 'Backend Engineer', skills: ['Python', 'FastAPI', 'AWS', 'Docker'], match_confidence: 'medium', years_experience: 4, has_linkedin: false, reason: 'Solid backend engineer with cloud infrastructure expertise.' },
    { id: 'm4', full_name: 'Luca Rossi', avatar_url: null, role: 'DevOps Engineer', skills: ['Kubernetes', 'CI/CD', 'Terraform', 'Monitoring'], match_confidence: 'high', years_experience: 6, has_linkedin: true, reason: 'Infrastructure specialist who has scaled systems to 100K+ users.' },
  ],
  mobile: [
    { id: 'm5', full_name: 'Elena Petrova', avatar_url: null, role: 'React Native Developer', skills: ['React Native', 'TypeScript', 'iOS', 'Android'], match_confidence: 'high', years_experience: 5, has_linkedin: true, reason: 'Built 12 mobile apps with over 1M combined downloads.' },
    { id: 'm6', full_name: 'James O\'Brien', avatar_url: null, role: 'Mobile Designer', skills: ['Figma', 'Mobile UX', 'Animation', 'iOS HIG'], match_confidence: 'high', years_experience: 4, has_linkedin: true, reason: 'Specializes in native mobile design patterns and micro-interactions.' },
    { id: 'm7', full_name: 'Maria Santos', avatar_url: null, role: 'Backend Engineer', skills: ['Node.js', 'GraphQL', 'MongoDB', 'Redis'], match_confidence: 'medium', years_experience: 6, has_linkedin: false, reason: 'Backend specialist experienced with real-time mobile APIs.' },
  ],
  ai: [
    { id: 'm8', full_name: 'Dr. Yuki Tanaka', avatar_url: null, role: 'ML Engineer', skills: ['Python', 'TensorFlow', 'LLMs', 'NLP'], match_confidence: 'high', years_experience: 8, has_linkedin: true, reason: 'PhD in NLP with published research in transformer architectures.' },
    { id: 'm9', full_name: 'Omar Hassan', avatar_url: null, role: 'AI Backend Developer', skills: ['FastAPI', 'Vector DB', 'LangChain', 'AWS'], match_confidence: 'high', years_experience: 5, has_linkedin: true, reason: 'Built production RAG systems serving 50K+ daily queries.' },
    { id: 'm10', full_name: 'Clara Schmidt', avatar_url: null, role: 'Frontend Developer', skills: ['React', 'TypeScript', 'AI UX', 'Streaming UI'], match_confidence: 'medium', years_experience: 4, has_linkedin: false, reason: 'Frontend expert with experience building AI chat interfaces.' },
  ],
};

const serviceTypes = [
  { id: 'webshop', name: 'E-commerce', icon: ShoppingCart },
  { id: 'website', name: 'Website', icon: Globe },
  { id: 'landing_page', name: 'Landing Page', icon: FileText },
  { id: 'ai_agent', name: 'AI Agent', icon: Bot },
  { id: 'automation', name: 'Automation', icon: Zap },
  { id: 'mobile_app', name: 'Mobile App', icon: Smartphone },
];

const skillDomains = [
  { key: 'frontend', label: 'Frontend', icon: Palette },
  { key: 'backend', label: 'Backend', icon: Code },
  { key: 'data', label: 'Data', icon: Database },
  { key: 'devops', label: 'DevOps', icon: Shield },
  { key: 'ai', label: 'AI/ML', icon: Brain },
];

// ── Helper ─────────────────────────────────────────────────

function getTeamKey(description: string): string {
  const lower = description.toLowerCase();
  if (lower.includes('mobile') || lower.includes('app') || lower.includes('ios') || lower.includes('android')) return 'mobile';
  if (lower.includes('ai') || lower.includes('machine learning') || lower.includes('chatbot') || lower.includes('llm')) return 'ai';
  return 'default';
}

function getCoverageForTeam(team: MockMember[]) {
  const domainKeywords: Record<string, string[]> = {
    frontend: ['react', 'vue', 'angular', 'css', 'figma', 'ui', 'ux', 'design', 'frontend', 'prototyping'],
    backend: ['node', 'python', 'fastapi', 'graphql', 'backend', 'api', 'express'],
    data: ['sql', 'postgres', 'mongodb', 'redis', 'database', 'data'],
    devops: ['aws', 'docker', 'kubernetes', 'ci/cd', 'terraform', 'monitoring', 'cloud'],
    ai: ['tensorflow', 'llm', 'nlp', 'langchain', 'vector', 'ml', 'ai'],
  };
  const allSkills = team.flatMap(m => m.skills.map(s => s.toLowerCase()));
  return skillDomains.map(d => {
    const kws = domainKeywords[d.key] || [];
    const matched = kws.filter(kw => allSkills.some(s => s.includes(kw)));
    const coverage = Math.min(100, (matched.length / Math.max(2, kws.length * 0.3)) * 100);
    return { ...d, coverage: Math.round(coverage) };
  });
}

// ── Component ──────────────────────────────────────────────

export function DemoDemandAgent() {
  const [selectedOrgIds, setSelectedOrgIds] = useState<string[]>(['1', '2', '3']);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTeam, setGeneratedTeam] = useState<MockMember[]>([]);
  const [orgSearch, setOrgSearch] = useState('');
  const [activeCountry, setActiveCountry] = useState<string | null>(null);

  const countries = [...new Set(mockOrgs.map(o => o.country))].sort();

  const filteredOrgs = activeCountry
    ? mockOrgs.filter(o => o.country === activeCountry)
    : orgSearch
      ? mockOrgs.filter(o =>
          o.name.toLowerCase().includes(orgSearch.toLowerCase()) ||
          o.country.toLowerCase().includes(orgSearch.toLowerCase()) ||
          o.city.toLowerCase().includes(orgSearch.toLowerCase())
        )
      : mockOrgs;

  const handleGenerate = () => {
    if (!description.trim()) return;
    setIsGenerating(true);
    setGeneratedTeam([]);
    // Fake delay
    setTimeout(() => {
      const key = getTeamKey(description);
      setGeneratedTeam(mockTeams[key]);
      setIsGenerating(false);
    }, 2200);
  };

  const coverage = generatedTeam.length > 0 ? getCoverageForTeam(generatedTeam) : [];
  const highConfidence = generatedTeam.filter(m => m.match_confidence === 'high').length;
  const totalYears = generatedTeam.reduce((sum, m) => sum + m.years_experience, 0);

  const confidenceConfig = {
    high: { color: 'bg-emerald-500', label: 'Strong Match', pct: 90 },
    medium: { color: 'bg-amber-500', label: 'Good Match', pct: 70 },
    low: { color: 'bg-orange-500', label: 'Partial Match', pct: 45 },
  };

  return (
    <section className="relative px-6 pt-12 pb-20 md:pt-16">
      <div className="max-w-3xl mx-auto">
        {/* Hero Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05] mb-4">
            Build your dream team
            <span className="block" style={{ color: 'hsl(25, 50%, 45%)' }}>in seconds.</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            Select organizations, describe your project, and let AI assemble your perfect team.
          </p>
        </motion.div>

        {/* Demo Container */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-3xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden"
        >
          <div className="p-6 md:p-8">
            {/* ── Talent Pool ── */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Talent Pool
                </label>
                <div className="flex items-center gap-3">
                  {selectedOrgIds.length > 0 && (
                    <span className="text-xs text-muted-foreground">{selectedOrgIds.length} selected</span>
                  )}
                  <button
                    onClick={() => setSelectedOrgIds(
                      selectedOrgIds.length === mockOrgs.length ? [] : mockOrgs.map(o => o.id)
                    )}
                    className="text-xs text-primary font-medium hover:underline"
                  >
                    {selectedOrgIds.length === mockOrgs.length ? 'Deselect all' : 'Select all'}
                  </button>
                </div>
              </div>

              {/* Country tabs + search */}
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <input
                  type="text"
                  value={orgSearch}
                  onChange={(e) => { setOrgSearch(e.target.value); setActiveCountry(null); }}
                  placeholder="Search..."
                  className="flex-1 max-w-[160px] pl-3 pr-3 py-1.5 rounded-full bg-background border border-border text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 transition-colors"
                />
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    onClick={() => { setActiveCountry(null); setOrgSearch(''); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      !activeCountry ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    All
                  </button>
                  {countries.map(c => (
                    <button
                      key={c}
                      onClick={() => { setActiveCountry(activeCountry === c ? null : c); setOrgSearch(''); }}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        activeCountry === c ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>

              {/* Org grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {filteredOrgs.map((org) => {
                  const isSelected = selectedOrgIds.includes(org.id);
                  return (
                    <motion.button
                      key={org.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      onClick={() => setSelectedOrgIds(prev =>
                        prev.includes(org.id) ? prev.filter(id => id !== org.id) : [...prev, org.id]
                      )}
                      className={`relative flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/8 shadow-sm'
                          : 'border-border bg-background hover:border-primary/30'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-primary-foreground" />
                        </div>
                      )}
                      <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{org.name}</p>
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          {org.city}, {org.country}
                        </p>
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {selectedOrgIds.length > 1 && (
                <div className="flex items-center gap-1.5 mt-3 text-xs text-muted-foreground">
                  <Shuffle className="w-3 h-3" />
                  <span>Cross-org mix — talent from {selectedOrgIds.length} pools</span>
                </div>
              )}
            </div>

            {/* ── Service Type ── */}
            <div className="mb-6">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
                Service type
              </label>
              <div className="flex gap-2 flex-wrap">
                {serviceTypes.map((s) => {
                  const Icon = s.icon;
                  const isSelected = selectedService === s.id;
                  return (
                    <button
                      key={s.id}
                      onClick={() => setSelectedService(isSelected ? null : s.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {s.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Project Brief ── */}
            <div className="mb-6">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 block">
                Project brief
              </label>
              <div className="rounded-2xl border border-border bg-background p-5 focus-within:border-primary/40 transition-colors">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. I need a team to build a mobile fitness app with AI coaching, payment integration, and social features..."
                  className="w-full h-20 bg-transparent border-none resize-none text-foreground placeholder:text-muted-foreground/60 focus:outline-none text-base leading-relaxed"
                />
                <div className="flex items-center justify-between pt-3 border-t border-border/30">
                  <p className="text-xs text-muted-foreground">
                    Demo mode — try it out with mock data
                  </p>
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating || !description.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-primary-foreground font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Finding...
                      </>
                    ) : generatedTeam.length > 0 ? (
                      <>
                        <RefreshCcw className="w-4 h-4" />
                        Regenerate
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        Generate Team
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* ── Loading ── */}
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-4 py-10 justify-center"
              >
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <div>
                  <p className="text-sm font-medium text-foreground">Assembling your team...</p>
                  <div className="flex gap-1 mt-1">
                    {['Scanning', 'Matching', 'Ranking'].map((step, i) => (
                      <motion.span
                        key={step}
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
                        className="text-xs text-muted-foreground"
                      >
                        {step}{i < 2 ? ' →' : ''}
                      </motion.span>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Team Results ── */}
            <AnimatePresence>
              {generatedTeam.length > 0 && !isGenerating && (
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 20 }}
                >
                  {/* Team Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                      <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Your Assembled Team</h3>
                      <p className="text-xs text-muted-foreground">
                        {generatedTeam.length} members • {highConfidence} strong matches • {totalYears}y combined exp
                      </p>
                    </div>
                  </div>

                  {/* Skill Coverage */}
                  <div className="mb-4 p-4 rounded-xl bg-card/40 border border-border/30">
                    <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wider">Skill Coverage</p>
                    <div className="grid grid-cols-5 gap-3">
                      {coverage.map((domain) => {
                        const Icon = domain.icon;
                        return (
                          <div key={domain.key} className="text-center">
                            <div className="relative w-12 h-12 mx-auto mb-1.5">
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

                  {/* Team Members */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {generatedTeam.map((member, index) => {
                      const conf = confidenceConfig[member.match_confidence];
                      return (
                        <motion.div
                          key={member.id}
                          initial={{ opacity: 0, y: 20, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ delay: index * 0.08 }}
                          className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm"
                        >
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
                              <div className="relative flex-shrink-0">
                                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center ring-2 ring-border/30">
                                  <User className="w-7 h-7 text-primary" />
                                </div>
                                <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
                                  <span className="text-[10px] font-bold text-white">{index + 1}</span>
                                </div>
                                {member.has_linkedin && (
                                  <div className="absolute -top-1 -left-1 w-5 h-5 rounded-full bg-[#0077b5] flex items-center justify-center shadow-sm">
                                    <Linkedin className="w-3 h-3 text-white" />
                                  </div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-foreground truncate">{member.full_name}</h4>
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
                                  <span className="text-xs opacity-70">• {member.years_experience}y exp</span>
                                </div>
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {member.skills.map((skill) => (
                                    <span
                                      key={skill}
                                      className="px-2 py-0.5 rounded-md text-xs font-medium bg-primary/8 text-primary border border-primary/10"
                                    >
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* CTA — "Try with real people" */}
                  <div className="flex gap-3 pt-4 border-t border-border/30">
                    <button
                      onClick={handleGenerate}
                      className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-border text-foreground font-medium text-sm hover:border-primary hover:text-primary transition-colors"
                    >
                      <RefreshCcw className="w-4 h-4" />
                      Regenerate
                    </button>
                    <Link to="/auth?mode=signup&type=demand" className="flex-1">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
                      >
                        Try with real people
                        <ArrowRight className="w-4 h-4" />
                      </motion.button>
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
