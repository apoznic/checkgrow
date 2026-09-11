import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Palette, Trash2, UserRound } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getNoteTheme, NOTE_THEMES, normalizeNoteColor } from './constants';
import type { StickyNoteData, StickyNoteDialogMode, StickyNoteDraft } from './types';

interface StickyNoteDialogProps {
  open: boolean;
  mode: StickyNoteDialogMode | null;
  note: StickyNoteData | null;
  draft: StickyNoteDraft;
  canEdit: boolean;
  isSaving: boolean;
  onDraftChange: (draft: StickyNoteDraft) => void;
  onClose: () => void;
  onDelete: () => void;
}

export function StickyNoteDialog({
  open,
  mode,
  note,
  draft,
  canEdit,
  isSaving,
  onDraftChange,
  onClose,
  onDelete,
}: StickyNoteDialogProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isEditing = mode === 'create' || mode === 'edit';

  useEffect(() => {
    if (!open) {
      setConfirmDelete(false);
    }
  }, [open, mode, note?.id]);

  const theme = useMemo(
    () => getNoteTheme(isEditing ? draft.color : normalizeNoteColor(note?.color)),
    [draft.color, isEditing, note?.color],
  );

  const authorName = note?.profiles?.full_name || 'Unknown';
  const updatedLabel = note
    ? formatDistanceToNow(new Date(note.updated_at), { addSuffix: true })
    : 'just now';

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="mx-4 max-h-[90dvh] max-w-4xl overflow-y-auto border-border/70 bg-background p-0 shadow-2xl sm:mx-auto">
        <div
          className="border-b border-border/60 px-6 py-5"
          style={{
            background: `linear-gradient(135deg, hsl(${theme.surfaceStrong}) 0%, hsl(${theme.surface}) 100%)`,
          }}
        >
          <DialogHeader className="space-y-2 text-left">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              <span>Sticky note</span>
              <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
              <span>{theme.label}</span>
              {isSaving && (
                <>
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/40" />
                  <span className="text-primary">Saving…</span>
                </>
              )}
            </div>
            <DialogTitle className="sr-only">
              {mode === 'create' ? 'Create sticky note' : 'Edit sticky note'}
            </DialogTitle>
            {isEditing ? (
              <input
                value={draft.title}
                onChange={(e) => onDraftChange({ ...draft, title: e.target.value })}
                placeholder="Untitled note…"
                className="w-full border-none bg-transparent text-lg font-semibold text-foreground outline-none placeholder:text-muted-foreground/60 sm:text-2xl"
              />
            ) : (
              <p className="text-lg font-semibold text-foreground sm:text-2xl">
                {note?.title || 'Untitled note'}
              </p>
            )}
            <DialogDescription className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {isEditing
                ? 'Changes are saved automatically.'
                : 'Open the note in a dedicated panel so the board stays calm and readable.'}
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="grid gap-6 px-6 py-6 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="space-y-4">
            {isEditing ? (
              <textarea
                value={draft.content}
                onChange={(event) => onDraftChange({ ...draft, content: event.target.value })}
                placeholder="Capture an idea, blocker, decision or next step..."
                className="min-h-[300px] w-full resize-none rounded-[1.4rem] border border-border/70 bg-card/70 px-5 py-4 text-sm leading-7 text-foreground shadow-sm outline-none transition-shadow placeholder:text-muted-foreground/70 focus-visible:ring-2 focus-visible:ring-ring"
                style={{ backgroundColor: `hsl(${theme.surface} / 0.86)` }}
              />
            ) : (
              <div
                className="min-h-[300px] whitespace-pre-wrap rounded-[1.4rem] border border-border/70 px-5 py-4 text-sm leading-7 text-foreground shadow-sm"
                style={{ backgroundColor: `hsl(${theme.surface} / 0.9)` }}
              >
                {note?.content}
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-[1.2rem] border border-border/70 bg-card/70 p-4 shadow-sm">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <UserRound className="h-3.5 w-3.5" />
                Author
              </p>
              <div className="flex items-center gap-3">
                {note?.profiles?.avatar_url ? (
                  <img
                    src={note.profiles.avatar_url}
                    alt={`${authorName} avatar`}
                    className="h-10 w-10 rounded-full border border-border/70 object-cover"
                  />
                ) : (
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold"
                    style={{
                      backgroundColor: `hsl(${theme.accent})`,
                      color: 'hsl(var(--background))',
                    }}
                  >
                    {authorName.charAt(0).toUpperCase() || '?'}
                  </div>
                )}
                <div>
                  <p className="font-medium text-foreground">{authorName}</p>
                  <p className="text-sm text-muted-foreground">Updated {updatedLabel}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.2rem] border border-border/70 bg-card/70 p-4 shadow-sm">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <CalendarClock className="h-3.5 w-3.5" />
                Note info
              </p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Created{' '}
                  <span className="font-medium text-foreground">
                    {note ? formatDistanceToNow(new Date(note.created_at), { addSuffix: true }) : 'just now'}
                  </span>
                </p>
                <p>
                  Status{' '}
                  <span className="font-medium text-foreground">
                    {isEditing ? 'Editing' : canEdit ? 'Ready to edit' : 'View only'}
                  </span>
                </p>
              </div>
            </div>

            <div className="rounded-[1.2rem] border border-border/70 bg-card/70 p-4 shadow-sm">
              <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                <Palette className="h-3.5 w-3.5" />
                Color
              </p>
              <div className="grid grid-cols-3 gap-2">
                {NOTE_THEMES.map((option) => {
                  const isActive = option.value === draft.color;

                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onDraftChange({ ...draft, color: option.value })}
                      className="relative flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 px-2 py-2.5 text-center transition-all duration-200"
                      style={{
                        backgroundColor: `hsl(${option.surfaceStrong})`,
                        borderColor: isActive ? `hsl(${option.accent})` : `hsl(${option.border} / 0.5)`,
                        boxShadow: isActive
                          ? `0 0 0 1px hsl(${option.accent} / 0.3), 0 4px 12px -4px hsl(${option.accent} / 0.35)`
                          : 'none',
                      }}
                      aria-label={`Select ${option.label} note color`}
                    >
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: `hsl(${option.accent})` }}
                      />
                      <span
                        className="text-[10px] font-semibold leading-none"
                        style={{ color: `hsl(${option.text})` }}
                      >
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>
        </div>

        <DialogFooter className="border-t border-border/60 px-6 py-4">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="flex flex-wrap items-center gap-2">
              {canEdit && note ? (
                confirmDelete ? (
                  <>
                    <span className="text-xs text-muted-foreground">Delete this note permanently?</span>
                    <Button size="sm" variant="destructive" onClick={onDelete} disabled={isSaving}>
                      {isSaving ? 'Deleting…' : 'Confirm delete'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)} disabled={isSaving}>
                      Keep note
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} disabled={isSaving}>
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </Button>
                )
              ) : null}
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Button variant="outline" onClick={onClose} disabled={isSaving}>
                Close
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
