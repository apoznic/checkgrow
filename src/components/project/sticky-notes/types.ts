export type StickyNoteColor = 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'orange';

export interface StickyNoteAuthor {
  full_name: string | null;
  avatar_url: string | null;
}

export interface StickyNoteData {
  id: string;
  project_id: string;
  author_id: string;
  title: string;
  content: string;
  color: string;
  created_at: string;
  updated_at: string;
  profiles?: StickyNoteAuthor | null;
}

export interface StickyNoteDraft {
  title: string;
  content: string;
  color: StickyNoteColor;
}

export interface StickyNoteTheme {
  value: StickyNoteColor;
  label: string;
  accent: string;
  surface: string;
  surfaceStrong: string;
  border: string;
  text: string;
}

export type StickyNoteDialogMode = 'create' | 'view' | 'edit';
