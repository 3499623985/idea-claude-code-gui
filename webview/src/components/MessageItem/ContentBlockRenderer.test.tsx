import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { TFunction } from 'i18next';
import { ContentBlockRenderer } from './ContentBlockRenderer';

vi.mock('../MarkdownBlock', () => ({
  default: ({ content }: { content: string }) => <div>{content}</div>,
}));

describe('ContentBlockRenderer', () => {
  it('renders a monochrome insight marker for thinking blocks', () => {
    const { container } = render(
      <ContentBlockRenderer
        block={{ type: 'thinking', thinking: 'analysis' }}
        messageIndex={0}
        messageType="assistant"
        isStreaming={false}
        isThinkingExpanded={false}
        isThinking={false}
        isLastMessage={false}
        t={((key: string) => key) as TFunction}
        onToggleThinking={vi.fn()}
        findToolResult={vi.fn()}
      />,
    );

    const insightIcon = container.querySelector('.thinking-insight-icon');

    expect(container.querySelector('.thinking-brain-icon')).toBeNull();
    expect(insightIcon).toBeTruthy();
    expect(insightIcon?.getAttribute('aria-hidden')).toBe('true');
  });
});
