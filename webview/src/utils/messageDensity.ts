export const MESSAGE_COMPACT_MODE_STORAGE_KEY = 'messageCompactMode';
const MESSAGE_DENSITY_ATTRIBUTE = 'data-message-density';

export function getSavedMessageCompactMode(storage: Storage = localStorage): boolean {
  try {
    return storage.getItem(MESSAGE_COMPACT_MODE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function applyMessageCompactMode(
  enabled: boolean,
  root: HTMLElement = document.documentElement,
  storage: Storage = localStorage,
): void {
  if (enabled) {
    root.setAttribute(MESSAGE_DENSITY_ATTRIBUTE, 'compact');
    try {
      storage.setItem(MESSAGE_COMPACT_MODE_STORAGE_KEY, 'true');
    } catch {
      return;
    }
    return;
  }

  root.removeAttribute(MESSAGE_DENSITY_ATTRIBUTE);
  try {
    storage.removeItem(MESSAGE_COMPACT_MODE_STORAGE_KEY);
  } catch {
    return;
  }
}
