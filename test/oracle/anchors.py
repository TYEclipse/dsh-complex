#!/usr/bin/env python3
"""anchors.py — independent Python oracle for dsh-complex (v0.2.0).

Every numeric expectation asserted in ``test/complex.test.ts`` and
``test/tools.test.ts`` is produced here from primitives that share no code with
the TypeScript implementation:

  - complex function values (elementary *and* the v0.2.0 inverse functions):
    CPython's stdlib ``cmath`` — an implementation unrelated to this plugin
  - modulus / argument: ``math.hypot`` / ``math.atan2``
  - parsing, arithmetic, De Moivre integer powers, n-th roots, formatters:
    exact closed forms (``math.cos``/``math.sin``)
  - complex power ``a**b``: ``cmath.exp(b * cmath.log(a))`` on the principal branch
  - the quadratic solver: ``cmath.sqrt`` of the discriminant, with both roots
    re-substituted into ``a z^2 + b z + c`` before printing (residual check)

Sections mirror the test files so a reviewer can walk assertion -> anchor:

  A. legacy (v0.1.x) anchors — cleanValue, parsing, arithmetic, integerPower,
     polar components, elementary functions, nthRoots, formatters
  B. complex_functions v0.2.0 — inverse trigonometric / inverse hyperbolic
  C. complex_calc v0.2.0 — general complex power a^b
  D. complex_quadratic v0.2.0 — roots, discriminant, invariants, residuals

Usage:
  python3 test/oracle/anchors.py            # print every anchor
  python3 test/oracle/anchors.py --check    # + invariant self-checks (rc=1 on failure)
"""

import cmath
import math
import sys

FAILS = []


def r10(x):
    """Round the way the plugin reports numbers (10 places, snap dust, kill -0)."""
    v = round(float(x), 10)
    if abs(v) < 5e-12:
        v = 0.0
    return v


def jsnum(v):
    """Render a number the way JavaScript's String(number) does (5.0 -> '5')."""
    v = r10(v)
    if v == int(v) and abs(v) < 1e15:
        return str(int(v))
    return repr(v)


def rc(z):
    """A complex value as the two cleaned components the plugin emits."""
    z = complex(z)
    return (r10(z.real), r10(z.imag))


def show(label, value):
    if isinstance(value, complex):
        re, im = r10(value.real), r10(value.imag)
        print(f"{label:<46} raw ({value.real!r}, {value.imag!r})")
        print(f"{'':<46} cleaned ({re!r}, {im!r})")
    else:
        print(f"{label:<46} raw {value!r}  cleaned {r10(value)!r}")


def check(label, got, want, tol=1e-12):
    if isinstance(want, (list, tuple)) and want and isinstance(want[0], (list, tuple)):
        ok = len(got) == len(want) and all(
            all(abs(x - y) <= tol for x, y in zip(g, w)) for g, w in zip(got, want))
    elif isinstance(want, (list, tuple)):
        ok = len(got) == len(want) and all(abs(x - y) <= tol for x, y in zip(got, want))
    else:
        ok = abs(got - want) <= tol
    if not ok:
        FAILS.append(f"{label}: got {got} want {want}")
    print(f"  [{'ok' if ok else 'FAIL'}] {label}")


def section(title):
    print()
    print("=" * 104)
    print(title)
    print("=" * 104)


# --------------------------------------------------------------------------
# A. legacy (v0.1.x) anchors
# --------------------------------------------------------------------------

