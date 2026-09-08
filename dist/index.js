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
import z from '@deepseek-ai/schemastery';
import { buildComplexTools } from "./tools.js";
/** Stable Cordis plugin name (also the config key under `plugins:`). */
export const name = 'dsh-complex';
/** Services required before tool registration can start. */
export const inject = ['agents', 'tools'];
export const Config = z.object({
    roundPlaces: z.number().step(1).min(1).max(15).default(10),
});
/** Resolve loader config into the effective runtime config. */
export function resolveConfig(config) {
    return {
        roundPlaces: config.roundPlaces ?? 10,
    };
}
/** Register every complex tool on one agent; returns the disposer. */
function decorate(agent, tools) {
    const disposers = Object.values(tools).map((definition) => agent.ctx.tools.register(definition));
    return () => {
        for (const dispose of disposers) {
            try {
                dispose();
            }
            catch {
                // already disposed
            }
        }
    };
}
/** Mount the complex tools on every live agent and every future one. */
export function apply(ctx, config) {
    const resolved = resolveConfig(config);
    const tools = buildComplexTools(resolved);
    const disposers = new Set();
    const decorateAgent = (agent) => {
        try {
            disposers.add(decorate(agent, tools));
        }
        catch (error) {
            ctx.logger('complex').warn(`tool registration for agent ${agent.id} failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };
    for (const agent of ctx.agents.list())
        decorateAgent(agent);
    const off = ctx.on('agent/created', ({ agent }) => decorateAgent(agent));
    ctx.effect(() => () => {
        off();
        for (const dispose of disposers) {
            try {
                dispose();
            }
            catch {
                // already disposed
            }
        }
        disposers.clear();
    });
}
//# sourceMappingURL=index.js.map