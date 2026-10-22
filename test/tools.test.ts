/**
 * Tests for tool definition assembly, config resolution, execute paths,
 * schema-level enum rejection, and lossless-JSON discipline.
 *
 * ORACLE: test/oracle/anchors.py
 */

import { describe, expect, it } from 'vitest'
import { resolveConfig } from '../src/index.ts'
import { buildComplexTools } from '../src/tools.ts'
import { assertLossless } from './helpers/lossless-json.ts'

type Exec = (args: unknown) => Promise<unknown>


function renderText(value: unknown, definition: { output: { render: (args: unknown, value: unknown) => unknown } }, args: unknown): string {
  const rendered = definition.output.render(args, value) as { type: string; text: string }[]
  return rendered.map((block) => block.text).join('\n')
}

describe('resolveConfig', () => {
  it('applies every default', () => {
    expect(resolveConfig({})).toEqual({ roundPlaces: 10 })
  })

  it('honours overrides', () => {
    expect(resolveConfig({ roundPlaces: 3 })).toEqual({ roundPlaces: 3 })
  })
})

describe('buildComplexTools', () => {
  const tools = buildComplexTools(resolveConfig({}))

  it('exposes all seven tools under their canonical names', () => {
    expect(Object.keys(tools).sort()).toEqual(
      ['complex_calc', 'complex_convert', 'complex_functions', 'complex_parse', 'complex_poly', 'complex_quadratic', 'complex_roots'].sort(),
    )
  })

  it('gives every tool a name, description, schema and executable', () => {
    for (const [key, definition] of Object.entries(tools)) {
      expect(definition.name).toBe(key)
      expect(definition.description.length).toBeGreaterThan(20)
      expect(definition.parameters).toBeDefined()
      expect(definition.output.schema).toBeDefined()
      expect(typeof definition.execute).toBe('function')
    }
  })
})

describe('complex_parse execute', () => {
  const tools = buildComplexTools(resolveConfig({}))
  const run = tools.complex_parse.execute as unknown as Exec

  it('parses 3+4i into the full summary (oracle anchors)', async () => {
    const result = await run({ input: '3+4i' }) as Record<string, unknown>
    assertLossless(result)
    expect(result.valid).toBe(true)
    expect(result.form).toBe('rectangular')
    expect(result.re).toBe(3)
    expect(result.im).toBe(4)
    expect(result.rect).toBe('3+4i')
    expect(result.modulus).toBe(5)
    expect(result.argumentRad).toBeCloseTo(0.927295218, 8)
    expect(result.argumentDeg).toBeCloseTo(53.1301023542, 8)
    expect(result.polar).toBe('5∠53.1301023542°')
    expect(result.exponential).toBe('5·e^(i·0.927295218)')
    expect(result.conjugate).toBe('3-4i')
    expect('note' in result).toBe(false)
  })

  it('parses polar input and flags the form', async () => {
    const result = await run({ input: '5∠53.1301023542°' }) as Record<string, unknown>
    expect(result.valid).toBe(true)
    expect(result.form).toBe('polar')
    expect(result.re).toBeCloseTo(3, 8)
    expect(result.im).toBeCloseTo(4, 8)
    expect(result.rect).toBe('3+4i')
  })

  it('reports the note when the argument is undefined (zero modulus)', async () => {
    const result = await run({ input: '0∠45°' }) as Record<string, unknown>
    expect(result.valid).toBe(true)
    expect(result.modulus).toBe(0)
    expect(typeof result.note).toBe('string')
  })

  it('rejects malformed input with a helpful error', async () => {
    const result = await run({ input: '3-4' }) as Record<string, unknown>
    assertLossless(result)
    expect(result.valid).toBe(false)
    expect(typeof result.error).toBe('string')
  })

  it('renders a one-line summary', async () => {
    const value = await run({ input: '3+4i' })
    const text = renderText(value, tools.complex_parse, { input: '3+4i' })
    expect(text).toContain('3+4i')
    expect(text).toContain('53.1301023542')
  })
})

