/**
 * complex_mobius v0.4.0 — Möbius (fractional-linear) transformations:
 * apply (with the derivative), inverse preimages, fixed points of every kind,
 * composition — plus the three honest-answer paths (pole, degenerate map,
 * extraneous fixed-point root that is the pole).
 *
 * ORACLE: test/oracle/anchors.py
 *   Section F prints every number asserted here. Values come from CPython
 *   complex arithmetic (independent of the TypeScript implementation), and each
 *   fixed point is re-substituted into the map before being printed; the
 *   invariants (root is fixed, M(preimage) = w, det(M∘N) = det M · det N,
 *   (M∘N)(z) = M(N(z))) are asserted by the oracle's own --check run.
 */

import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/index.ts'
import { buildComplexTools } from '../src/tools.ts'
import { assertLossless } from './helpers/lossless-json.ts'

const tools = buildComplexTools(resolveConfig({}))

type Exec = (args: unknown) => Promise<unknown>
const run = (args: unknown): Promise<unknown> => (tools.complex_mobius.execute as Exec)(args)

interface Point {
  re: number
  im: number
  rect: string
}

interface LocatedPoint extends Point {
  modulus: number
  argumentDeg: number
}

interface FixedEntry extends Point {
  multiplicity: number
}

interface MobiusOut {
  valid: boolean
  error?: string
  operation?: string
  a?: string
  b?: string
  c?: string
  d?: string
  determinant?: Point
  invertible?: boolean
  z?: LocatedPoint
  w?: LocatedPoint
  derivative?: Point
  preimage?: LocatedPoint
  atPole?: boolean
  degenerate?: boolean
  constant?: Point
  fixedPointKind?: string
  fixedPoints?: FixedEntry[]
  excludedFixedPoints?: Point[]
  note?: string
}

const CAYLEY = { a: '1', b: '-i', c: '1', d: 'i' }
const SECOND = { a: '2', b: '1', c: '1', d: '-i' }

async function apply(a: string, b: string, c: string, d: string, z: string): Promise<MobiusOut> {
  const out = (await run({ a, b, c, d, operation: 'apply', z })) as MobiusOut
  assertLossless(out)
  return out
}

