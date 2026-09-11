import { useState, useRef, useEffect } from 'react';
import { X, Plus, Tag, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ContactType } from './types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

const contactTypes: { value: ContactType; label: string; color: string }[] = [
  { value: 'lead', label: 'Lead', color: 'bg-primary/20 text-primary border-primary/30' },
  { value: 'prospect', label: 'Prospect', color: 'bg-accent/20 text-accent border-accent/30' },
  { value: 'client', label: 'Client', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'partner', label: 'Partner', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { value: 'vendor', label: 'Vendor', color: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30' },
  { value: 'other', label: 'Other', color: 'bg-muted text-muted-foreground border-border' },
];

const leadStatuses = [
  { value: 'new', label: 'New', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'contacted', label: 'Contacted', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'qualified', label: 'Qualified', color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  { value: 'unqualified', label: 'Unqualified', color: 'bg-red-500/20 text-red-400 border-red-500/30' },
  { value: 'nurturing', label: 'Nurturing', color: 'bg-teal-500/20 text-teal-400 border-teal-500/30' },
  { value: 'converted', label: 'Converted', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
];

interface InlineTypeBadgeProps {
  contactId: string;
  currentType: ContactType;
  canManage: boolean;
  onUpdate: () => void;
}

export function InlineTypeBadge({ contactId, currentType, canManage, onUpdate }: InlineTypeBadgeProps) {
  const { toast } = useToast();
  const typeInfo = contactTypes.find(t => t.value === currentType);

  const handleChange = async (newType: ContactType) => {
    const { error } = await supabase
      .from('crm_contacts')
      .update({ contact_type: newType })
      .eq('id', contactId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      onUpdate();
    }
  };

  if (!canManage) {
    return <Badge className={`${typeInfo?.color} border`}>{typeInfo?.label}</Badge>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={e => e.stopPropagation()}
          className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border cursor-pointer hover:opacity-80 transition-opacity ${typeInfo?.color}`}
        >
          {typeInfo?.label}
          <ChevronDown className="w-3 h-3 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent onClick={e => e.stopPropagation()}>
        {contactTypes.map(t => (
          <DropdownMenuItem
            key={t.value}
            onClick={() => handleChange(t.value)}
            className={currentType === t.value ? 'bg-secondary' : ''}
          >
            <span className={`w-2 h-2 rounded-full mr-2 ${t.color.split(' ')[0]}`} />
            {t.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface InlineLeadStatusProps {
  contactId: string;
  currentStatus: string | null;
  canManage: boolean;
  onUpdate: () => void;
}

export function InlineLeadStatus({ contactId, currentStatus, canManage, onUpdate }: InlineLeadStatusProps) {
  const { toast } = useToast();
  const statusInfo = leadStatuses.find(s => s.value === currentStatus) || leadStatuses[0];

  const handleChange = async (newStatus: string) => {
    const { error } = await supabase
      .from('crm_contacts')
      .update({ lead_status: newStatus })
      .eq('id', contactId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      onUpdate();
    }
  };

  if (!canManage) {
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={e => e.stopPropagation()}
          className={`inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border cursor-pointer hover:opacity-80 transition-opacity ${statusInfo.color}`}
        >
          {statusInfo.label}
          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent onClick={e => e.stopPropagation()}>
        {leadStatuses.map(s => (
          <DropdownMenuItem
            key={s.value}
            onClick={() => handleChange(s.value)}
            className={currentStatus === s.value ? 'bg-secondary' : ''}
          >
            <span className={`w-2 h-2 rounded-full mr-2 ${s.color.split(' ')[0]}`} />
            {s.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface InlineTagsProps {
  contactId: string;
  tags: string[];
  canManage: boolean;
  onUpdate: () => void;
}

export function InlineTags({ contactId, tags, canManage, onUpdate }: InlineTagsProps) {
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [newTag, setNewTag] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isAdding]);

  const handleAddTag = async () => {
    const tagValue = newTag.trim();
    if (!tagValue || tags.includes(tagValue)) {
      setNewTag('');
      setIsAdding(false);
      return;
    }

    const newTags = [...tags, tagValue];
    const { error } = await supabase
      .from('crm_contacts')
      .update({ tags: newTags })
      .eq('id', contactId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      onUpdate();
    }
    setNewTag('');
    setIsAdding(false);
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const newTags = tags.filter(t => t !== tagToRemove);
    const { error } = await supabase
      .from('crm_contacts')
      .update({ tags: newTags })
      .eq('id', contactId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      onUpdate();
    }
  };

  return (
    <div className="flex items-center gap-1 flex-wrap" onClick={e => e.stopPropagation()}>
      {tags.map(tag => (
        <span
          key={tag}
          className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full bg-secondary/60 text-muted-foreground border border-border/30 group/tag"
        >
          <Tag className="w-2.5 h-2.5" />
          {tag}
          {canManage && (
            <button
              onClick={() => handleRemoveTag(tag)}
              className="opacity-0 group-hover/tag:opacity-100 hover:text-destructive transition-opacity ml-0.5"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          )}
        </span>
      ))}
      {canManage && (
        isAdding ? (
          <input
            ref={inputRef}
            type="text"
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAddTag();
              if (e.key === 'Escape') { setNewTag(''); setIsAdding(false); }
            }}
            onBlur={handleAddTag}
            placeholder="tag..."
            className="text-[10px] w-16 bg-transparent border-b border-primary/50 outline-none px-1 py-0.5"
          />
        ) : (
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full border border-dashed border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
          >
            <Plus className="w-2.5 h-2.5" />
          </button>
        )
      )}
    </div>
  );
}