describe('complex_calc execute', () => {
  const tools = buildComplexTools(resolveConfig({}))
  const run = tools.complex_calc.execute as unknown as Exec

  it('add: (3+4i)+(1-2i) = 4+2i', async () => {
    const result = await run({ a: '3+4i', b: '1-2i', operation: 'add' }) as Record<string, unknown>
    assertLossless(result)
    expect(result.valid).toBe(true)
    const r = result.result as Record<string, unknown>
    expect(r.re).toBeCloseTo(4, 8)
    expect(r.im).toBeCloseTo(2, 8)
    expect(r.rect).toBe('4+2i')
  })

  it('multiply: (3+4i)(1-2i) = 11-2i', async () => {
    const result = await run({ a: '3+4i', b: '1-2i', operation: 'multiply' }) as Record<string, unknown>
    const r = result.result as Record<string, unknown>
    expect(r.rect).toBe('11-2i')
  })

  it('divide: (3+4i)/(1-2i) = -1+2i', async () => {
    const result = await run({ a: '3+4i', b: '1-2i', operation: 'divide' }) as Record<string, unknown>
    const r = result.result as Record<string, unknown>
    expect(r.rect).toBe('-1+2i')
  })

  it('power: (1+i)^8 = 16', async () => {
    const result = await run({ a: '1+i', exponent: 8, operation: 'power' }) as Record<string, unknown>
    assertLossless(result)
    expect(result.valid).toBe(true)
    const r = result.result as Record<string, unknown>
    expect(r.re).toBeCloseTo(16, 8)
    expect(r.im).toBeCloseTo(0, 8)
    expect(r.rect).toBe('16')
  })

  it('power requires an integer exponent', async () => {
    const result = await run({ a: '1+i', operation: 'power' }) as Record<string, unknown>
    expect(result.valid).toBe(false)
  })

  it('divide by zero is an honest error', async () => {
    const result = await run({ a: '1', b: '0', operation: 'divide' }) as Record<string, unknown>
    expect(result.valid).toBe(false)
    expect((result.error as string).length).toBeGreaterThan(0)
  })

  it('requires b for binary operations', async () => {
    const result = await run({ a: '1', operation: 'add' }) as Record<string, unknown>
    expect(result.valid).toBe(false)
  })

  it('rejects an unknown operation at the schema layer', async () => {
    await expect(run({ a: '1', b: '1', operation: 'bogus' })).rejects.toThrow()
  })
})

describe('complex_convert execute', () => {
  const tools = buildComplexTools(resolveConfig({}))
  const run = tools.complex_convert.execute as unknown as Exec

  it('to_polar on 3+4i (oracle anchors)', async () => {
    const result = await run({ input: '3+4i', operation: 'to_polar' }) as Record<string, unknown>
    assertLossless(result)
    expect(result.valid).toBe(true)
    expect(result.modulus).toBe(5)
    expect(result.argumentRad).toBeCloseTo(0.927295218, 8)
    expect(result.argumentDeg).toBeCloseTo(53.1301023542, 8)
    expect(result.polar).toBe('5∠53.1301023542°')
    expect(result.exponential).toBe('5·e^(i·0.927295218)')
  })

  it('to_rect on polar input', async () => {
    const result = await run({ input: '2∠270°', operation: 'to_rect' }) as Record<string, unknown>
    assertLossless(result)
    expect(result.valid).toBe(true)
    expect(result.re).toBeCloseTo(0, 8)
    expect(result.im).toBeCloseTo(-2, 8)
    expect(result.rect).toBe('-2i')
  })

  it('to_rect refuses rectangular input', async () => {
    const result = await run({ input: '3+4i', operation: 'to_rect' }) as Record<string, unknown>
    expect(result.valid).toBe(false)
  })

  it('rejects an unknown operation at the schema layer', async () => {
    await expect(run({ input: '3+4i', operation: 'bogus' })).rejects.toThrow()
  })
})

