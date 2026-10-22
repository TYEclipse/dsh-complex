/**
 * complex_poly v0.3.0 — polynomial evaluation (Horner, with the derivative) and
 * root finding (Durand–Kerner), including multiplicity clustering, leading-zero
 * trimming, the degree limit and honest non-convergence reporting.
 *
 * ORACLE: test/oracle/anchors.py
 *   Section E prints every number asserted here: evaluation values and
 *   derivatives from a direct power sum (the implementation uses Horner), and
 *   the root sets from closed forms (n-th roots of unity, the quadratic
 *   formula, and expanded products of known integer roots) with each root
 *   re-substituted into p (residual) plus the Vieta sum/product invariants.
 */

import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/index.ts'
import { buildComplexTools } from '../src/tools.ts'
import { assertLossless } from './helpers/lossless-json.ts'

const tools = buildComplexTools(resolveConfig({}))

type Exec = (args: unknown) => Promise<unknown>
const run = (args: unknown): Promise<unknown> => (tools.complex_poly.execute as Exec)(args)

interface Point {
  re: number
  im: number
  rect: string
}

interface RootEntry extends Point {
  multiplicity: number
  residual: number
}

interface PolyOut {
  valid: boolean
  error?: string
  operation?: string
  degree?: number
  trimmedLeadingZeros?: number
  z?: string
  value?: Point
  derivative?: Point
  roots?: RootEntry[]
  count?: number
  distinctCount?: number
  converged?: boolean
  iterations?: number
  maxResidual?: number
  note?: string
}

async function evaluate(coefficients: string[], z: string): Promise<PolyOut> {
  const out = (await run({ coefficients, operation: 'evaluate', z })) as PolyOut
  assertLossless(out)
  return out
}

async function rootsOf(coefficients: string[]): Promise<PolyOut> {
  const out = (await run({ coefficients, operation: 'roots' })) as PolyOut
  assertLossless(out)
  return out
}

/**
 * Root order is "ascending by real then imaginary part", but the near-zero
 * components of ±i-style roots are round-off (|x| ~ 1e-17) and their sign must
 * not decide the order — so compare on the rounded coordinates.
 */
function sorted(entries: RootEntry[]): RootEntry[] {
  return [...entries].sort((a, b) => {
    const ar = Math.round(a.re * 1e8)
    const br = Math.round(b.re * 1e8)
    if (ar !== br) return ar - br
    return Math.round(a.im * 1e8) - Math.round(b.im * 1e8)
  })
}

function expectRoots(actual: RootEntry[] | undefined, expected: [number, number, number][]): void {
  expect(actual).toBeDefined()
  const list = sorted(actual as RootEntry[])
  expect(list).toHaveLength(expected.length)
  list.forEach((entry, i) => {
    const anchor = expected[i] as [number, number, number]
    expect(entry.re).toBeCloseTo(anchor[0], 8)
    expect(entry.im).toBeCloseTo(anchor[1], 8)
    expect(entry.multiplicity).toBe(anchor[2])
    expect(entry.residual).toBeLessThanOrEqual(1e-9)
  })
}

