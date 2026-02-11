import { Liquid } from 'liquidjs';
import { Logger } from '@xpack/logger';
import { LiquidSubstitutionsVariables } from '../data/substitutions-variables.js';
import { Actions } from './actions.js';
import { BuildConfigurations } from './build-configurations.js';
import { JsonXpmPackage } from '../types/json.js';
export declare const buildFolderRelativePathPropertyName = "buildFolderRelativePath";
export interface DataModelConstructorParameters {
    jsonPackage: JsonXpmPackage;
    log: Logger;
}
export declare class DataModel {
    readonly substitutionsVariables: LiquidSubstitutionsVariables;
    readonly actions: Actions;
    readonly buildConfigurations: BuildConfigurations;
    protected _log: Logger;
    protected _engine: Liquid;
    protected _jsonPackage: JsonXpmPackage;
    constructor({ jsonPackage, log }: DataModelConstructorParameters);
}
//# sourceMappingURL=data-model.d.ts.map