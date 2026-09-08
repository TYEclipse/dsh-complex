# dsh-complex ➗➕

Complex-number math toolbox for [DeepSeek Harness (dsh)](https://github.com/deepseek-ai/deepseek-harness). Five pure-math tools that do complex arithmetic correctly on the principal branch, so the agent never has to hand-track `i² = -1` bookkeeping, Euler formulas, or polar conversions.

> 中文简介：dsh-complex 是 DeepSeek Harness 的复数数学工具箱插件，提供 5 个纯计算工具（复数解析、四则运算与整数幂、极坐标↔直角坐标互转、初等复函数主值、n 次方根全集），零运行时依赖、纯本地算术。适合让 Agent 直接完成「复数乘除、极坐标转换、欧拉公式、n 次方根、主值分支」等手算极易出错的计算。

## Why

LLMs reliably botch complex arithmetic: `(3+4i)(1-2i)`, `exp(iπ)`, `log(-1)`, `√-4`, the four fourth roots of 1, `i^i`. This plugin computes them exactly (IEEE double, output rounded to 10 decimals by default) with deterministic closed-form formulas, anchored by the Python stdlib `cmath` reference implementation in tests.

## Tools

| Tool | What it does |
|------|--------------|
| `complex_parse` | Parse `"3+4i"`, `"-2i"`, `"1e3+2e-1j"` (i or j, implicit coefficient 1 accepted) or polar `"5∠53.13°"` (degrees) into a full identity: rectangular/polar/exponential forms, modulus, argument (rad + deg), conjugate. |
| `complex_calc` | One operation: add, subtract, multiply, divide, conjugate, reciprocal, or integer power (De Moivre, exponent −1000..1000). Result in all three forms. |
| `complex_convert` | `to_polar` (any input → modulus, argument rad/deg, polar + exponential strings) and `to_rect` (polar input → a+bi). |
| `complex_functions` | Principal values of exp, log, sin, cos, tan, sinh, cosh, sqrt. Branch conventions are reported in the result `note`. |
| `complex_roots` | All n n-th roots (n = 1..64): r^(1/n)·(cos((θ+2πk)/n) + i·sin((θ+2πk)/n)), k = 0..n−1, listed from the principal root. |

Every value is deterministic: computations keep raw IEEE doubles and round/snap floating-point dust only at the output boundary (10 decimal places by default, configurable via `plugins.complex.roundPlaces`).

## Install

```bash
dsh plugin --profile web add github:TYEclipse/dsh-complex
```

Pin a specific version:

```bash
dsh plugin --profile web add github:TYEclipse/dsh-complex#v0.1.0
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

### Arithmetic

```
complex_calc(a="3+4i", b="1-2i", operation="multiply")   → 11-2i
complex_calc(a="3+4i", b="1-2i", operation="divide")     → -1+2i
complex_calc(a="1+i", exponent=8, operation="power")     → 16
```

### Principal values and roots

```
complex_functions(input="3.141592653589793i", operation="exp")  → -1        (Euler identity)
complex_functions(input="-1", operation="log")                   → 3.1415926536i  (iπ, principal branch)
complex_functions(input="-4", operation="sqrt")                  → 2i
complex_functions(input="i", operation="sqrt")                   → 0.7071067812+0.7071067812i

complex_roots(input="1", n=4)   → 1, i, -1, -i
complex_roots(input="-8", n=3)  → 1+1.7320508076i, -2, 1-1.7320508076i
```

### Conventions

- Input grammar: `a+bi` (or `a-bi`, `bi`, `a`, bare `i`; `j` also accepted; whitespace around the operator and the suffix is tolerated; scientific notation works; the imaginary coefficient may be omitted — `1+i` is `1+1i`).
- Polar input: `r∠θ°` with θ in degrees (the `°` or `deg` suffix is optional; negative angles accepted; r must be ≥ 0).
- Principal branch: `arg ∈ (-π, π]`; log and sqrt report their branch convention in the result `note`.
- `log(0)` and division by zero return an honest `valid: false` with an explanation instead of guessing.

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

123 tests, all anchored by an independent Python `cmath` oracle (`/tmp/dsh-scan/anchors-complex.py` — the reference implementation), plus schema-level enum rejection and recursive no-undefined (lossless-JSON) assertions on every tool result.

## License

MIT
