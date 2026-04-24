import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const historyStyles = readFileSync('src/styles/less/components/history.less', 'utf8');

describe('history styles', () => {
  it('uses scalable typography for history list titles', () => {
    expect(historyStyles).toMatch(/\.history-item-title\s*\{[^}]*font-size:\s*var\(--app-font-size-14\);/s);
  });
});
