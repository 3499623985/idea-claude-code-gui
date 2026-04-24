import { render, act, cleanup } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useScrollBehavior } from './useScrollBehavior';
import type { ClaudeMessage } from '../types';

type ResizeObserverCallback = ConstructorParameters<typeof ResizeObserver>[0];

let resizeObserverCallback: ResizeObserverCallback | null = null;

class ResizeObserverMock implements ResizeObserver {
  readonly observe = vi.fn();
  readonly unobserve = vi.fn();
  readonly disconnect = vi.fn();

  constructor(callback: ResizeObserverCallback) {
    resizeObserverCallback = callback;
  }
}

function setScrollMetrics(
  element: HTMLElement,
  metrics: { scrollHeight: number; clientHeight: number; scrollTop: number },
): void {
  Object.defineProperty(element, 'scrollHeight', {
    configurable: true,
    value: metrics.scrollHeight,
  });
  Object.defineProperty(element, 'clientHeight', {
    configurable: true,
    value: metrics.clientHeight,
  });
  element.scrollTop = metrics.scrollTop;
}

function ChatScrollHarness({
  messages,
  streamingActive = false,
}: {
  messages: ClaudeMessage[];
  streamingActive?: boolean;
}): React.ReactElement {
  const { messagesContainerRef, messagesEndRef } = useScrollBehavior({
    currentView: 'chat',
    messages,
    loading: false,
    streamingActive,
  });

  return (
    <div ref={messagesContainerRef} data-testid="messages-container">
      <div ref={messagesEndRef} />
    </div>
  );
}

describe('useScrollBehavior', () => {
  beforeEach(() => {
    resizeObserverCallback = null;
    vi.useFakeTimers();
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      callback(0);
      return 1;
    });
    vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('keeps following the bottom when rendered message content grows after state settles', () => {
    const messages: ClaudeMessage[] = [
      { type: 'assistant', content: 'hello', timestamp: '2026-04-24T00:00:00Z' },
    ];
    const { getByTestId } = render(<ChatScrollHarness messages={messages} streamingActive />);
    const container = getByTestId('messages-container');

    setScrollMetrics(container, { scrollHeight: 1000, clientHeight: 400, scrollTop: 600 });

    act(() => {
      resizeObserverCallback?.([], {} as ResizeObserver);
    });

    expect(container.scrollTop).toBe(1000);
  });

  it('does not follow layout growth after the user scrolls upward', () => {
    const messages: ClaudeMessage[] = [
      { type: 'assistant', content: 'hello', timestamp: '2026-04-24T00:00:00Z' },
    ];
    const { getByTestId } = render(<ChatScrollHarness messages={messages} streamingActive />);
    const container = getByTestId('messages-container');

    setScrollMetrics(container, { scrollHeight: 1000, clientHeight: 400, scrollTop: 600 });

    act(() => {
      container.dispatchEvent(new WheelEvent('wheel', { deltaY: -80 }));
    });

    setScrollMetrics(container, { scrollHeight: 1200, clientHeight: 400, scrollTop: 520 });

    act(() => {
      resizeObserverCallback?.([], {} as ResizeObserver);
    });

    expect(container.scrollTop).toBe(520);
  });
});
