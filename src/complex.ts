/**
 * dsh-complex complex-number core: parsing, formatting, and closed-form
 * complex arithmetic on the principal branch. Zero runtime dependencies —
 * pure Math.* local computation, no network, no processes, no eval.
 *
 * Number hygiene (R28 discipline): every computation step keeps the raw
 * IEEE double (dust ~1e-16); `cleanValue` rounds/snaps only at the output
 * boundary. Intermediate rounding would leave residues above the snap
 * threshold and corrupt results.
 *
 * @module dsh-complex/complex
 */

/** A rectangular complex value. */
export interface Complex {
  re: number
  im: number
}

/** Parse/validation error. */
export interface ComplexError {
  valid: false
  error: string
}

/** Round to `places` decimals, snap near-zero dust, kill negative zero. */
export function cleanValue(v: number, places: number): number {
  if (!Number.isFinite(v)) return v
  const factor = 10 ** places
  let out = Math.round(v * factor) / factor
  if (Math.abs(out) < 5e-12) out = 0
  return out === 0 ? 0 : out // kill negative zero
}

export function cleanComplex(z: Complex, places: number): Complex {
  return { re: cleanValue(z.re, places), im: cleanValue(z.im, places) }
}

// A number without a sign; signs are handled by the surrounding grammar.
const NUM = String.raw`(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?`

// Rectangular with explicit imaginary coefficient: "3+4i", "-3 - 4 i", "1e3+2e-1j".
// The coefficient is optional: "1+i", "3-i", "2+i" (implicit 1) are accepted.
const RECT_FULL = new RegExp(String.raw`^\s*([+-]?${NUM})\s*([+-])\s*(${NUM})?\s*[ij]\s*$`)
// Pure imaginary: "5i", "-2j", "i", "+i"
const RECT_IMAG = new RegExp(String.raw`^\s*([+-]?)(${NUM})\s*[ij]\s*$`)
// Bare imaginary unit: "i", "-i", "+i", "j"
const RECT_UNIT = new RegExp(String.raw`^\s*([+-]?)\s*[ij]\s*$`)
// Pure real: "3", "-2.5", "1e3"
const RECT_REAL = new RegExp(String.raw`^\s*([+-]?${NUM})\s*$`)
// Polar form: "5∠53.13°", "2 ∠ 270 deg" (angle in degrees)
const POLAR = new RegExp(String.raw`^\s*([+-]?${NUM})\s*∠\s*([+-]?${NUM})\s*(?:°|deg)?\s*$`)

export type ParsedForm = 'rectangular' | 'polar'

/** Parse a complex number from string form. Deterministic grammar, both i and j accepted. */
export function parseComplex(input: unknown, places: number): { z: Complex; form: ParsedForm; valid: true } | ComplexError {
  if (typeof input !== 'string') return { valid: false, error: 'input must be a string, e.g. "3+4i", "-2i", "5∠53.13°"' }
  const s = input.trim()
  if (s === '') return { valid: false, error: 'input is empty; expected a complex number like "3+4i" or "5∠53.13°"' }

  const polar = POLAR.exec(s)
  if (polar !== null) {
    const r = Number(polar[1])
    const deg = Number(polar[2])
    if (!Number.isFinite(r) || !Number.isFinite(deg)) return { valid: false, error: 'polar form must be "r∠θ°" with finite numbers' }
    if (r < 0) return { valid: false, error: 'polar modulus r must be >= 0; for negative r add 180° to the angle instead' }
    const rad = (deg * Math.PI) / 180
    return { z: cleanComplex({ re: r * Math.cos(rad), im: r * Math.sin(rad) }, places), form: 'polar', valid: true }
  }

  const full = RECT_FULL.exec(s)
  if (full !== null) {
    const re = Number(full[1])
    const coeff = full[3] === undefined ? 1 : Number(full[3])
    const im = full[2] === '-' ? -coeff : coeff
    if (!Number.isFinite(re) || !Number.isFinite(im)) return { valid: false, error: 'coefficients must be finite numbers' }
    return { z: cleanComplex({ re, im }, places), form: 'rectangular', valid: true }
  }

  const imag = RECT_IMAG.exec(s)
  if (imag !== null) {
    const sign = imag[1] === '-' ? -1 : 1
    const im = sign * Number(imag[2])
    if (!Number.isFinite(im)) return { valid: false, error: 'coefficient must be a finite number' }
    return { z: cleanComplex({ re: 0, im }, places), form: 'rectangular', valid: true }
  }

  const unit = RECT_UNIT.exec(s)
  if (unit !== null) {
    const im = unit[1] === '-' ? -1 : 1
    return { z: { re: 0, im }, form: 'rectangular', valid: true }
  }

  const real = RECT_REAL.exec(s)
  if (real !== null) {
    const re = Number(real[1])
    if (!Number.isFinite(re)) return { valid: false, error: 'coefficient must be a finite number' }
    return { z: cleanComplex({ re, im: 0 }, places), form: 'rectangular', valid: true }
  }

  return { valid: false, error: `unrecognized complex number: "${s}" — use rectangular "a+bi" (i or j) or polar "r∠θ°"` }
}