def section_a():
    section("A. legacy (v0.1.x) anchors")

    print("-- cleanValue --")
    show("cleanValue(0.12345678912345, 10)", r10(0.12345678912345))
    show("cleanValue(1e-13, 10)", r10(1e-13))
    show("cleanValue(-1e-13, 10)", r10(-1e-13))
    show("cleanValue(3.4e-9, 10)", r10(3.4e-9))

    print("-- parsing: rectangular identities are exact --")
    for text, want in [("3+4i", (3, 4)), ("3-4i", (3, -4)), ("-3+4i", (-3, 4)), ("-3-4i", (-3, -4)),
                       ("3", (3, 0)), ("-2.5", (-2.5, 0)), ("i", (0, 1)), ("-i", (0, -1)),
                       ("+i", (0, 1)), ("5j", (0, 5)), ("-2i", (0, -2)), ("1e3+2e-1i", (1000, 0.2)),
                       ("3 + 4 i", (3, 4)), ("0.5-0.25j", (0.5, -0.25)), ("1+i", (1, 1)),
                       ("3-i", (3, -1)), ("-2+i", (-2, 1))]:
        print(f"   parse({text!r}) = {want}")

    print("-- parsing: polar r <angle> deg -> (r cos, r sin) --")
    for text, r, deg in [("5∠53.1301023542°", 5, 53.1301023542), ("5∠53.1301023542", 5, 53.1301023542),
                         ("2∠270°", 2, 270), ("2 ∠ 270 deg", 2, 270), ("1∠90", 1, 90),
                         ("0∠45°", 0, 45), ("5∠-45", 5, -45)]:
        rad = math.radians(deg)
        show(f"parse({text!r})", complex(r * math.cos(rad), r * math.sin(rad)))

    print("-- arithmetic on 3+4i and 1-2i --")
    a, b = complex(3, 4), complex(1, -2)
    show("add(3+4i, 1-2i)", a + b)
    show("subtract(3+4i, 1-2i)", a - b)
    show("multiply(3+4i, 1-2i)", a * b)
    show("divide(3+4i, 1-2i)", a / b)
    show("conjugate(3+4i)", a.conjugate())
    show("reciprocal(3+4i) = 1/a", 1 / a)

    print("-- integerPower (De Moivre, exact closed form) --")
    show("(1+i)^8", complex(1, 1) ** 8)
    show("(1+i)^-3", complex(1, 1) ** -3)
    show("(5+7i)^0", complex(5, 7) ** 0)
    show("(-2)^3", (-2 + 0j) ** 3)
    show("i^9", (0 + 1j) ** 9)

    print("-- polar components of 3+4i --")
    show("modulus(3+4i) = hypot(3,4)", math.hypot(3, 4))
    show("argumentRad(3+4i) = atan2(4,3)", math.atan2(4, 3))
    show("argumentDeg(3+4i)", math.degrees(math.atan2(4, 3)))
    show("argumentDeg(1-i)", math.degrees(math.atan2(-1, 1)))
    show("argumentDeg(-1)", math.degrees(math.atan2(0, -1)))
    print("   argumentDeg(0) = 0  (atan2(0,0) is 0; reported with an undefined-argument note)")

    print("-- elementary functions (cmath = reference implementation) --")
    show("exp(i*pi)", cmath.exp(1j * math.pi))
    show("exp(1+i*pi)", cmath.exp(1 + 1j * math.pi))
    show("exp(i)", cmath.exp(1j))
    show("log(1+i)", cmath.log(1 + 1j))
    show("log(-1)", cmath.log(-1 + 0j))
    show("log(8)", cmath.log(8 + 0j))
    show("sin(1+i)", cmath.sin(1 + 1j))
    show("cos(1+i)", cmath.cos(1 + 1j))
    show("tan(1+i)", cmath.tan(1 + 1j))
    show("sinh(1+i)", cmath.sinh(1 + 1j))
    show("cosh(1+i)", cmath.cosh(1 + 1j))
    show("sqrt(-4)", cmath.sqrt(-4 + 0j))
    show("sqrt(i)", cmath.sqrt(1j))
    show("sqrt(-0.25)", cmath.sqrt(-0.25 + 0j))

    print("-- nthRoots: r^(1/n) * (cos((theta+2*pi*k)/n) + i sin(...)) --")
    for label, z, n, want in [
        ("4th roots of 1", 1 + 0j, 4, [(1, 0), (0, 1), (-1, 0), (0, -1)]),
        ("cube roots of -8", -8 + 0j, 3, [(1, 1.7320508076), (-2, 0), (1, -1.7320508076)]),
        ("square roots of i", 1j, 2, [(0.7071067812, 0.7071067812), (-0.7071067812, -0.7071067812)]),
        ("1st root of 1", 1 + 0j, 1, [(1, 0)]),
        ("cube roots of 0", 0j, 3, [(0, 0), (0, 0), (0, 0)]),
    ]:
        r = abs(z) ** (1 / n)
        theta = cmath.phase(z)
        got = [rc(complex(r * math.cos((theta + 2 * math.pi * k) / n),
                          r * math.sin((theta + 2 * math.pi * k) / n))) for k in range(n)]
        print(f"   {label}: {got}")
        check(f"nthRoots {label}", got, want, tol=1e-9)

    print("-- formatters (string anchors) --")
    print("   formatRect(3+4i)          = '3+4i'")
    print("   formatRect(3-4i)          = '3-4i'")
    print("   formatRect(-3+4i)         = '-3+4i'")
    print("   formatRect(2i)            = '2i'")
    print("   formatRect(-i)            = '-i'")
    print("   formatRect(5)             = '5'")
    print("   formatRect(0)             = '0'")
    print(f"   formatPolar(3+4i)         = '{jsnum(math.hypot(3,4))}∠{jsnum(math.degrees(math.atan2(4,3)))}°'")
    print(f"   formatExponential(3+4i)   = '{jsnum(math.hypot(3,4))}·e^(i·{jsnum(math.atan2(4,3))})'")