describe('complex_functions execute', () => {
  const tools = buildComplexTools(resolveConfig({}))
  const run = tools.complex_functions.execute as unknown as Exec

  it('exp(iπ) = -1 (Euler identity)', async () => {
    const result = await run({ input: '3.141592653589793i', operation: 'exp' }) as Record<string, unknown>
    const r = result.result as Record<string, unknown>
    expect(r.re).toBeCloseTo(-1, 6)
    expect(r.im).toBeCloseTo(0, 6)
  })

  it('log(-1) = iπ on the principal branch', async () => {
    const result = await run({ input: '-1', operation: 'log' }) as Record<string, unknown>
    assertLossless(result)
    const r = result.result as Record<string, unknown>
    expect(r.re).toBeCloseTo(0, 8)
    expect(r.im).toBeCloseTo(3.1415926536, 8)
    expect((result.note as string).length).toBeGreaterThan(0) // branch note
  })

  it('sqrt(-4) = 2i', async () => {
    const result = await run({ input: '-4', operation: 'sqrt' }) as Record<string, unknown>
    const r = result.result as Record<string, unknown>
    expect(r.re).toBeCloseTo(0, 8)
    expect(r.im).toBeCloseTo(2, 8)
    expect(r.rect).toBe('2i')
  })

  it('sin/cos/sinh/cosh anchors', async () => {
    const sin = await run({ input: '1+i', operation: 'sin' }) as Record<string, unknown>
    const sr = sin.result as Record<string, unknown>
    expect(sr.re).toBeCloseTo(1.2984575814, 8)
    expect(sr.im).toBeCloseTo(0.6349639148, 8)
    const cos = await run({ input: '1+i', operation: 'cos' }) as Record<string, unknown>
    const cr = cos.result as Record<string, unknown>
    expect(cr.re).toBeCloseTo(0.8337300251, 8)
    expect(cr.im).toBeCloseTo(-0.9888977058, 8)
    const sinh = await run({ input: '1+i', operation: 'sinh' }) as Record<string, unknown>
    const shr = sinh.result as Record<string, unknown>
    expect(shr.re).toBeCloseTo(0.6349639148, 8)
    expect(shr.im).toBeCloseTo(1.2984575814, 8)
    const cosh = await run({ input: '1+i', operation: 'cosh' }) as Record<string, unknown>
    const chr = cosh.result as Record<string, unknown>
    expect(chr.re).toBeCloseTo(0.8337300251, 8)
    expect(chr.im).toBeCloseTo(0.9888977058, 8)
  })

  it('tan(1+i) anchor', async () => {
    const result = await run({ input: '1+i', operation: 'tan' }) as Record<string, unknown>
    const r = result.result as Record<string, unknown>
    expect(r.re).toBeCloseTo(0.2717525853, 8)
    expect(r.im).toBeCloseTo(1.0839233273, 8)
  })

  it('log(0) is an honest error', async () => {
    const result = await run({ input: '0', operation: 'log' }) as Record<string, unknown>
    expect(result.valid).toBe(false)
  })

  it('rejects an unknown function at the schema layer', async () => {
    await expect(run({ input: '1+i', operation: 'arccos' })).rejects.toThrow()
  })
})

describe('complex_roots execute', () => {
  const tools = buildComplexTools(resolveConfig({}))
  const run = tools.complex_roots.execute as unknown as Exec

  it('4th roots of 1 (roots of unity)', async () => {
    const result = await run({ input: '1', n: 4 }) as Record<string, unknown>
    assertLossless(result)
    expect(result.valid).toBe(true)
    const roots = result.roots as { re: number; im: number; rect: string }[]
    expect(roots).toHaveLength(4)
    expect(roots[0]?.rect).toBe('1')
    expect(roots[1]?.rect).toBe('i')
    expect(roots[2]?.rect).toBe('-1')
    expect(roots[3]?.rect).toBe('-i')
  })

  it('cube roots of -8 (oracle anchors, k-order)', async () => {
    const result = await run({ input: '-8', n: 3 }) as Record<string, unknown>
    const roots = result.roots as { re: number; im: number; rect: string }[]
    expect(roots).toHaveLength(3)
    expect(roots[0]?.re).toBeCloseTo(1, 8)
    expect(roots[0]?.im).toBeCloseTo(1.7320508076, 8)
    expect(roots[1]?.re).toBeCloseTo(-2, 8)
    expect(roots[1]?.im).toBeCloseTo(0, 8)
    expect(roots[2]?.re).toBeCloseTo(1, 8)
    expect(roots[2]?.im).toBeCloseTo(-1.7320508076, 8)
  })

  it('rejects n outside 1..64', async () => {
    for (const n of [0, -1, 65, 2.5]) {
      const result = await run({ input: '1', n }) as Record<string, unknown>
      assertLossless(result)
      expect(result.valid).toBe(false)
    }
  })

  it('renders the root list', async () => {
    const value = await run({ input: '1', n: 4 })
    const text = renderText(value, tools.complex_roots, { input: '1', n: 4 })
    expect(text).toContain('the 4 roots of 1')
    expect(text).toContain('-i')
  })
})

