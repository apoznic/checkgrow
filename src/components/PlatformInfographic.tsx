import { motion } from 'framer-motion';
import { Users, Cpu, ArrowRight, Sparkles, Target, CheckCircle } from 'lucide-react';

export function PlatformInfographic() {
  return (
    <div className="w-full max-w-5xl mx-auto">
      <motion.div
        className="relative"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 100, damping: 20 }}
      >
        {/* Flow Container */}
        <div className="glass-panel rounded-3xl p-8 md:p-12">
          <div className="grid md:grid-cols-5 gap-6 items-center">
            {/* Step 1: Talent Pool */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 100 }}
            >
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center mb-4">
                <Users className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Talent Pool</h3>
              <p className="text-sm text-muted-foreground">Skills & availability tracked by AI</p>
            </motion.div>

            {/* Arrow 1 */}
            <motion.div
              className="hidden md:flex items-center justify-center"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="w-full h-0.5 bg-gradient-to-r from-primary/50 to-accent/50 relative">
                <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 text-accent" />
              </div>
            </motion.div>

            {/* Step 2: AI Matching */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 100 }}
            >
              <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-accent to-copper-500 flex items-center justify-center mb-4 shadow-lg shadow-accent/20">
                <Sparkles className="w-10 h-10 text-primary-foreground" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">AI Agent</h3>
              <p className="text-sm text-muted-foreground">Intelligent team formation</p>
            </motion.div>

            {/* Arrow 2 */}
            <motion.div
              className="hidden md:flex items-center justify-center"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="w-full h-0.5 bg-gradient-to-r from-accent/50 to-copper-500/50 relative">
                <ArrowRight className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 text-copper-500" />
              </div>
            </motion.div>

            {/* Step 3: Project Team */}
            <motion.div
              className="text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: "spring", stiffness: 100 }}
            >
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-copper-500/20 to-copper-500/5 border border-copper-500/20 flex items-center justify-center mb-4">
                <Target className="w-8 h-8 text-copper-500" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">Dream Team</h3>
              <p className="text-sm text-muted-foreground">Ready to deliver results</p>
            </motion.div>
          </div>

          {/* Mobile flow arrows */}
          <div className="flex md:hidden flex-col items-center gap-2 my-4">
            <div className="w-0.5 h-8 bg-gradient-to-b from-primary/50 to-accent/50" />
          </div>

          {/* Bottom Stats */}
          <motion.div
            className="mt-10 pt-8 border-t border-border/50 grid grid-cols-3 gap-4"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-primary mb-1">
                <CheckCircle className="w-4 h-4" />
                <span className="text-2xl font-bold">100%</span>
              </div>
              <p className="text-xs text-muted-foreground">AI-Powered</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-accent mb-1">
                <Cpu className="w-4 h-4" />
                <span className="text-2xl font-bold">&lt;60s</span>
              </div>
              <p className="text-xs text-muted-foreground">Team Formation</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-copper-500 mb-1">
                <Users className="w-4 h-4" />
                <span className="text-2xl font-bold">∞</span>
              </div>
              <p className="text-xs text-muted-foreground">Scalable Teams</p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
