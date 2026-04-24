import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import SearchToolGroupBlock from './SearchToolGroupBlock';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('SearchToolGroupBlock', () => {
  it('aligns item status dots with task header status dots', () => {
    const { container } = render(
      <SearchToolGroupBlock
        items={[
          {
            name: 'Grep',
            input: {
              pattern: 'input-area',
              path: '/tmp/input.less',
            },
            result: { type: 'tool_result', content: 'ok' },
          },
        ]}
      />,
    );

    expect(container.querySelector('.file-list-container')?.classList.contains('has-scrollbar-gutter')).toBe(false);
    expect(container.querySelector('.file-list-item')?.getAttribute('style')).toContain(
      'padding: var(--tool-list-item-padding-y) 0px',
    );
  });

  it('compensates for scrollbar width when the batch list needs scrolling', () => {
    const items = Array.from({ length: 4 }, (_, index) => ({
      name: 'Grep',
      input: {
        pattern: `input-area-${index}`,
        path: '/tmp/input.less',
      },
      result: { type: 'tool_result' as const, content: 'ok' },
    }));

    const { container } = render(<SearchToolGroupBlock items={items} />);

    expect(container.querySelector('.file-list-container')?.classList.contains('has-scrollbar-gutter')).toBe(true);
  });
});
