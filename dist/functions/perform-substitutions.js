import assert from 'node:assert';
import * as util from 'node:util';
import { Context } from 'liquidjs';
import { ConfigurationError } from '../classes/errors.js';
import { LiquidPropertiesDrop, LiquidMatrixDrop, } from '../classes/liquid-drop.js';
export async function performSubstitutions({ log, engine, input, substitutionsVariables, }) {
    assert(substitutionsVariables, 'substitutionsVariables is required');
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
    while (current.includes('{{') || current.includes('{%')) {
        ++count;
        try {
            substituted = (await engine.parseAndRender(current, context));
            if (substituted === current) {
                log.warn(`performSubstitutions() step ${String(count)} => (`, substituted, ') did not change');
                break;
            }
        }
        catch (error) {
            if (error instanceof Error) {
                log.trace(util.inspect(error));
                throw new ConfigurationError(error.message.replace(/, line:.*/g, ''));
            }
            else {
                throw new ConfigurationError(String(error));
            }
        }
        log.trace(`performSubstitutions() step ${String(count)} => (`, substituted, ')');
        current = substituted;
    }
    return substituted;
}
//# sourceMappingURL=perform-substitutions.js.map