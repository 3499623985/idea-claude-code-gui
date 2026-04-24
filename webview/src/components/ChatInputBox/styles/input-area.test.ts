import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const inputAreaStyles = readFileSync('src/components/ChatInputBox/styles/input-area.css', 'utf8');

describe('ChatInputBox input area styles', () => {
  it('uses scalable typography variables for the editable input', () => {
    expect(inputAreaStyles).toContain('font-size: var(--message-font-size)');
    expect(inputAreaStyles).not.toContain('font-size: 14px;');
  });
});
