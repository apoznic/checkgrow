import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Check, Calendar, Clock, Briefcase } from 'lucide-react';
import { GlassButton } from '@/components/GlassCard';

interface ProjectType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const projectTypes: ProjectType[] = [
  {
    id: 'short-term',
    name: 'Short-term gigs',
    description: 'Quick projects, 1-4 weeks',
    icon: <Clock className="w-5 h-5" />,
  },
  {
    id: 'long-term',
    name: 'Long-term contracts',
    description: 'Extended engagements, 1-6 months',
    icon: <Calendar className="w-5 h-5" />,
  },
  {
    id: 'full-time',
    name: 'Full-time roles',
    description: 'Permanent positions',
    icon: <Briefcase className="w-5 h-5" />,
  },
];

interface ProjectTypesStepProps {
  onBack: () => void;
  onContinue: (types: string[]) => void;
}

export function ProjectTypesStep({ onBack, onContinue }: ProjectTypesStepProps) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const toggleType = (typeId: string) => {
    setSelectedTypes(prev =>
      prev.includes(typeId)
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId]
    );
  };

  const handleContinue = () => {
    onContinue(selectedTypes.length > 0 ? selectedTypes : ['short-term', 'long-term', 'full-time']);
  };

  return (
    <motion.div
      key="project-types"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center w-full max-w-lg"
    >
      <motion.button
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        ← Back to experience
      </motion.button>

      <div className="text-5xl mb-4">🎯</div>
      <h2 className="text-2xl md:text-3xl font-bold mb-3">
        What kind of <span className="gradient-text">projects</span>?
      </h2>
      <p className="text-muted-foreground mb-8">
        Select the types of work you're interested in
      </p>

      <div className="space-y-3 mb-8">
        {projectTypes.map((type, index) => (
          <motion.button
            key={type.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => toggleType(type.id)}
            className={`w-full p-4 rounded-xl border transition-all flex items-center gap-4 ${
              selectedTypes.includes(type.id)
                ? 'border-primary bg-primary/10'
                : 'border-border/50 hover:border-primary/50 bg-card/50'
            }`}
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              selectedTypes.includes(type.id)
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground'
            }`}>
              {type.icon}
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-semibold">{type.name}</h3>
              <p className="text-sm text-muted-foreground">{type.description}</p>
            </div>
            {selectedTypes.includes(type.id) && (
              <Check className="w-5 h-5 text-primary" />
            )}
          </motion.button>
        ))}
      </div>

      <p className="text-sm text-muted-foreground mb-6">
        {selectedTypes.length === 0 
          ? "Skip to be open to all project types"
          : `Selected: ${selectedTypes.length} type${selectedTypes.length > 1 ? 's' : ''}`
        }
      </p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <GlassButton variant="primary" onClick={handleContinue}>
          Continue
          <ArrowRight className="w-4 h-4 ml-2 inline" />
        </GlassButton>
      </motion.div>
    </motion.div>
  );
}