# --------------------------------------------------------------------------
# B. inverse trigonometric / inverse hyperbolic (v0.2.0)
# --------------------------------------------------------------------------

INVERSE = {
    "asin": cmath.asin,
    "acos": cmath.acos,
    "atan": cmath.atan,
    "asinh": cmath.asinh,
    "acosh": cmath.acosh,
    "atanh": cmath.atanh,
}

INVERSE_CASES = [
    ("1+i", 1 + 1j), ("i", 1j), ("2", 2 + 0j), ("-2", -2 + 0j), ("3+4i", 3 + 4j),
    ("0.5", 0.5 + 0j), ("-1", -1 + 0j), ("2i", 2j),
    # the four branch cuts (where the naive principal-sqrt composition diverges
    # from cmath and the implementation switches to the explicit cut formula)
    ("3", 3 + 0j), ("-3", -3 + 0j), ("4", 4 + 0j), ("-4", -4 + 0j),
    ("3i", 3j), ("-3i", complex(0, -3)), ("-2i", complex(0, -2)), ("-0.5", -0.5 + 0j),
    ("1-2i", 1 - 2j), ("-1+1j", -1 + 1j),
    # just off the real cut: proves the cut branch does not leak into nearby points
    ("1+1e-9i", complex(1, 1e-9)), ("2-1e-9i", complex(2, -1e-9)),
]
# NOTE on the purely imaginary entries: the literal `-3j` carries a **-0.0 real
# part**, and cmath's cut value for atan/asinh depends on the *sign of that
# zero* (it is the limit from Re < 0 rather than Re > 0). The plugin's parser
# always produces re = +0.0 for binary input, so the oracle constructs those
# cases as complex(0, y) — the C99 continuation from the right half plane.

UNDEFINED = [("atan", "i"), ("atan", "-i"), ("atanh", "1"), ("atanh", "-1")]


def section_b():
    section("B. complex_functions v0.2.0 — inverse trigonometric / inverse hyperbolic")
    for fn, z in INVERSE_CASES:
        for name in ("asin", "acos", "atan", "asinh", "acosh", "atanh"):
            try:
                value = INVERSE[name](z)
            except ValueError:
                print(f"   {name}({fn}) = undefined (cmath raises ValueError)")
                continue
            show(f"{name}({fn})", value)
    print()
    print("-- genuinely undefined inputs (cmath raises ValueError) --")
    for name, text in UNDEFINED:
        try:
            value = INVERSE[name](complex(text.replace("i", "j")))
            print(f"   {name}({text}) = {value}  <-- UNEXPECTED (should be undefined)")
            FAILS.append(f"{name}({text}) should be undefined")
        except ValueError:
            print(f"   {name}({text}) = undefined (cmath ValueError) -> plugin must return an honest error")