/** Format a real number with at most `places` decimals (trailing zeros stripped). */
export function formatNumber(v: number, places: number): string {
  const cleaned = cleanValue(v, places)
  return String(cleaned)
}

/** Rectangular string: "3+4i", "3-4i", "-3+4i", "2i", "-i", "5". */
export function formatRect(z: Complex, places: number): string {
  const re = cleanValue(z.re, places)
  const im = cleanValue(z.im, places)
  if (im === 0) return formatNumber(re, places)
  if (re === 0) {
    if (im === 1) return 'i'
    if (im === -1) return '-i'
    return `${formatNumber(im, places)}i`
  }
  const sign = im < 0 ? '-' : '+'
  return `${formatNumber(re, places)}${sign}${formatNumber(Math.abs(im), places)}i`
}

/** Polar string: "5∠53.1301023542°". */
export function formatPolar(z: Complex, places: number): string {
  const r = cleanValue(modulus(z), places)
  const deg = cleanValue(argumentDeg(z), places)
  return `${formatNumber(r, places)}∠${formatNumber(deg, places)}°`
}

/** Exponential string: "5·e^(i·0.927295218)". */
export function formatExponential(z: Complex, places: number): string {
  const r = cleanValue(modulus(z), places)
  const rad = cleanValue(argumentRad(z), places)
  return `${formatNumber(r, places)}·e^(i·${formatNumber(rad, places)})`
}

/** |z| = sqrt(re² + im²). */
export function modulus(z: Complex): number {
  return Math.hypot(z.re, z.im)
}

/** Principal argument atan2(im, re) in radians, range (−π, π]. */
export function argumentRad(z: Complex): number {
  return Math.atan2(z.im, z.re)
}

/** Principal argument in degrees, range (−180, 180]. */
export function argumentDeg(z: Complex): number {
  return (Math.atan2(z.im, z.re) * 180) / Math.PI
}

export function add(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im }
}

export function subtract(a: Complex, b: Complex): Complex {
  return { re: a.re - b.re, im: a.im - b.im }
}

export function multiply(a: Complex, b: Complex): Complex {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }
}

/** a / b via the conjugate; division by zero is an error. */
export function divide(a: Complex, b: Complex): Complex | null {
  const denom = b.re * b.re + b.im * b.im
  if (denom === 0) return null
  return { re: (a.re * b.re + a.im * b.im) / denom, im: (a.im * b.re - a.re * b.im) / denom }
}

export function conjugate(z: Complex): Complex {
  return { re: z.re, im: -z.im }
}

/** −z (the real-axis twin of `conjugate`). */
export function negate(z: Complex): Complex {
  return { re: -z.re, im: -z.im }
}

/** i·z — a 90° rotation, used by the inverse-function identities. */
function mulI(z: Complex): Complex {
  return { re: -z.im, im: z.re }
}

/** −i·z (equivalently z / i) — a −90° rotation. */
function mulNegI(z: Complex): Complex {
  return { re: z.im, im: -z.re }
}

