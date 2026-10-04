# dsh-complex ➗➕

DeepSeek Harness (dsh) 的复数数学工具箱插件。

## 简介

大模型手算复数极易出错（i² 符号、极坐标转换、欧拉公式、n 次方根、反函数主值、分支切割、复系数方程）。本插件用确定性闭式公式在主值分支上完成复数计算，全部为本地纯算术、零运行时依赖（仅 Math.* 与字符串解析），输出统一舍入到 10 位小数（可配）。

## 工具（6 个）

- `complex_parse`：解析复数字符串（`"3+4i"`、`"-2i"`、`"5∠53.13°"`，i/j 均可、系数 1 可省略）→ 完整身份（直角/极坐标/指数形式、模、辐角 rad 与 deg、共轭）。
- `complex_calc`：加 / 减 / 乘 / 除 / 共轭 / 倒数 / 整数幂（De Moivre，指数 −1000..1000）/ **任意复幂** `pow`（`a^b = exp(b·log a)`，两个操作数都可为复数，如 `i^i`、`2^(1+i)`、`(-1)^0.5`），结果三种形式齐全。
- `complex_convert`：`to_polar`（→模、辐角、极坐标与指数形式字符串）与 `to_rect`（极坐标输入 → a+bi）。
- `complex_functions`：初等函数（exp / log / sin / cos / tan / sinh / cosh / sqrt）**与反函数**（asin / acos / atan / asinh / acosh / atanh）的主值；分支约定写入结果 note。
- `complex_roots`：全部 n 个 n 次方根（n = 1..64），从主根起按 k 序排列。
- `complex_quadratic`：求 **复系数** 二次方程 `a z² + b z + c = 0`：判别式、两个根（主平方根那支在前）、韦达不变量 −b/a 与 c/a，以及每个根的回代残差 `|a z² + b z + c|`（答案自检）。a = 0 退化为一次方程；a = b = 0 时如实报「任意复数皆解」或「无解」。

## 安装

```bash
dsh plugin --profile web add github:TYEclipse/dsh-complex
```

版本锁定：

```bash
dsh plugin --profile web add github:TYEclipse/dsh-complex#v0.2.0
```

要求 Node ≥ 20；零运行时依赖。

## 约定

- 直角形式语法：`a+bi` / `a-bi` / `bi` / `a` / 裸 `i`；`j` 亦可；运算符与后缀两侧允许空格；支持科学计数法；虚部系数可省略（`1+i` ≡ `1+1i`）。
- 极坐标输入：`r∠θ°`（θ 单位度；`°`/`deg` 后缀可省略；角度可为负；r 必须 ≥ 0）。
- 主值分支：辐角 ∈ (−π, π]；每个函数在结果 note 中明示分支约定。
- 反函数严格对齐 CPython `cmath`（C99），**包括分支切割上的取值**——朴素的「主平方根恒等式」在切割上会静默返回共轭值，故切割处改用显式延拓：实轴 |x| > 1 时 `asin(x) = sign(x)·π/2 + i·acosh|x|`、`atanh(x) = atanh(1/x) + iπ/2`；虚轴 |y| > 1 时 `atan(iy) = π/2 + i·sign(y)·atanh(1/|y|)`、`asinh(iy) = acosh|y| + i·sign(y)·π/2`；且 `acos = π/2 − asin`。
- `log(0)`、除零、`0^0`、以及本就无定义的 `atan(±i)` / `atanh(±1)` 一律返回诚实的 `valid: false` 与原因说明，绝不编造。

## 示例

- `(3+4i)(1-2i)` = `11-2i`；`(3+4i)/(1-2i)` = `-1+2i`
- `(1+i)^8` = `16`；`i^i` = `0.2078795764`；`exp(iπ)` = `-1`（欧拉恒等式）
- `log(-1)` = `3.1415926536i`（iπ，主值分支）
- `√-4` = `2i`；`√i` = `0.7071067812+0.7071067812i`
- `asin(1+i)` = `0.6662394325+1.0612750619i`；`asin(2)` = `1.5707963268+1.3169578969i`（落在实轴切割上）
- `1^(1/4)` = {1, i, -1, -i}；`(-8)^(1/3)` = {1+1.7320508076i, -2, 1-1.7320508076i}
- `z² + iz + 1 = 0` → `0.6180339887i`、`-1.6180339887i`（黄金比）

## 开发

```bash
pnpm install && pnpm build && pnpm test && pnpm lint
```

181 个测试全绿，全部锚点由随仓提交的独立 Python `cmath` oracle（`test/oracle/anchors.py`，权威参考实现；网格覆盖四条分支切割）生成，另含 schema 层枚举拒绝与递归无 undefined（lossless-JSON）断言。

## 许可证

MIT