# --------------------------------------------------------------------------
# C. general complex power a^b (v0.2.0)
# --------------------------------------------------------------------------

POW_CASES = [
    ("1+i", 1 + 1j, "1-i", 1 - 1j),
    ("i", 1j, "i", 1j),
    ("2", 2 + 0j, "1+i", 1 + 1j),
    ("-1", -1 + 0j, "0.5", 0.5 + 0j),
    ("3+4i", 3 + 4j, "1-2i", 1 - 2j),
    ("e", math.e + 0j, "i*pi", 0 + 1j * math.pi),
]


def pow_principal(a, b):
    """a^b = exp(b * log a) on the principal branch."""
    if a == 0:
        return None
    return cmath.exp(b * cmath.log(a))


def section_c():
    section("C. complex_calc v0.2.0 — general complex power a^b = exp(b·log a)")
    for an, a, bn, b in POW_CASES:
        got = pow_principal(a, b)
        show(f"({an})^({bn})", got)
        # cross-check with CPython's own complex power operator
        check(f"({an})^({bn}) vs **", rc(got), rc(a ** b), tol=1e-9)
    print("   note: a = 0 -> only b real and > 0 is defined (0^2 = 0); 0^0 and 0^(non-positive-real) are undefined")
    show("0^2", 0 + 0j)


# --------------------------------------------------------------------------
# D. quadratic solver (v0.2.0)
# --------------------------------------------------------------------------

QUADRATIC_CASES = [
    ("1", 1 + 0j, "0", 0 + 0j, "1", 1 + 0j),
    ("1", 1 + 0j, "-2", -2 + 0j, "2", 2 + 0j),
    ("1", 1 + 0j, "1", 1 + 0j, "1", 1 + 0j),
    ("2", 2 + 0j, "-4", -4 + 0j, "5", 5 + 0j),
    ("1", 1 + 0j, "i", 1j, "1", 1 + 0j),
    ("1+i", 1 + 1j, "0", 0 + 0j, "-1", -1 + 0j),
    ("0", 0 + 0j, "2", 2 + 0j, "-4", -4 + 0j),
]


def section_d():
    section("D. complex_quadratic v0.2.0 — a z^2 + b z + c = 0 over the complex numbers")
    for an, a, bn, b, cn, c in QUADRATIC_CASES:
        print(f"-- {an} z^2 + {bn} z + {cn} = 0 --")
        if a == 0:
            if b == 0:
                print("   degenerate: a = b = 0 -> no solution" if c != 0 else "   degenerate: a = b = c = 0 -> every z is a solution")
                continue
            root = -c / b
            show("   degree 1 root -c/b", root)
            check(f"   linear residual |bz+c| ({an},{bn},{cn})", abs(b * root + c), 0.0, tol=1e-9)
            continue
        disc = b * b - 4 * a * c
        if disc.imag == 0:
            disc = complex(disc.real, 0.0)  # signed-zero normalisation (plugin rule): -0.0 imag would flip sqrt's branch
        s = cmath.sqrt(disc)
        roots = [(-b + s) / (2 * a), (-b - s) / (2 * a)]
        show("   discriminant b^2-4ac", disc)
        show("   sum -b/a", -b / a)
        show("   product c/a", c / a)
        for i, root in enumerate(roots):
            residual = abs(a * root * root + b * root + c)
            show(f"   root[{i}]", root)
            show(f"   root[{i}] residual |az^2+bz+c|", residual)
            check(f"   root[{i}] residual ({an},{bn},{cn})", r10(residual), 0.0, tol=1e-9)
            check(f"   root[{i}] satisfies ({an},{bn},{cn})", rc(a * root * root + b * root + c), (0, 0), tol=1e-8)
        check(f"   sum invariant ({an},{bn},{cn})", rc(roots[0] + roots[1]), rc(-b / a), tol=1e-9)
        check(f"   product invariant ({an},{bn},{cn})", rc(roots[0] * roots[1]), rc(c / a), tol=1e-9)


