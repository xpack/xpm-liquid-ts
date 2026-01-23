import { Logger } from '@xpack/logger';
import { XpmLiquidEngine } from './liquid-engine.js';
import { XpmLiquidSubstitutionsVariables, XpmLiquidSubstitutionsStrings } from '../data/substitutions-variables.js';
import { JsonActions, JsonActionContent, JsonActionTemplate } from '../types/json.js';
import { XpmLiquidBuildConfiguration } from './liquid-build-configurations.js';
export declare class XpmLiquidActions {
    readonly log: Logger;
    readonly engine: XpmLiquidEngine;
    readonly substitutionsVariables: XpmLiquidSubstitutionsVariables;
    readonly jsonActions: JsonActions;
    protected readonly _actionsMap: Map<string, XpmLiquidAction | undefined>;
    protected readonly _actionsNamesSet: Set<string>;
    protected readonly _jsonActionsNamesMap: Map<string, string>;
    readonly buildConfiguration: XpmLiquidBuildConfiguration | undefined;
    protected _isInitialised: boolean;
    constructor({ log, engine, substitutionsVariables, inheritedActionsMap, jsonActions, buildConfiguration, }: {
        log: Logger;
        engine: XpmLiquidEngine;
        substitutionsVariables: XpmLiquidSubstitutionsVariables;
        inheritedActionsMap?: Map<string, XpmLiquidAction>;
        jsonActions: JsonActions | undefined;
        buildConfiguration?: XpmLiquidBuildConfiguration;
    });
    initialise(): Promise<boolean>;
    empty(): boolean;
    names(): string[];
    has(actionName: string): boolean;
    get(actionName: string): XpmLiquidAction;
    protected _expandTemplateActions({ actionName, jsonActionTemplate, }: {
        actionName: string;
        jsonActionTemplate: JsonActionTemplate;
    }): Promise<Map<string, XpmLiquidAction>>;
}
export declare class XpmLiquidAction {
    readonly actionName: string;
    readonly jsonAction: JsonActionContent;
    readonly parentActions: XpmLiquidActions;
    protected readonly _matrixParameters?: XpmLiquidSubstitutionsStrings;
    protected _commands?: string[];
    protected _isInitialised: boolean;
    constructor({ actionName, jsonAction, parentActions, matrixParameters, }: {
        actionName: string;
        jsonAction: JsonActionContent;
        parentActions: XpmLiquidActions;
        matrixParameters?: XpmLiquidSubstitutionsStrings;
    });
    initialise(): Promise<boolean>;
    get commands(): string[];
}
//# sourceMappingURL=liquid-actions.d.ts.map