describe('complex_poly evaluate (Horner)', () => {
  it('evaluates z^2 - 1 at 1+i and reports the derivative', async () => {
    const out = await evaluate(['1', '0', '-1'], '1+i')
    expect(out.valid).toBe(true)
    expect(out.operation).toBe('evaluate')
    expect(out.degree).toBe(2)
    expect(out.trimmedLeadingZeros).toBe(0)
    expect(out.z).toBe('1+1i')
    expect(out.value?.re).toBeCloseTo(-1, 9)
    expect(out.value?.im).toBeCloseTo(2, 9)
    expect(out.value?.rect).toBe('-1+2i')
    expect(out.derivative?.re).toBeCloseTo(2, 9)
    expect(out.derivative?.im).toBeCloseTo(2, 9)
    expect(out.derivative?.rect).toBe('2+2i')
    expect(out.note).toBeUndefined()
  })

  it('returns an exact zero at a root and the derivative there', async () => {
    const out = await evaluate(['1', '-6', '11', '-6'], '2')
    expect(out.value?.re).toBe(0)
    expect(out.value?.im).toBe(0)
    expect(out.value?.rect).toBe('0')
    expect(out.derivative?.re).toBeCloseTo(-1, 9)
    expect(out.derivative?.im).toBeCloseTo(0, 9)
  })

  it('handles complex coefficients and a complex argument', async () => {
    const out = await evaluate(['2', '-1', '1', '-4'], 'i')
    expect(out.value?.re).toBeCloseTo(-3, 9)
    expect(out.value?.im).toBeCloseTo(-1, 9)
    expect(out.derivative?.re).toBeCloseTo(-5, 9)
    expect(out.derivative?.im).toBeCloseTo(-2, 9)
  })

  it('evaluates z^2 + i z + 1 at -2i', async () => {
    const out = await evaluate(['1', '1j', '1'], '-2i')
    expect(out.value?.re).toBeCloseTo(-1, 9)
    expect(out.value?.im).toBeCloseTo(0, 9)
    expect(out.derivative?.rect).toBe('-3i')
  })

  it('trims leading zero coefficients and reports the effective degree', async () => {
    const out = await evaluate(['0', '1', '-1'], '3')
    expect(out.degree).toBe(1)
    expect(out.trimmedLeadingZeros).toBe(1)
    expect(out.value?.re).toBeCloseTo(2, 9)
    expect(out.derivative?.re).toBeCloseTo(1, 9)
    expect(out.note).toContain('trimmed 1 leading zero')
  })

  it('evaluates a polynomial that trims down to a constant', async () => {
    const out = await evaluate(['0', '5'], '2')
    expect(out.valid).toBe(true)
    expect(out.degree).toBe(0)
    expect(out.value?.rect).toBe('5')
    expect(out.derivative?.rect).toBe('0')
  })

  it('requires z for the evaluate operation', async () => {
    const out = (await run({ coefficients: ['1', '0', '-1'], operation: 'evaluate' })) as PolyOut
    assertLossless(out)
    expect(out.valid).toBe(false)
    expect(out.error).toContain('z is required')
  })

  it('rejects a malformed evaluation point', async () => {
    const out = await evaluate(['1', '0', '-1'], 'two')
    expect(out.valid).toBe(false)
    expect(out.error).toContain('unrecognized complex number')
  })
})