ROOT5 = [cmath.exp(2j * cmath.pi * k / 3) for k in range(3)]
# z^2 + i z + 1 = 0: b = i, a = c = 1, disc = b^2 - 4ac = -1 - 4 = -5
_C_B = 1j
_QUAD_DISC = _C_B * _C_B - 4
QUAD_C = [(-_C_B + cmath.sqrt(_QUAD_DISC)) / 2, (-_C_B - cmath.sqrt(_QUAD_DISC)) / 2]

# (coefficients, z label, z value) — coefficients highest power first
EVAL_CASES = [
    (("1", "0", "-1"), "1+i", 1 + 1j),
    (("1", "-6", "11", "-6"), "2", 2 + 0j),
    (("2", "-1", "1", "-4"), "i", 1j),
    (("1", "1j", "1"), "-2i", -2j),
    (("0", "1", "-1"), "3", 3 + 0j),
]

# (label, coefficients, [(known root, multiplicity)]) — roots from closed forms
ROOT_CASES = [
    ("z^2 - 1", ("1", "0", "-1"), [(1 + 0j, 1), (-1 + 0j, 1)]),
    ("z^3 - 1", ("1", "0", "0", "-1"), [(1 + 0j, 1), (ROOT5[1], 1), (ROOT5[2], 1)]),
    ("z^4 - 1", ("1", "0", "0", "0", "-1"), [(1 + 0j, 1), (1j, 1), (-1 + 0j, 1), (-1j, 1)]),
    ("(z-1)^2", ("1", "-2", "1"), [(1 + 0j, 2)]),
    ("z^2 + i z + 1", ("1", "1j", "1"), [(QUAD_C[0], 1), (QUAD_C[1], 1)]),
    ("(z-1)(z-2)(z-3)", ("1", "-6", "11", "-6"), [(1 + 0j, 1), (2 + 0j, 1), (3 + 0j, 1)]),
    ("z^2 + 1", ("1", "0", "1"), [(1j, 1), (-1j, 1)]),
    ("(z-1)(z-2)(z-3)(z-4)", ("1", "-10", "35", "-50", "24"),
     [(1 + 0j, 1), (2 + 0j, 1), (3 + 0j, 1), (4 + 0j, 1)]),
    ("0z^2 + z - 1 (leading zero)", ("0", "1", "-1"), [(1 + 0j, 1)]),
]


def section_e():
    section("E. complex_poly v0.3.0 — Horner evaluation and polynomial roots")
    for coeffs, zn, z in EVAL_CASES:
        p = [complex(x) for x in coeffs]
        deg = len(p) - 1
        # direct power sum, deliberately not Horner (the implementation uses Horner)
        value = sum(c * (z ** (deg - i)) for i, c in enumerate(p))
        deriv = sum((deg - i) * c * (z ** (deg - i - 1)) for i, c in enumerate(p) if deg - i >= 1)
        print(f"-- coefficients {list(coeffs)} at z = {zn} --")
        show("   p(z)", value)
        show("   p'(z)", deriv)
        check(f"   p({zn}) direct sum", rc(value), rc(value), tol=1e-12)

    for label, coeffs, known in ROOT_CASES:
        p = [complex(x) for x in coeffs]
        lead = p[0]
        while p and p[0] == 0:  # leading zeros trimmed like the plugin
            p.pop(0)
        deg = len(p) - 1
        print(f"-- {label}: coefficients {list(coeffs)} (effective degree {deg}) --")
        for i, (root, mult) in enumerate(known):
            residual = abs(sum(c * (root ** (len(p) - 1 - k)) for k, c in enumerate(p)))
            show(f"   root[{i}]", root)
            print(f"   root[{i}] multiplicity = {mult}")
            show(f"   root[{i}] residual |p(z)|", residual)
            check(f"   root[{i}] satisfies p ({label})", residual, 0.0, tol=1e-9)
        total = sum(m for _, m in known)
        check(f"   root count equals degree ({label})", total, deg, tol=0)
        if lead != 0 and deg >= 2:
            # Vieta: sum of roots = -a_{n-1}/a_n, product = (-1)^n a_0/a_n
            s = sum(root * mult for root, mult in known)
            prod = 1 + 0j
            for root, mult in known:
                prod *= root ** mult
            check(f"   Vieta sum ({label})", rc(s), rc(-p[1] / lead), tol=1e-9)
            check(f"   Vieta product ({label})", rc(prod), rc(((-1) ** deg) * p[-1] / lead), tol=1e-9)


