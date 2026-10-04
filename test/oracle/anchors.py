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


def main():
    for fn in (section_a, section_b, section_c, section_d):
        fn()
    print()
    print("=" * 104)
    if "--check" in sys.argv:
        if FAILS:
            print(f"SELF-CHECK FAILED ({len(FAILS)}):")
            for f in FAILS:
                print("  - " + f)
            return 1
        print("self-check: all invariants hold (roots satisfy the polynomial, powers match CPython **)")
    else:
        print("(run with --check to verify the invariants)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
