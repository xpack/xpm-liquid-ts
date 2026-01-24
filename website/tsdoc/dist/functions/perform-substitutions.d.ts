import { Logger } from '@xpack/logger';
import { XpmLiquidEngine } from '../classes/liquid-engine.js';
import { XpmLiquidSubstitutionsVariables } from '../data/substitutions-variables.js';
/**
 * Performs substitutions on an input string using Liquid.
 *
 * @remarks
 * This function processes Liquid template syntax (variables and tags) by
 * repeatedly rendering the input until no more substitutions are detected.
 * The iterative approach supports nested substitutions where one property
 * references another.
 *
 * Processing workflow:
 *
 * 1. Skip processing for empty strings to avoid unnecessary overhead.
 *
 * 2. Prepare Liquid context with substitution variables.
 *
 * 3. If properties exist, wrap them in {@link XpmLiquidPropertiesDrop} for
 *    lazy evaluation and nested substitution support.
 *
 * 4. If matrix parameters exist, wrap them in {@link XpmLiquidMatrixDrop}
 *    for template expansion variable access.
 *
 * 5. Iterate while Liquid syntax (`{{` or `{%`) is present:
 *
 *    - Parse and render the current string.
 *
 *    - Break if no changes occur (safety check).
 *
 *    - Continue with the substituted result.
 *
 * 6. Return the fully substituted string.
 *
 * The Drop pattern enables recursive property resolution: when a template
 * accesses `{{ properties.foo }}` and `foo` contains `{{ properties.bar }}`,
 * the next iteration resolves `bar`, and so on until no Liquid syntax
 * remains.
 *
 * Error handling: Liquid rendering errors are caught, stripped of line
 * number information (which can be misleading for nested templates), and
 * re-thrown as {@link XpmError}.
 *
 * @param log - The logger instance for output and diagnostics.
 * @param engine - The Liquid engine used to render substitutions.
 * @param input - The input string, possibly containing substitutions.
 * @param substitutionsVariables - The variables available for substitution.
 * @returns The fully substituted string.
 *
 * @throws {@link XpmError}
 * If Liquid rendering fails.
 */
export declare function performSubstitutions({ log, engine, input, substitutionsVariables, }: {
    log: Logger;
    engine: XpmLiquidEngine;
    input: string;
    substitutionsVariables: XpmLiquidSubstitutionsVariables;
}): Promise<string>;
//# sourceMappingURL=perform-substitutions.d.ts.map