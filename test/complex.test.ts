/**
 * Unit tests for the complex core, anchored by an independent oracle
 * (/tmp/dsh-scan/anchors-complex.py, Python stdlib cmath — the authoritative
 * reference implementation). Every anchor value below was produced by that
 * oracle, not hand-computed.
 */

import { describe, expect, it } from 'vitest'
import {
  add,
  argumentDeg,
  argumentRad,
  cleanValue,
  complexCos,
  complexCosh,
  complexExp,
  complexLog,
  complexSin,
  complexSinh,
  complexSqrt,
  complexTan,
  conjugate,
  divide,
  formatExponential,
  formatPolar,
  formatRect,
  integerPower,
  modulus,
  multiply,
  nthRoots,
  parseComplex,
  reciprocal,
  subtract,
} from '../src/complex.ts'

const P = 10

function expectClose(z: { re: number; im: number } | null, expected: [number, number]): void {
  expect(z).not.toBeNull()
  if (z === null) return
  expect(z.re).toBeCloseTo(expected[0], 8)
  expect(z.im).toBeCloseTo(expected[1], 8)
}

describe('cleanValue', () => {
  it('rounds to places and snaps dust', () => {
    expect(cleanValue(0.12345678912345, 10)).toBe(0.1234567891)
    expect(cleanValue(1e-13, 10)).toBe(0)
    expect(cleanValue(-1e-13, 10)).toBe(0)
    expect(cleanValue(3.4e-9, 10)).toBe(3.4e-9) // above snap threshold
  })

  it('kills negative zero', () => {
    expect(Object.is(cleanValue(-1e-13, 10), -0)).toBe(false)
    expect(cleanValue(-1e-13, 10)).toBe(0)
  })
})

describe('parseComplex rectangular', () => {
  const cases: Record<string, [number, number]> = {
    '3+4i': [3, 4],
    '3-4i': [3, -4],
    '-3+4i': [-3, 4],
    '-3-4i': [-3, -4],
    '3': [3, 0],
    '-2.5': [-2.5, 0],
    i: [0, 1],
    '-i': [0, -1],
    '+i': [0, 1],
    '5j': [0, 5],
    '-2i': [0, -2],
    '1e3+2e-1i': [1000, 0.2],
    '3 + 4 i': [3, 4],
    '0.5-0.25j': [0.5, -0.25],
    // implicit coefficient 1 (integer-exact, no float risk)
    '1+i': [1, 1],
    '3-i': [3, -1],
    '-2+i': [-2, 1],
  }
  for (const [input, expected] of Object.entries(cases)) {
    it(`parses "${input}"`, () => {
      const parsed = parseComplex(input, P)
      expect(parsed.valid).toBe(true)
      if (parsed.valid) {
        expect(parsed.form).toBe('rectangular')
        expect(parsed.z.re).toBeCloseTo(expected[0], 8)
        expect(parsed.z.im).toBeCloseTo(expected[1], 8)
      }
    })
  }

  const rejects = ['', '   ', '3-4', '4i3', '3+i4', '1+2i+3', '3++4i', '3+-4i', 'i3', 'abc', '3 4i', '1,2i', 'Infinity', 'NaN', '3.4.5i', '3+4i5']
  for (const input of rejects) {
    it(`rejects "${input}"`, () => {
      const parsed = parseComplex(input, P)
      expect(parsed.valid).toBe(false)
      if (!parsed.valid) expect(parsed.error.length).toBeGreaterThan(0)
    })
  }

  it('rejects non-string input', () => {
    expect(parseComplex(123 as unknown as string, P).valid).toBe(false)
  })
})

