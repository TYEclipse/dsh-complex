/**
 * Tool definitions for dsh-complex: six pure-math tools exposed via defineTool.
 *   complex_parse      — parse "3+4i" / "5∠53.13°" into a full summary
 *   complex_calc       — add / subtract / multiply / divide / conjugate / reciprocal / power / pow
 *   complex_convert    — polar <-> rectangular conversion
 *   complex_functions  — principal values of the elementary and inverse functions
 *   complex_roots      — all n n-th roots of a complex number
 *   complex_quadratic  — solve a z² + b z + c = 0 over the complex numbers
 *   complex_poly       — evaluate a polynomial and find all of its roots
 *
 * @module dsh-complex/tools
 */
import { defineTool } from '@deepseek-ai/dsh-tools';
import { add, argumentDeg, argumentRad, cleanComplex, cleanValue, complexAcos, complexAcosh, complexAsin, complexAsinh, complexAtan, complexAtanh, complexCos, complexCosh, complexExp, complexLog, complexPow, complexSin, complexSinh, complexSqrt, complexTan, conjugate, derivativePolynomial, divide, evalPolynomial, formatExponential, formatPolar, formatRect, integerPower, modulus, multiply, nthRoots, parseComplex, polynomialRoots, reciprocal, solveQuadratic, subtract, } from "./complex.js";
const CALC_OPS = ['add', 'subtract', 'multiply', 'divide', 'conjugate', 'reciprocal', 'power', 'pow'];
const CONVERT_OPS = ['to_polar', 'to_rect'];
const FUNCTION_OPS = ['exp', 'log', 'sin', 'cos', 'tan', 'sinh', 'cosh', 'sqrt',
    'asin', 'acos', 'atan', 'asinh', 'acosh', 'atanh'];
