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
/** Round to `places` decimals, snap near-zero dust, kill negative zero. */
export function cleanValue(v, places) {
    if (!Number.isFinite(v))
        return v;
    const factor = 10 ** places;
    let out = Math.round(v * factor) / factor;
    if (Math.abs(out) < 5e-12)
        out = 0;
    return out === 0 ? 0 : out; // kill negative zero
}
export function cleanComplex(z, places) {
    return { re: cleanValue(z.re, places), im: cleanValue(z.im, places) };
}
// A number without a sign; signs are handled by the surrounding grammar.
const NUM = String.raw `(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?`;
// Rectangular with explicit imaginary coefficient: "3+4i", "-3 - 4 i", "1e3+2e-1j".
// The coefficient is optional: "1+i", "3-i", "2+i" (implicit 1) are accepted.
const RECT_FULL = new RegExp(String.raw `^\s*([+-]?${NUM})\s*([+-])\s*(${NUM})?\s*[ij]\s*$`);
// Pure imaginary: "5i", "-2j", "i", "+i"
const RECT_IMAG = new RegExp(String.raw `^\s*([+-]?)(${NUM})\s*[ij]\s*$`);
// Bare imaginary unit: "i", "-i", "+i", "j"
const RECT_UNIT = new RegExp(String.raw `^\s*([+-]?)\s*[ij]\s*$`);
// Pure real: "3", "-2.5", "1e3"
const RECT_REAL = new RegExp(String.raw `^\s*([+-]?${NUM})\s*$`);
// Polar form: "5∠53.13°", "2 ∠ 270 deg" (angle in degrees)
const POLAR = new RegExp(String.raw `^\s*([+-]?${NUM})\s*∠\s*([+-]?${NUM})\s*(?:°|deg)?\s*$`);
/** Parse a complex number from string form. Deterministic grammar, both i and j accepted. */
export function parseComplex(input, places) {
    if (typeof input !== 'string')
        return { valid: false, error: 'input must be a string, e.g. "3+4i", "-2i", "5∠53.13°"' };
    const s = input.trim();
    if (s === '')
        return { valid: false, error: 'input is empty; expected a complex number like "3+4i" or "5∠53.13°"' };
    const polar = POLAR.exec(s);
    if (polar !== null) {
        const r = Number(polar[1]);
        const deg = Number(polar[2]);
        if (!Number.isFinite(r) || !Number.isFinite(deg))
            return { valid: false, error: 'polar form must be "r∠θ°" with finite numbers' };
        if (r < 0)
            return { valid: false, error: 'polar modulus r must be >= 0; for negative r add 180° to the angle instead' };
        const rad = (deg * Math.PI) / 180;
        return { z: cleanComplex({ re: r * Math.cos(rad), im: r * Math.sin(rad) }, places), form: 'polar', valid: true };
    }
    const full = RECT_FULL.exec(s);
    if (full !== null) {
        const re = Number(full[1]);
        const coeff = full[3] === undefined ? 1 : Number(full[3]);
        const im = full[2] === '-' ? -coeff : coeff;
        if (!Number.isFinite(re) || !Number.isFinite(im))
            return { valid: false, error: 'coefficients must be finite numbers' };
        return { z: cleanComplex({ re, im }, places), form: 'rectangular', valid: true };
    }
    const imag = RECT_IMAG.exec(s);
    if (imag !== null) {
        const sign = imag[1] === '-' ? -1 : 1;
        const im = sign * Number(imag[2]);
        if (!Number.isFinite(im))
            return { valid: false, error: 'coefficient must be a finite number' };
        return { z: cleanComplex({ re: 0, im }, places), form: 'rectangular', valid: true };
    }
    const unit = RECT_UNIT.exec(s);
    if (unit !== null) {
        const im = unit[1] === '-' ? -1 : 1;
        return { z: { re: 0, im }, form: 'rectangular', valid: true };
    }
    const real = RECT_REAL.exec(s);
    if (real !== null) {
        const re = Number(real[1]);
        if (!Number.isFinite(re))
            return { valid: false, error: 'coefficient must be a finite number' };
        return { z: cleanComplex({ re, im: 0 }, places), form: 'rectangular', valid: true };
    }
    return { valid: false, error: `unrecognized complex number: "${s}" — use rectangular "a+bi" (i or j) or polar "r∠θ°"` };
}
/** Format a real number with at most `places` decimals (trailing zeros stripped). */
export function formatNumber(v, places) {
    const cleaned = cleanValue(v, places);
    return String(cleaned);
}
/** Rectangular string: "3+4i", "3-4i", "-3+4i", "2i", "-i", "5". */
export function formatRect(z, places) {
    const re = cleanValue(z.re, places);
    const im = cleanValue(z.im, places);
    if (im === 0)
        return formatNumber(re, places);
    if (re === 0) {
        if (im === 1)
            return 'i';
        if (im === -1)
            return '-i';
        return `${formatNumber(im, places)}i`;
    }
    const sign = im < 0 ? '-' : '+';
    return `${formatNumber(re, places)}${sign}${formatNumber(Math.abs(im), places)}i`;
}
/** Polar string: "5∠53.1301023542°". */
export function formatPolar(z, places) {
    const r = cleanValue(modulus(z), places);
    const deg = cleanValue(argumentDeg(z), places);
    return `${formatNumber(r, places)}∠${formatNumber(deg, places)}°`;
}
/** Exponential string: "5·e^(i·0.927295218)". */
export function formatExponential(z, places) {
    const r = cleanValue(modulus(z), places);
    const rad = cleanValue(argumentRad(z), places);
    return `${formatNumber(r, places)}·e^(i·${formatNumber(rad, places)})`;
}
/** |z| = sqrt(re² + im²). */
export function modulus(z) {
    return Math.hypot(z.re, z.im);
}
/** Principal argument atan2(im, re) in radians, range (−π, π]. */
export function argumentRad(z) {
    return Math.atan2(z.im, z.re);
}
/** Principal argument in degrees, range (−180, 180]. */
export function argumentDeg(z) {
    return (Math.atan2(z.im, z.re) * 180) / Math.PI;
}
export function add(a, b) {
    return { re: a.re + b.re, im: a.im + b.im };
}
export function subtract(a, b) {
    return { re: a.re - b.re, im: a.im - b.im };
}
export function multiply(a, b) {
    return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}