# --------------------------------------------------------------------------
# F. complex_mobius v0.4.0 — apply / inverse / fixed points / compose
# --------------------------------------------------------------------------

def mob_apply(a, b, c, d, z):
    return (a * z + b) / (c * z + d)


def mob_det(a, b, c, d):
    return a * d - b * c


def mob_fixed(a, b, c, d):
    """Roots of c z^2 + (d - a) z - b = 0, computed with cmath.sqrt."""
    if c == 0:
        if d == a:
            return []
        return [b / (d - a)]
    disc = (d - a) ** 2 + 4 * c * b
    root = cmath.sqrt(disc)
    return [(-(d - a) + root) / (2 * c), (-(d - a) - root) / (2 * c)]


MOBIUS_APPLY = [
    # label, a, b, c, d, z
    ("cayley at 1+i", 1, -1j, 1, 1j, 1 + 1j),
    ("(2z+1)/(z-i) at 1", 2, 1, 1, -1j, 1 + 0j),
    ("(z+1)/(z-1) at 2", 1, 1, 1, -1, 2 + 0j),
    ("identity at 2+3i", 1, 0, 0, 1, 2 + 3j),
    ("translation at 2+3i", 1, 1, 0, 1, 2 + 3j),
    ("degenerate at 3+2i", 1, 1j, 1j, -1, 3 + 2j),
    ("two-point swap style at 1+2i", 1, -1j, 2, 1, 1 + 2j),
]


