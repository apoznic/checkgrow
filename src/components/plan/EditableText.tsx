import { useEffect, useRef, useState } from 'react';

interface EditableTextProps {
  value: string;
  onSave: (next: string) => void;
  canEdit: boolean;
  multiline?: boolean;
  className?: string;
  placeholder?: string;
}

export function EditableText({
  value,
  onSave,
  canEdit,
  multiline = false,
  className = '',
  placeholder = 'Empty',
}: EditableTextProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  useEffect(() => setDraft(value), [value]);

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus();
      const el = ref.current as HTMLTextAreaElement;
      el.selectionStart = el.value.length;
      if (multiline) {
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
      }
    }
  }, [editing, multiline]);

  const commit = () => {
    setEditing(false);
    const next = draft.trim();
    if (next !== value) onSave(next);
  };

  const wrapClass = multiline ? `${className} whitespace-pre-line` : className;

  if (!canEdit) {
    return <span className={wrapClass}>{value || <span className="opacity-40">{placeholder}</span>}</span>;
  }

  if (!editing) {
    return (
      <span
        role="button"
        tabIndex={0}
        onClick={() => setEditing(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            setEditing(true);
          }
        }}
        className={`${wrapClass} cursor-text rounded-sm px-0.5 -mx-0.5 hover:bg-primary/10 transition-colors print:hover:bg-transparent`}
      >
        {value || <span className="opacity-40">{placeholder}</span>}
      </span>
    );
  }


  const shared = {
    value: draft,
    onBlur: commit,
    className: `${className} w-full bg-secondary/40 border border-primary/40 rounded-md px-2 py-1 outline-none resize-none print:hidden`,
  };

  if (multiline) {
    return (
      <textarea
        {...shared}
        ref={ref as React.RefObject<HTMLTextAreaElement>}
        rows={3}
        onChange={(e) => {
          setDraft(e.target.value);
          e.target.style.height = 'auto';
          e.target.style.height = `${e.target.scrollHeight}px`;
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            commit();
          }
          if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}

      />
    );
  }

  return (
    <input
      {...shared}
      ref={ref as React.RefObject<HTMLInputElement>}
      onChange={(e) => setDraft(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
        }
        if (e.key === 'Escape') {
          setDraft(value);
          setEditing(false);
        }
      }}
    />
  );
}
