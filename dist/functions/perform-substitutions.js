import assert from 'node:assert';
import * as util from 'node:util';
import { Context } from 'liquidjs';
import { XpmLiquidMatrixDrop, XpmLiquidPropertiesDrop, } from '../classes/liquid-drop.js';
import { XpmError } from '../classes/errors.js';
export async function performSubstitutions({ log, engine, input, substitutionsVariables, }) {
    assert(substitutionsVariables);
    if (input.trim() === '') {
        return input;
    }
    let context;
    if (Object.keys(substitutionsVariables.properties).length > 0) {
        context = new Context({
            ...substitutionsVariables,
            properties: new XpmLiquidPropertiesDrop({
                log,
                engine,
                properties: substitutionsVariables.properties,
            }),
            matrix: new XpmLiquidMatrixDrop({
                log,
                engine,
                matrix: substitutionsVariables.matrix ?? {},
            }),
        });
    }
    else {
        context = new Context(substitutionsVariables);
    }
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
                throw new XpmError(error.message.replace(/, line:.*/g, ''));
            }
            else {
                throw new XpmError(String(error));
            }
            substituted = current;
            break;
        }
        log.trace(`performSubstitutions() step ${String(count)} => (`, substituted, ')');
        current = substituted;
    }
    return substituted;
}
//# sourceMappingURL=perform-substitutions.js.map