describe('complex_calc pow (general complex power, oracle anchors)', () => {
  const tools = buildComplexTools(resolveConfig({}))
  const run = tools.complex_calc.execute as unknown as Exec

  it('(1+i)^(1-i) = 2.8078792973+1.3178651729i', async () => {
    const result = await run({ a: '1+i', b: '1-i', operation: 'pow' }) as Record<string, unknown>
    assertLossless(result)
    expect(result.valid).toBe(true)
    const r = result.result as Record<string, unknown>
    expect(r.re).toBeCloseTo(2.8078792973, 8)
    expect(r.im).toBeCloseTo(1.3178651729, 8)
  })

  it('i^i = 0.2078795764 (Euler, real)', async () => {
    const result = await run({ a: 'i', b: 'i', operation: 'pow' }) as Record<string, unknown>
    const r = result.result as Record<string, unknown>
    expect(r.re).toBeCloseTo(0.2078795764, 8)
    expect(r.im).toBeCloseTo(0, 8)
    expect(r.rect).toBe('0.2078795764')
  })

  it('2^(1+i) = 1.5384778027+1.2779225526i', async () => {
    const result = await run({ a: '2', b: '1+i', operation: 'pow' }) as Record<string, unknown>
    const r = result.result as Record<string, unknown>
    expect(r.re).toBeCloseTo(1.5384778027, 8)
    expect(r.im).toBeCloseTo(1.2779225526, 8)
  })

  it('(-1)^0.5 = i on the principal branch', async () => {
    const result = await run({ a: '-1', b: '0.5', operation: 'pow' }) as Record<string, unknown>
    const r = result.result as Record<string, unknown>
    expect(r.rect).toBe('i')
  })

  it('requires the exponent b', async () => {
    const result = await run({ a: '2', operation: 'pow' }) as Record<string, unknown>
    expect(result.valid).toBe(false)
    expect(result.error as string).toContain('exponent')
  })

  it('0^(positive real) = 0, but 0^0 and 0^(negative) are honest errors', async () => {
    const ok = await run({ a: '0', b: '2', operation: 'pow' }) as Record<string, unknown>
    expect(ok.valid).toBe(true)
    expect((ok.result as Record<string, unknown>).rect).toBe('0')
    for (const b of ['0', '-1', 'i']) {
      const bad = await run({ a: '0', b, operation: 'pow' }) as Record<string, unknown>
      assertLossless(bad)
      expect(bad.valid).toBe(false)
    }
  })

  it('renders the power result', async () => {
    const value = await run({ a: 'i', b: 'i', operation: 'pow' })
    const text = renderText(value, tools.complex_calc, { a: 'i', b: 'i', operation: 'pow' })
    expect(text).toContain('pow')
    expect(text).toContain('0.2078795764')
  })
})

describe('complex_functions inverse family (cmath branch anchors)', () => {
  const tools = buildComplexTools(resolveConfig({}))
  const run = tools.complex_functions.execute as unknown as Exec

  it('asin(1+i) with a branch note', async () => {
    const result = await run({ input: '1+i', operation: 'asin' }) as Record<string, unknown>
    assertLossless(result)
    expect(result.valid).toBe(true)
    expect(result.function).toBe('asin')
    const r = result.result as Record<string, unknown>
    expect(r.re).toBeCloseTo(0.6662394325, 8)
    expect(r.im).toBeCloseTo(1.0612750619, 8)
    expect((result.note as string)).toContain('principal branch')
  })

  it('asin(2) crosses the real cut to π/2 + 1.3169578969i', async () => {
    const result = await run({ input: '2', operation: 'asin' }) as Record<string, unknown>
    const r = result.result as Record<string, unknown>
    expect(r.re).toBeCloseTo(1.5707963268, 8)
    expect(r.im).toBeCloseTo(1.3169578969, 8)
  })

  it('acos / atan / asinh / acosh / atanh anchors on 1+i and 2i', async () => {
    const acos = await run({ input: '1+i', operation: 'acos' }) as Record<string, unknown>
    const ar = acos.result as Record<string, unknown>
    expect(ar.re).toBeCloseTo(0.9045568943, 8)
    expect(ar.im).toBeCloseTo(-1.0612750619, 8)

    const atan = await run({ input: '2i', operation: 'atan' }) as Record<string, unknown>
    const tr = atan.result as Record<string, unknown>
    expect(tr.re).toBeCloseTo(1.5707963268, 8)
    expect(tr.im).toBeCloseTo(0.5493061443, 8)

    const asinh = await run({ input: '1+i', operation: 'asinh' }) as Record<string, unknown>
    const shr = asinh.result as Record<string, unknown>
    expect(shr.re).toBeCloseTo(1.0612750619, 8)
    expect(shr.im).toBeCloseTo(0.6662394325, 8)

    const acosh = await run({ input: '-2', operation: 'acosh' }) as Record<string, unknown>
    const chr = acosh.result as Record<string, unknown>
    expect(chr.re).toBeCloseTo(1.3169578969, 8)
    expect(chr.im).toBeCloseTo(3.1415926536, 8)

    const atanh = await run({ input: '1+i', operation: 'atanh' }) as Record<string, unknown>
    const thr = atanh.result as Record<string, unknown>
    expect(thr.re).toBeCloseTo(0.4023594781, 8)
    expect(thr.im).toBeCloseTo(1.0172219679, 8)
  })

  it('branch cuts through the tool path (parser yields re = +0 for "3i")', async () => {
    const asin3 = await run({ input: '3', operation: 'asin' }) as Record<string, unknown>
    const a3 = asin3.result as Record<string, unknown>
    expect(a3.re).toBeCloseTo(1.5707963268, 8)
    expect(a3.im).toBeCloseTo(1.762747174, 8)

    const atanNeg = await run({ input: '-2i', operation: 'atan' }) as Record<string, unknown>
    const tn = atanNeg.result as Record<string, unknown>
    expect(tn.re).toBeCloseTo(1.5707963268, 8)
    expect(tn.im).toBeCloseTo(-0.5493061443, 8)

    const atanh4 = await run({ input: '4', operation: 'atanh' }) as Record<string, unknown>
    const th = atanh4.result as Record<string, unknown>
    expect(th.re).toBeCloseTo(0.2554128119, 8)
    expect(th.im).toBeCloseTo(1.5707963268, 8)
  })

  it('atan(±i) and atanh(±1) report an honest, specific error', async () => {
    const atan = await run({ input: 'i', operation: 'atan' }) as Record<string, unknown>
    assertLossless(atan)
    expect(atan.valid).toBe(false)
    expect(atan.error as string).toContain('undefined')

    const atanh = await run({ input: '1', operation: 'atanh' }) as Record<string, unknown>
    expect(atanh.valid).toBe(false)
    expect(atanh.error as string).toContain('undefined')
  })
})

