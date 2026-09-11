import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

interface MentionInputProps {
  orgMembers: Profile[];
  onSubmit: (text: string, mentionedIds: string[]) => void;
  isSubmitting?: boolean;
  placeholder?: string;
}

export function MentionInput({ orgMembers, onSubmit, isSubmitting, placeholder = 'Comment... use @ to mention' }: MentionInputProps) {
  const [text, setText] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [suggestionQuery, setSuggestionQuery] = useState('');
  const [cursorMentionStart, setCursorMentionStart] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredMembers = orgMembers.filter(m =>
    m.full_name?.toLowerCase().includes(suggestionQuery.toLowerCase())
  ).slice(0, 5);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setText(value);

    // Check if we're in a mention context
    const textBeforeCursor = value.slice(0, cursorPos);
    const lastAtSign = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtSign >= 0) {
      const textAfterAt = textBeforeCursor.slice(lastAtSign + 1);
      // Only show suggestions if there's no space after @, or it's a partial name
      if (!textAfterAt.includes(' ') || textAfterAt.split(' ').length <= 2) {
        const query = textAfterAt.trim();
        setSuggestionQuery(query);
        setCursorMentionStart(lastAtSign);
        setShowSuggestions(true);
        return;
      }
    }
    
    setShowSuggestions(false);
    setCursorMentionStart(null);
  };

  const insertMention = (member: Profile) => {
    if (cursorMentionStart === null) return;
    const name = member.full_name || 'Unknown';
    const before = text.slice(0, cursorMentionStart);
    const afterCursor = text.slice((inputRef.current?.selectionStart || text.length));
    const newText = `${before}@${name} ${afterCursor}`;
    setText(newText);
    setShowSuggestions(false);
    setCursorMentionStart(null);
    inputRef.current?.focus();
  };

  const handleSubmit = () => {
    if (!text.trim() || isSubmitting) return;
    
    // Extract mentioned profile IDs
    const mentionedIds: string[] = [];
    orgMembers.forEach(m => {
      if (m.full_name && text.includes(`@${m.full_name}`)) {
        mentionedIds.push(m.id);
      }
    });

    onSubmit(text.trim(), mentionedIds);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !showSuggestions) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative">
      <div className="flex gap-1.5">
        <input
          ref={inputRef}
          type="text"
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 text-[11px] bg-transparent border-none outline-none placeholder:text-muted-foreground/40 py-0.5"
        />
        {text.trim() && (
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="text-primary hover:text-primary/80 disabled:opacity-40 transition-all"
          >
            <Send className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Mention suggestions dropdown */}
      <AnimatePresence>
        {showSuggestions && filteredMembers.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute bottom-full left-0 mb-1 w-52 bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-50"
          >
            {filteredMembers.map(member => (
              <button
                key={member.id}
                onClick={() => insertMention(member)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-secondary/50 transition-colors text-left"
              >
                {member.avatar_url ? (
                  <img src={member.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center text-[9px] font-medium">
                    {(member.full_name || '?')[0]}
                  </div>
                )}
                <span className="text-xs font-medium truncate">{member.full_name || 'Unknown'}</span>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
