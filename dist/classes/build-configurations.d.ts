import { Logger } from '@xpack/logger';
import { XpmLiquidEngine } from './liquid-engine.js';
import { XpmLiquidSubstitutionsVariables, XpmLiquidSubstitutionsStrings } from '../data/substitutions-variables.js';
import { JsonBuildConfiguration, JsonBuildConfigurationContent, JsonBuildConfigurations, JsonBuildConfigurationTemplate, JsonDependencies } from '../types/json.js';
import { XpmAction, XpmActions } from './actions.js';
export declare class XpmBuildConfigurations {
    readonly log: Logger;
    readonly engine: XpmLiquidEngine;
    readonly substitutionsVariables: XpmLiquidSubstitutionsVariables;
    readonly jsonBuildConfigurations: JsonBuildConfigurations;
    protected readonly _buildConfigurationsMap: Map<string, XpmBuildConfiguration | undefined>;
    protected readonly _jsonBuildConfigurationsNamesMap: Map<string, string>;
    protected readonly _buildComfigurationsNamesSet: Set<string>;
    protected _isInitialised: boolean;
    protected _buildConfigurationsNames: string[];
    constructor({ log, engine, substitutionsVariables, jsonBuildConfigurations, }: {
        log: Logger;
        engine: XpmLiquidEngine;
        substitutionsVariables: XpmLiquidSubstitutionsVariables;
        jsonBuildConfigurations: JsonBuildConfigurations | undefined;
    });
    initialise(): Promise<boolean>;
    get size(): number;
    get isEmpty(): boolean;
    get names(): string[];
    getJsonName(buildConfigurationName: string): string;
    hasJson(buildConfigurationName: string): boolean;
    getJson(buildConfigurationName: string): JsonBuildConfiguration;
    isHidden(buildConfigurationName: string): boolean;
    has(buildConfigurationName: string): boolean;
    get(buildConfigurationName: string): XpmBuildConfiguration;
    protected _processTemplate({ buildConfigurationName, jsonBuildConfigurationTemplate, }: {
        buildConfigurationName: string;
        jsonBuildConfigurationTemplate: JsonBuildConfigurationTemplate;
    }): Promise<void>;
    protected _expandTemplateBuildConfigurations({ buildConfigurationName, jsonBuildConfigurationTemplate, }: {
        buildConfigurationName: string;
        jsonBuildConfigurationTemplate: JsonBuildConfigurationTemplate;
    }): Promise<Map<string, XpmBuildConfiguration>>;
    protected _createSubstitutedBuildConfiguration({ buildConfigurationName, jsonBuildConfiguration, combination, newBuildConfigurationsMap, }: {
        buildConfigurationName: string;
        jsonBuildConfiguration: JsonBuildConfigurationContent;
        combination: Record<string, string>;
        newBuildConfigurationsMap: Map<string, XpmBuildConfiguration>;
    }): Promise<void>;
}
export declare class XpmBuildConfiguration {
    readonly buildConfigurationName: string;
    readonly templateBuildConfigurationName?: string;
    readonly parentBuildConfigurations: XpmBuildConfigurations;
    inheritsNames: string[];
    readonly isHidden: boolean;
    properties: XpmLiquidSubstitutionsStrings;
    dependencies: JsonDependencies;
    devDependencies: JsonDependencies;
    jsonBuildConfiguration: JsonBuildConfigurationContent;
    isTemplate: boolean;
    protected _log: Logger;
    protected _substitutionsVariables: XpmLiquidSubstitutionsVariables;
    protected readonly matrixParameters?: XpmLiquidSubstitutionsStrings;
    protected _actions: XpmActions | undefined;
    protected _buildFolderRelativePath?: string;
    protected _inheritedNamesSet: Set<string>;
    protected _isInitialised: boolean;
    constructor({ buildConfigurationName, templateBuildConfigurationName, jsonBuildConfiguration, parentBuildConfigurations, matrixParameters, }: {
        buildConfigurationName: string;
        templateBuildConfigurationName?: string;
        jsonBuildConfiguration: JsonBuildConfigurationContent;
        parentBuildConfigurations: XpmBuildConfigurations;
        matrixParameters?: XpmLiquidSubstitutionsStrings;
    });
    initialise(): Promise<boolean>;
    get actions(): XpmActions;
    get buildFolderRelativePath(): string;
    protected _substituteTemplate(): Promise<JsonBuildConfigurationContent>;
    protected _substituteInherits(): Promise<JsonBuildConfigurationContent>;
    protected _processInherits(localJsonBuildConfiguration: JsonBuildConfigurationContent): Promise<Map<string, XpmAction>>;
    protected _getBuildFolderRelativePath(): Promise<string>;
}
//# sourceMappingURL=build-configurations.d.ts.map