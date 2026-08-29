/**
 * The four field states — non-negotiable product principle #1.
 * Every value is either real, or explicitly one of these. No blanks, no zeros
 * standing in for unknowns.
 */
export type FieldState =
  | 'not-applicable' // does not apply to this declaration
  | 'not-available' // not provided by the source
  | 'not-populated' // required but missing
  | 'not-verified'; // not yet compared with the source record

export type FieldValue<T> = { kind: 'value'; value: T } | { kind: FieldState };

export const fv = <T>(value: T): FieldValue<T> => ({ kind: 'value', value });
export const NOT_APPLICABLE = { kind: 'not-applicable' } as const;
export const NOT_AVAILABLE = { kind: 'not-available' } as const;
export const NOT_POPULATED = { kind: 'not-populated' } as const;
export const NOT_VERIFIED = { kind: 'not-verified' } as const;

export function isValue<T>(f: FieldValue<T>): f is { kind: 'value'; value: T } {
  return f.kind === 'value';
}

export function valueOr<T, F>(f: FieldValue<T>, fallback: F): T | F {
  return isValue(f) ? f.value : fallback;
}

export function mapValue<T, U>(f: FieldValue<T>, fn: (v: T) => U): FieldValue<U> {
  return isValue(f) ? fv(fn(f.value)) : f;
}

/** Plain-English labels — principle #7: never expose internal codes. */
export const FIELD_STATE_LABEL: Record<FieldState, string> = {
  'not-applicable': 'Not applicable',
  'not-available': 'Not available',
  'not-populated': 'Not populated',
  'not-verified': 'Not verified',
};

/** Warning states render amber; informational states render neutral. */
export const FIELD_STATE_SEVERITY: Record<FieldState, 'warning' | 'muted'> = {
  'not-applicable': 'muted',
  'not-available': 'muted',
  'not-populated': 'warning',
  'not-verified': 'warning',
};
