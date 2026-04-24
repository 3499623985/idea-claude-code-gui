import { readFileSync } from 'node:fs';
import { describe, expect, it, beforeEach } from 'vitest';
import {
  applyMessageCompactMode,
  getSavedMessageCompactMode,
  MESSAGE_COMPACT_MODE_STORAGE_KEY,
} from './messageDensity';

const baseStyles = readFileSync('src/styles/less/base.less', 'utf8');

describe('messageDensity', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('data-message-density');
    localStorage.clear();
  });

  it('applies and persists compact message density', () => {
    applyMessageCompactMode(true);

    expect(document.documentElement.getAttribute('data-message-density')).toBe('compact');
    expect(localStorage.getItem(MESSAGE_COMPACT_MODE_STORAGE_KEY)).toBe('true');
    expect(getSavedMessageCompactMode()).toBe(true);
  });

  it('removes compact message density when disabled', () => {
    applyMessageCompactMode(true);
    applyMessageCompactMode(false);

    expect(document.documentElement.hasAttribute('data-message-density')).toBe(false);
    expect(localStorage.getItem(MESSAGE_COMPACT_MODE_STORAGE_KEY)).toBeNull();
    expect(getSavedMessageCompactMode()).toBe(false);
  });

  it('keeps compact density spacing visibly tighter than the default mode', () => {
    expect(baseStyles).toContain(":root[data-message-density='compact']");
    expect(baseStyles).toContain('--message-block-padding-y: 7px;');
    expect(baseStyles).toContain('--message-markdown-block-margin: 3px;');
    expect(baseStyles).toContain('--task-block-margin-y: 4px;');
    expect(baseStyles).toContain('--tool-list-item-padding-y: 1px;');
  });
});
