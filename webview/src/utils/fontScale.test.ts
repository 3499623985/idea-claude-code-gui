import {
  applyFontScaleLevel,
  applyMessageTypographyVariables,
  FONT_SCALE_CHANGED_EVENT,
  getFontScaleForLevel,
} from './fontScale';

describe('fontScale', () => {
  beforeEach(() => {
    document.documentElement.removeAttribute('style');
    localStorage.clear();
  });

  it('maps configured font size levels to stable scale values', () => {
    expect(getFontScaleForLevel(1)).toBe(0.8);
    expect(getFontScaleForLevel(3)).toBe(1);
    expect(getFontScaleForLevel(6)).toBe(1.4);
    expect(getFontScaleForLevel(99)).toBe(0.9);
  });

  it('writes concrete message typography sizes instead of relying on CSS zoom', () => {
    document.documentElement.style.setProperty('--idea-editor-font-size', '14px');

    applyFontScaleLevel(5);

    expect(document.documentElement.style.getPropertyValue('--font-scale')).toBe('1.2');
    expect(document.documentElement.style.getPropertyValue('--message-font-size')).toBe('16.8px');
    expect(document.documentElement.style.getPropertyValue('--message-small-font-size')).toBe('14.4px');
    expect(localStorage.getItem('fontSizeLevel')).toBe('5');
  });

  it('writes concrete app typography sizes so the settings level still affects fixed px styles', () => {
    applyFontScaleLevel(1);

    expect(document.documentElement.style.getPropertyValue('--app-font-size-13')).toBe('10.4px');
    expect(document.documentElement.style.getPropertyValue('--app-font-size-14')).toBe('11.2px');

    applyFontScaleLevel(5);

    expect(document.documentElement.style.getPropertyValue('--app-font-size-13')).toBe('15.6px');
    expect(document.documentElement.style.getPropertyValue('--app-font-size-14')).toBe('16.8px');
  });

  it('recomputes message typography when the IDE editor font changes', () => {
    document.documentElement.style.setProperty('--font-scale', '1.1');

    applyMessageTypographyVariables(document.documentElement, 15);

    expect(document.documentElement.style.getPropertyValue('--message-font-size')).toBe('16.5px');
    expect(document.documentElement.style.getPropertyValue('--message-code-font-size')).toBe('16.5px');
  });

  it('notifies views that depend on measured typography when font scale changes', () => {
    let receivedScale = 0;
    window.addEventListener(FONT_SCALE_CHANGED_EVENT, ((event: CustomEvent<{ scale: number }>) => {
      receivedScale = event.detail.scale;
    }) as EventListener, { once: true });

    applyFontScaleLevel(4);

    expect(receivedScale).toBe(1.1);
  });
});
