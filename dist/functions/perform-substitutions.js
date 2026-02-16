import assert from 'node:assert';
import { Context } from 'liquidjs';
import { TemplateError } from '../classes/errors.js';
import { LiquidPropertiesDrop, LiquidMatrixDrop, } from '../classes/liquid-drop.js';
const PERFORM_SUBSTITUTION_MAX_ITERATIONS = 42;
const PERFORM_SUBSTITUTION_MAX_OUTPUT_SIZE = 42 * 1024;
export async function performSubstitutions({ engine, input, substitutionsVariables, log, maxIterations = PERFORM_SUBSTITUTION_MAX_ITERATIONS, maxOutputSize = PERFORM_SUBSTITUTION_MAX_OUTPUT_SIZE, }) {
    assert(engine, 'engine is required');
    assert(substitutionsVariables, 'substitutionsVariables is required');
    assert(log, 'log is required');
    assert(maxIterations > 0, 'maxIterations must be a positive integer');
    assert(maxOutputSize > 0, 'maxOutputSize must be a positive integer');
    if (input.trim() === '') {
        return input;
    }
    let properties = substitutionsVariables.properties;
    let matrix = substitutionsVariables.matrix;
    if (Object.keys(substitutionsVariables.properties).length > 0) {
        properties = new LiquidPropertiesDrop({
            log,
            engine,
            properties: substitutionsVariables.properties,
        });
    }
    if (substitutionsVariables.matrix &&
        Object.keys(substitutionsVariables.matrix).length > 0) {
        matrix = new LiquidMatrixDrop({
            log,
            engine,
            matrix: substitutionsVariables.matrix,
        });
    }
    const context = new Context({
        ...substitutionsVariables,
        properties,
        matrix,
    }, engine.options, { sync: false });
    log.trace(`performSubstitutions('${input}')`);
    let current = input;
    let substituted = current;
    let count = 0;
    const LIQUID_SYNTAX_REGEX = /\{\{|\{%/;
    while (LIQUID_SYNTAX_REGEX.test(current)) {
        if (++count > maxIterations) {
            throw new TemplateError(`Substitution limit exceeded ` +
                `(${String(maxIterations)} iterations). ` +
                `Possible circular reference in template.`);
        }
        try {
            substituted = (await engine.parseAndRender(current, context));
            if (substituted.length > maxOutputSize) {
                throw new TemplateError(`Template expansion exceeded size limit ` +
                    `(${String(maxOutputSize)} bytes). ` +
                    `Output was ${String(substituted.length)} bytes.`);
            }
            if (substituted === current) {
                log.warn(`performSubstitutions() step ${String(count)} => (`, substituted, ') did not change');
                break;
            }
        }
        catch (error) {
            if (error instanceof Error) {
                log.trace(`Liquid error: ${error.message}`);
                const cleanMessage = error.message.replace(/, line:.*/g, '');
                throw new TemplateError(cleanMessage);
            }
            else {
                throw new TemplateError(String(error));
            }
        }
        log.trace(`performSubstitutions() step ${String(count)} => (`, substituted, ')');
        current = substituted;
    }
    return substituted;
}
//# sourceMappingURL=perform-substitutions.js.map