import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BehaviorTab from './BehaviorTab';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('BehaviorTab', () => {
  it('notifies compact mode changes immediately', () => {
    const onMessageCompactModeChange = vi.fn();

    render(
      <BehaviorTab
        messageCompactMode={false}
        onMessageCompactModeChange={onMessageCompactModeChange}
      />,
    );

    fireEvent.click(screen.getByLabelText(/settings.basic.messageCompactMode.label/i));

    expect(onMessageCompactModeChange).toHaveBeenCalledTimes(1);
    expect(onMessageCompactModeChange).toHaveBeenCalledWith(true);
  });
});
