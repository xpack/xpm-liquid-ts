import { Liquid } from 'liquidjs';
import { Logger } from '@xpack/logger';
import { XpmLiquidSubstitutionsVariables } from '../data/substitutions-variables.js';
import { XpmLiquidActions } from './liquid-actions.js';
import { XpmLiquidBuildConfigurations } from './liquid-build-configurations.js';
import { JsonXpmPackage } from '../types/json.js';
export declare const buildFolderRelativePathPropertyName = "buildFolderRelativePath";
export declare class XpmLiquidPackage {
    protected _log: Logger;
    protected _engine: Liquid;
    protected _jsonPackage: JsonXpmPackage;
    readonly substitutionsVariables: XpmLiquidSubstitutionsVariables;
    readonly actions: XpmLiquidActions;
    readonly buildConfigurations: XpmLiquidBuildConfigurations;
    constructor({ log, jsonPackage, }: {
        log: Logger;
        jsonPackage: JsonXpmPackage;
    });
}
//# sourceMappingURL=liquid-package.d.ts.map