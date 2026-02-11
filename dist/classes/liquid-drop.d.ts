import * as liquidjs from 'liquidjs';
import { Logger } from '@xpack/logger';
import { LiquidSubstitutionsStrings } from '../data/substitutions-variables.js';
export interface LiquidPropertiesDropConstructorParameters {
    engine: liquidjs.Liquid;
    properties: LiquidSubstitutionsStrings;
    log: Logger;
}
export declare class LiquidPropertiesDrop extends liquidjs.Drop {
    protected _log: Logger;
    protected _properties: LiquidSubstitutionsStrings;
    protected _engine: liquidjs.Liquid;
    constructor({ engine, properties, log, }: LiquidPropertiesDropConstructorParameters);
    liquidMethodMissing(key: string, context: liquidjs.Context): Promise<any>;
}
export interface LiquidMatrixDropConstructorParameters {
    engine: liquidjs.Liquid;
    matrix: LiquidSubstitutionsStrings;
    log: Logger;
}
export declare class LiquidMatrixDrop extends liquidjs.Drop {
    protected _log: Logger;
    protected _matrix: LiquidSubstitutionsStrings;
    protected _engine: liquidjs.Liquid;
    constructor({ engine, matrix, log }: LiquidMatrixDropConstructorParameters);
    liquidMethodMissing(key: string, context: liquidjs.Context): Promise<any>;
}
//# sourceMappingURL=liquid-drop.d.ts.map