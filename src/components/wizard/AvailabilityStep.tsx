import { useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { GlassButton } from '@/components/GlassCard';

interface AvailabilityStepProps {
  onBack: () => void;
  onComplete: (availability: number) => void;
  skillCount: number;
}

export function AvailabilityStep({ onBack, onComplete, skillCount }: AvailabilityStepProps) {
  const [availability, setAvailability] = useState(50);

  const getAvailabilityText = () => {
    if (availability < 30) return 'Taking it easy — selective projects only';
    if (availability < 70) return 'Open to opportunities — moderate availability';
    return 'Ready to work — bring on the projects!';
  };

  return (
    <motion.div
      key="availability"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center w-full max-w-md"
    >
      <motion.button
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        ← Back to project types
      </motion.button>

      <div className="text-5xl mb-4">⚡</div>
      <h2 className="text-2xl md:text-3xl font-bold mb-3">
        Set your <span className="gradient-text">vibe</span>
      </h2>
      <p className="text-muted-foreground mb-8">
        How available are you for new projects?
      </p>

      <div className="glass-panel p-8 mb-8">
        <div className="flex justify-between text-sm text-muted-foreground mb-4">
          <span>🌙 Chill</span>
          <span>🔥 On Fire</span>
        </div>
        
        <input
          type="range"
          min="0"
          max="100"
          value={availability}
          onChange={(e) => setAvailability(Number(e.target.value))}
          className="w-full h-3 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--accent)) ${availability}%, hsl(var(--muted)) ${availability}%)`,
          }}
        />
        
        <div className="text-4xl font-bold mt-6 gradient-text">
          {availability}%
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          {getAvailabilityText()}
        </p>
      </div>

      {/* Summary before completion */}
      <div className="glass-panel p-4 mb-8 text-left">
        <h3 className="font-semibold mb-2">🎉 Profile Summary</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>✅ {skillCount} skills added</li>
          <li>✅ Work experience captured</li>
          <li>✅ Project preferences set</li>
          <li>✅ Availability: {availability}%</li>
        </ul>
      </div>

      <GlassButton variant="primary" onClick={() => onComplete(availability)}>
        Complete Setup
        <Sparkles className="w-4 h-4 ml-2 inline" />
      </GlassButton>
    </motion.div>
  );
}
