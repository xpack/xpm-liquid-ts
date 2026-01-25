import { Logger } from '@xpack/logger';
import { XpmLiquidEngine } from './liquid-engine.js';
import { XpmLiquidSubstitutionsVariables, XpmLiquidSubstitutionsStrings } from '../data/substitutions-variables.js';
import { JsonActions, JsonActionContent, JsonActionTemplate } from '../types/json.js';
import { XpmBuildConfiguration } from './build-configurations.js';
export declare class XpmActions {
    readonly log: Logger;
    readonly engine: XpmLiquidEngine;
    readonly substitutionsVariables: XpmLiquidSubstitutionsVariables;
    readonly jsonActions: JsonActions;
    protected readonly _actionsMap: Map<string, XpmAction | undefined>;
    protected readonly _actionsNamesSet: Set<string>;
    protected readonly _jsonActionsNamesMap: Map<string, string>;
    readonly buildConfiguration: XpmBuildConfiguration | undefined;
    protected _isInitialised: boolean;
    constructor({ log, engine, substitutionsVariables, inheritedActionsMap, jsonActions, buildConfiguration, }: {
        log: Logger;
        engine: XpmLiquidEngine;
        substitutionsVariables: XpmLiquidSubstitutionsVariables;
        inheritedActionsMap?: Map<string, XpmAction>;
        jsonActions: JsonActions | undefined;
        buildConfiguration?: XpmBuildConfiguration;
    });
    initialise(): Promise<boolean>;
    empty(): boolean;
    names(): string[];
    has(actionName: string): boolean;
    get(actionName: string): XpmAction;
    protected _expandTemplateActions({ actionName, jsonActionTemplate, }: {
        actionName: string;
        jsonActionTemplate: JsonActionTemplate;
    }): Promise<Map<string, XpmAction>>;
}
export declare class XpmAction {
    readonly actionName: string;
    readonly jsonAction: JsonActionContent;
    readonly parentActions: XpmActions;
    protected readonly _matrixParameters?: XpmLiquidSubstitutionsStrings;
    protected _commands?: string[];
    protected _isInitialised: boolean;
    constructor({ actionName, jsonAction, parentActions, matrixParameters, }: {
        actionName: string;
        jsonAction: JsonActionContent;
        parentActions: XpmActions;
        matrixParameters?: XpmLiquidSubstitutionsStrings;
    });
    initialise(): Promise<boolean>;
    get commands(): string[];
}
//# sourceMappingURL=actions.d.ts.map