/** a / b via the conjugate; division by zero is an error. */
export function divide(a, b) {
    const denom = b.re * b.re + b.im * b.im;
    if (denom === 0)
        return null;
    return { re: (a.re * b.re + a.im * b.im) / denom, im: (a.im * b.re - a.re * b.im) / denom };
}
export function conjugate(z) {
    return { re: z.re, im: -z.im };
}
/** 1 / z; zero is an error. */
export function reciprocal(z) {
    const denom = z.re * z.re + z.im * z.im;
    if (denom === 0)
        return null;
    return { re: z.re / denom, im: -z.im / denom };
}
/** Integer power via De Moivre: z^n = r^n (cos nθ + i sin nθ). |n| <= maxPower. */
export function integerPower(z, n, maxPower) {
    if (!Number.isInteger(n))
        return null;
    if (Math.abs(n) > maxPower)
        return null;
    if (n === 0)
        return { re: 1, im: 0 };
    const absN = Math.abs(n);
    const r = Math.hypot(z.re, z.im);
    const theta = Math.atan2(z.im, z.re);
    const rn = r ** absN;
    const angle = theta * absN;
    const out = { re: rn * Math.cos(angle), im: rn * Math.sin(angle) };
    if (n < 0)
        return reciprocal(out);
    return out;
}
/** Principal value of e^z. */
export function complexExp(z) {
    const r = Math.exp(z.re);
    return { re: r * Math.cos(z.im), im: r * Math.sin(z.im) };
}
/** Principal value of ln z = ln|z| + i·arg(z); zero is an error. */
export function complexLog(z) {
    const r = Math.hypot(z.re, z.im);
    if (r === 0)
        return null;
    return { re: Math.log(r), im: Math.atan2(z.im, z.re) };
}
/** Principal value of sin z = sin re·cosh im + i·cos re·sinh im. */
export function complexSin(z) {
    return { re: Math.sin(z.re) * Math.cosh(z.im), im: Math.cos(z.re) * Math.sinh(z.im) };
}
/** Principal value of cos z = cos re·cosh im − i·sin re·sinh im. */
export function complexCos(z) {
    return { re: Math.cos(z.re) * Math.cosh(z.im), im: -Math.sin(z.re) * Math.sinh(z.im) };
}
/** tan z = sin z / cos z. */
export function complexTan(z) {
    return divide(complexSin(z), complexCos(z));
}
/** sinh z = sinh re·cos im + i·cosh re·sin im. */
export function complexSinh(z) {
    return { re: Math.sinh(z.re) * Math.cos(z.im), im: Math.cosh(z.re) * Math.sin(z.im) };
}
/** cosh z = cosh re·cos im + i·sinh re·sin im. */
export function complexCosh(z) {
    return { re: Math.cosh(z.re) * Math.cos(z.im), im: Math.sinh(z.re) * Math.sin(z.im) };
}
/** Principal square root: √r (cos θ/2 + i sin θ/2). */
export function complexSqrt(z) {
    const r = Math.hypot(z.re, z.im);
    const theta = Math.atan2(z.im, z.re);
    const rootR = Math.sqrt(r);
    return { re: rootR * Math.cos(theta / 2), im: rootR * Math.sin(theta / 2) };
}
/**
 * The n n-th roots of z: r^(1/n) · (cos((θ+2πk)/n) + i·sin((θ+2πk)/n)), k = 0..n−1,
 * θ = principal argument. n is validated by the caller (1..maxRoots).
 */
export function nthRoots(z, n) {
    const r = Math.hypot(z.re, z.im);
    const theta = Math.atan2(z.im, z.re);
    const rootR = r ** (1 / n);
    const out = [];
    for (let k = 0; k < n; k++) {
        const angle = (theta + 2 * Math.PI * k) / n;
        out.push({ re: rootR * Math.cos(angle), im: rootR * Math.sin(angle) });
    }
    return out;
}
//# sourceMappingURL=complex.js.map