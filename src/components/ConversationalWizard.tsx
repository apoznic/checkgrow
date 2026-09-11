import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import {
  SkillCategory,
  SkillCategoryStep,
  SkillSelectionStep,
  WorkExperienceStep,
  ProjectTypesStep,
  AvailabilityStep,
  CategoryPickerModal,
  skillCategories,
} from '@/components/wizard';

type WizardStep = 'category' | 'skills' | 'experience' | 'project-types' | 'availability';

interface WizardData {
  skills: string[];
  workExperience: string;
  yearsExperience: number;
  projectTypes: string[];
  availability: number;
}

interface ConversationalWizardProps {
  onComplete: (data: WizardData) => void;
  minSkills?: number;
}

export function ConversationalWizard({ onComplete, minSkills = 10 }: ConversationalWizardProps) {
  const [step, setStep] = useState<WizardStep>('category');
  const [selectedCategory, setSelectedCategory] = useState<SkillCategory | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [workExperience, setWorkExperience] = useState('');
  const [yearsExperience, setYearsExperience] = useState(0);
  const [projectTypes, setProjectTypes] = useState<string[]>([]);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);

  const handleCategorySelect = (category: SkillCategory) => {
    setSelectedCategory(category);
    setStep('skills');
  };

  const toggleSkill = (skill: string) => {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill]
    );
  };

  const handleSkillsContinue = () => {
    if (selectedSkills.length >= minSkills) {
      setStep('experience');
    }
  };

  const handleExperienceContinue = (experience: string, years: number) => {
    setWorkExperience(experience);
    setYearsExperience(years);
    setStep('project-types');
  };

  const handleProjectTypesContinue = (types: string[]) => {
    setProjectTypes(types);
    setStep('availability');
  };

  const handleComplete = (availability: number) => {
    onComplete({
      skills: selectedSkills,
      workExperience,
      yearsExperience,
      projectTypes,
      availability,
    });
  };

  const handleAddCategory = () => {
    setShowCategoryPicker(true);
  };

  const handleCategoryFromPicker = (category: SkillCategory) => {
    // Add skills from the new category to the available pool
    // User stays on the same step but can now select from expanded skills
    setSelectedCategory(category);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[500px] p-8">
      <AnimatePresence mode="wait">
        {step === 'category' && (
          <SkillCategoryStep onSelect={handleCategorySelect} />
        )}

        {step === 'skills' && selectedCategory && (
          <SkillSelectionStep
            selectedCategory={selectedCategory}
            selectedSkills={selectedSkills}
            onBack={() => setStep('category')}
            onToggleSkill={toggleSkill}
            onContinue={handleSkillsContinue}
            onAddCategory={handleAddCategory}
            minSkills={minSkills}
          />
        )}

        {step === 'experience' && (
          <WorkExperienceStep
            onBack={() => setStep('skills')}
            onContinue={handleExperienceContinue}
          />
        )}

        {step === 'project-types' && (
          <ProjectTypesStep
            onBack={() => setStep('experience')}
            onContinue={handleProjectTypesContinue}
          />
        )}

        {step === 'availability' && (
          <AvailabilityStep
            onBack={() => setStep('project-types')}
            onComplete={handleComplete}
            skillCount={selectedSkills.length}
          />
        )}
      </AnimatePresence>

      {/* Category picker modal */}
      <CategoryPickerModal
        open={showCategoryPicker}
        onClose={() => setShowCategoryPicker(false)}
        onSelect={handleCategoryFromPicker}
        excludeCategoryId={selectedCategory?.id}
      />
    </div>
  );
}
