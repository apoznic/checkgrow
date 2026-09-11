import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Sparkles, ArrowRight, Rocket, Palette, Target, Brain,
  Send, Building2, CheckCircle2, MapPin
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Simulated AI conversation flow
const demoConversation = [
  { role: 'assistant' as const, content: "Hey! 👋 I'm the CheckGrow AI. Tell me what you do and I'll map your skills, find your matches, and connect you with projects. What's your specialty?" },
];

const quickActions = [
  { icon: Rocket, label: 'Full-stack developer', prompt: "I'm a full-stack developer experienced with React, Node.js, and cloud platforms", color: 'from-blue-500/15 to-blue-600/5 border-blue-200/60' },
  { icon: Palette, label: 'Designer / Creative', prompt: "I work mainly with design, UX research, and creative tools like Figma", color: 'from-pink-500/15 to-pink-600/5 border-pink-200/60' },
  { icon: Target, label: 'Project Manager', prompt: "I'm a project manager experienced with Agile, Scrum, and product strategy", color: 'from-amber-500/15 to-amber-600/5 border-amber-200/60' },
  { icon: Brain, label: 'Data / AI specialist', prompt: "I specialize in data science, machine learning, and AI engineering", color: 'from-purple-500/15 to-purple-600/5 border-purple-200/60' },
];

const aiResponses: Record<string, { message: string; skills: string[] }> = {
  "I'm a full-stack developer experienced with React, Node.js, and cloud platforms": {
    message: "Great! I've mapped 12 skills from your profile. Here's what I found — you're a strong match for 3 active projects in your collective.",
    skills: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'AWS', 'Docker', 'GraphQL', 'Next.js', 'REST APIs', 'Git', 'CI/CD', 'Tailwind CSS'],
  },
  "I work mainly with design, UX research, and creative tools like Figma": {
    message: "Perfect! I've identified 10 design & creative skills. You'd be a great fit for 2 projects looking for design talent right now.",
    skills: ['Figma', 'UI Design', 'UX Research', 'Prototyping', 'Design Systems', 'Typography', 'Wireframing', 'Branding', 'User Testing', 'Adobe CC'],
  },
  "I'm a project manager experienced with Agile, Scrum, and product strategy": {
    message: "Excellent! I've mapped 9 leadership & management skills. There are 2 projects in your collective that need a PM lead.",
    skills: ['Agile', 'Scrum', 'Product Strategy', 'Stakeholder Management', 'Jira', 'Confluence', 'Risk Management', 'Team Leadership', 'Roadmapping'],
  },
  "I specialize in data science, machine learning, and AI engineering": {
    message: "Impressive! I've catalogued 11 AI/ML skills. You're a top match for a high-value AI Dashboard project.",
    skills: ['Python', 'TensorFlow', 'PyTorch', 'NLP', 'Computer Vision', 'Pandas', 'SQL', 'MLOps', 'LLMs', 'Data Viz', 'Scikit-learn'],
  },
};