function scale(z: Complex, k: number): Complex {
  return { re: z.re * k, im: z.im * k }
}

const ONE: Complex = { re: 1, im: 0 }

/** 1 / z; zero is an error. */
export function reciprocal(z: Complex): Complex | null {
  const denom = z.re * z.re + z.im * z.im
  if (denom === 0) return null
  return { re: z.re / denom, im: -z.im / denom }
}

/** Integer power via De Moivre: z^n = r^n (cos nθ + i sin nθ). |n| <= maxPower. */
export function integerPower(z: Complex, n: number, maxPower: number): Complex | null {
  if (!Number.isInteger(n)) return null
  if (Math.abs(n) > maxPower) return null
  if (n === 0) return { re: 1, im: 0 }
  const absN = Math.abs(n)
  const r = Math.hypot(z.re, z.im)
  const theta = Math.atan2(z.im, z.re)
  const rn = r ** absN
  const angle = theta * absN
  const out: Complex = { re: rn * Math.cos(angle), im: rn * Math.sin(angle) }
  if (n < 0) return reciprocal(out)
  return out
}

/** Principal value of e^z. */
export function complexExp(z: Complex): Complex {
  const r = Math.exp(z.re)
  return { re: r * Math.cos(z.im), im: r * Math.sin(z.im) }
}

/** Principal value of ln z = ln|z| + i·arg(z); zero is an error. */
export function complexLog(z: Complex): Complex | null {
  const r = Math.hypot(z.re, z.im)
  if (r === 0) return null
  return { re: Math.log(r), im: Math.atan2(z.im, z.re) }
}

/** Principal value of sin z = sin re·cosh im + i·cos re·sinh im. */
export function complexSin(z: Complex): Complex {
  return { re: Math.sin(z.re) * Math.cosh(z.im), im: Math.cos(z.re) * Math.sinh(z.im) }
}

/** Principal value of cos z = cos re·cosh im − i·sin re·sinh im. */
export function complexCos(z: Complex): Complex {
  return { re: Math.cos(z.re) * Math.cosh(z.im), im: -Math.sin(z.re) * Math.sinh(z.im) }
}

/** tan z = sin z / cos z. */
export function complexTan(z: Complex): Complex | null {
  return divide(complexSin(z), complexCos(z))
}

/** sinh z = sinh re·cos im + i·cosh re·sin im. */
export function complexSinh(z: Complex): Complex {
  return { re: Math.sinh(z.re) * Math.cos(z.im), im: Math.cosh(z.re) * Math.sin(z.im) }
}

/** cosh z = cosh re·cos im + i·sinh re·sin im. */
export function complexCosh(z: Complex): Complex {
  return { re: Math.cosh(z.re) * Math.cos(z.im), im: Math.sinh(z.re) * Math.sin(z.im) }
}

/** Principal square root: √r (cos θ/2 + i sin θ/2). */
export function complexSqrt(z: Complex): Complex {
  const r = Math.hypot(z.re, z.im)
  const theta = Math.atan2(z.im, z.re)
  const rootR = Math.sqrt(r)
  return { re: rootR * Math.cos(theta / 2), im: rootR * Math.sin(theta / 2) }
}

/**
 * The n n-th roots of z: r^(1/n) · (cos((θ+2πk)/n) + i·sin((θ+2πk)/n)), k = 0..n−1,
 * θ = principal argument. n is validated by the caller (1..maxRoots).
 */
export function nthRoots(z: Complex, n: number): Complex[] {
  const r = Math.hypot(z.re, z.im)
  const theta = Math.atan2(z.im, z.re)
  const rootR = r ** (1 / n)
  const out: Complex[] = []
  for (let k = 0; k < n; k++) {
    const angle = (theta + 2 * Math.PI * k) / n
    out.push({ re: rootR * Math.cos(angle), im: rootR * Math.sin(angle) })
  }
  return out
}

