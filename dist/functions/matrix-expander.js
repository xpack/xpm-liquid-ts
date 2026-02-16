import * as os from 'node:os';
import { ConfigurationError } from '../classes/errors.js';
import { isJsonArray, isString } from './is-something.js';
import { performSubstitutions } from './perform-substitutions.js';
import { hasLiquidSyntax } from './utils.js';
import { getErrorMessage } from './utils.js';
export async function processMatrixForExpansion({ matrix, templateName, templateType, engine, substitutionsVariables, log, }) {
    const matrixKeys = [];
    const matrixValues = [];
    for (const [matrixKey, matrixValueArray] of Object.entries(matrix)) {
        if (!isJsonArray(matrixValueArray)) {
            throw new ConfigurationError(`${templateType} "${templateName}" ` +
                `matrix.${matrixKey} is not an array`);
        }
        if (matrixValueArray.length === 0) {
            throw new ConfigurationError(`${templateType} "${templateName}" ` +
                `matrix.${matrixKey} cannot be empty`);
        }
        const validatedArray = matrixValueArray;
        for (const matrixValue of validatedArray) {
            if (!isString(matrixValue)) {
                throw new ConfigurationError(`${templateType} "${templateName}" ` +
                    `matrix.${matrixKey} value is not a string`);
            }
        }
        matrixKeys.push(matrixKey);
        const stringValue = validatedArray.join(os.EOL);
        if (hasLiquidSyntax(stringValue)) {
            let substitutedValue;
            try {
                substitutedValue = await performSubstitutions({
                    input: stringValue,
                    engine,
                    substitutionsVariables,
                    log,
                });
            }
            catch (error) {
                const message = getErrorMessage(error) +
                    ` in ${templateType} "${templateName}" ` +
                    `matrix substitution`;
                throw new ConfigurationError(message);
            }
            matrixValues.push(substitutedValue.replace(new RegExp(os.EOL + '$'), '').split(os.EOL));
        }
        else {
            matrixValues.push(validatedArray);
        }
    }
    return { matrixKeys, matrixValues };
}
//# sourceMappingURL=matrix-expander.js.map