describe('complex_quadratic execute (oracle anchors)', () => {
  const tools = buildComplexTools(resolveConfig({}))
  const run = tools.complex_quadratic.execute as unknown as Exec

  it('z^2 + i z + 1 = 0 (complex coefficients) with zero residuals and Vieta invariants', async () => {
    const result = await run({ a: '1', b: 'i', c: '1' }) as Record<string, unknown>
    assertLossless(result)
    expect(result.valid).toBe(true)
    expect(result.degree).toBe(2)
    expect(result.count).toBe(2)
    expect((result.discriminant as Record<string, unknown>).rect).toBe('-5')
    expect((result.sum as Record<string, unknown>).rect).toBe('-i')
    expect((result.product as Record<string, unknown>).rect).toBe('1')
    const roots = result.roots as { rect: string; residual: number; re: number; im: number }[]
    expect(roots[0]?.rect).toBe('0.6180339887i')
    expect(roots[1]?.rect).toBe('-1.6180339887i')
    for (const root of roots) expect(root.residual).toBe(0)
  })

  it('2z^2 - 4z + 5 = 0 -> 1 ± 1.2247448714i', async () => {
    const result = await run({ a: '2', b: '-4', c: '5' }) as Record<string, unknown>
    const roots = result.roots as { re: number; im: number; rect: string }[]
    expect(roots[0]?.re).toBeCloseTo(1, 8)
    expect(roots[0]?.im).toBeCloseTo(1.2247448714, 8)
    expect(roots[1]?.rect).toBe('1-1.2247448714i')
  })

  it('a = 0 degrades to a linear equation with a note', async () => {
    const result = await run({ a: '0', b: '2', c: '-4' }) as Record<string, unknown>
    assertLossless(result)
    expect(result.valid).toBe(true)
    expect(result.degree).toBe(1)
    expect(result.count).toBe(1)
    expect((result.roots as { rect: string }[])[0]?.rect).toBe('2')
    expect(result.note as string).toContain('linear')
  })

  it('a = b = 0 says "every z" (c = 0) or "no solution" (c ≠ 0) instead of inventing roots', async () => {
    const every = await run({ a: '0', b: '0', c: '0' }) as Record<string, unknown>
    assertLossless(every)
    expect(every.degree).toBe(0)
    expect(every.count).toBe(0)
    expect(every.note as string).toContain('every complex number')

    const none = await run({ a: '0', b: '0', c: '1' }) as Record<string, unknown>
    expect(none.degree).toBe(0)
    expect(none.note as string).toContain('no complex number')
  })

  it('rejects a malformed coefficient with a labelled error', async () => {
    const result = await run({ a: '1', b: 'oops', c: '1' }) as Record<string, unknown>
    assertLossless(result)
    expect(result.valid).toBe(false)
    expect(result.error as string).toMatch(/^b:/)
  })

  it('renders the equation, roots and invariants', async () => {
    const value = await run({ a: '1', b: '-2', c: '2' })
    const text = renderText(value, tools.complex_quadratic, { a: '1', b: '-2', c: '2' })
    expect(text).toContain('1 z^2 + -2 z + 2 = 0')
    expect(text).toContain('1+1i')
    expect(text).toContain('product c/a = 2')
  })
})
