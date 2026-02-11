import { Logger } from '@xpack/logger';
import { LiquidEngine } from '../classes/liquid-engine.js';
import { LiquidSubstitutionsVariables } from '../data/substitutions-variables.js';
export declare function performSubstitutions({ log, engine, input, substitutionsVariables, }: {
    log: Logger;
    engine: LiquidEngine;
    input: string;
    substitutionsVariables: LiquidSubstitutionsVariables;
}): Promise<string>;
//# sourceMappingURL=perform-substitutions.d.ts.map