describe('parseComplex polar', () => {
  const cases: Record<string, [number, number]> = {
    '5∠53.1301023542°': [3, 4],
    '5∠53.1301023542': [3, 4],
    '2∠270°': [0, -2],
    '2 ∠ 270 deg': [0, -2],
    '1∠90': [0, 1],
    '0∠45°': [0, 0],
    '5∠-45': [3.5355339059, -3.5355339059],
  }
  for (const [input, expected] of Object.entries(cases)) {
    it(`parses "${input}"`, () => {
      const parsed = parseComplex(input, P)
      expect(parsed.valid).toBe(true)
      if (parsed.valid) {
        expect(parsed.form).toBe('polar')
        expect(parsed.z.re).toBeCloseTo(expected[0], 8)
        expect(parsed.z.im).toBeCloseTo(expected[1], 8)
      }
    })
  }

  const rejects = ['5∠', '∠90°', '5∠45rad', '-5∠45°', '5∠90°∠1']
  for (const input of rejects) {
    it(`rejects "${input}"`, () => {
      expect(parseComplex(input, P).valid).toBe(false)
    })
  }
})

describe('arithmetic (oracle anchors)', () => {
  const a = { re: 3, im: 4 }
  const b = { re: 1, im: -2 }

  it('add', () => expectClose(add(a, b), [4, 2]))
  it('subtract', () => expectClose(subtract(a, b), [2, 6]))
  it('multiply', () => expectClose(multiply(a, b), [11, -2]))
  it('divide', () => expectClose(divide(a, b), [-1, 2]))
  it('conjugate', () => expectClose(conjugate(a), [3, -4]))
  it('reciprocal', () => expectClose(reciprocal(a), [0.12, -0.16]))
  it('divide by zero returns null', () => expect(divide(a, { re: 0, im: 0 })).toBeNull())
  it('reciprocal of zero returns null', () => expect(reciprocal({ re: 0, im: 0 })).toBeNull())
})

describe('integerPower (De Moivre, oracle anchors)', () => {
  const a = { re: 3, im: 4 }
  it('(1+i)^8 = 16', () => expectClose(integerPower({ re: 1, im: 1 }, 8, 1000), [16, 0]))
  it('(1+i)^-3 = -0.25-0.25i', () => expectClose(integerPower({ re: 1, im: 1 }, -3, 1000), [-0.25, -0.25]))
  it('(5+7i)^0 = 1', () => expectClose(integerPower({ re: 5, im: 7 }, 0, 1000), [1, 0]))
  it('(-2)^3 = -8', () => expectClose(integerPower({ re: -2, im: 0 }, 3, 1000), [-8, 0]))
  it('i^9 = i (cycle)', () => expectClose(integerPower({ re: 0, im: 1 }, 9, 1000), [0, 1]))
  it('non-integer exponent rejected', () => expect(integerPower(a, 1.5, 1000)).toBeNull())
  it('exponent beyond maxPower rejected', () => expect(integerPower(a, 1001, 1000)).toBeNull())
})

describe('polar components (oracle anchors)', () => {
  const z = { re: 3, im: 4 }
  it('modulus 3+4i = 5', () => expect(modulus(z)).toBe(5))
  it('argumentRad = 0.927295218', () => expect(argumentRad(z)).toBeCloseTo(0.927295218, 8))
  it('argumentDeg = 53.1301023542', () => expect(argumentDeg(z)).toBeCloseTo(53.1301023542, 8))
  it('argument of 1-i is -45°', () => expect(argumentDeg({ re: 1, im: -1 })).toBeCloseTo(-45, 8))
  it('argument of -1 is 180°', () => expect(argumentDeg({ re: -1, im: 0 })).toBeCloseTo(180, 8))
  it('argument of 0 is 0 (undefined, reported with note)', () => expect(argumentDeg({ re: 0, im: 0 })).toBe(0))
})

