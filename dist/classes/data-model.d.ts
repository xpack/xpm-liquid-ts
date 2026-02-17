import { Logger } from '@xpack/logger';
import { LiquidSubstitutionsVariables } from '../data/substitutions-variables.js';
import { Actions } from './actions.js';
import { BuildConfigurations } from './build-configurations.js';
import { LiquidEngine } from './liquid-engine.js';
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
    protected readonly _log: Logger;
    protected readonly _engine: LiquidEngine;
    protected readonly _jsonPackage: JsonXpmPackage;
    constructor({ jsonPackage, log }: DataModelConstructorParameters);
}
//# sourceMappingURL=data-model.d.ts.map