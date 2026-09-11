import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { ArrowRight, Users, Cpu, Sparkles, Zap, Globe, Rocket, Brain, Target, CheckCircle2, Play } from 'lucide-react';
import { Link } from 'react-router-dom';
import { GlassButton } from '@/components/GlassCard';
import { useState, useEffect } from 'react';

const heroStats = [
  { value: 5000, label: 'Professionals', suffix: '+' },
  { value: 98, label: 'Match Rate', suffix: '%' },
  { value: 24, label: 'Hour Formation', suffix: 'h' },
];

function AnimatedCounter({ value, suffix }: { value: number; suffix: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, latest => Math.round(latest));
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const controls = animate(count, value, { duration: 2, ease: "easeOut" });
    const unsubscribe = rounded.on("change", v => setDisplayValue(v));
    return () => {
      controls.stop();
      unsubscribe();
    };
  }, [value]);

  return <span>{displayValue}{suffix}</span>;
}

export function AnimatedHero() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <section className="relative z-10 flex items-center justify-center px-6 py-16 md:py-24 min-h-[90vh] overflow-hidden">
      {/* Dynamic Gradient Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Main gradient orb */}
        <motion.div
          className="absolute w-[600px] h-[600px] rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, hsl(var(--accent) / 0.2) 40%, transparent 70%)',
            filter: 'blur(80px)',
            top: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
          }}
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.6, 0.8, 0.6],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Secondary orbs */}
        <motion.div
          className="absolute w-72 h-72 rounded-full bg-gradient-to-br from-accent/20 to-transparent blur-3xl"
          animate={{
            x: [0, 80, 0],
            y: [0, -40, 0],
            scale: [1, 1.3, 1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          style={{ top: '60%', left: '10%' }}
        />
        <motion.div
          className="absolute w-64 h-64 rounded-full bg-gradient-to-br from-primary/20 to-transparent blur-3xl"
          animate={{
            x: [0, -60, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          style={{ top: '20%', right: '10%' }}
        />
        
        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full bg-primary/40"
            style={{
              top: `${20 + Math.random() * 60}%`,
              left: `${10 + Math.random() * 80}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.3, 0.8, 0.3],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 4 + Math.random() * 3,
              repeat: Infinity,
              delay: Math.random() * 2,
            }}
          />
        ))}
      </div>

      <div className="text-center max-w-5xl mx-auto relative">
        {/* Animated Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 100, damping: 20 }}
        >
          <motion.span 
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-panel text-xs font-semibold mb-8 border border-primary/40 shadow-lg shadow-primary/10"
            whileHover={{ scale: 1.05 }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-4 h-4 text-primary" />
            </motion.div>
            <span className="gradient-text">AI-Powered Team Formation</span>
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          </motion.span>
        </motion.div>

        {/* Main Heading - More Impactful */}
        <motion.h1
          className="text-5xl md:text-7xl lg:text-8xl font-display font-bold leading-[0.9] mb-8"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.1 }}
        >
          <motion.span 
            className="block"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <span className="gradient-text">Your Vision.</span>
          </motion.span>
          <motion.span 
            className="block text-foreground mt-2"
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.35 }}
          >
            Our Perfect Team.
          </motion.span>
        </motion.h1>

        {/* Subtitle - More Compelling */}
        <motion.p
          className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          Describe your project in plain language.
          <br className="hidden md:block" />
          <span className="text-foreground font-medium">Our AI matches you with elite talent in seconds.</span>
        </motion.p>

        {/* Stats Row */}
        <motion.div
          className="flex flex-wrap justify-center gap-8 md:gap-16 mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          {heroStats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl md:text-4xl font-bold gradient-text">
                <AnimatedCounter value={stat.value} suffix={stat.suffix} />
              </div>
              <div className="text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>

        {/* CTA Buttons - Enhanced */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
        >
          <Link to="/auth?mode=signup&type=supply">
            <motion.div
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.98 }}
              onHoverStart={() => setIsHovered(true)}
              onHoverEnd={() => setIsHovered(false)}
            >
              <GlassButton variant="primary" className="min-w-[220px] py-5 text-base font-semibold shadow-xl shadow-primary/20">
                <motion.div
                  animate={isHovered ? { rotate: [0, -10, 10, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <Users className="w-5 h-5 mr-2 inline" />
                </motion.div>
                Join as Talent
                <ArrowRight className="w-4 h-4 ml-2 inline" />
              </GlassButton>
            </motion.div>
          </Link>
          <Link to="/auth?mode=signup&type=demand">
            <motion.div
              whileHover={{ scale: 1.05, y: -3 }}
              whileTap={{ scale: 0.98 }}
            >
              <GlassButton className="min-w-[220px] py-5 text-base font-semibold border-2 border-primary/30 hover:border-primary/60">
                <Rocket className="w-5 h-5 mr-2 inline" />
                Build Your Team
              </GlassButton>
            </motion.div>
          </Link>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          className="mt-16 flex flex-wrap justify-center gap-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
        >
          {[
            { icon: Brain, text: "AI-Powered Matching" },
            { icon: Target, text: "Precision Teams" },
            { icon: Zap, text: "Instant Formation" },
            { icon: Globe, text: "Global Talent" },
          ].map((feature, index) => (
            <motion.div
              key={feature.text}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 + index * 0.1 }}
              whileHover={{ y: -4, scale: 1.02 }}
              className="flex items-center gap-2 px-5 py-3 glass-panel text-sm backdrop-blur-xl border border-border/50"
            >
              <feature.icon className="w-4 h-4 text-primary" />
              <span className="text-muted-foreground">{feature.text}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
