/**
 * Normalizes radio semantics for native screen readers and React Native Web.
 * `checked` is the ARIA state expected for a radio; it follows the same
 * boolean that controls the visual selected treatment.
 */
export function radioAccessibilityProps(checked: boolean, disabled?: boolean) {
  return {
    'aria-checked': checked,
    accessibilityState: {
      checked,
      ...(disabled === undefined ? {} : { disabled }),
    },
  } as const;
}
