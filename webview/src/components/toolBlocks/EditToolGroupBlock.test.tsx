import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EditToolGroupBlock from './EditToolGroupBlock';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../utils/bridge', () => ({
  openFile: vi.fn(),
  refreshFile: vi.fn(),
  showDiff: vi.fn(),
}));

describe('EditToolGroupBlock', () => {
  it('keeps each file diff and refresh action in the same file row', () => {
    const { container } = render(
      <EditToolGroupBlock
        items={[
          {
            name: 'Edit',
            input: {
              file_path: '/tmp/BashToolGroupBlock.tsx',
              old_string: 'const count = 1;',
              new_string: 'const count = 2;',
            },
            result: { type: 'tool_result', content: 'ok' },
          },
        ]}
      />,
    );

    const fileRow = container.querySelector('.file-list-item');
    const diffAction = screen.getByTitle('tools.showDiffInIdea');
    const refreshAction = screen.getByTitle('tools.refreshFileInIdea');
    const statusIndicator = container.querySelector('.edit-tool-status-indicator');

    expect(fileRow).toBeTruthy();
    expect(diffAction.closest('.file-list-item')).toBe(fileRow);
    expect(refreshAction.closest('.file-list-item')).toBe(fileRow);
    expect(statusIndicator?.closest('.file-list-item')).toBe(fileRow);
  });

  it('compensates for scrollbar width when the batch list needs scrolling', () => {
    const items = Array.from({ length: 4 }, (_, index) => ({
      name: 'Edit',
      input: {
        file_path: `/tmp/BashToolGroupBlock-${index}.tsx`,
        old_string: 'const count = 1;',
        new_string: 'const count = 2;',
      },
      result: { type: 'tool_result' as const, content: 'ok' },
    }));

    const { container } = render(<EditToolGroupBlock items={items} />);

    expect(container.querySelector('.file-list-container')?.classList.contains('has-scrollbar-gutter')).toBe(true);
  });
});