/**
 * Inverse trigonometric / inverse hyperbolic functions (v0.2.0), principal
 * branch, matching CPython's stdlib `cmath` exactly:
 *
 *   asin z  = −i·log(iz + √(1−z²))
 *   acos z  = π/2 − asin z            (C99's own definition of cacos)
 *   atan z  = (i/2)·(log(1−iz) − log(1+iz))
 *   asinh z = log(z + √(z²+1))
 *   acosh z = log(z + √(z−1)·√(z+1))
 *   atanh z = ½·(log(1+z) − log(1−z))
 *
 * The principal square root is not enough on the branch cuts: exactly on the
 * cuts (real |x| > 1 for asin/acos/atanh, imaginary |y| > 1 for atan/asinh)
 * the naive composition picks the conjugate value, so those cases use the
 * explicit C99 continuation instead:
 *
 *   asin(x)   = sign(x)·π/2 + i·acosh(|x|)
 *   atan(iy)  = π/2 + i·sign(y)·atanh(1/|y|)   (continuous with Re z > 0)
 *   asinh(iy) = acosh(|y|) + i·sign(y)·π/2
 *   atanh(x)  = atanh(1/x) + i·π/2
 *
 * Every branch convention was verified against `cmath` over a grid of points
 * that includes all four cuts (see `test/oracle/anchors.py`, section B), which
 * is also what caught the naive version's wrong sign on those cuts. `null` is
 * returned exactly where `cmath` raises `ValueError`: `atan(±i)` and
 * `atanh(±1)` (a logarithm of zero).
 */

/** Principal arc sine. */
export function complexAsin(z: Complex): Complex | null {
  if (z.im === 0 && Math.abs(z.re) > 1) {
    // real branch cut: continue from Im z > 0 (the imaginary part stays positive on both sides)
    return { re: (Math.sign(z.re) * Math.PI) / 2, im: Math.acosh(Math.abs(z.re)) }
  }
  const log = complexLog(add(mulI(z), complexSqrt(subtract(ONE, multiply(z, z)))))
  return log === null ? null : mulNegI(log)
}

/** Principal arc cosine: π/2 − asin (the identity holds for these branches, including the cut). */
export function complexAcos(z: Complex): Complex | null {
  const asin = complexAsin(z)
  return asin === null ? null : { re: Math.PI / 2 - asin.re, im: -asin.im }
}

/** Principal arc tangent; undefined at z = ±i. */
export function complexAtan(z: Complex): Complex | null {
  if (z.re === 0 && Math.abs(z.im) > 1) {
    // imaginary branch cut: continuous with the right half plane
    return { re: Math.PI / 2, im: Math.sign(z.im) * Math.atanh(1 / Math.abs(z.im)) }
  }
  const l1 = complexLog(subtract(ONE, mulI(z)))
  const l2 = complexLog(add(ONE, mulI(z)))
  if (l1 === null || l2 === null) return null
  return scale(mulI(subtract(l1, l2)), 0.5)
}

/** Principal inverse hyperbolic sine. */
export function complexAsinh(z: Complex): Complex | null {
  if (z.re === 0 && Math.abs(z.im) > 1) {
    // imaginary branch cut: acosh(|y|) + i·sign(y)·π/2
    return { re: Math.acosh(Math.abs(z.im)), im: (Math.sign(z.im) * Math.PI) / 2 }
  }
  return complexLog(add(z, complexSqrt(add(multiply(z, z), ONE))))
}

/**
 * Principal inverse hyperbolic cosine: acosh z = log(z + √(z−1)·√(z+1))
 * (the product form, which keeps the real part ≥ 0 on the branch cut x < 1
 * where the naive √(z²−1) picks the wrong side).
 */
export function complexAcosh(z: Complex): Complex | null {
  const inner = add(z, multiply(complexSqrt(subtract(z, ONE)), complexSqrt(add(z, ONE))))
  return complexLog(inner)
}

/** Principal inverse hyperbolic tangent; undefined at z = ±1. */
export function complexAtanh(z: Complex): Complex | null {
  if (z.im === 0 && Math.abs(z.re) > 1) {
    // real branch cut: atanh(1/x) + iπ/2 (the imaginary part stays positive on both sides)
    return { re: Math.atanh(1 / z.re), im: Math.PI / 2 }
  }
  const l1 = complexLog(add(ONE, z))
  const l2 = complexLog(subtract(ONE, z))
  if (l1 === null || l2 === null) return null
  return scale(subtract(l1, l2), 0.5)
}

