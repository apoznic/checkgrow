import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, CheckCircle2 } from 'lucide-react';

interface DemoMember {
  name: string;
  role: string;
  skills: string[];
  avatar: string;
  matchScore: number;
}

const demoPrompts = [
  "I need a mobile app for food delivery with payment integration",
  "Build a SaaS dashboard with analytics and user management",
  "Create an AI-powered content generation platform",
];

const demoTeams: Record<string, DemoMember[]> = {
  "mobile": [
    { name: "Alex Chen", role: "React Native Developer", skills: ["React Native", "TypeScript"], avatar: "AC", matchScore: 98 },
    { name: "Maya Patel", role: "Backend Engineer", skills: ["Node.js", "PostgreSQL"], avatar: "MP", matchScore: 95 },
    { name: "Jordan Lee", role: "UI/UX Designer", skills: ["Figma", "Mobile Design"], avatar: "JL", matchScore: 92 },
  ],
  "dashboard": [
    { name: "Sam Wilson", role: "Full-Stack Developer", skills: ["React", "Next.js", "Prisma"], avatar: "SW", matchScore: 97 },
    { name: "Emily Davis", role: "Data Analyst", skills: ["Python", "SQL", "Visualization"], avatar: "ED", matchScore: 94 },
    { name: "Chris Brown", role: "DevOps Engineer", skills: ["AWS", "Docker", "CI/CD"], avatar: "CB", matchScore: 91 },
  ],
  "ai": [
    { name: "Dr. Sarah Kim", role: "ML Engineer", skills: ["Python", "TensorFlow", "LLMs"], avatar: "SK", matchScore: 99 },
    { name: "Mike Johnson", role: "Backend Architect", skills: ["FastAPI", "Redis", "Vector DB"], avatar: "MJ", matchScore: 96 },
    { name: "Lisa Wang", role: "Frontend Developer", skills: ["React", "TypeScript", "AI UX"], avatar: "LW", matchScore: 93 },
  ],
};

export function InteractiveDemo() {
  const [currentPromptIndex, setCurrentPromptIndex] = useState(0);
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(true);
  const [showTeam, setShowTeam] = useState(false);
  const [currentTeam, setCurrentTeam] = useState<DemoMember[]>([]);

  useEffect(() => {
    const prompt = demoPrompts[currentPromptIndex];
    let charIndex = 0;
    setIsTyping(true);
    setShowTeam(false);
    setDisplayedText('');

    const typingInterval = setInterval(() => {
      if (charIndex <= prompt.length) {
        setDisplayedText(prompt.slice(0, charIndex));
        charIndex++;
      } else {
        clearInterval(typingInterval);
        setIsTyping(false);

        const teamKey = prompt.includes('mobile') ? 'mobile' :
                       prompt.includes('dashboard') ? 'dashboard' : 'ai';
        setCurrentTeam(demoTeams[teamKey]);

        setTimeout(() => setShowTeam(true), 500);
        setTimeout(() => {
          setCurrentPromptIndex((prev) => (prev + 1) % demoPrompts.length);
        }, 6000);
      }
    }, 40);

    return () => clearInterval(typingInterval);
  }, [currentPromptIndex]);

  return (
    <section className="relative px-6 py-20">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-5xl font-bold mb-4 text-foreground">
            See it in action
          </h2>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            Watch how our AI instantly matches your project with the perfect team
          </p>
        </motion.div>

        {/* Demo Container - warm card style */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="rounded-3xl p-8 md:p-10 relative overflow-hidden"
          style={{ background: 'hsl(35, 25%, 90%)' }}
        >
          <div className="relative z-10">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-2xl bg-foreground flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-background" />
              </div>
              <div>
                <span className="font-semibold text-foreground">AI Team Generator</span>
                <span className="text-xs text-foreground/40 ml-2">Live demo</span>
              </div>
            </div>

            {/* Typing Animation */}
            <div className="bg-card rounded-2xl p-5 mb-6 min-h-[70px] border border-border shadow-sm">
              <p className="text-base md:text-lg text-foreground">
                {displayedText}
                {isTyping && (
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.8, repeat: Infinity }}
                    className="inline-block w-0.5 h-5 bg-foreground ml-1"
                  />
                )}
              </p>
            </div>

            {/* Team Results */}
            <AnimatePresence mode="wait">
              {showTeam && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2 text-sm text-foreground/60 mb-4">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="font-medium">Found {currentTeam.length} perfect matches</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {currentTeam.map((member, index) => (
                      <motion.div
                        key={member.name}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.12 }}
                        className="bg-card rounded-2xl p-5 border border-border shadow-sm"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-11 h-11 rounded-full bg-foreground flex items-center justify-center text-sm font-bold text-background">
                            {member.avatar}
                          </div>
                          <div>
                            <p className="font-semibold text-sm text-foreground">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.role}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-1.5 mb-4">
                          {member.skills.map((skill) => (
                            <span key={skill} className="text-xs px-2.5 py-1 rounded-full bg-secondary text-foreground/70 font-medium">
                              {skill}
                            </span>
                          ))}
                        </div>

                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Match</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 rounded-full bg-secondary overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${member.matchScore}%` }}
                                transition={{ delay: index * 0.12 + 0.3, duration: 0.6 }}
                                className="h-full rounded-full bg-foreground"
                              />
                            </div>
                            <span className="text-xs font-bold text-foreground">{member.matchScore}%</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
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