const MAX_POWER = 1000;
const MAX_ROOTS = 64;
const MAX_POLY_DEGREE = 12;
function buildSummary(z, places) {
    const c = cleanComplex(z, places);
    return {
        re: c.re,
        im: c.im,
        rect: formatRect(c, places),
        modulus: cleanValue(modulus(c), places),
        argumentRad: cleanValue(argumentRad(c), places),
        argumentDeg: cleanValue(argumentDeg(c), places),
        polar: formatPolar(c, places),
        exponential: formatExponential(c, places),
    };
}
/** Summary plus a note when the argument is undefined (modulus 0). */
function buildSummaryWithNote(z, places) {
    const summary = buildSummary(z, places);
    const note = summary.modulus === 0 ? 'modulus is 0: the argument is undefined, reported as 0' : undefined;
    return { summary, note };
}
function renderSummary(z) {
    return `${z.rect}  (|z| = ${z.modulus}, arg = ${z.argumentRad} rad = ${z.argumentDeg}°, polar ${z.polar})`;
}
function renderParse(value) {
    const result = value;
    if (!result.valid)
        return `complex_parse failed: ${result.error}`;
    const note = result.note === undefined ? '' : `\n  note: ${result.note}`;
    return `${result.input} = ${result.rect}  (${result.form}; |z| = ${result.modulus}, arg = ${result.argumentDeg}°, conjugate ${result.conjugate})${note}`;
}
function renderCalc(value) {
    const result = value;
    if (!result.valid)
        return `complex_calc failed: ${result.error}`;
    const note = result.note === undefined ? '' : `\n  note: ${result.note}`;
    return `${result.operation}: ${result.aForm} ${result.operation} ${result.bForm ?? ''} = ${renderSummary(result.result)}${note}`;
}
function renderConvert(value) {
    const result = value;
    if (!result.valid)
        return `complex_convert failed: ${result.error}`;
    if (result.operation === 'to_rect') {
        return `to_rect: ${result.input} = ${result.rect}`;
    }
    return `to_polar: ${result.input} -> |z| = ${result.modulus}, arg = ${result.argumentRad} rad = ${result.argumentDeg}°  (${result.polar}; exponential ${result.exponential})`;
}
function renderFunction(value) {
    const result = value;
    if (!result.valid)
        return `complex_functions failed: ${result.error}`;
    const note = result.note === undefined ? '' : `\n  note: ${result.note}`;
    return `${result.function}(${result.input}) = ${renderSummary(result.result)}${note}`;
}
function renderRoots(value) {
    const result = value;
    if (!result.valid)
        return `complex_roots failed: ${result.error}`;
    const list = result.roots.map((z) => `  ${z.rect}`).join('\n');
    return `the ${result.n} ${result.n === 1 ? 'root' : 'roots'} of ${result.input}:\n${list}`;
}
function pointOf(z, places) {
    const c = cleanComplex(z, places);
    return { re: c.re, im: c.im, rect: formatRect(c, places) };
}
function renderQuadratic(value) {
    const result = value;
    if (!result.valid)
        return `complex_quadratic failed: ${result.error}`;
    const equation = `${result.a} z^2 + ${result.b} z + ${result.c} = 0`;
    const note = result.note === undefined ? '' : `\n  note: ${result.note}`;
    if (result.degree === 0)
        return `${equation}: no roots${note}`;
    const roots = result.roots.map((r) => `  ${r.rect}  (residual |az^2+bz+c| = ${r.residual})`).join('\n');
    if (result.degree === 1) {
        return `${equation} is linear (a = 0):\n${roots}${note}`;
    }
    return `${equation}  (discriminant ${result.discriminant.rect}, sum -b/a = ${result.sum.rect}, `
        + `product c/a = ${result.product.rect})\n${result.count} roots:\n${roots}${note}`;
}
function renderPoly(value) {
    const result = value;
    if (!result.valid)
        return `complex_poly failed: ${result.error}`;
    const note = result.note === undefined ? '' : `\n  note: ${result.note}`;
    if (result.operation === 'evaluate') {
        return `degree ${result.degree}: p(${result.z}) = ${result.value.rect}`
            + `  (p'(${result.z}) = ${result.derivative.rect})${note}`;
    }
    const list = result.roots
        .map((r) => `  ${r.rect}${r.multiplicity > 1 ? `  (×${r.multiplicity})` : ''}  residual ${r.residual}`)
        .join('\n');
    const head = `degree ${result.degree}: ${result.count} root(s)${(result.count ?? 0) === (result.distinctCount ?? 0) ? '' : ` in ${result.distinctCount} distinct value(s)`}`
        + ` — ${result.converged === true ? `converged in ${result.iterations} iterations` : 'not converged'}, max residual ${result.maxResidual}`;
    return `${head}\n${list}${note}`;
}
/** Build all seven complex tool definitions from the resolved config. */
export function buildComplexTools(config) {
    const places = config.roundPlaces;
    const complex_parse = defineTool({
        name: 'complex_parse',
        description: 'Parse a complex number from string form and report its full identity: rectangular and polar forms, '
            + 'modulus, argument (radians and degrees), exponential form and conjugate. Accepts "a+bi" style input with either '
            + 'i or j ("3+4i", "-2i", "1e3+2e-1j") and polar form "r∠θ°" with the angle in degrees ("5∠53.13°"). Use this '
            + 'instead of converting complex forms by hand. Pure arithmetic, no external calls.',
        parameters: {
            input: { type: 'string', required: true, description: 'Complex number as a string, e.g. "3+4i", "-2i", "5∠53.13°".' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    valid: { type: 'boolean', required: true },
                    error: { type: 'string' },
                    input: { type: 'string' },
                    form: { type: 'string' },
                    re: { type: 'number' },
                    im: { type: 'number' },
                    rect: { type: 'string' },
                    modulus: { type: 'number' },
                    argumentRad: { type: 'number' },
                    argumentDeg: { type: 'number' },
                    polar: { type: 'string' },
                    exponential: { type: 'string' },
                    conjugate: { type: 'string' },
                    note: { type: 'string' },
                },
            },
            render: (_args, value) => [{ type: 'text', text: renderParse(value) }],
        },
        async execute(args) {
            const parsed = parseComplex(args.input, places);
            if (!parsed.valid)
                return { valid: false, error: parsed.error };
            const { summary, note } = buildSummaryWithNote(parsed.z, places);
            const out = {
                valid: true,
                input: args.input,
                form: parsed.form,
                re: summary.re,
                im: summary.im,
                rect: summary.rect,
                modulus: summary.modulus,
                argumentRad: summary.argumentRad,
                argumentDeg: summary.argumentDeg,
                polar: summary.polar,
                exponential: summary.exponential,
                conjugate: formatRect(conjugate(parsed.z), places),
            };
            if (note !== undefined)
                out.note = note;
            return out;
        },
    });
    const complex_calc = defineTool({
        name: 'complex_calc',
        description: 'Compute one complex arithmetic operation: add, subtract, multiply, divide, conjugate, reciprocal, '
            + 'integer power (De Moivre, exponent range -1000..1000), or general complex power pow (a^b = exp(b·log a), '
            + 'principal branch). Operands are strings in "a+bi" or polar "r∠θ°" form; for pow both a (base) and b (exponent) '
            + 'may be complex. The result comes back in rectangular, polar and exponential forms with modulus and argument. '
            + 'Use this for exact complex arithmetic instead of doing i² = -1 bookkeeping by hand. Pure arithmetic, no external calls.',
        parameters: {
            a: { type: 'string', required: true, description: 'First operand, e.g. "3+4i" or "5∠53.13°".' },
            b: { type: 'string', description: 'Second operand (required for add/subtract/multiply/divide and for pow, where it is the complex exponent).' },
            exponent: { type: 'number', description: `Integer exponent for power (${-MAX_POWER}..${MAX_POWER}); required for the power operation.` },
            operation: { type: 'string', required: true, enum: [...CALC_OPS], description: 'Operation to compute.' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    valid: { type: 'boolean', required: true },
                    operation: { type: 'string', required: true },
                    error: { type: 'string' },
                    aForm: { type: 'string' },
                    bForm: { type: 'string' },
                    result: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            re: { type: 'number', required: true },
                            im: { type: 'number', required: true },
                            rect: { type: 'string', required: true },
                            modulus: { type: 'number', required: true },
                            argumentRad: { type: 'number', required: true },
                            argumentDeg: { type: 'number', required: true },
                            polar: { type: 'string', required: true },
                            exponential: { type: 'string', required: true },
                        },
                    },
                    note: { type: 'string' },
                },
            },
            render: (_args, value) => [{ type: 'text', text: renderCalc(value) }],
        },
        async execute(args) {
            const pa = parseComplex(args.a, places);
            if (!pa.valid)
                return { valid: false, operation: args.operation, error: `a: ${pa.error}` };
            if (args.operation === 'pow') {
                if (args.b === undefined)
                    return { valid: false, operation: 'pow', error: 'pow requires b, the complex exponent (a^b)' };
                const pb = parseComplex(args.b, places);
                if (!pb.valid)
                    return { valid: false, operation: 'pow', error: `b: ${pb.error}` };
                const aForm = formatRect(pa.z, places);
                const bForm = formatRect(pb.z, places);
                if (pa.z.re === 0 && pa.z.im === 0) {
                    // 0^b is defined only for real b > 0 (and equals 0); everything else has no principal value.
                    if (pb.z.im === 0 && pb.z.re > 0) {
                        const zero = buildSummary({ re: 0, im: 0 }, places);
                        return { valid: true, operation: 'pow', aForm, bForm, result: zero };
                    }
                    return {
                        valid: false,
                        operation: 'pow',
                        error: pb.z.im === 0 && pb.z.re === 0
                            ? 'pow is undefined for 0^0'
                            : 'pow has no principal value for a base of zero unless the exponent is a positive real number',
                    };
                }
                const powered = complexPow(pa.z, pb.z);
                if (powered === null)
                    return { valid: false, operation: 'pow', error: 'pow is undefined for a base of zero' };
                const { summary, note } = buildSummaryWithNote(powered, places);
                const out = { valid: true, operation: 'pow', aForm, bForm, result: summary };
                if (note !== undefined)
                    out.note = note;
                return out;
            }
            if (args.operation === 'power') {
                const n = args.exponent;
                if (typeof n !== 'number' || !Number.isInteger(n)) {
                    return { valid: false, operation: 'power', error: 'power requires an integer exponent' };
                }
                const powered = integerPower(pa.z, n, MAX_POWER);
                if (powered === null)
                    return { valid: false, operation: 'power', error: `exponent magnitude must be <= ${MAX_POWER}` };
                const { summary, note } = buildSummaryWithNote(powered, places);
                const out = { valid: true, operation: 'power', aForm: formatRect(pa.z, places) };
                out.result = summary;
                if (note !== undefined)
                    out.note = note;
                return out;
            }
            if (args.operation === 'conjugate') {
                const { summary } = buildSummaryWithNote(conjugate(pa.z), places);
                return { valid: true, operation: 'conjugate', aForm: formatRect(pa.z, places), result: summary };
            }
            if (args.operation === 'reciprocal') {
                const inv = reciprocal(pa.z);
                if (inv === null)
                    return { valid: false, operation: 'reciprocal', error: 'reciprocal of zero is undefined' };
                const { summary } = buildSummaryWithNote(inv, places);
                return { valid: true, operation: 'reciprocal', aForm: formatRect(pa.z, places), result: summary };
            }
            if (args.b === undefined) {
                return { valid: false, operation: args.operation, error: 'b is required for add/subtract/multiply/divide' };
            }
            const pb = parseComplex(args.b, places);
            if (!pb.valid)
                return { valid: false, operation: args.operation, error: `b: ${pb.error}` };
            const aForm = formatRect(pa.z, places);
            const bForm = formatRect(pb.z, places);
            let z = null;
            if (args.operation === 'add')
                z = add(pa.z, pb.z);
            else if (args.operation === 'subtract')
                z = subtract(pa.z, pb.z);
            else if (args.operation === 'multiply')
                z = multiply(pa.z, pb.z);
            else if (args.operation === 'divide')
                z = divide(pa.z, pb.z);
            else
                return { valid: false, operation: args.operation, error: `unknown operation: ${args.operation}` };
            if (z === null)
                return { valid: false, operation: args.operation, error: 'division by zero: the denominator has modulus 0' };
            const { summary, note } = buildSummaryWithNote(z, places);
            const out = { valid: true, operation: args.operation, aForm, bForm, result: summary };
            if (note !== undefined)
                out.note = note;
            return out;
        },
    });
    const complex_convert = defineTool({
        name: 'complex_convert',
        description: 'Convert a complex number between rectangular and polar form. to_polar takes any form and returns '
            + 'modulus, argument in radians and degrees, polar ("5∠53.13°") and exponential ("5·e^(i·0.9273)") notation. '
            + 'to_rect takes polar input "r∠θ°" (angle in degrees) and returns the rectangular "a+bi" form. Pure arithmetic, '
            + 'no external calls.',
        parameters: {
            input: { type: 'string', required: true, description: 'Complex number as a string: "3+4i" for to_polar, "5∠53.13°" for to_rect.' },
            operation: { type: 'string', required: true, enum: [...CONVERT_OPS], description: 'Direction of the conversion.' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    valid: { type: 'boolean', required: true },
                    operation: { type: 'string', required: true },
                    error: { type: 'string' },
                    input: { type: 'string' },
                    modulus: { type: 'number' },
                    argumentRad: { type: 'number' },
                    argumentDeg: { type: 'number' },
                    polar: { type: 'string' },
                    exponential: { type: 'string' },
                    re: { type: 'number' },
                    im: { type: 'number' },
                    rect: { type: 'string' },
                    note: { type: 'string' },
                },
            },
            render: (_args, value) => [{ type: 'text', text: renderConvert(value) }],
        },
        async execute(args) {
            const parsed = parseComplex(args.input, places);
            if (!parsed.valid)
                return { valid: false, operation: args.operation, error: parsed.error };
            if (args.operation === 'to_rect') {
                if (parsed.form !== 'polar') {
                    return {
                        valid: false,
                        operation: 'to_rect',
                        error: 'to_rect requires polar-form input like "5∠53.13°"; the given input is already rectangular — use to_polar to go the other way',
                    };
                }
                const { summary, note } = buildSummaryWithNote(parsed.z, places);
                const out = {
                    valid: true,
                    operation: 'to_rect',
                    input: args.input,
                    re: summary.re,
                    im: summary.im,
                    rect: summary.rect,
                };
                if (note !== undefined)
                    out.note = note;
                return out;
            }
            if (args.operation === 'to_polar') {
                const { summary, note } = buildSummaryWithNote(parsed.z, places);
                const out = {
                    valid: true,
                    operation: 'to_polar',
                    input: args.input,
                    modulus: summary.modulus,
                    argumentRad: summary.argumentRad,
                    argumentDeg: summary.argumentDeg,
                    polar: summary.polar,
                    exponential: summary.exponential,
                };
                if (note !== undefined)
                    out.note = note;
                return out;
            }
            return { valid: false, operation: args.operation, error: `unknown operation: ${args.operation}` };
        },
    });
    const complex_functions = defineTool({
        name: 'complex_functions',
        description: 'Evaluate a standard complex function of a complex argument and return the principal value. '
            + 'Elementary: exp, log, sin, cos, tan, sinh, cosh, sqrt. Inverse (v0.2.0): asin, acos, atan, asinh, acosh, atanh. '
            + 'The input is a string ("3+4i", "i", "5∠53.13°"). Branch conventions follow CPython\'s cmath: log returns '
            + 'ln|z| + i·arg(z) with arg in (-π, π], sqrt returns the root with argument in (-π/2, π/2], and the inverse '
            + 'functions use their standard principal cuts (asin/acos/atanh cut on the real axis, atan/asinh on the imaginary '
            + 'axis, acosh with real part ≥ 0). atan(±i) and atanh(±1) are genuinely undefined and come back as an honest error. '
            + 'Use this for correct complex function values (e.g. exp(iπ) = -1, log(-1) = iπ, asin(2) = π/2 + 1.3169578969i) '
            + 'instead of hand-deriving Euler formulas. Pure arithmetic, no external calls.',
        parameters: {
            input: { type: 'string', required: true, description: 'Complex argument as a string, e.g. "i", "3+4i", "-1".' },
            operation: { type: 'string', required: true, enum: [...FUNCTION_OPS], description: 'Function to evaluate.' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    valid: { type: 'boolean', required: true },
                    function: { type: 'string', required: true },
                    error: { type: 'string' },
                    input: { type: 'string' },
                    result: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            re: { type: 'number', required: true },
                            im: { type: 'number', required: true },
                            rect: { type: 'string', required: true },
                            modulus: { type: 'number', required: true },
                            argumentRad: { type: 'number', required: true },
                            argumentDeg: { type: 'number', required: true },
                            polar: { type: 'string', required: true },
                            exponential: { type: 'string', required: true },
                        },
                    },
                    note: { type: 'string' },
                },
            },
            render: (_args, value) => [{ type: 'text', text: renderFunction(value) }],
        },
        async execute(args) {
            const parsed = parseComplex(args.input, places);
            if (!parsed.valid)
                return { valid: false, function: args.operation, error: parsed.error };
            const z = parsed.z;
            let out = null;
            if (args.operation === 'exp')
                out = complexExp(z);
            else if (args.operation === 'log')
                out = complexLog(z);
            else if (args.operation === 'sin')
                out = complexSin(z);
            else if (args.operation === 'cos')
                out = complexCos(z);
            else if (args.operation === 'tan')
                out = complexTan(z);
            else if (args.operation === 'sinh')
                out = complexSinh(z);
            else if (args.operation === 'cosh')
                out = complexCosh(z);
            else if (args.operation === 'sqrt')
                out = complexSqrt(z);
            else if (args.operation === 'asin')
                out = complexAsin(z);
            else if (args.operation === 'acos')
                out = complexAcos(z);
            else if (args.operation === 'atan')
                out = complexAtan(z);
            else if (args.operation === 'asinh')
                out = complexAsinh(z);
            else if (args.operation === 'acosh')
                out = complexAcosh(z);
            else if (args.operation === 'atanh')
                out = complexAtanh(z);
            else
                return { valid: false, function: args.operation, error: `unknown function: ${args.operation}` };
            if (out === null) {
                const undefinedAt = {
                    log: 'log is undefined at zero',
                    atan: 'atan is undefined at z = ±i (1 ∓ iz = 0 there)',
                    atanh: 'atanh is undefined at z = ±1 (1 ∓ z = 0 there)',
                };
                return { valid: false, function: args.operation, error: undefinedAt[args.operation] ?? `${args.operation} is undefined here` };
            }
            const { summary, note } = buildSummaryWithNote(out, places);
            const BRANCH_NOTES = {
                log: 'principal branch: arg in (-π, π]',
                sqrt: 'principal square root: argument in (-π/2, π/2]',
                asin: 'principal branch: cut on the real axis for |x| > 1',
                acos: 'principal branch: cut on the real axis for |x| > 1',
                atan: 'principal branch: cut on the imaginary axis for |y| > 1',
                asinh: 'principal branch: cut on the imaginary axis for |y| > 1',
                acosh: 'principal branch: real part >= 0, cut on the real axis for x < 1',
                atanh: 'principal branch: cut on the real axis for |x| > 1',
            };
            const branchNote = BRANCH_NOTES[args.operation];
            const result = {
                valid: true,
                function: args.operation,
                input: formatRect(z, places),
                result: summary,
            };
            if (note !== undefined || branchNote !== undefined) {
                result.note = [note, branchNote].filter((n) => n !== undefined).join('; ');
            }
            return result;
        },
    });
    const complex_roots = defineTool({
        name: 'complex_roots',
        description: `Compute all n n-th roots of a complex number (n = 1..${MAX_ROOTS}). Returns the complete root set `
            + 'r^(1/n)·(cos((θ+2πk)/n) + i·sin((θ+2πk)/n)) for k = 0..n-1 with θ the principal argument, listed in increasing '
            + 'k order starting from the principal root. Use this for roots of unity (1^(1/4) = {1, i, -1, -i}) or any '
            + 'polynomial root extraction. Pure arithmetic, no external calls.',
        parameters: {
            input: { type: 'string', required: true, description: 'Complex number as a string, e.g. "1", "-8", "3+4i".' },
            n: { type: 'number', required: true, description: `Number of roots (1..${MAX_ROOTS}).` },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    valid: { type: 'boolean', required: true },
                    error: { type: 'string' },
                    input: { type: 'string' },
                    n: { type: 'number' },
                    roots: {
                        type: 'array',
                        items: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                re: { type: 'number', required: true },
                                im: { type: 'number', required: true },
                                rect: { type: 'string', required: true },
                            },
                        },
                    },
                },
            },
            render: (_args, value) => [{ type: 'text', text: renderRoots(value) }],
        },
        async execute(args) {
            const parsed = parseComplex(args.input, places);
            if (!parsed.valid)
                return { valid: false, error: parsed.error };
            if (!Number.isInteger(args.n) || args.n < 1 || args.n > MAX_ROOTS) {
                return { valid: false, error: `n must be an integer between 1 and ${MAX_ROOTS}` };
            }
            const roots = nthRoots(parsed.z, args.n).map((z) => {
                const c = cleanComplex(z, places);
                return { re: c.re, im: c.im, rect: formatRect(c, places) };
            });
            return { valid: true, input: args.input, n: args.n, roots };
        },
    });
    const complex_quadratic = defineTool({
        name: 'complex_quadratic',
        description: 'Solve the quadratic equation a z² + b z + c = 0 over the complex numbers, with complex coefficients. '
            + 'a, b and c are strings ("1", "-2", "i", "1+i"); the roots are (−b ± √disc)/(2a) with √ the principal square root '
            + 'and disc = b² − 4ac. Returns the discriminant, both roots, and the Vieta invariants −b/a and c/a, plus each root\'s '
            + 'residual |a z² + b z + c| so the answer is self-checking. a = 0 degrades to the linear equation b z + c = 0; '
            + 'a = b = 0 reports "every z" or "no solution" honestly instead of inventing a root. Polynomials with complex '
            + 'coefficients (e.g. z² + i z + 1 = 0) are handled natively — no real-root fallback. Pure arithmetic, no external calls.',
        parameters: {
            a: { type: 'string', required: true, description: 'Quadratic coefficient a, e.g. "1", "2i", "1+i". Non-zero for a true quadratic.' },
            b: { type: 'string', required: true, description: 'Linear coefficient b, e.g. "-2", "i".' },
            c: { type: 'string', required: true, description: 'Constant term c, e.g. "2", "1-i".' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    valid: { type: 'boolean', required: true },
                    error: { type: 'string' },
                    a: { type: 'string' },
                    b: { type: 'string' },
                    c: { type: 'string' },
                    degree: { type: 'number' },
                    discriminant: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            re: { type: 'number', required: true },
                            im: { type: 'number', required: true },
                            rect: { type: 'string', required: true },
                        },
                    },
                    roots: {
                        type: 'array',
                        items: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                re: { type: 'number', required: true },
                                im: { type: 'number', required: true },
                                rect: { type: 'string', required: true },
                                residual: { type: 'number', required: true },
                            },
                        },
                    },
                    count: { type: 'number' },
                    sum: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            re: { type: 'number', required: true },
                            im: { type: 'number', required: true },
                            rect: { type: 'string', required: true },
                        },
                    },
                    product: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            re: { type: 'number', required: true },
                            im: { type: 'number', required: true },
                            rect: { type: 'string', required: true },
                        },
                    },
                    note: { type: 'string' },
                },
            },
            render: (_args, value) => [{ type: 'text', text: renderQuadratic(value) }],
        },
        async execute(args) {
            const pa = parseComplex(args.a, places);
            if (!pa.valid)
                return { valid: false, error: `a: ${pa.error}` };
            const pb = parseComplex(args.b, places);
            if (!pb.valid)
                return { valid: false, error: `b: ${pb.error}` };
            const pc = parseComplex(args.c, places);
            if (!pc.valid)
                return { valid: false, error: `c: ${pc.error}` };
            const solution = solveQuadratic(pa.z, pb.z, pc.z);
            const roots = solution.roots.map((root) => {
                const value = add(add(multiply(pa.z, multiply(root, root)), multiply(pb.z, root)), pc.z);
                return { ...pointOf(root, places), residual: cleanValue(modulus(value), places) };
            });
            const out = {
                valid: true,
                a: formatRect(pa.z, places),
                b: formatRect(pb.z, places),
                c: formatRect(pc.z, places),
                degree: solution.degree,
                roots,
                count: roots.length,
            };
            if (solution.discriminant !== null)
                out.discriminant = pointOf(solution.discriminant, places);
            if (solution.sum !== null)
                out.sum = pointOf(solution.sum, places);
            if (solution.product !== null)
                out.product = pointOf(solution.product, places);
            if (solution.degree === 1) {
                out.note = 'a = 0: the equation is linear, so it has a single root';
            }
            else if (solution.degree === 0) {
                out.note = pc.z.re === 0 && pc.z.im === 0
                    ? 'a = b = c = 0: every complex number is a solution'
                    : 'a = b = 0 with c non-zero: no complex number solves this';
            }
            return out;
        },
    });
    const complex_poly = defineTool({
        name: 'complex_poly',
        description: 'Polynomials with complex coefficients, written highest power first (["1","0","-1"] is z² − 1). '
            + `Two operations: "evaluate" returns p(z) and p'(z) at a given z by Horner's rule; "roots" returns every root up to `
            + `degree ${MAX_POLY_DEGREE} via the Durand–Kerner iteration, with each root’s round-off residual and a real `
            + 'convergence flag. Whole-number roots come back as exact integers (z³ − 6z² + 11z − 6 → 1, 2, 3); a multiple root '
            + 'such as (z − 1)² is reported once with multiplicity 2 rather than as two near-identical numbers. When the '
            + 'iteration does not reach its step tolerance the answer is marked converged: false with the residuals instead of '
            + 'being presented as exact. Coefficients are any complex strings ("1", "-2i", "1+i"). Pure arithmetic, no external calls.',
        parameters: {
            coefficients: {
                type: 'array',
                required: true,
                items: { type: 'string' },
                description: 'Coefficients highest power first, 2–' + (MAX_POLY_DEGREE + 1) + ' entries, e.g. ["1","0","-1"] for z^2 - 1.',
            },
            operation: {
                type: 'string',
                required: true,
                enum: ['evaluate', 'roots'],
                description: 'evaluate = p(z) and p\'(z) at the given z; roots = all roots of p.',
            },
            z: { type: 'string', description: 'Point at which to evaluate (required for evaluate), e.g. "1+i".' },
        },
        output: {
            schema: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    valid: { type: 'boolean', required: true },
                    error: { type: 'string' },
                    operation: { type: 'string' },
                    degree: { type: 'number' },
                    trimmedLeadingZeros: { type: 'number' },
                    z: { type: 'string' },
                    value: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            re: { type: 'number', required: true },
                            im: { type: 'number', required: true },
                            rect: { type: 'string', required: true },
                        },
                    },
                    derivative: {
                        type: 'object',
                        additionalProperties: false,
                        properties: {
                            re: { type: 'number', required: true },
                            im: { type: 'number', required: true },
                            rect: { type: 'string', required: true },
                        },
                    },
                    roots: {
                        type: 'array',
                        items: {
                            type: 'object',
                            additionalProperties: false,
                            properties: {
                                re: { type: 'number', required: true },
                                im: { type: 'number', required: true },
                                rect: { type: 'string', required: true },
                                multiplicity: { type: 'number', required: true },
                                residual: { type: 'number', required: true },
                            },
                        },
                    },
                    count: { type: 'number' },
                    distinctCount: { type: 'number' },
                    converged: { type: 'boolean' },
                    iterations: { type: 'number' },
                    maxResidual: { type: 'number' },
                    note: { type: 'string' },
                },
            },
            render: (_args, value) => [{ type: 'text', text: renderPoly(value) }],
        },
        async execute(args) {
            const raw = args.coefficients;
            if (!Array.isArray(raw) || raw.length < 2) {
                return { valid: false, error: 'coefficients must be an array of at least 2 strings, highest power first (["1","0","-1"] is z^2 - 1)' };
            }
            if (raw.length > MAX_POLY_DEGREE + 1) {
                return { valid: false, error: `too many coefficients: ${raw.length} (degree limit ${MAX_POLY_DEGREE})` };
            }
            const parsedCoeffs = [];
            for (let i = 0; i < raw.length; i++) {
                const parsed = parseComplex(raw[i], places);
                if (!parsed.valid)
                    return { valid: false, error: `coefficient[${i}] ("${raw[i]}"): ${parsed.error}` };
                parsedCoeffs.push(parsed.z);
            }
            let start = 0;
            while (start < parsedCoeffs.length - 1) {
                const c = parsedCoeffs[start];
                if (c === undefined || c.re !== 0 || c.im !== 0)
                    break;
                start++;
            }
            const trimmedLeadingZeros = start;
            const coeffs = parsedCoeffs.slice(start);
            const degree = coeffs.length - 1;
            const lead = coeffs[0];
            if (lead === undefined || (lead.re === 0 && lead.im === 0)) {
                return { valid: false, error: 'every coefficient is zero: the zero polynomial is not a degree-≥1 polynomial' };
            }
            const notes = [];
            if (trimmedLeadingZeros > 0)
                notes.push(`trimmed ${trimmedLeadingZeros} leading zero coefficient(s): effective degree ${degree}`);
            if (args.operation === 'evaluate') {
                if (args.z === undefined)
                    return { valid: false, error: 'z is required for the evaluate operation' };
                const point = parseComplex(args.z, places);
                if (!point.valid)
                    return { valid: false, error: `z: ${point.error}` };
                const value = evalPolynomial(coeffs, point.z);
                const derivative = evalPolynomial(derivativePolynomial(coeffs), point.z);
                const out = {
                    valid: true,
                    operation: 'evaluate',
                    degree,
                    trimmedLeadingZeros,
                    z: formatRect(point.z, places),
                    value: pointOf(value, places),
                    derivative: pointOf(derivative, places),
                };
                if (notes.length > 0)
                    out.note = notes.join('; ');
                return out;
            }
            if (degree < 1) {
                return { valid: false, error: 'the polynomial is a non-zero constant: it has no roots' };
            }
            const report = polynomialRoots(coeffs);
            if (report === null)
                return { valid: false, error: 'the polynomial could not be normalised (leading coefficient is zero)' };
            const roots = report.roots.map((entry) => {
                const value = evalPolynomial(coeffs, entry.z);
                return { ...pointOf(entry.z, places), multiplicity: entry.multiplicity, residual: cleanValue(modulus(value), places) };
            });
            const maxResidual = roots.reduce((m, r) => Math.max(m, r.residual), 0);
            const out = {
                valid: true,
                operation: 'roots',
                degree,
                trimmedLeadingZeros,
                roots,
                count: roots.reduce((total, r) => total + r.multiplicity, 0),
                distinctCount: roots.length,
                converged: report.converged,
                iterations: report.iterations,
                maxResidual,
            };
            if (!report.converged) {
                notes.push(`the iteration stopped after ${report.iterations} steps without reaching its step tolerance: treat the roots as estimates (residuals above)`);
            }
            if (roots.some((r) => r.multiplicity > 1)) {
                notes.push('a repeated root converges only linearly and is reported once with its multiplicity');
            }
            if (notes.length > 0)
                out.note = notes.join('; ');
            return out;
        },
    });
    return { complex_parse, complex_calc, complex_convert, complex_functions, complex_roots, complex_quadratic, complex_poly };
}
//# sourceMappingURL=tools.js.map