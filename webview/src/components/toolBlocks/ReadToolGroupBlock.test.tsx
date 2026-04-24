import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReadToolGroupBlock from './ReadToolGroupBlock';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../utils/bridge', () => ({
  openFile: vi.fn(),
}));

describe('ReadToolGroupBlock', () => {
  it('aligns item status dots with task header status dots', () => {
    const { container } = render(
      <ReadToolGroupBlock
        items={[
          {
            name: 'Read',
            input: {
              file_path: '/tmp/input.less',
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
      name: 'Read',
      input: {
        file_path: `/tmp/input-${index}.less`,
      },
      result: { type: 'tool_result' as const, content: 'ok' },
    }));

    const { container } = render(<ReadToolGroupBlock items={items} />);

    expect(container.querySelector('.file-list-container')?.classList.contains('has-scrollbar-gutter')).toBe(true);
  });
});
