import { Logger } from '@xpack/logger';
import { XpmLiquidEngine } from '../classes/liquid-engine.js';
import { XpmLiquidSubstitutionsVariables } from '../data/substitutions-variables.js';
export declare function performSubstitutions({ log, engine, input, substitutionsVariables, }: {
    log: Logger;
    engine: XpmLiquidEngine;
    input: string;
    substitutionsVariables: XpmLiquidSubstitutionsVariables;
}): Promise<string>;
//# sourceMappingURL=perform-substitutions.d.ts.map