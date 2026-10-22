/**
 * Canonical "lossless JSON" guard for plugin test suites (dsh-autopilot R66).
 * Copied verbatim from `dsh-autopilot/tools/templates/lossless-json.ts`; do not
 * edit here — change the template and re-copy.
 *
 * Two things survive a naive `JSON.stringify` but not the strict comparison dsh
 * runs on the way back:
 *
 *   1. `undefined` values on live keys        → `{"a": undefined}` becomes `{}`
 *   2. `-0`                                   → stringifies as `"0"`, and a
 *      strict deep-equality check sees `0 !== -0` (any rounding of a tiny
 *      negative channel can produce it), plus `NaN`/`±Infinity` → `null`
 */

/** Throw if any key anywhere in the tree holds `undefined`. */
export function assertNoUndefined(value: unknown, path = 'root'): void {
  if (value === undefined) throw new Error(`undefined value at ${path}`)
  if (value === null || typeof value !== 'object') return
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertNoUndefined(item, `${path}[${i}]`))
    return
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    assertNoUndefined(child, `${path}.${key}`)
  }
}

/** Throw if any number that cannot survive a JSON round-trip appears. */
export function assertLosslessNumbers(value: unknown, path = 'root'): void {
  if (typeof value === 'number') {
    if (Object.is(value, -0)) throw new Error(`negative zero at ${path}`)
    if (!Number.isFinite(value)) throw new Error(`non-finite number (${value}) at ${path}`)
    return
  }
  if (value === null || typeof value !== 'object') return
  if (Array.isArray(value)) {
    value.forEach((item, i) => assertLosslessNumbers(item, `${path}[${i}]`))
    return
  }
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    assertLosslessNumbers(child, `${path}.${key}`)
  }
}

/** Both guards in one call — what every tool-result test should use. */
export function assertLossless(value: unknown, path = 'root'): void {
  assertNoUndefined(value, path)
  assertLosslessNumbers(value, path)
}
