# dsh-complex ➗➕

Complex-number math toolbox for [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness). Eight pure-math tools that do complex arithmetic correctly on the principal branch, so the agent never has to hand-track `i² = -1` bookkeeping, Euler formulas, polar conversions, branch cuts, polynomial roots, or fractional-linear maps.

> 中文简介：dsh-complex 是 DeepSeek Harness 的复数数学工具箱插件，提供 8 个纯计算工具（复数解析、四则运算与任意复幂、极坐标↔直角坐标互转、初等与反函数主值、n 次方根全集、复系数二次方程求解、多项式求值与全部根、莫比乌斯（分式线性）变换），零运行时依赖、纯本地算术。适合让 Agent 直接完成「复数乘除、极坐标转换、欧拉公式、n 次方根、反三角/反双曲主值、分支切割、复系数二次方程、分式线性映射的不动点与复合」等手算极易出错的计算。

## Why

LLMs reliably botch complex arithmetic: `(3+4i)(1-2i)`, `exp(iπ)`, `log(-1)`, `√-4`, `i^i`, `asin(2)`, the four fourth roots of 1, the roots of `z² + iz + 1 = 0`. This plugin computes them exactly (IEEE double, output rounded to 10 decimals by default) with deterministic closed-form formulas, anchored by the Python stdlib `cmath` reference implementation in tests.

## Tools

| Tool | What it does |
|------|--------------|
| `complex_parse` | Parse `"3+4i"`, `"-2i"`, `"1e3+2e-1j"` (i or j, implicit coefficient 1 accepted) or polar `"5∠53.13°"` (degrees) into a full identity: rectangular/polar/exponential forms, modulus, argument (rad + deg), conjugate. |
| `complex_calc` | One operation: add, subtract, multiply, divide, conjugate, reciprocal, integer power (De Moivre, exponent −1000..1000), or **general complex power** `pow` (`a^b = exp(b·log a)`, both operands complex — `i^i`, `2^(1+i)`, `(-1)^0.5`). Result in all three forms. |
| `complex_convert` | `to_polar` (any input → modulus, argument rad/deg, polar + exponential strings) and `to_rect` (polar input → a+bi). |
| `complex_functions` | Principal values of the elementary functions (exp, log, sin, cos, tan, sinh, cosh, sqrt) **and the inverses** `asin`, `acos`, `atan`, `asinh`, `acosh`, `atanh`. Branch conventions are reported in the result `note`. |
| `complex_roots` | All n n-th roots (n = 1..64): r^(1/n)·(cos((θ+2πk)/n) + i·sin((θ+2πk)/n)), k = 0..n−1, listed from the principal root. |
| `complex_poly` | Polynomials with **complex** coefficients, highest power first: `evaluate` returns `p(z)` and `p'(z)` (Horner), `roots` returns every root up to degree 12 (Durand–Kerner) with each root's residual and a real `converged` flag. Integer roots come back exact; a multiple root such as `(z − 1)²` is reported once with multiplicity 2 instead of two near-identical numbers, and a run that misses its step tolerance says so. |
| `complex_quadratic` | Solve `a z² + b z + c = 0` with **complex** coefficients: discriminant, both roots (principal square root first), the Vieta invariants −b/a and c/a, and each root's residual `|a z² + b z + c|` so the answer is self-checking. `a = 0` degrades to the linear equation; `a = b = 0` reports "every z" or "no solution" honestly. |
| `complex_mobius` | Möbius (fractional-linear) maps `M(z) = (a z + b)/(c z + d)`: `apply` maps a point and gives the derivative `(ad − bc)/(c z + d)²`, `inverse` returns a preimage, `fixed_points` solves `z = M(z)` (two points, one repeated point, one point, every point for the identity, or none for a translation), `compose` multiplies two maps. Three traps are reported instead of papered over: `z = −d/c` is a pole (`atPole`, with no `w` field), `ad − bc = 0` means the map is degenerate (one `constant`, no `w`), and the fixed-point equation can pick up the pole as an extraneous root (listed under `excludedFixedPoints`). |

Every value is deterministic: computations keep raw IEEE doubles and round/snap floating-point dust only at the output boundary (10 decimal places by default, configurable via `plugins.complex.roundPlaces`).

## Install

```bash
dsh plugin --profile web add github:TYEclipse/dsh-complex
```

Pin a specific version:

```bash
dsh plugin --profile web add github:TYEclipse/dsh-complex#v0.4.0
```

Or install through the DSH web GUI plugin browser / any dsh plugin marketplace by searching `dsh-complex` (topic `dsh-plugin`).

Requires Node ≥ 20. Zero runtime dependencies.

## Usage

### Parse and convert

```
complex_parse("3+4i")
→ 3+4i  (rectangular; |z| = 5, arg = 53.1301023542°, conjugate 3-4i)

complex_convert(input="3+4i", operation="to_polar")
→ |z| = 5, arg = 0.927295218 rad = 53.1301023542°  (5∠53.1301023542°; exponential 5·e^(i·0.927295218))

complex_convert(input="2∠270°", operation="to_rect")
→ -2i
```

### Arithmetic and complex powers

