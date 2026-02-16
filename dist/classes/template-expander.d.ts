import { Logger } from '@xpack/logger';
import { LiquidSubstitutionsVariables } from '../data/substitutions-variables.js';
import { LiquidEngine } from './liquid-engine.js';
import { JsonTemplateMatrix } from '../types/json.js';
export interface TemplateExpanderConstructorParameters {
    engine: LiquidEngine;
    substitutionsVariables: LiquidSubstitutionsVariables;
    log: Logger;
}
export type InstanceFactoryCallback<TTemplate, TInstance> = (expandedName: string, combination: Record<string, string>, templateContent: TTemplate, originalTemplateName: string) => TInstance;
export declare class TemplateExpander<TTemplate, TInstance> {
    readonly engine: LiquidEngine;
    readonly substitutionsVariables: LiquidSubstitutionsVariables;
    readonly log: Logger;
    constructor({ engine, substitutionsVariables, log, }: TemplateExpanderConstructorParameters);
    expandTemplate({ templateName, matrix, templateContent, templateType, instanceFactory, }: {
        templateName: string;
        matrix: JsonTemplateMatrix;
        templateContent: TTemplate;
        templateType: string;
        instanceFactory: InstanceFactoryCallback<TTemplate, TInstance>;
    }): Promise<Map<string, TInstance>>;
    protected _expandName({ templateName, combination, templateType, }: {
        templateName: string;
        combination: Record<string, string>;
        templateType: string;
    }): Promise<string>;
}
//# sourceMappingURL=template-expander.d.ts.map