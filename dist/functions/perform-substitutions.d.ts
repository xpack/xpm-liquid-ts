import { Logger } from '@xpack/logger';
import { LiquidEngine } from '../classes/liquid-engine.js';
import { LiquidSubstitutionsVariables } from '../data/substitutions-variables.js';
export declare function performSubstitutions({ engine, input, substitutionsVariables, log, maxIterations, maxOutputSize, }: {
    engine: LiquidEngine;
    input: string;
    substitutionsVariables: LiquidSubstitutionsVariables;
    log: Logger;
    maxIterations?: number;
    maxOutputSize?: number;
}): Promise<string>;
//# sourceMappingURL=perform-substitutions.d.ts.map