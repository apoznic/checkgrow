import { motion } from 'framer-motion';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SkillCategory, skillCategories } from './SkillCategoryStep';

interface CategoryPickerModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (category: SkillCategory) => void;
  excludeCategoryId?: string;
}

export function CategoryPickerModal({ 
  open, 
  onClose, 
  onSelect,
  excludeCategoryId 
}: CategoryPickerModalProps) {
  const availableCategories = skillCategories.filter(c => c.id !== excludeCategoryId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add skills from another category</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-2 gap-3 py-4">
          {availableCategories.map((category, index) => (
            <motion.button
              key={category.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              onClick={() => {
                onSelect(category);
                onClose();
              }}
              className="p-4 rounded-xl border border-border/50 hover:border-primary/50 bg-card/50 transition-all text-center"
            >
              <span className="text-3xl block mb-2">{category.icon}</span>
              <span className="font-medium text-sm">{category.name}</span>
              <span className="block text-xs text-muted-foreground mt-1">
                {category.skills.length} skills
              </span>
            </motion.button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
