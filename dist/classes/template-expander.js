import { processMatrixForExpansion } from '../functions/matrix-expander.js';
import { performSubstitutions } from '../functions/perform-substitutions.js';
import { getErrorMessage } from '../functions/utils.js';
import { CombinationsGenerator } from './combinations-generator.js';
import { ConfigurationError } from './errors.js';
export class TemplateExpander {
    engine;
    substitutionsVariables;
    log;
    constructor({ engine, substitutionsVariables, log, }) {
        this.engine = engine;
        this.substitutionsVariables = substitutionsVariables;
        this.log = log;
    }
    async expandTemplate({ templateName, matrix, templateContent, templateType, instanceFactory, }) {
        const log = this.log;
        log.trace(`${TemplateExpander.name}.expandTemplate(${templateName})`);
        const instances = new Map();
        const { matrixKeys, matrixValues } = await processMatrixForExpansion({
            matrix,
            templateName,
            templateType: templateType,
            engine: this.engine,
            substitutionsVariables: this.substitutionsVariables,
            log: this.log,
        });
        const combinationsGenerator = new CombinationsGenerator({
            matrixKeys,
            matrixValues,
            log: this.log,
        });
        for (const combination of combinationsGenerator.generate()) {
            const expandedName = await this._expandName({
                templateName,
                combination,
                templateType,
            });
            const instance = instanceFactory(expandedName, combination, templateContent, templateName);
            instances.set(expandedName, instance);
        }
        return instances;
    }
    async _expandName({ templateName, combination, templateType, }) {
        try {
            return await performSubstitutions({
                input: templateName,
                engine: this.engine,
                substitutionsVariables: {
                    ...this.substitutionsVariables,
                    matrix: combination,
                },
                log: this.log,
            });
        }
        catch (error) {
            const message = getErrorMessage(error) +
                ` in ${templateType} "${templateName}" name substitution`;
            throw new ConfigurationError(message);
        }
    }
}
//# sourceMappingURL=template-expander.js.map