/**
 * General complex power a^b = exp(b·log a) on the principal branch (v0.2.0);
 * `null` when a = 0 (log 0 is undefined — the caller decides whether the real
 * 0^positive case is allowed).
 */
export function complexPow(a: Complex, b: Complex): Complex | null {
  const log = complexLog(a)
  if (log === null) return null
  return complexExp(multiply(b, log))
}

/** One solution set of `a z² + b z + c = 0` (v0.2.0). */
export interface QuadraticSolution {
  /** 2 = quadratic, 1 = degenerate linear (a = 0, b ≠ 0), 0 = a = b = 0. */
  degree: 2 | 1 | 0
  /** b² − 4ac (present only when degree = 2), with the imaginary part normalised to +0. */
  discriminant: Complex | null
  /** The roots, principal square root of the discriminant first. */
  roots: Complex[]
  /** −b/a and c/a (present only when degree = 2) — the Vieta invariants. */
  sum: Complex | null
  product: Complex | null
}

/**
 * Solve a z² + b z + c = 0 over the complex numbers with complex coefficients:
 * the roots are (−b ± √disc)/(2a) with √ the principal square root. The
 * discriminant's imaginary part is normalised to +0 when it is exactly zero,
 * so a real negative discriminant always takes the +i√|disc| branch instead of
 * whichever side a signed-zero artefact picks. a = 0 degenerates to the linear
 * equation b z + c = 0; a = b = 0 leaves no root at all (the caller reports
 * "every z" vs. "no solution" from c).
 */
export function solveQuadratic(a: Complex, b: Complex, c: Complex): QuadraticSolution {
  if (a.re === 0 && a.im === 0) {
    if (b.re === 0 && b.im === 0) {
      return { degree: 0, discriminant: null, roots: [], sum: null, product: null }
    }
    const root = divide(negate(c), b)
    return { degree: 1, discriminant: null, roots: root === null ? [] : [root], sum: null, product: null }
  }

  const raw = subtract(multiply(b, b), multiply(scale(a, 4), c))
  const disc: Complex = raw.im === 0 ? { re: raw.re, im: 0 } : raw
  const s = complexSqrt(disc)
  const denominator = scale(a, 2)
  const minusB = negate(b)
  const roots: Complex[] = []
  const first = divide(add(minusB, s), denominator)
  const second = divide(subtract(minusB, s), denominator)
  if (first !== null) roots.push(first)
  if (second !== null) roots.push(second)

  const sum = divide(minusB, a)
  const product = divide(c, a)
  return { degree: 2, discriminant: disc, roots, sum, product }
}

/**
 * Polynomials (v0.3.0). Coefficients are given **highest power first**, so
 * `[1, 0, -1]` is z² − 1 and `[2i, 1, -3]` is 2i·z² + z − 3. Everything below
 * is plain complex arithmetic on the same primitives the rest of the module
 * uses (Horner for evaluation, Durand–Kerner for roots).
 */

/** Evaluate p(z) by Horner's rule; the empty list is the zero polynomial. */
export function evalPolynomial(coeffs: Complex[], z: Complex): Complex {
  let acc: Complex = { re: 0, im: 0 }
  for (const c of coeffs) acc = add(multiply(acc, z), c)
  return acc
}

/** Coefficients of p'(z); the derivative of a constant is the zero polynomial. */
export function derivativePolynomial(coeffs: Complex[]): Complex[] {
  const n = coeffs.length - 1
  if (n <= 0) return [{ re: 0, im: 0 }]
  const out: Complex[] = []
  for (let i = 0; i < n; i++) {
    const c = coeffs[i]
    if (c !== undefined) out.push(scale(c, n - i))
  }
  return out
}

/** One distinct root with its estimated multiplicity. */
export interface PolyRoot {
  z: Complex
  multiplicity: number
}

