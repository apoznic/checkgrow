import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Briefcase } from 'lucide-react';
import { GlassButton } from '@/components/GlassCard';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface WorkExperienceStepProps {
  onBack: () => void;
  onContinue: (experience: string, years: number) => void;
}

export function WorkExperienceStep({ onBack, onContinue }: WorkExperienceStepProps) {
  const [experience, setExperience] = useState('');
  const [years, setYears] = useState(3);

  const handleContinue = () => {
    onContinue(experience, years);
  };

  const getYearsLabel = () => {
    if (years === 0) return "Just starting out";
    if (years === 1) return "1 year";
    if (years >= 15) return "15+ years";
    return `${years} years`;
  };

  return (
    <motion.div
      key="experience"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center w-full max-w-lg"
    >
      <motion.button
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        ← Back to skills
      </motion.button>

      <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
        <Briefcase className="w-8 h-8 text-white" />
      </div>

      <h2 className="text-2xl md:text-3xl font-bold mb-3">
        Tell us about your <span className="gradient-text">experience</span>
      </h2>
      <p className="text-muted-foreground mb-8">
        This helps us match you with the right projects
      </p>

      <div className="glass-panel p-6 text-left space-y-6">
        {/* Years of experience slider */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label htmlFor="years">Total years of experience</Label>
            <span className="text-primary font-semibold">{getYearsLabel()}</span>
          </div>
          <Slider
            id="years"
            min={0}
            max={15}
            step={1}
            value={[years]}
            onValueChange={(value) => setYears(value[0])}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Beginner</span>
            <span>Senior</span>
            <span>Expert</span>
          </div>
        </div>

        {/* Experience summary */}
        <div className="space-y-3">
          <Label htmlFor="experience">
            Work experience summary <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="experience"
            placeholder="E.g., I've worked at startups and agencies, building web apps with React. Previously led a team of 5 developers at a fintech company..."
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            rows={4}
            className="resize-none"
          />
          <p className="text-xs text-muted-foreground">
            Mention past roles, companies, or notable projects
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8"
      >
        <GlassButton variant="primary" onClick={handleContinue}>
          Continue
          <ArrowRight className="w-4 h-4 ml-2 inline" />
        </GlassButton>
      </motion.div>
    </motion.div>
  );
}
