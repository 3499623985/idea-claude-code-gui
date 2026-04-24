import { readFileSync } from 'node:fs';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BashToolGroupBlock from './BashToolGroupBlock';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const toolStyles = readFileSync('src/styles/less/components/tools.less', 'utf8');

describe('BashToolGroupBlock', () => {
  it('renders timeline status indicators inside command rows', () => {
    const { container } = render(
      <BashToolGroupBlock
        items={[
          {
            input: {
              command: 'git commit -m "fix"',
              description: 'Commit gutter fix',
            },
            result: { type: 'tool_result', content: 'failed', is_error: true },
          },
          {
            input: {
              command: 'git commit -m "style"',
              description: 'Commit style fix only',
            },
            result: { type: 'tool_result', content: 'ok' },
          },
        ]}
      />,
    );

    expect(container.querySelectorAll('.bash-timeline-row .tool-status-indicator')).toHaveLength(2);
    expect(container.querySelector('.bash-group-timeline')?.classList.contains('has-scrollbar-gutter')).toBe(false);
  });

  it('uses the same right alignment baseline as task headers', () => {
    expect(toolStyles).toContain('margin-right: 0;');
    expect(toolStyles).toContain('padding: var(--task-header-padding-y) var(--task-header-padding-x);');
    expect(toolStyles).toContain(
      'padding: var(--tool-list-padding-y) var(--task-header-padding-x) var(--tool-list-padding-y) 16px;',
    );
    expect(toolStyles).toContain(
      'padding-right: calc(var(--task-header-padding-x) - var(--tool-list-scrollbar-gutter));',
    );
    expect(toolStyles).toContain('padding: var(--tool-list-item-padding-y) 0;');
  });

  it('compensates only when the timeline needs a scrollbar', () => {
    const items = Array.from({ length: 4 }, (_, index) => ({
      input: {
        command: `npm run task-${index}`,
        description: `Task ${index}`,
      },
      result: { type: 'tool_result' as const, content: 'ok' },
    }));

    const { container } = render(<BashToolGroupBlock items={items} />);

    expect(container.querySelector('.bash-group-timeline')?.classList.contains('has-scrollbar-gutter')).toBe(true);
  });
});