const mockOrgs = [
  { name: 'TechBridge', city: 'Amsterdam' },
  { name: 'PixelCraft', city: 'Berlin' },
];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function DemoSupplyAgent() {
  const [messages, setMessages] = useState<Message[]>(demoConversation);
  const [mappedSkills, setMappedSkills] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [hasResponded, setHasResponded] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleQuickAction = (prompt: string) => {
    if (hasResponded) return;
    setMessages(prev => [...prev, { role: 'user', content: prompt }]);
    setIsTyping(true);

    setTimeout(() => {
      const response = aiResponses[prompt];
      if (response) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.message }]);
        setMappedSkills(response.skills);
      }
      setIsTyping(false);
      setHasResponded(true);
    }, 1500);
  };

  const handleReset = () => {
    setMessages(demoConversation);
    setMappedSkills([]);
    setIsTyping(false);
    setHasResponded(false);
  };

  return (
    <section id="supply-demo" className="relative px-6 py-20">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-foreground">
            Try the Supply Agent
          </h2>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            Our AI maps your skills through conversation — just like in the real product
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-3xl border border-border bg-card/50 backdrop-blur-sm overflow-hidden"
        >
          {/* Profile Strip */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <User className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-foreground">Demo User</p>
                <p className="text-xs text-muted-foreground">demo@checkgrow.com</p>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-xs text-muted-foreground">Available</span>
              </div>
              {mappedSkills.length > 0 && (
                <div className="text-right">
                  <motion.p
                    className="text-xl font-bold text-primary"
                    initial={{ scale: 1.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                  >
                    {mappedSkills.length}
                  </motion.p>
                  <p className="text-[10px] text-muted-foreground">skills</p>
                </div>
              )}
            </div>

            {/* Mapped Skills */}
            <AnimatePresence>
              {mappedSkills.length > 0 && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mt-3 pt-3 border-t border-border overflow-hidden"
                >
                  <div className="flex flex-wrap gap-1.5">
                    {mappedSkills.map((skill, i) => (
                      <motion.span
                        key={skill}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="px-2 py-0.5 rounded-md text-xs font-medium bg-primary/8 text-primary border border-primary/10"
                      >
                        {skill}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Organizations */}
          <div className="px-4 py-3 border-b border-border">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Organizations</p>
            <div className="flex gap-2">
              {mockOrgs.map((org) => (
                <div key={org.name} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-secondary/50">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs font-medium text-foreground">{org.name}</span>
                  <span className="text-[10px] text-muted-foreground">{org.city}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Chat Area */}
          <div className="p-4 md:p-6 max-h-[400px] overflow-y-auto">
            {/* Welcome */}
            {!hasResponded && messages.length <= 1 && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-4 mb-4"
              >
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-3xl bg-gradient-to-br from-primary/15 to-accent/15 mb-3">
                  <Sparkles className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-lg font-bold text-foreground">AI Skill Mapper</h3>
                <p className="text-sm text-muted-foreground">Tell me your expertise and I'll build your talent profile</p>
              </motion.div>
            )}

            {/* Messages */}
            <div className="space-y-3">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary/8 border border-primary/12 text-foreground'
                      : 'bg-card border border-border text-foreground'
                  }`}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex justify-start"
                >
                  <div className="px-4 py-2.5 rounded-2xl bg-card border border-border">
                    <div className="flex gap-1">
                      {[0, 1, 2].map(i => (
                        <motion.div
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-muted-foreground"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
            <div ref={chatEndRef} />

            {/* Quick Actions */}
            {!hasResponded && !isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="grid grid-cols-2 gap-2 mt-4"
              >
                {quickActions.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      onClick={() => handleQuickAction(action.prompt)}
                      className={`flex items-center gap-2.5 p-3 rounded-xl border bg-gradient-to-br ${action.color} hover:scale-[1.02] transition-all text-left`}
                    >
                      <Icon className="w-4 h-4 text-foreground/70 flex-shrink-0" />
                      <span className="text-xs font-medium text-foreground">{action.label}</span>
                    </button>
                  );
                })}
              </motion.div>
            )}
          </div>

          {/* Input bar */}
          <div className="px-4 py-3 border-t border-border">
            <div className="flex items-center gap-2">
              <div className="flex-1 px-4 py-2.5 rounded-xl bg-secondary/50 border border-border text-sm text-muted-foreground">
                {hasResponded ? 'Skills mapped! Sign up to continue...' : 'Describe your skills or pick a role above...'}
              </div>
              <button className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center opacity-50">
                <Send className="w-4 h-4 text-primary-foreground" />
              </button>
            </div>
          </div>

          {/* CTA */}
          <div className="px-4 pb-4">
            <div className="flex gap-3 pt-3 border-t border-border/30">
              {hasResponded && (
                <button
                  onClick={handleReset}
                  className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-full border border-border text-foreground font-medium text-sm hover:border-primary transition-colors"
                >
                  Try again
                </button>
              )}
              <Link to="/auth?mode=signup&type=supply" className="flex-1">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity"
                >
                  Join as talent
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
            </div>
            <p className="text-xs text-muted-foreground text-center mt-3">
              Demo mode — try it out with mock data
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