describe('complex_poly roots (Durand–Kerner)', () => {
  it('solves z^2 - 1', async () => {
    const out = await rootsOf(['1', '0', '-1'])
    expect(out.valid).toBe(true)
    expect(out.operation).toBe('roots')
    expect(out.converged).toBe(true)
    expect(out.count).toBe(2)
    expect(out.distinctCount).toBe(2)
    expect(out.maxResidual).toBeLessThanOrEqual(1e-9)
    expectRoots(out.roots, [
      [-1, 0, 1],
      [1, 0, 1],
    ])
  })

  it('solves z^3 - 1 (cube roots of unity)', async () => {
    const out = await rootsOf(['1', '0', '0', '-1'])
    expect(out.count).toBe(3)
    expectRoots(out.roots, [
      [-0.5, -0.8660254038, 1],
      [-0.5, 0.8660254038, 1],
      [1, 0, 1],
    ])
  })

  it('solves z^4 - 1 (fourth roots of unity) and keeps the exact rect forms', async () => {
    const out = await rootsOf(['1', '0', '0', '0', '-1'])
    expect(out.count).toBe(4)
    expectRoots(out.roots, [
      [-1, 0, 1],
      [0, -1, 1],
      [0, 1, 1],
      [1, 0, 1],
    ])
    const rects = sorted(out.roots as RootEntry[]).map((r) => r.rect)
    expect(rects).toEqual(['-1', '-i', 'i', '1'])
  })

  it('reports a double root once with multiplicity 2', async () => {
    const out = await rootsOf(['1', '-2', '1'])
    expect(out.count).toBe(2)
    expect(out.distinctCount).toBe(1)
    expectRoots(out.roots, [[1, 0, 2]])
    expect(out.note).toContain('multiplicity')
  })

  it('solves z^2 + i z + 1 with complex coefficients', async () => {
    const out = await rootsOf(['1', '1j', '1'])
    expect(out.converged).toBe(true)
    expectRoots(out.roots, [
      [0, -1.6180339887, 1],
      [0, 0.6180339887, 1],
    ])
  })

  it('recovers integer roots of (z-1)(z-2)(z-3)', async () => {
    const out = await rootsOf(['1', '-6', '11', '-6'])
    expectRoots(out.roots, [
      [1, 0, 1],
      [2, 0, 1],
      [3, 0, 1],
    ])
  })

  it('recovers integer roots of (z-1)(z-2)(z-3)(z-4)', async () => {
    const out = await rootsOf(['1', '-10', '35', '-50', '24'])
    expect(out.count).toBe(4)
    expect(out.converged).toBe(true)
    expectRoots(out.roots, [
      [1, 0, 1],
      [2, 0, 1],
      [3, 0, 1],
      [4, 0, 1],
    ])
  })

  it('solves z^2 + 1 in either order and reports pure imaginary roots', async () => {
    const out = await rootsOf(['1', '0', '1'])
    expectRoots(out.roots, [
      [0, -1, 1],
      [0, 1, 1],
    ])
  })

  it('trims a leading zero before solving', async () => {
    const out = await rootsOf(['0', '1', '-1'])
    expect(out.degree).toBe(1)
    expect(out.trimmedLeadingZeros).toBe(1)
    expect(out.count).toBe(1)
    expect(out.note).toContain('trimmed 1 leading zero')
    expectRoots(out.roots, [[1, 0, 1]])
  })

  it('rejects the zero polynomial', async () => {
    const out = await rootsOf(['0', '0', '0'])
    expect(out.valid).toBe(false)
    expect(out.error).toContain('zero polynomial')
  })

  it('rejects a non-zero constant (no roots at all)', async () => {
    const out = await rootsOf(['0', '7'])
    expect(out.valid).toBe(false)
    expect(out.error).toContain('non-zero constant')
  })

  it('accepts degree 12 and rejects degree 13', async () => {
    const atLimit = Array.from({ length: 13 }, () => '1')
    const ok = await rootsOf(atLimit)
    expect(ok.valid).toBe(true)
    expect(ok.degree).toBe(12)
    const overLimit = Array.from({ length: 14 }, () => '1')
    const out = await rootsOf(overLimit)
    expect(out.valid).toBe(false)
    expect(out.error).toContain('degree limit 12')
  })

  it('needs at least two coefficients', async () => {
    const out = await rootsOf(['1'])
    expect(out.valid).toBe(false)
    expect(out.error).toContain('at least 2')
  })

  it('labels a malformed coefficient by its index', async () => {
    const out = await rootsOf(['1', 'x', '1'])
    expect(out.valid).toBe(false)
    expect(out.error).toContain('coefficient[1]')
  })

  it('rejects an unknown operation at the schema layer', async () => {
    await expect(run({ coefficients: ['1', '0', '-1'], operation: 'factor' })).rejects.toThrow()
  })
})

describe('complex_poly rendering', () => {
  it('renders the evaluation line', async () => {
    const out = await evaluate(['1', '0', '-1'], '1+i')
    const blocks = tools.complex_poly.output.render({ coefficients: ['1', '0', '-1'], operation: 'evaluate', z: '1+i' }, out) as {
      type: string
      text: string
    }[]
    const text = blocks.map((b) => b.text).join('\n')
    expect(text).toContain('degree 2: p(1+1i) = -1+2i')
    expect(text).toContain("p'(1+1i) = 2+2i")
  })

  it('renders the root list with multiplicity and convergence', async () => {
    const out = await rootsOf(['1', '-2', '1'])
    const blocks = tools.complex_poly.output.render({ coefficients: ['1', '-2', '1'], operation: 'roots' }, out) as {
      type: string
      text: string
    }[]
    const text = blocks.map((b) => b.text).join('\n')
    expect(text).toContain('2 root(s) in 1 distinct value(s)')
    expect(text).toContain('converged in')
    expect(text).toContain('(×2)')
  })

  it('renders a failed call without throwing', async () => {
    const out = (await run({ coefficients: ['0', '0'], operation: 'roots' })) as PolyOut
    const blocks = tools.complex_poly.output.render({ coefficients: ['0', '0'], operation: 'roots' }, out) as {
      type: string
      text: string
    }[]
    expect(blocks.map((b) => b.text).join('\n')).toContain('complex_poly failed')
  })
})