describe('elementary functions, principal values (oracle anchors)', () => {
  it('exp(iπ) = -1 (Euler identity)', () => expectClose(complexExp({ re: 0, im: Math.PI }), [-1, 0]))
  it('exp(1+iπ) = -e', () => expectClose(complexExp({ re: 1, im: Math.PI }), [-2.7182818285, 0]))
  it('exp(i) = cos1 + i sin1', () => expectClose(complexExp({ re: 0, im: 1 }), [0.5403023059, 0.8414709848]))
  it('log(1+i)', () => expectClose(complexLog({ re: 1, im: 1 }), [0.3465735903, 0.7853981634]))
  it('log(-1) = iπ', () => expectClose(complexLog({ re: -1, im: 0 }), [0, 3.1415926536]))
  it('log(8) = ln 8', () => expectClose(complexLog({ re: 8, im: 0 }), [2.0794415417, 0]))
  it('log(0) is null', () => expect(complexLog({ re: 0, im: 0 })).toBeNull())
  it('sin(1+i)', () => expectClose(complexSin({ re: 1, im: 1 }), [1.2984575814, 0.6349639148]))
  it('cos(1+i)', () => expectClose(complexCos({ re: 1, im: 1 }), [0.8337300251, -0.9888977058]))
  it('tan(1+i)', () => expectClose(complexTan({ re: 1, im: 1 }), [0.2717525853, 1.0839233273]))
  it('sinh(1+i)', () => expectClose(complexSinh({ re: 1, im: 1 }), [0.6349639148, 1.2984575814]))
  it('cosh(1+i)', () => expectClose(complexCosh({ re: 1, im: 1 }), [0.8337300251, 0.9888977058]))
  it('sqrt(-4) = 2i', () => expectClose(complexSqrt({ re: -4, im: 0 }), [0, 2]))
  it('sqrt(i) = (1+i)/√2', () => expectClose(complexSqrt({ re: 0, im: 1 }), [0.7071067812, 0.7071067812]))
  it('sqrt(-0.25) = 0.5i', () => expectClose(complexSqrt({ re: -0.25, im: 0 }), [0, 0.5]))
})

describe('nthRoots (oracle anchors)', () => {
  it('4th roots of 1', () => {
    const roots = nthRoots({ re: 1, im: 0 }, 4)
    expect(roots).toHaveLength(4)
    expectClose(roots[0] ?? null, [1, 0])
    expectClose(roots[1] ?? null, [0, 1])
    expectClose(roots[2] ?? null, [-1, 0])
    expectClose(roots[3] ?? null, [0, -1])
  })

  it('cube roots of -8 (k-order from principal argument)', () => {
    const roots = nthRoots({ re: -8, im: 0 }, 3)
    expect(roots).toHaveLength(3)
    expectClose(roots[0] ?? null, [1, 1.7320508076])
    expectClose(roots[1] ?? null, [-2, 0])
    expectClose(roots[2] ?? null, [1, -1.7320508076])
  })

  it('square roots of i', () => {
    const roots = nthRoots({ re: 0, im: 1 }, 2)
    expectClose(roots[0] ?? null, [0.7071067812, 0.7071067812])
    expectClose(roots[1] ?? null, [-0.7071067812, -0.7071067812])
  })

  it('1st root of 1 is 1', () => {
    const roots = nthRoots({ re: 1, im: 0 }, 1)
    expect(roots).toHaveLength(1)
    expectClose(roots[0] ?? null, [1, 0])
  })

  it('roots of 0 are all 0', () => {
    const roots = nthRoots({ re: 0, im: 0 }, 3)
    expect(roots).toHaveLength(3)
    for (const z of roots) expectClose(z, [0, 0])
  })
})

describe('formatters', () => {
  it('rectangular', () => {
    expect(formatRect({ re: 3, im: 4 }, P)).toBe('3+4i')
    expect(formatRect({ re: 3, im: -4 }, P)).toBe('3-4i')
    expect(formatRect({ re: -3, im: 4 }, P)).toBe('-3+4i')
    expect(formatRect({ re: 0, im: 2 }, P)).toBe('2i')
    expect(formatRect({ re: 0, im: -1 }, P)).toBe('-i')
    expect(formatRect({ re: 5, im: 0 }, P)).toBe('5')
    expect(formatRect({ re: 0, im: 0 }, P)).toBe('0')
  })

  it('polar and exponential', () => {
    expect(formatPolar({ re: 3, im: 4 }, P)).toBe('5∠53.1301023542°')
    expect(formatExponential({ re: 3, im: 4 }, P)).toBe('5·e^(i·0.927295218)')
  })
})
