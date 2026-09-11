import { ArrowUpRight, PencilLine } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { getNotePreview, getNoteTheme } from './constants';
import type { StickyNoteData } from './types';

interface StickyNoteCardProps {
  note: StickyNoteData;
  isOwner: boolean;
  isSelected: boolean;
  onOpen: (note: StickyNoteData) => void;
}

export function StickyNoteCard({ note, isOwner, isSelected, onOpen }: StickyNoteCardProps) {
  const theme = getNoteTheme(note.color);
  const authorName = note.profiles?.full_name || 'Unknown';
  const preview = getNotePreview(note.content);
  const displayTitle = note.title || 'Untitled note';

  return (
    <button
      type="button"
      onClick={() => onOpen(note)}
      className="group flex h-full min-h-[180px] w-full flex-col overflow-hidden rounded-[1.2rem] border text-left transition-all duration-200 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:min-h-[220px] sm:rounded-[1.4rem]"
      style={{
        background: `linear-gradient(180deg, hsl(${theme.surfaceStrong}) 0%, hsl(${theme.surface}) 100%)`,
        borderColor: `hsl(${theme.border} / ${isSelected ? '1' : '0.76'})`,
        boxShadow: isSelected
          ? `0 24px 48px -28px hsl(${theme.accent} / 0.45)`
          : `0 18px 36px -32px hsl(${theme.accent} / 0.32)`,
      }}
      aria-label={`Open sticky note: ${displayTitle}`}
    >
      <div className="h-1.5 w-full" style={{ backgroundColor: `hsl(${theme.accent})` }} />

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-sm font-semibold text-foreground line-clamp-1">
              {displayTitle}
            </p>
            <p className="text-xs text-muted-foreground">
              Updated {formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })}
            </p>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            {isOwner ? <PencilLine className="h-3.5 w-3.5" /> : null}
            <ArrowUpRight className="h-4 w-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </div>
        </div>

        <div className="flex-1 rounded-[1.1rem] border border-background/70 bg-background/55 p-4 shadow-sm backdrop-blur-sm">
          <p
            className="whitespace-pre-wrap text-sm leading-7"
            style={{ color: `hsl(${theme.text})` }}
          >
            {preview}
          </p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            {note.profiles?.avatar_url ? (
              <img
                src={note.profiles.avatar_url}
                alt={`${authorName} avatar`}
                className="h-8 w-8 rounded-full border border-border/70 object-cover"
              />
            ) : (
              <div
                className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold"
                style={{
                  backgroundColor: `hsl(${theme.accent})`,
                  color: 'hsl(var(--background))',
                }}
              >
                {authorName.charAt(0).toUpperCase() || '?'}
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-foreground">{authorName}</p>
              <p className="text-xs text-muted-foreground">
                {isOwner ? 'Click to edit' : 'Click to view'}
              </p>
            </div>
          </div>

          {isSelected ? (
            <span className="rounded-full bg-background/80 px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm">
              Open
            </span>
          ) : null}
        </div>
      </div>
    </button>
  );
}
