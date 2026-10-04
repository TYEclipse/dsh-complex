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
    re: number;
    im: number;
}
/** Parse/validation error. */
export interface ComplexError {
    valid: false;
    error: string;
}
/** Round to `places` decimals, snap near-zero dust, kill negative zero. */
export declare function cleanValue(v: number, places: number): number;
export declare function cleanComplex(z: Complex, places: number): Complex;
export type ParsedForm = 'rectangular' | 'polar';
/** Parse a complex number from string form. Deterministic grammar, both i and j accepted. */
export declare function parseComplex(input: unknown, places: number): {
    z: Complex;
    form: ParsedForm;
    valid: true;
} | ComplexError;
/** Format a real number with at most `places` decimals (trailing zeros stripped). */
export declare function formatNumber(v: number, places: number): string;
/** Rectangular string: "3+4i", "3-4i", "-3+4i", "2i", "-i", "5". */
export declare function formatRect(z: Complex, places: number): string;
/** Polar string: "5∠53.1301023542°". */
export declare function formatPolar(z: Complex, places: number): string;
/** Exponential string: "5·e^(i·0.927295218)". */
export declare function formatExponential(z: Complex, places: number): string;
/** |z| = sqrt(re² + im²). */
export declare function modulus(z: Complex): number;
/** Principal argument atan2(im, re) in radians, range (−π, π]. */
export declare function argumentRad(z: Complex): number;
/** Principal argument in degrees, range (−180, 180]. */
export declare function argumentDeg(z: Complex): number;
export declare function add(a: Complex, b: Complex): Complex;
export declare function subtract(a: Complex, b: Complex): Complex;
export declare function multiply(a: Complex, b: Complex): Complex;
/** a / b via the conjugate; division by zero is an error. */
export declare function divide(a: Complex, b: Complex): Complex | null;
export declare function conjugate(z: Complex): Complex;
/** −z (the real-axis twin of `conjugate`). */
export declare function negate(z: Complex): Complex;
/** 1 / z; zero is an error. */
export declare function reciprocal(z: Complex): Complex | null;
/** Integer power via De Moivre: z^n = r^n (cos nθ + i sin nθ). |n| <= maxPower. */
export declare function integerPower(z: Complex, n: number, maxPower: number): Complex | null;
/** Principal value of e^z. */
export declare function complexExp(z: Complex): Complex;
/** Principal value of ln z = ln|z| + i·arg(z); zero is an error. */
export declare function complexLog(z: Complex): Complex | null;
/** Principal value of sin z = sin re·cosh im + i·cos re·sinh im. */
export declare function complexSin(z: Complex): Complex;
/** Principal value of cos z = cos re·cosh im − i·sin re·sinh im. */
export declare function complexCos(z: Complex): Complex;
/** tan z = sin z / cos z. */
export declare function complexTan(z: Complex): Complex | null;
/** sinh z = sinh re·cos im + i·cosh re·sin im. */
export declare function complexSinh(z: Complex): Complex;
/** cosh z = cosh re·cos im + i·sinh re·sin im. */
export declare function complexCosh(z: Complex): Complex;
/** Principal square root: √r (cos θ/2 + i sin θ/2). */
export declare function complexSqrt(z: Complex): Complex;
/**
 * The n n-th roots of z: r^(1/n) · (cos((θ+2πk)/n) + i·sin((θ+2πk)/n)), k = 0..n−1,
 * θ = principal argument. n is validated by the caller (1..maxRoots).
 */
export declare function nthRoots(z: Complex, n: number): Complex[];
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
export declare function complexAsin(z: Complex): Complex | null;
/** Principal arc cosine: π/2 − asin (the identity holds for these branches, including the cut). */
export declare function complexAcos(z: Complex): Complex | null;
/** Principal arc tangent; undefined at z = ±i. */
export declare function complexAtan(z: Complex): Complex | null;
/** Principal inverse hyperbolic sine. */
export declare function complexAsinh(z: Complex): Complex | null;
/**
 * Principal inverse hyperbolic cosine: acosh z = log(z + √(z−1)·√(z+1))
 * (the product form, which keeps the real part ≥ 0 on the branch cut x < 1
 * where the naive √(z²−1) picks the wrong side).
 */
export declare function complexAcosh(z: Complex): Complex | null;
/** Principal inverse hyperbolic tangent; undefined at z = ±1. */
export declare function complexAtanh(z: Complex): Complex | null;
/**
 * General complex power a^b = exp(b·log a) on the principal branch (v0.2.0);
 * `null` when a = 0 (log 0 is undefined — the caller decides whether the real
 * 0^positive case is allowed).
 */
export declare function complexPow(a: Complex, b: Complex): Complex | null;
/** One solution set of `a z² + b z + c = 0` (v0.2.0). */
export interface QuadraticSolution {
    /** 2 = quadratic, 1 = degenerate linear (a = 0, b ≠ 0), 0 = a = b = 0. */
    degree: 2 | 1 | 0;
    /** b² − 4ac (present only when degree = 2), with the imaginary part normalised to +0. */
    discriminant: Complex | null;
    /** The roots, principal square root of the discriminant first. */
    roots: Complex[];
    /** −b/a and c/a (present only when degree = 2) — the Vieta invariants. */
    sum: Complex | null;
    product: Complex | null;
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
export declare function solveQuadratic(a: Complex, b: Complex, c: Complex): QuadraticSolution;
//# sourceMappingURL=complex.d.ts.map