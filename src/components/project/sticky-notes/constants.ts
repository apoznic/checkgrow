import type { StickyNoteColor, StickyNoteData, StickyNoteTheme } from './types';

export const DEFAULT_NOTE_COLOR: StickyNoteColor = 'yellow';

export const NOTE_THEMES: StickyNoteTheme[] = [
  {
    value: 'yellow',
    label: 'Sunbeam',
    accent: '42 96% 54%',
    surface: '44 100% 96%',
    surfaceStrong: '44 100% 92%',
    border: '40 76% 78%',
    text: '28 20% 18%',
  },
  {
    value: 'blue',
    label: 'Skylight',
    accent: '199 89% 48%',
    surface: '197 100% 96%',
    surfaceStrong: '197 100% 92%',
    border: '197 74% 78%',
    text: '210 30% 20%',
  },
  {
    value: 'green',
    label: 'Meadow',
    accent: '150 60% 42%',
    surface: '151 50% 96%',
    surfaceStrong: '151 54% 92%',
    border: '150 38% 76%',
    text: '155 28% 18%',
  },
  {
    value: 'pink',
    label: 'Petal',
    accent: '343 82% 58%',
    surface: '341 100% 97%',
    surfaceStrong: '341 100% 94%',
    border: '340 76% 82%',
    text: '338 24% 20%',
  },
  {
    value: 'purple',
    label: 'Muse',
    accent: '265 80% 60%',
    surface: '266 100% 97%',
    surfaceStrong: '266 100% 94%',
    border: '266 60% 82%',
    text: '268 28% 20%',
  },
  {
    value: 'orange',
    label: 'Clementine',
    accent: '24 92% 56%',
    surface: '28 100% 96%',
    surfaceStrong: '28 100% 92%',
    border: '26 85% 80%',
    text: '22 28% 18%',
  },
];

export function normalizeNoteColor(color?: string | null): StickyNoteColor {
  return NOTE_THEMES.some((theme) => theme.value === color)
    ? (color as StickyNoteColor)
    : DEFAULT_NOTE_COLOR;
}

export function getNoteTheme(color?: string | null) {
  return NOTE_THEMES.find((theme) => theme.value === color) ?? NOTE_THEMES[0];
}

export function getNotePreview(content: string, maxLength = 180) {
  const normalized = content.replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength
    ? `${normalized.slice(0, maxLength).trimEnd()}…`
    : normalized;
}

export function sortNotesByRecent(notes: StickyNoteData[]) {
  return [...notes].sort((a, b) => {
    const aTime = new Date(a.updated_at || a.created_at).getTime();
    const bTime = new Date(b.updated_at || b.created_at).getTime();
    return bTime - aTime;
  });
}