describe('complex_mobius — apply', () => {
  it('maps the Cayley transform at 1+i to 0.2-0.4i with its derivative', async () => {
    const out = await apply(CAYLEY.a, CAYLEY.b, CAYLEY.c, CAYLEY.d, '1+i')
    expect(out.valid).toBe(true)
    expect(out.operation).toBe('apply')
    expect(out.invertible).toBe(true)
    expect(out.determinant).toEqual({ re: 0, im: 2, rect: '2i' })
    expect(out.z?.re).toBe(1)
    expect(out.z?.im).toBe(1)
    expect(out.z?.modulus).toBe(1.4142135624)
    expect(out.w?.re).toBe(0.2)
    expect(out.w?.im).toBe(-0.4)
    expect(out.w?.rect).toBe('0.2-0.4i')
    expect(out.w?.modulus).toBe(0.4472135955)
    expect(out.w?.argumentDeg).toBe(-63.4349488229)
    expect(out.derivative).toEqual({ re: 0.32, im: -0.24, rect: '0.32-0.24i' })
  })

  it('maps (2z+1)/(z-i) at 1 to 1.5+1.5i', async () => {
    const out = await apply('2', '1', '1', '-i', '1')
    expect(out.w?.re).toBe(1.5)
    expect(out.w?.im).toBe(1.5)
    expect(out.w?.modulus).toBe(2.1213203436)
    expect(out.w?.argumentDeg).toBe(45)
    expect(out.determinant).toEqual({ re: -1, im: -2, rect: '-1-2i' })
    expect(out.derivative).toEqual({ re: 1, im: -0.5, rect: '1-0.5i' })
  })

  it('maps a real point of (z+1)/(z-1) to 3 with derivative -2', async () => {
    const out = await apply('1', '1', '1', '-1', '2')
    expect(out.w?.re).toBe(3)
    expect(out.w?.im).toBe(0)
    expect(out.w?.modulus).toBe(3)
    expect(out.w?.argumentDeg).toBe(0)
    expect(out.derivative).toEqual({ re: -2, im: 0, rect: '-2' })
  })

  it('leaves points alone under the identity and shifts them under a translation', async () => {
    const identity = await apply('1', '0', '0', '1', '2+3i')
    expect(identity.w).toEqual({ re: 2, im: 3, rect: '2+3i', modulus: 3.6055512755, argumentDeg: 56.309932474 })
    expect(identity.derivative).toEqual({ re: 1, im: 0, rect: '1' })

    const shift = await apply('1', '1', '0', '1', '2+3i')
    expect(shift.w?.re).toBe(3)
    expect(shift.w?.im).toBe(3)
    expect(shift.w?.modulus).toBe(4.2426406871)
    expect(shift.w?.argumentDeg).toBe(45)
  })

  it('reports a pole instead of a huge number', async () => {
    const out = await apply('1', '1', '1', '-1', '1')
    expect(out.valid).toBe(true)
    expect(out.atPole).toBe(true)
    expect(out.w).toBeUndefined()
    expect(out.derivative).toBeUndefined()
    expect(out.note).toContain('pole')
  })

  it('reports a degenerate map as a constant instead of a bogus w', async () => {
    const out = await apply('1', 'i', 'i', '-1', '3+2i')
    expect(out.valid).toBe(true)
    expect(out.invertible).toBe(false)
    expect(out.degenerate).toBe(true)
    expect(out.determinant).toEqual({ re: 0, im: 0, rect: '0' })
    expect(out.constant).toEqual({ re: 0, im: -1, rect: '-i' })
    expect(out.w).toBeUndefined()
    expect(out.note).toContain('degenerate')
  })

  it('handles a non-unit denominator scale', async () => {
    const out = await apply('1', '-i', '2', '1', '1+2i')
    expect(out.determinant).toEqual({ re: 1, im: 2, rect: '1+2i' })
    expect(out.w?.re).toBe(0.28)
    expect(out.w?.im).toBe(-0.04)
    expect(out.w?.modulus).toBe(0.2828427125)
    expect(out.w?.argumentDeg).toBe(-8.1301023542)
    expect(out.derivative).toEqual({ re: 0.0656, im: -0.0608, rect: '0.0656-0.0608i' })
  })
})

describe('complex_mobius — inverse', () => {
  it('inverts the Cayley transform: preimage of 0.2-0.4i is 1+i', async () => {
    const out = (await run({ ...CAYLEY, operation: 'inverse', z: '0.2-0.4i' })) as MobiusOut
    assertLossless(out)
    expect(out.valid).toBe(true)
    expect(out.preimage?.re).toBe(1)
    expect(out.preimage?.im).toBe(1)
    expect(out.preimage?.modulus).toBe(1.4142135624)
    expect(out.preimage?.argumentDeg).toBe(45)
  })

  it('reports the image of infinity (a - c w = 0) as having no finite preimage', async () => {
    const out = (await run({ ...CAYLEY, operation: 'inverse', z: '1' })) as MobiusOut
    expect(out.valid).toBe(true)
    expect(out.atPole).toBe(true)
    expect(out.preimage).toBeUndefined()
    expect(out.note).toContain('point at infinity')
  })

  it('refuses to invert a degenerate map', async () => {
    const out = (await run({ a: '1', b: 'i', c: 'i', d: '-1', operation: 'inverse', z: '1' })) as MobiusOut
    expect(out.valid).toBe(false)
    expect(out.error).toContain('ad − bc = 0')
  })
})

