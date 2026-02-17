import { Logger } from '@xpack/logger';
import { LiquidSubstitutionsVariables, LiquidSubstitutionsStrings } from '../data/substitutions-variables.js';
import { JsonActionContent, JsonActions, JsonActionTemplate } from '../types/json.js';
import { BuildConfiguration } from './build-configurations.js';
import { LiquidEngine } from './liquid-engine.js';
export interface ActionsConstructorParameters {
    engine: LiquidEngine;
    substitutionsVariables: LiquidSubstitutionsVariables;
    jsonActions: JsonActions | undefined;
    inheritedActionsMap?: Map<string, Action>;
    buildConfiguration?: BuildConfiguration;
    log: Logger;
}
export declare class Actions {
    readonly log: Logger;
    readonly engine: LiquidEngine;
    readonly substitutionsVariables: LiquidSubstitutionsVariables;
    readonly jsonActions: JsonActions;
    readonly buildConfiguration: BuildConfiguration | undefined;
    protected readonly _actionsMap: Map<string, Action | undefined>;
    protected readonly _namesSet: Set<string>;
    protected readonly _jsonActionsNamesMap: Map<string, string>;
    protected _isInitialised: boolean;
    protected _names: string[];
    constructor({ engine, substitutionsVariables, jsonActions, inheritedActionsMap, buildConfiguration, log, }: ActionsConstructorParameters);
    initialise(): Promise<boolean>;
    get size(): number;
    get isEmpty(): boolean;
    get names(): string[];
    has(actionName: string): boolean;
    get(actionName: string): Action;
    protected _processTemplate({ actionName, jsonActionTemplate, }: {
        actionName: string;
        jsonActionTemplate: JsonActionTemplate;
    }): Promise<void>;
    protected _expandTemplateActions({ actionName, jsonActionTemplate, }: {
        actionName: string;
        jsonActionTemplate: JsonActionTemplate;
    }): Promise<Map<string, Action>>;
}
export interface ActionConstructorParameters {
    actionName: string;
    jsonAction: JsonActionContent;
    parentActions: Actions;
    matrixParameters?: LiquidSubstitutionsStrings;
}
export declare class Action {
    readonly name: string;
    readonly jsonAction: JsonActionContent;
    readonly parentActions: Actions;
    protected readonly _matrixParameters?: LiquidSubstitutionsStrings;
    protected _commands?: string[];
    protected _isInitialised: boolean;
    constructor({ actionName, jsonAction, parentActions, matrixParameters, }: ActionConstructorParameters);
    initialise(): Promise<boolean>;
    get commands(): string[];
}
//# sourceMappingURL=actions.d.ts.map