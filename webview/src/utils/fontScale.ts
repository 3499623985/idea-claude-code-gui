export const FONT_SIZE_LEVEL_SCALE: Record<number, number> = {
  1: 0.8,
  2: 0.9,
  3: 1.0,
  4: 1.1,
  5: 1.2,
  6: 1.4,
};

export const FONT_SCALE_CHANGED_EVENT = 'codemoss-font-scale-changed';
const DEFAULT_FONT_SIZE_LEVEL = 2;
const DEFAULT_EDITOR_FONT_SIZE = 14;
const APP_FONT_SIZE_BASES = [9, 10, 11, 12, 13, 14, 15, 16, 18, 20, 24, 32, 36, 48] as const;

function roundPx(value: number): string {
  return `${Math.round(value * 100) / 100}px`;
}

function parsePx(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed.endsWith('px')) {
    return null;
  }
  const parsed = Number.parseFloat(trimmed.slice(0, -2));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function getFontScaleForLevel(level: number): number {
  return FONT_SIZE_LEVEL_SCALE[level] ?? FONT_SIZE_LEVEL_SCALE[DEFAULT_FONT_SIZE_LEVEL];
}

export function getSavedFontScaleLevel(storage: Storage = localStorage): number {
  const savedLevel = storage.getItem('fontSizeLevel');
  const parsedLevel = savedLevel ? Number.parseInt(savedLevel, 10) : DEFAULT_FONT_SIZE_LEVEL;
  return parsedLevel >= 1 && parsedLevel <= 6 ? parsedLevel : DEFAULT_FONT_SIZE_LEVEL;
}

export function getCurrentFontScale(root: HTMLElement = document.documentElement): number {
  const fromStyle = getComputedStyle(root).getPropertyValue('--font-scale');
  const parsed = Number.parseFloat(fromStyle);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : getFontScaleForLevel(getSavedFontScaleLevel());
}

export function applyMessageTypographyVariables(
  root: HTMLElement = document.documentElement,
  editorFontSize?: number,
  scale = getCurrentFontScale(root),
): void {
  const currentEditorFontSize = editorFontSize
    ?? parsePx(getComputedStyle(root).getPropertyValue('--idea-editor-font-size'))
    ?? DEFAULT_EDITOR_FONT_SIZE;

  root.style.setProperty('--message-font-size', roundPx(currentEditorFontSize * scale));
  root.style.setProperty('--message-code-font-size', roundPx(currentEditorFontSize * scale));
  root.style.setProperty('--message-small-font-size', roundPx(12 * scale));
  root.style.setProperty('--message-caption-font-size', roundPx(11 * scale));
  root.style.setProperty('--message-icon-font-size', roundPx(14 * scale));
  root.style.setProperty('--message-large-icon-font-size', roundPx(16 * scale));
}

export function applyAppTypographyVariables(
  root: HTMLElement = document.documentElement,
  scale = getCurrentFontScale(root),
): void {
  APP_FONT_SIZE_BASES.forEach((baseSize) => {
    root.style.setProperty(`--app-font-size-${baseSize}`, roundPx(baseSize * scale));
  });
}

export function applyFontScaleLevel(
  level: number,
  root: HTMLElement = document.documentElement,
  storage: Storage = localStorage,
): number {
  const scale = getFontScaleForLevel(level);
  root.style.setProperty('--font-scale', String(scale));
  applyAppTypographyVariables(root, scale);
  applyMessageTypographyVariables(root, undefined, scale);
  storage.setItem('fontSizeLevel', level.toString());
  window.dispatchEvent(new CustomEvent(FONT_SCALE_CHANGED_EVENT, { detail: { level, scale } }));
  return scale;
}
