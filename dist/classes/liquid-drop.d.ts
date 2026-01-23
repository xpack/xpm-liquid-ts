import { Liquid, Context, Drop } from 'liquidjs';
import { Logger } from '@xpack/logger';
import { XpmLiquidSubstitutionsStrings } from '../data/substitutions-variables.js';
export declare class XpmLiquidPropertiesDrop extends Drop {
    protected _log: Logger;
    protected _properties: XpmLiquidSubstitutionsStrings;
    protected _engine: Liquid;
    constructor({ log, engine, properties, }: {
        log: Logger;
        engine: Liquid;
        properties: XpmLiquidSubstitutionsStrings;
    });
    liquidMethodMissing(key: string, context: Context): Promise<any>;
}
export declare class XpmLiquidMatrixDrop extends Drop {
    protected _log: Logger;
    protected _matrix: XpmLiquidSubstitutionsStrings;
    protected _engine: Liquid;
    constructor({ log, engine, matrix, }: {
        log: Logger;
        engine: Liquid;
        matrix: XpmLiquidSubstitutionsStrings;
    });
    liquidMethodMissing(key: string, context: Context): Promise<any>;
}
//# sourceMappingURL=liquid-drop.d.ts.map