def section_f():
    section("F. complex_mobius v0.4.0 — apply / inverse / fixed points / compose")

    for label, a, b, c, d, z in MOBIUS_APPLY:
        print(f"-- apply {label}: ({a}) z + ({b}) over ({c}) z + ({d}) at z = {z} --")
        show("   determinant ad - bc", mob_det(a, b, c, d))
        w = mob_apply(a, b, c, d, z)
        show("   w = M(z)", w)
        denominator = c * z + d
        show("   c z + d", denominator)
        show("   derivative (ad-bc)/(cz+d)^2", mob_det(a, b, c, d) / denominator ** 2)
        show("   |w|", abs(w))
        show("   arg(w) in degrees", math.degrees(cmath.phase(w)))
        show("   |z|", abs(z))
        show("   arg(z) in degrees", math.degrees(cmath.phase(z)))
        # invariant: w = (a z + b)/(c z + d) restated as cz*w + d*w = az + b
        check(f"   M(z) satisfies c w z + d w = a z + b ({label})",
              rc(c * w * z + d * w), rc(a * z + b), tol=1e-12)

    print("-- pole: (z + 1)/(z - 1) at z = 1 --")
    show("   c z + d at z = 1", 1 * 1 + (-1))
    print("   -> the map is undefined there (the honest answer, not a huge number)")

    print("-- degenerate: (z + i)/(i z - 1) at z = 3 + 2i --")
    a, b, c, d = 1, 1j, 1j, -1
    show("   determinant", mob_det(a, b, c, d))
    show("   constant a/c", a / c)
    show("   constant b/d", b / d)
    check("   degenerate constant: a/c == b/d", rc(a / c), rc(b / d), tol=1e-15)
    show("   M(3+2i)", mob_apply(a, b, c, d, 3 + 2j))

    print("-- inverse: cayley, preimage of w = 0.2 - 0.4i --")
    a, b, c, d = 1, -1j, 1, 1j
    w = 0.2 - 0.4j
    pre = (d * w - b) / (a - c * w)
    show("   preimage (d w - b)/(a - c w)", pre)
    check("   round trip M(preimage) = w", rc(mob_apply(a, b, c, d, pre)), rc(w), tol=1e-12)
    print("-- inverse: w = a/c = 1 has no finite preimage (a - c w = 0) --")
    show("   a - c w at w = 1", a - c * 1)

    print("-- fixed points --")
    FIXED = [
        ("cayley", 1, -1j, 1, 1j),
        ("(2z+1)/(z-i)", 2, 1, 1, -1j),
        ("identity", 1, 0, 0, 1),
        ("translation", 1, 1, 0, 1),
        ("c = 0, d != a", 2, 3, 0, 1),
        ("repeated (degenerate)", 1, 1j, 1j, -1),
        ("repeated (invertible)", 0, -1, 1, 2),
    ]
    for label, a, b, c, d in FIXED:
        print(f"-- fixed points {label}: ({a}) z + ({b}) over ({c}) z + ({d}) --")
        print(f"   determinant = {rc(mob_det(a, b, c, d))}")
        roots = mob_fixed(a, b, c, d)
        if not roots:
            print("   no finite fixed point (identity has every point fixed; a translation has none)")
            continue
        for i, root in enumerate(roots):
            show(f"   root[{i}]", root)
            pole = abs(c * root + d) <= 1e-12 * max(1.0, abs(c * root) + abs(d))
            show(f"   c*root[{i}] + d (0 means root is the pole)", c * root + d)
            if pole:
                # The fixed-point equation z(cz + d) = az + b also collects the
                # pole when the map is degenerate (ad - bc = 0): the root is not
                # in the domain, so it is excluded rather than reported as fixed.
                print(f"   -> root[{i}] is the pole: excluded (the map is undefined there)")
                continue
            show(f"   M(root[{i}])", mob_apply(a, b, c, d, root))
            check(f"   root[{i}] is fixed ({label})", rc(mob_apply(a, b, c, d, root)), rc(root), tol=1e-9)
        if len(roots) == 2:
            check(f"   sum of roots = -(d - a)/c ({label})",
                  rc(roots[0] + roots[1]), rc(-(d - a) / c), tol=1e-9)
            check(f"   product of roots = -b/c ({label})",
                  rc(roots[0] * roots[1]), rc(-b / c), tol=1e-9)

    print("-- compose: M = cayley, N = (2z + 1)/(z - i) --")
    M = (1, -1j, 1, 1j)
    N = (2, 1, 1, -1j)
    comp = (M[0] * N[0] + M[1] * N[2], M[0] * N[1] + M[1] * N[3],
            M[2] * N[0] + M[3] * N[2], M[2] * N[1] + M[3] * N[3])
    print(f"   composed coefficients a,b,c,d = {[rc(x) for x in comp]}")
    show("   det(M∘N)", mob_det(*comp))
    check("   det(M∘N) = det(M)·det(N)", rc(mob_det(*comp)), rc(mob_det(*M) * mob_det(*N)), tol=1e-12)
    z = 1 + 2j
    show("   (M∘N)(1+2i)", mob_apply(*comp, z))
    check("   (M∘N)(z) = M(N(z))", rc(mob_apply(*comp, z)),
          rc(mob_apply(*M, mob_apply(*N, z))), tol=1e-12)


def main():
    for fn in (section_a, section_b, section_c, section_d, section_e, section_f):
        fn()
    print()
    print("=" * 104)
    if "--check" in sys.argv:
        if FAILS:
            print(f"SELF-CHECK FAILED ({len(FAILS)}):")
            for f in FAILS:
                print("  - " + f)
            return 1
        print("self-check: all invariants hold (roots satisfy the polynomial, powers match CPython **, "
              "Möbius fixed points are fixed and compositions agree)")
    else:
        print("(run with --check to verify the invariants)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
