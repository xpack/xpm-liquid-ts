import { Logger } from '@xpack/logger';
import { LiquidEngine } from './liquid-engine.js';
import { LiquidSubstitutionsVariables, LiquidSubstitutionsStrings } from '../data/substitutions-variables.js';
import { JsonBuildConfigurations, JsonBuildConfigurationTemplate, JsonBuildConfiguration, JsonBuildConfigurationContent, JsonDependencies } from '../types/json.js';
import { Actions, Action } from './actions.js';
export interface BuildConfigurationsConstructorParameters {
    engine: LiquidEngine;
    substitutionsVariables: LiquidSubstitutionsVariables;
    jsonBuildConfigurations: JsonBuildConfigurations | undefined;
    log: Logger;
}
export declare class BuildConfigurations {
    readonly log: Logger;
    readonly engine: LiquidEngine;
    readonly substitutionsVariables: LiquidSubstitutionsVariables;
    readonly jsonBuildConfigurations: JsonBuildConfigurations;
    protected readonly _buildConfigurationsMap: Map<string, BuildConfiguration | undefined>;
    protected readonly _jsonBuildConfigurationsNamesMap: Map<string, string>;
    protected readonly _namesSet: Set<string>;
    protected _isInitialised: boolean;
    protected _names: string[];
    constructor({ engine, substitutionsVariables, jsonBuildConfigurations, log, }: BuildConfigurationsConstructorParameters);
    initialise(): Promise<boolean>;
    get size(): number;
    get isEmpty(): boolean;
    get names(): string[];
    getJsonName(buildConfigurationName: string): string;
    hasJson(buildConfigurationName: string): boolean;
    getJson(buildConfigurationName: string): JsonBuildConfiguration;
    isHidden(buildConfigurationName: string): boolean;
    has(buildConfigurationName: string): boolean;
    get(buildConfigurationName: string): BuildConfiguration;
    protected _processTemplate({ buildConfigurationName, jsonBuildConfigurationTemplate, }: {
        buildConfigurationName: string;
        jsonBuildConfigurationTemplate: JsonBuildConfigurationTemplate;
    }): Promise<void>;
    protected _expandTemplateBuildConfigurations({ buildConfigurationName, jsonBuildConfigurationTemplate, }: {
        buildConfigurationName: string;
        jsonBuildConfigurationTemplate: JsonBuildConfigurationTemplate;
    }): Promise<Map<string, BuildConfiguration>>;
}
export interface BuildConfigurationConstructorParameters {
    buildConfigurationName: string;
    templateBuildConfigurationName?: string;
    jsonBuildConfiguration: JsonBuildConfigurationContent;
    parentBuildConfigurations: BuildConfigurations;
    matrixParameters?: LiquidSubstitutionsStrings;
}
export declare class BuildConfiguration {
    readonly name: string;
    readonly templateName?: string;
    readonly parentBuildConfigurations: BuildConfigurations;
    inheritsNames: string[];
    readonly isHidden: boolean;
    properties: LiquidSubstitutionsStrings;
    dependencies: JsonDependencies;
    devDependencies: JsonDependencies;
    jsonBuildConfiguration: JsonBuildConfigurationContent;
    isTemplate: boolean;
    protected readonly _log: Logger;
    protected _substitutionsVariables: LiquidSubstitutionsVariables;
    protected readonly matrixParameters?: LiquidSubstitutionsStrings;
    protected _actions: Actions | undefined;
    protected _buildFolderRelativePath?: string;
    protected _inheritedNamesSet: Set<string>;
    protected _isInitialised: boolean;
    constructor({ buildConfigurationName, templateBuildConfigurationName, jsonBuildConfiguration, parentBuildConfigurations, matrixParameters, }: BuildConfigurationConstructorParameters);
    initialise(): Promise<boolean>;
    get actions(): Actions;
    get buildFolderRelativePath(): string;
    protected _substituteTemplate(): Promise<JsonBuildConfigurationContent>;
    protected _substituteInherits(): Promise<JsonBuildConfigurationContent>;
    private _parseInheritsField;
    private _processInheritedConfiguration;
    protected _processInherits(localJsonBuildConfiguration: JsonBuildConfigurationContent): Promise<Map<string, Action>>;
    protected _getBuildFolderRelativePath(): Promise<string>;
}
//# sourceMappingURL=build-configurations.d.ts.map