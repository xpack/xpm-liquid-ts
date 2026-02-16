import { Logger } from '@xpack/logger';
import { LiquidEngine } from '../classes/liquid-engine.js';
import { LiquidSubstitutionsVariables } from '../data/substitutions-variables.js';
import { JsonTemplateMatrix } from '../types/json.js';
export interface ProcessedMatrix {
    matrixKeys: string[];
    matrixValues: string[][];
}
export declare function processMatrixForExpansion({ matrix, templateName, templateType, engine, substitutionsVariables, log, }: {
    matrix: JsonTemplateMatrix;
    templateName: string;
    templateType: 'action' | 'buildConfiguration';
    engine: LiquidEngine;
    substitutionsVariables: LiquidSubstitutionsVariables;
    log: Logger;
}): Promise<ProcessedMatrix>;
//# sourceMappingURL=matrix-expander.d.ts.map