/** Outcome of the Durand–Kerner iteration. */
export interface PolyRootReport {
  /** Distinct roots, ascending by real then imaginary part. */
  roots: PolyRoot[]
  /** True when the last step was below the step tolerance. */
  converged: boolean
  iterations: number
  /** Largest per-component step of the last iteration (in the monic scale). */
  maxStep: number
}

export interface PolyRootOptions {
  maxIterations?: number
  stepTolerance?: number
  /** Relative distance under which neighbouring roots are treated as one root. */
  clusterTolerance?: number
}

/**
 * All roots of a polynomial with complex coefficients (degree ≥ 1, leading
 * coefficient non-zero), by the Durand–Kerner (Weierstrass) iteration on the
 * monic form:
 *
 *   z_k ← z_k − p(z_k) / ∏_{j≠k} (z_k − z_j),  k = 0..n−1
 *
 * with the classic (0.4 + 0.9i)^k starting points. The iteration converges
 * quadratically for simple roots and **linearly** for multiple roots, so
 * neighbouring results are clustered (`clusterTolerance`, relative) and
 * reported once with a multiplicity rather than as n near-identical numbers.
 * Convergence is reported, never assumed: `converged: false` means the step
 * tolerance was not reached and the caller must treat the values as estimates.
 * `null` when the input is not a genuine degree-≥1 polynomial.
 */
export function polynomialRoots(coeffs: Complex[], options: PolyRootOptions = {}): PolyRootReport | null {
  const maxIterations = options.maxIterations ?? 2000
  const stepTolerance = options.stepTolerance ?? 1e-14
  const clusterTolerance = options.clusterTolerance ?? 1e-6
  const n = coeffs.length - 1
  if (n < 1) return null
  const lead = coeffs[0]
  if (lead === undefined || (lead.re === 0 && lead.im === 0)) return null

  const monic: Complex[] = []
  for (const c of coeffs) {
    const q = divide(c, lead)
    if (q === null) return null
    monic.push(q)
  }

  const base: Complex = { re: 0.4, im: 0.9 }
  const zs: Complex[] = []
  let seed: Complex = { re: 1, im: 0 }
  for (let k = 0; k < n; k++) {
    zs.push(seed)
    seed = multiply(seed, base)
  }

  let converged = false
  let iterations = 0
  let maxStep = Number.POSITIVE_INFINITY
  while (iterations < maxIterations) {
    iterations++
    maxStep = 0
    for (let k = 0; k < n; k++) {
      const zk = zs[k]
      if (zk === undefined) continue
      const p = evalPolynomial(monic, zk)
      let denom: Complex = { re: 1, im: 0 }
      for (let j = 0; j < n; j++) {
        const zj = zs[j]
        if (j === k || zj === undefined) continue
        denom = multiply(denom, subtract(zk, zj))
      }
      let delta = divide(p, denom)
      if (delta === null) delta = { re: 1e-3, im: 1e-3 } // coincident guesses: nudge apart
      const next = subtract(zk, delta)
      zs[k] = next
      const step = Math.hypot(delta.re, delta.im)
      if (step > maxStep) maxStep = step
    }
    let scaleRef = 1
    for (const z of zs) scaleRef = Math.max(scaleRef, modulus(z))
    if (maxStep <= stepTolerance * scaleRef) {
      converged = true
      break
    }
  }

  const sorted = [...zs].sort((a, b) => (a.re === b.re ? a.im - b.im : a.re - b.re))
  const roots: PolyRoot[] = []
  for (const z of sorted) {
    const last = roots[roots.length - 1]
    if (last !== undefined) {
      const distance = modulus(subtract(z, last.z))
      if (distance <= clusterTolerance * Math.max(1, modulus(last.z))) {
        const mean = divide(add(scale(last.z, last.multiplicity), z), { re: last.multiplicity + 1, im: 0 })
        if (mean !== null) last.z = mean
        last.multiplicity += 1
        continue
      }
    }
    roots.push({ z, multiplicity: 1 })
  }

  return { roots, converged, iterations, maxStep }
}