```
complex_calc(a="3+4i", b="1-2i", operation="multiply")   → 11-2i
complex_calc(a="3+4i", b="1-2i", operation="divide")     → -1+2i
complex_calc(a="1+i", exponent=8, operation="power")     → 16
complex_calc(a="i", b="i", operation="pow")              → 0.2078795764   (i^i = e^(-π/2))
complex_calc(a="2", b="1+i", operation="pow")            → 1.5384778027+1.2779225526i
complex_calc(a="-1", b="0.5", operation="pow")           → i              (principal branch)
```

### Principal values, inverses and roots

```
complex_functions(input="3.141592653589793i", operation="exp")  → -1        (Euler identity)
complex_functions(input="-1", operation="log")                  → 3.1415926536i  (iπ, principal branch)
complex_functions(input="-4", operation="sqrt")                 → 2i
complex_functions(input="1+i", operation="asin")                → 0.6662394325+1.0612750619i
complex_functions(input="2", operation="asin")                  → 1.5707963268+1.3169578969i  (on the real cut)
complex_functions(input="2i", operation="atan")                 → 1.5707963268+0.5493061443i
complex_functions(input="2", operation="atanh")                 → 0.5493061443+1.5707963268i

complex_roots(input="1", n=4)   → 1, i, -1, -i
complex_roots(input="-8", n=3)  → 1+1.7320508076i, -2, 1-1.7320508076i
```

### Quadratic equations with complex coefficients

```
complex_quadratic(a="1", b="-2", c="2")
→ discriminant -4, sum 2, product 2; roots 1+1i, 1-1i

complex_quadratic(a="1", b="i", c="1")
→ discriminant -5, sum -i, product 1; roots 0.6180339887i, -1.6180339887i   (golden-ratio pair)

complex_quadratic(a="0", b="2", c="-4")
→ degree 1 (linear): root 2
```

### Polynomials and their roots

```
complex_poly(coefficients=["1","0","-1"], operation="evaluate", z="1+i")
→ p(1+1i) = -1+2i, p'(1+1i) = 2+2i

complex_poly(coefficients=["1","0","0","-1"], operation="roots")
→ 3 roots: 1, -0.5+0.8660254038i, -0.5-0.8660254038i   (converged, max residual 0)

complex_poly(coefficients=["1","-2","1"], operation="roots")
→ 1 root: 1  (×2)   — (z − 1)², multiplicity 2, not two near-identical numbers

complex_poly(coefficients=["1","-1","1","-4"], operation="roots")
→ 1, i, -i, -1                                    (z⁴ − 1)
```

### Fractional-linear (Möbius) maps

```
complex_mobius(a="1", b="-i", c="1", d="i", operation="apply", z="1+i")
→ M(1+1i) = 0.2-0.4i   (|w| = 0.4472135955, arg = -63.4349488229°, w' = 0.32-0.24i)

complex_mobius(a="1", b="-i", c="1", d="i", operation="fixed_points")
→ two fixed points: 1.3660254038-1.3660254038i, -0.3660254038+0.3660254038i

complex_mobius(a="1", b="-i", c="1", d="i", operation="inverse", z="0.2-0.4i")
→ preimage of w = 0.2-0.4i is z = 1+1i

complex_mobius(a="1", b="-i", c="1", d="i", operation="compose", a2="2", b2="1", c2="1", d2="-i")
→ (M ∘ N)(z) = (2-1i z + 0)/(2+1i z + 2), det = 4-2i

complex_mobius(a="1", b="1", c="1", d="-1", operation="apply", z="1")
→ atPole: 1 is the pole, the map is undefined there (no w field)

complex_mobius(a="1", b="i", c="i", d="-1", operation="apply", z="3+2i")
→ degenerate (ad − bc = 0): every defined point maps to -i (constant field, no w)
```

### Conventions

- Input grammar: `a+bi` (or `a-bi`, `bi`, `a`, bare `i`; `j` also accepted; whitespace around the operator and the suffix is tolerated; scientific notation works; the imaginary coefficient may be omitted — `1+i` is `1+1i`).
- Polar input: `r∠θ°` with θ in degrees (the `°` or `deg` suffix is optional; negative angles accepted; r must be ≥ 0).
- Principal branch: `arg ∈ (-π, π]`; every function reports its branch convention in the result `note`.
- Inverse functions follow CPython's `cmath` (C99) exactly, *including on the branch cuts*, where the naive principal-square-root identity would silently return the conjugate value: `asin(x) = sign(x)·π/2 + i·acosh|x|` for real |x| > 1, `atan(iy) = π/2 + i·sign(y)·atanh(1/|y|)` for |y| > 1, `asinh(iy) = acosh|y| + i·sign(y)·π/2`, `atanh(x) = atanh(1/x) + iπ/2`, and `acos = π/2 − asin`.
- `log(0)`, division by zero, `0^0`, and the genuinely undefined `atan(±i)` / `atanh(±1)` return an honest `valid: false` with an explanation instead of guessing.

## Configuration

```yaml
plugins:
  complex:
    roundPlaces: 10   # decimal places for every output number (1–15)
```

## Development

```bash
pnpm install
pnpm build
pnpm test
pnpm lint
```

235 tests, all anchored by an independent Python `cmath` oracle (`test/oracle/anchors.py` — the reference implementation, which prints every anchor over a grid that includes all four branch cuts and the degenerate/pole cases of the Möbius maps), plus schema-level enum rejection and recursive no-undefined (lossless-JSON) assertions on every tool result.

## License

MIT
