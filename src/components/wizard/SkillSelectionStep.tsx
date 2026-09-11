import { motion } from 'framer-motion';
import { Check, ArrowRight, AlertCircle } from 'lucide-react';
import { GlassButton } from '@/components/GlassCard';
import { Progress } from '@/components/ui/progress';
import { SkillCategory, skillCategories } from './SkillCategoryStep';

interface SkillSelectionStepProps {
  selectedCategory: SkillCategory;
  selectedSkills: string[];
  onBack: () => void;
  onToggleSkill: (skill: string) => void;
  onContinue: () => void;
  onAddCategory: () => void;
  minSkills?: number;
}

export function SkillSelectionStep({
  selectedCategory,
  selectedSkills,
  onBack,
  onToggleSkill,
  onContinue,
  onAddCategory,
  minSkills = 10,
}: SkillSelectionStepProps) {
  const progress = Math.min((selectedSkills.length / minSkills) * 100, 100);
  const canContinue = selectedSkills.length >= minSkills;
  const skillsNeeded = minSkills - selectedSkills.length;

  // Get all other categories user can add skills from
  const otherCategories = skillCategories.filter(c => c.id !== selectedCategory.id);
  const allAvailableSkills = [
    ...selectedCategory.skills,
    ...otherCategories.flatMap(c => c.skills),
  ];

  // Suggested skills based on current selection
  const getSuggestedSkills = () => {
    if (selectedSkills.length >= 3) {
      // Suggest complementary skills from other categories
      return otherCategories
        .flatMap(c => c.skills.slice(0, 2))
        .filter(s => !selectedSkills.includes(s))
        .slice(0, 6);
    }
    return [];
  };

  const suggestedSkills = getSuggestedSkills();

  return (
    <motion.div
      key="skills"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="text-center w-full max-w-3xl"
    >
      <motion.button
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        ← Back to categories
      </motion.button>

      {/* Progress indicator */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">Profile completeness</span>
          <span className={canContinue ? 'text-green-400' : 'text-primary'}>
            {selectedSkills.length} / {minSkills} skills
          </span>
        </div>
        <Progress value={progress} className="h-2" />
        {!canContinue && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Add {skillsNeeded} more skill{skillsNeeded > 1 ? 's' : ''} to be eligible for project matching
          </p>
        )}
      </div>

      <div className="text-5xl mb-4">{selectedCategory.icon}</div>
      <h2 className="text-2xl md:text-3xl font-bold mb-3">
        Pick your <span className="gradient-text">{selectedCategory.name}</span> skills
      </h2>
      <p className="text-muted-foreground mb-6">
        Select all that apply — the more you add, the better your matches
      </p>

      {/* Main category skills */}
      <div className="flex flex-wrap justify-center gap-3 mb-6">
        {selectedCategory.skills.map((skill, index) => (
          <motion.button
            key={skill}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => onToggleSkill(skill)}
            className={`skill-bubble ${selectedSkills.includes(skill) ? 'selected' : ''}`}
          >
            {selectedSkills.includes(skill) && (
              <Check className="w-4 h-4 mr-2" />
            )}
            {skill}
          </motion.button>
        ))}
      </div>

      {/* Suggested complementary skills */}
      {suggestedSkills.length > 0 && (
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-3">💡 Suggested complementary skills:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {suggestedSkills.map((skill) => (
              <motion.button
                key={skill}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => onToggleSkill(skill)}
                className={`skill-bubble text-sm ${selectedSkills.includes(skill) ? 'selected' : 'opacity-70 hover:opacity-100'}`}
              >
                {selectedSkills.includes(skill) && (
                  <Check className="w-3 h-3 mr-1" />
                )}
                {skill}
              </motion.button>
            ))}
          </div>
        </div>
      )}

      {/* Add more categories button */}
      <div className="mb-8">
        <button
          onClick={onAddCategory}
          className="text-sm text-primary hover:text-primary/80 transition-colors underline"
        >
          + Add skills from another category
        </button>
      </div>

      {/* Continue button */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <GlassButton 
          variant={canContinue ? 'primary' : 'default'} 
          onClick={onContinue}
          disabled={!canContinue}
        >
          {canContinue ? (
            <>
              Continue with {selectedSkills.length} skills
              <ArrowRight className="w-4 h-4 ml-2 inline" />
            </>
          ) : (
            <>
              Add {skillsNeeded} more skill{skillsNeeded > 1 ? 's' : ''} to continue
            </>
          )}
        </GlassButton>
      </motion.div>
    </motion.div>
  );
}