describe('complex_mobius — fixed points', () => {
  it('finds the two fixed points of the Cayley transform', async () => {
    const out = (await run({ ...CAYLEY, operation: 'fixed_points' })) as MobiusOut
    assertLossless(out)
    expect(out.fixedPointKind).toBe('two')
    expect(out.fixedPoints?.length).toBe(2)
    const [first, second] = out.fixedPoints ?? []
    expect(first?.re).toBe(1.3660254038)
    expect(first?.im).toBe(-1.3660254038)
    expect(first?.multiplicity).toBe(1)
    expect(second?.re).toBe(-0.3660254038)
    expect(second?.im).toBe(0.3660254038)
    expect(out.excludedFixedPoints).toBeUndefined()
  })

  it('finds the two fixed points of (2z+1)/(z-i)', async () => {
    const out = (await run({ ...SECOND, operation: 'fixed_points' })) as MobiusOut
    expect(out.fixedPointKind).toBe('two')
    expect(out.fixedPoints?.[0]?.re).toBe(2.3721451157)
    expect(out.fixedPoints?.[0]?.im).toBe(0.8643929452)
    expect(out.fixedPoints?.[1]?.re).toBe(-0.3721451157)
    expect(out.fixedPoints?.[1]?.im).toBe(0.1356070548)
  })

  it('says the identity fixes every point and a translation fixes none', async () => {
    const identity = (await run({ a: '1', b: '0', c: '0', d: '1', operation: 'fixed_points' })) as MobiusOut
    expect(identity.fixedPointKind).toBe('every_point')
    expect(identity.fixedPoints).toBeUndefined()

    const translation = (await run({ a: '1', b: '1', c: '0', d: '1', operation: 'fixed_points' })) as MobiusOut
    expect(translation.fixedPointKind).toBe('none')
    expect(translation.fixedPoints).toBeUndefined()
    expect(translation.note).toContain('translation')
  })

  it('solves the linear case c = 0, a != d', async () => {
    const out = (await run({ a: '2', b: '3', c: '0', d: '1', operation: 'fixed_points' })) as MobiusOut
    expect(out.fixedPointKind).toBe('one')
    expect(out.fixedPoints).toEqual([{ re: -3, im: 0, rect: '-3', multiplicity: 1 }])
  })

  it('reports a repeated fixed point once with multiplicity 2', async () => {
    const out = (await run({ a: '0', b: '-1', c: '1', d: '2', operation: 'fixed_points' })) as MobiusOut
    expect(out.invertible).toBe(true)
    expect(out.fixedPointKind).toBe('repeated')
    expect(out.fixedPoints).toEqual([{ re: -1, im: 0, rect: '-1', multiplicity: 2 }])
    expect(out.note).toContain('repeated')
  })

  it('excludes a fixed-point root that is the pole of a degenerate map', async () => {
    const out = (await run({ a: '1', b: 'i', c: 'i', d: '-1', operation: 'fixed_points' })) as MobiusOut
    expect(out.invertible).toBe(false)
    expect(out.fixedPointKind).toBe('none')
    expect(out.fixedPoints).toBeUndefined()
    expect(out.excludedFixedPoints).toEqual([{ re: 0, im: -1, rect: '-i' }])
    expect(out.note).toContain('excludedFixedPoints')
  })
})

describe('complex_mobius — compose', () => {
  it('multiplies two transformations: M ∘ N has the product coefficients', async () => {
    const out = (await run({ ...CAYLEY, operation: 'compose', a2: '2', b2: '1', c2: '1', d2: '-i' })) as MobiusOut
    assertLossless(out)
    expect(out.valid).toBe(true)
    expect(out.operation).toBe('compose')
    expect(out.a).toBe('2-1i')
    expect(out.b).toBe('0')
    expect(out.c).toBe('2+1i')
    expect(out.d).toBe('2')
    expect(out.determinant).toEqual({ re: 4, im: -2, rect: '4-2i' })
    expect(out.invertible).toBe(true)
    expect(out.note).toContain('applies N first')
  })

  it('applies N first: the composed map at 1+2i matches the oracle', async () => {
    // (M∘N)(1+2i) = 0.7931034483-0.4827586207i (oracle section F); the composed
    // coefficients are a = 2-i, b = 0, c = 2+i, d = 2.
    const out = await apply('2-i', '0', '2+i', '2', '1+2i')
    expect(out.w?.re).toBe(0.7931034483)
    expect(out.w?.im).toBe(-0.4827586207)
  })
})

