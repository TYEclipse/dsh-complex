/**
 * dsh-complex — complex-number math toolbox for DeepSeek Harness.
 *
 * Five pure-math tools, zero runtime dependencies:
 *   complex_parse     — parse "3+4i" / "5∠53.13°" into a full summary
 *   complex_calc      — add / subtract / multiply / divide / conjugate / reciprocal / integer power
 *   complex_convert   — polar <-> rectangular conversion
 *   complex_functions — principal values of exp / log / sin / cos / tan / sinh / cosh / sqrt
 *   complex_roots     — all n n-th roots of a complex number
 *
 * All computation is closed-form local arithmetic on the principal branch;
 * no network, no processes, no eval.
 *
 * @module dsh-complex
 */
import type { Context } from '@deepseek-ai/cordis';
import z from '@deepseek-ai/schemastery';
/** Stable Cordis plugin name (also the config key under `plugins:`). */
export declare const name = "dsh-complex";
/** Services required before tool registration can start. */
export declare const inject: string[];
/** Plugin configuration, resolved with defaults by the loader. */
export interface Config {
    /** Decimal places every output number is rounded to (1–15). */
    roundPlaces?: number;
}
export declare const Config: z<Config>;
/** Config with every default resolved (all fields guaranteed). */
export interface ResolvedConfig {
    roundPlaces: number;
}
/** Resolve loader config into the effective runtime config. */
export declare function resolveConfig(config: Config): ResolvedConfig;
/** Mount the complex tools on every live agent and every future one. */
export declare function apply(ctx: Context, config: Config): void;
//# sourceMappingURL=index.d.ts.map