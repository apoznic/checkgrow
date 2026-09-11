import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Users, Briefcase, Zap, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

const roles = [
  "dream team",
  "dev squad",
  "design crew",
  "data team",
];

export function SimpleHero() {
  const [roleIndex, setRoleIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setRoleIndex((prev) => (prev + 1) % roles.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative px-6 pt-16 pb-20 md:pt-24 md:pb-28">
      <div className="max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05] mb-8">
              <span className="block text-foreground">Build your</span>
              <span className="block relative h-[1.15em] overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.span
                    key={roleIndex}
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -40, opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute left-0"
                    style={{ color: 'hsl(25, 50%, 45%)' }}
                  >
                    {roles[roleIndex]}
                  </motion.span>
                </AnimatePresence>
              </span>
              <span className="block text-foreground">in seconds.</span>
            </h1>

            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-lg leading-relaxed">
              Describe what you need. Our AI instantly matches you with vetted professionals. Start shipping faster.
            </p>

            {/* CTAs - Hims style: bold, rounded, high contrast */}
            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link to="/auth?mode=signup&type=demand">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full sm:w-auto px-8 py-4 bg-foreground text-background rounded-full font-semibold text-base flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-shadow"
                >
                  Find your team
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
              <Link to="/auth?mode=signup&type=supply">
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full sm:w-auto px-8 py-4 bg-card text-foreground rounded-full font-semibold text-base border-2 border-border hover:border-foreground/30 transition-colors"
                >
                  Join as talent
                </motion.button>
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-foreground/60" />
                <span>5,000+ professionals</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-foreground/60" />
                <span>30s average match</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-foreground/60" />
                <span>Free to start</span>
              </div>
            </div>
          </motion.div>

          {/* Right: Visual Card - Hims style warm card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="rounded-3xl p-8 md:p-10 relative overflow-hidden" style={{ background: 'hsl(35, 30%, 88%)' }}>
              {/* Content */}
              <div className="relative z-10">
                <p className="text-sm font-medium uppercase tracking-wider text-foreground/50 mb-6">How it works</p>
                
                <div className="space-y-6">
                  {[
                    { step: '01', icon: Briefcase, title: 'Describe your project', desc: 'Tell us what you\'re building and the skills you need.' },
                    { step: '02', icon: Zap, title: 'AI finds matches', desc: 'Our AI scans thousands of profiles in seconds.' },
                    { step: '03', icon: Users, title: 'Team assembled', desc: 'Review matched talent and start collaborating.' },
                  ].map((item, i) => (
                    <motion.div
                      key={item.step}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + i * 0.15 }}
                      className="flex gap-4 items-start"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-card flex items-center justify-center shrink-0 shadow-sm">
                        <item.icon className="w-5 h-5 text-foreground" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">{item.title}</h3>
                        <p className="text-sm text-foreground/60 leading-relaxed">{item.desc}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Bottom team preview */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                  className="mt-8 pt-6 border-t border-foreground/10"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex -space-x-3">
                      {['AC', 'MP', 'JL', 'SK'].map((initials, i) => (
                        <div
                          key={initials}
                          className="w-10 h-10 rounded-full bg-foreground flex items-center justify-center text-xs font-bold text-background border-2 border-card"
                        >
                          {initials}
                        </div>
                      ))}
                      <div className="w-10 h-10 rounded-full bg-card flex items-center justify-center text-xs text-foreground/50 border-2 border-card">
                        +12
                      </div>
                    </div>
                    <span className="text-sm text-foreground/50">Ready to match →</span>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
