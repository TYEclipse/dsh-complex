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
import { type ToolDefinition } from '@deepseek-ai/dsh-tools';
import type { ResolvedConfig } from './index.ts';
export interface ToolSet {
    complex_parse: ToolDefinition;
    complex_calc: ToolDefinition;
    complex_convert: ToolDefinition;
    complex_functions: ToolDefinition;
    complex_roots: ToolDefinition;
    complex_quadratic: ToolDefinition;
    complex_poly: ToolDefinition;
}
/** Build all seven complex tool definitions from the resolved config. */
export declare function buildComplexTools(config: ResolvedConfig): ToolSet;
//# sourceMappingURL=tools.d.ts.map