describe('complex_mobius — validation', () => {
  it('rejects a vanishing denominator (c = d = 0)', async () => {
    const out = (await run({ a: '1', b: '1', c: '0', d: '0', operation: 'apply', z: '1' })) as MobiusOut
    expect(out.valid).toBe(false)
    expect(out.error).toContain('c = d = 0')
  })

  it('rejects the all-zero quadruple', async () => {
    const out = (await run({ a: '0', b: '0', c: '0', d: '0', operation: 'fixed_points' })) as MobiusOut
    expect(out.valid).toBe(false)
    expect(out.error).toContain('undefined for every z')
  })

  it('names the offending coefficient when parsing fails', async () => {
    const out = (await run({ a: '1', b: 'x', c: '1', d: '1', operation: 'apply', z: '1' })) as MobiusOut
    expect(out.valid).toBe(false)
    expect(out.error?.startsWith('b:')).toBe(true)
  })

  it('requires z for apply and inverse', async () => {
    const out = (await run({ ...CAYLEY, operation: 'apply' })) as MobiusOut
    expect(out.valid).toBe(false)
    expect(out.error).toContain('z is required')
  })

  it('requires the whole inner quadruple for compose', async () => {
    const out = (await run({ ...CAYLEY, operation: 'compose', a2: '1' })) as MobiusOut
    expect(out.valid).toBe(false)
    expect(out.error).toContain('b2 is required')
  })

  it('rejects an unknown operation at the schema layer', async () => {
    await expect(run({ ...CAYLEY, operation: 'rotate', z: '1' })).rejects.toThrow()
  })
})

describe('complex_mobius — render', () => {
  const render = (value: unknown, args: unknown): string => {
    const blocks = tools.complex_mobius.output.render(args as never, value) as { type: string; text: string }[]
    return blocks.map((block) => block.text).join('\n')
  }

  it('renders a mapped point with its derivative', async () => {
    const out = await apply(CAYLEY.a, CAYLEY.b, CAYLEY.c, CAYLEY.d, '1+i')
    const text = render(out, { ...CAYLEY, operation: 'apply', z: '1+i' })
    expect(text).toContain('M(z) = (1 z + -i)/(1 z + i)')
    expect(text).toContain('M(1+1i) = 0.2-0.4i')
    expect(text).toContain("w' = 0.32-0.24i")
  })

  it('renders a pole as undefined', async () => {
    const out = await apply('1', '1', '1', '-1', '1')
    expect(render(out, { a: '1', b: '1', c: '1', d: '-1', operation: 'apply', z: '1' })).toContain('undefined (pole)')
  })

  it('renders fixed points and the excluded pole', async () => {
    const out = (await run({ a: '1', b: 'i', c: 'i', d: '-1', operation: 'fixed_points' })) as MobiusOut
    const text = render(out, { a: '1', b: 'i', c: 'i', d: '-1', operation: 'fixed_points' })
    expect(text).toContain('no finite fixed point')
    expect(text).toContain('excluded (pole): -i')
  })

  it('renders validation failures', async () => {
    const out = (await run({ a: '1', b: '1', c: '0', d: '0', operation: 'apply', z: '1' })) as MobiusOut
    expect(render(out, { a: '1', b: '1', c: '0', d: '0', operation: 'apply', z: '1' })).toContain('complex_mobius failed:')
  })
})
