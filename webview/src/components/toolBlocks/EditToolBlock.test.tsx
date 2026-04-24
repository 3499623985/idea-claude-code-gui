import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import EditToolBlock from './EditToolBlock';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('../../hooks/useIsToolDenied', () => ({
  useIsToolDenied: () => false,
}));

vi.mock('../../utils/bridge', () => ({
  openFile: vi.fn(),
  refreshFile: vi.fn(),
  showDiff: vi.fn(),
}));

describe('EditToolBlock', () => {
  it('renders diff and refresh actions inside the edit header row', () => {
    const { container } = render(
      <EditToolBlock
        name="Edit"
        input={{
          file_path: '/tmp/BashToolGroupBlock.tsx',
          old_string: 'const count = 1;',
          new_string: 'const count = 2;\nconst name = "x";',
        }}
        result={{ type: 'tool_result', content: 'ok' }}
      />,
    );

    const header = container.querySelector('.task-header');
    const diffAction = screen.getByTitle('tools.showDiffInIdea');
    const refreshAction = screen.getByTitle('tools.refreshFileInIdea');
    const statusIndicator = container.querySelector('.edit-tool-status-indicator');

    expect(header).toBeTruthy();
    expect(diffAction.closest('.task-header')).toBe(header);
    expect(refreshAction.closest('.task-header')).toBe(header);
    expect(statusIndicator?.closest('.task-header')).toBe(header);
    expect(container.querySelector('.edit-tool-floating-actions')).toBeNull();
  });
});
