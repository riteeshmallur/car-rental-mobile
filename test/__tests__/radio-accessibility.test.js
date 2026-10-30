const { radioAccessibilityProps } = require('@/utils/radio-accessibility');

describe('radio accessibility', () => {
  it('exposes selected radios as checked for native and web accessibility trees', () => {
    expect(radioAccessibilityProps(true)).toEqual({
      'aria-checked': true,
      accessibilityState: { checked: true },
    });
  });

  it('exposes unselected and disabled radios accurately', () => {
    expect(radioAccessibilityProps(false, true)).toEqual({
      'aria-checked': false,
      accessibilityState: { checked: false, disabled: true },
    });
  });
});
