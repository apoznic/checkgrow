import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export interface SkillCategory {
  id: string;
  name: string;
  icon: string;
  skills: string[];
}

export const skillCategories: SkillCategory[] = [
  {
    id: 'dev',
    name: 'Development',
    icon: '💻',
    skills: ['Frontend', 'Backend', 'Full Stack', 'Mobile', 'DevOps', 'AI/ML', 'React', 'Node.js', 'Python', 'TypeScript', 'AWS', 'Docker'],
  },
  {
    id: 'design',
    name: 'Design',
    icon: '🎨',
    skills: ['UI/UX', 'Graphic Design', 'Brand Design', 'Motion Design', '3D Design', 'Illustration', 'Figma', 'Adobe XD', 'Photoshop', 'After Effects'],
  },
  {
    id: 'marketing',
    name: 'Marketing',
    icon: '📈',
    skills: ['Growth', 'Content', 'SEO', 'Social Media', 'Paid Ads', 'Analytics', 'Email Marketing', 'Brand Strategy', 'Community', 'Influencer Marketing'],
  },
  {
    id: 'product',
    name: 'Product',
    icon: '🚀',
    skills: ['Product Management', 'Strategy', 'User Research', 'Data Analysis', 'Agile', 'Scrum', 'Roadmapping', 'A/B Testing', 'Metrics', 'Product Design'],
  },
  {
    id: 'writing',
    name: 'Writing',
    icon: '✍️',
    skills: ['Copywriting', 'Technical Writing', 'Content Strategy', 'Editing', 'Storytelling', 'Blog Writing', 'UX Writing', 'Journalism', 'Scriptwriting', 'Grant Writing'],
  },
  {
    id: 'business',
    name: 'Business',
    icon: '💼',
    skills: ['Sales', 'Operations', 'Finance', 'Legal', 'HR', 'Consulting', 'Project Management', 'Business Development', 'Accounting', 'Strategy'],
  },
];

interface SkillCategoryStepProps {
  onSelect: (category: SkillCategory) => void;
}

export function SkillCategoryStep({ onSelect }: SkillCategoryStepProps) {
  return (
    <motion.div
      key="category"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center w-full max-w-2xl"
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-primary to-accent flex items-center justify-center"
      >
        <Sparkles className="w-10 h-10 text-white" />
      </motion.div>
      <h2 className="text-2xl md:text-3xl font-bold mb-3">
        What's your <span className="gradient-text">superpower</span>?
      </h2>
      <p className="text-muted-foreground mb-8">
        Select the area where you shine the brightest — you can add more categories later
      </p>

      <div className="flex flex-wrap justify-center gap-4">
        {skillCategories.map((category, index) => (
          <motion.button
            key={category.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            onClick={() => onSelect(category)}
            className="skill-bubble text-lg animate-bubble-float"
            style={{ animationDelay: `${index * 0.5}s` }}
          >
            <span className="text-2xl mr-2">{category.icon}</span>
            {category.name}
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}
