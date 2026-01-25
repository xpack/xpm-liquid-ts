import { Liquid } from 'liquidjs';
import { Logger } from '@xpack/logger';
import { XpmLiquidSubstitutionsVariables } from '../data/substitutions-variables.js';
import { XpmActions } from './actions.js';
import { XpmBuildConfigurations } from './build-configurations.js';
import { JsonXpmPackage } from '../types/json.js';
export declare const buildFolderRelativePathPropertyName = "buildFolderRelativePath";
export declare class XpmDataModel {
    protected _log: Logger;
    protected _engine: Liquid;
    protected _jsonPackage: JsonXpmPackage;
    readonly substitutionsVariables: XpmLiquidSubstitutionsVariables;
    readonly actions: XpmActions;
    readonly buildConfigurations: XpmBuildConfigurations;
    constructor({ log, jsonPackage, }: {
        log: Logger;
        jsonPackage: JsonXpmPackage;
    });
}
//# sourceMappingURL=data-model.d.ts.map