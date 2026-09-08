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
//# sourceMappingURL=complex.d.ts.map