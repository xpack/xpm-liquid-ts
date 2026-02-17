import assert from 'node:assert';
import * as os from 'node:os';
import { isJsonObject, isString, isJsonArray, } from '../functions/is-something.js';
import { performSubstitutions } from '../functions/perform-substitutions.js';
import { getErrorMessage, hasLiquidSyntax } from '../functions/utils.js';
import { ConfigurationError } from './errors.js';
import { TemplateExpander } from './template-expander.js';
export class Actions {
    log;
    engine;
    substitutionsVariables;
    jsonActions;
    buildConfiguration;
    _actionsMap = new Map();
    _actionsNamesSet = new Set();
    _jsonActionsNamesMap = new Map();
    _isInitialised = false;
    _names = [];
    constructor({ engine, substitutionsVariables, jsonActions, inheritedActionsMap, buildConfiguration, log, }) {
        assert(log, 'log is required');
        assert(engine, 'engine is required');
        assert(substitutionsVariables, 'substitutionsVariables is required');
        if (buildConfiguration !== undefined) {
            log.trace(`${Actions.name}()` + ` @${buildConfiguration.name}`);
        }
        else {
            log.trace(`${Actions.name}()`);
        }
        this.log = log;
        this.engine = engine;
        this.substitutionsVariables = substitutionsVariables;
        this.jsonActions = jsonActions ?? {};
        if (buildConfiguration !== undefined) {
            this.buildConfiguration = buildConfiguration;
        }
        if (inheritedActionsMap !== undefined) {
            for (const [inheritedActionName, inheritedAction,] of inheritedActionsMap) {
                const action = new Action({
                    actionName: inheritedActionName,
                    jsonAction: inheritedAction.jsonAction,
                    parentActions: this,
                });
                this._actionsMap.set(inheritedActionName, action);
            }
        }
    }
    async initialise() {
        const log = this.log;
        if (this._isInitialised) {
            if (this.buildConfiguration !== undefined) {
                log.trace(`${Actions.name}.initialise()` +
                    ` @${this.buildConfiguration.name} again`);
            }
            else {
                log.trace(`${Actions.name}.initialise() again`);
            }
            return false;
        }
        if (this.buildConfiguration !== undefined) {
            log.trace(`${Actions.name}.initialise()` + ` @${this.buildConfiguration.name}`);
        }
        else {
            log.trace(`${Actions.name}.initialise()`);
        }
        for (const [actionName, jsonAction] of Object.entries(this.jsonActions)) {
            if (hasLiquidSyntax(actionName)) {
                await this._processTemplate({
                    actionName,
                    jsonActionTemplate: jsonAction,
                });
            }
            else {
                if (this._actionsNamesSet.has(actionName)) {
                    throw new ConfigurationError(`action name "${actionName}" already defined`);
                }
                else {
                    this._actionsMap.set(actionName, undefined);
                    this._jsonActionsNamesMap.set(actionName, actionName);
                    this._actionsNamesSet.add(actionName);
                }
            }
        }
        const names = Array.from(this._actionsMap.keys());
        this._names = names;
        this.log.trace(`${Actions.name}.initialise() =>`, names);
        this._isInitialised = true;
        return true;
    }
    get size() {
        assert(this._isInitialised, 'Actions collection must be initialised before accessing size');
        return this._actionsMap.size;
    }
    get isEmpty() {
        assert(this._isInitialised, 'Actions collection must be initialised before accessing isEmpty');
        return this._actionsMap.size === 0;
    }
    get names() {
        assert(this._isInitialised, 'Actions collection must be initialised before accessing names');
        return this._names;
    }
    has(actionName) {
        assert(this._isInitialised, 'Actions collection must be initialised before accessing has()');
        return this._actionsMap.has(actionName);
    }
    get(actionName) {
        assert(this._isInitialised, 'Actions collection must be initialised before accessing get()');
        const log = this.log;
        log.trace(`${Actions.name}.get(${actionName})`);
        let action = this._actionsMap.get(actionName);
        if (action === undefined) {
            const jsonActionName = this._jsonActionsNamesMap.get(actionName);
            if (jsonActionName === undefined) {
                throw new ConfigurationError(`action "${actionName}" does not exist`);
            }
            const jsonAction = (this.jsonActions[jsonActionName] ??
                '');
            action = new Action({
                actionName,
                jsonAction,
                parentActions: this,
            });
            this._actionsMap.set(actionName, action);
        }
        return action;
    }
    async _processTemplate({ actionName, jsonActionTemplate, }) {
        try {
            const expandedActionsMap = await this._expandTemplateActions({
                actionName,
                jsonActionTemplate,
            });
            for (const [expandedActionName, expandedAction] of expandedActionsMap) {
                if (this._actionsNamesSet.has(expandedActionName)) {
                    throw new ConfigurationError(`duplicate action name "${expandedActionName}" ` +
                        `could not be generated from template.`);
                }
                else {
                    this._actionsMap.set(expandedActionName, expandedAction);
                    this._jsonActionsNamesMap.set(expandedActionName, actionName);
                    this._actionsNamesSet.add(expandedActionName);
                }
            }
        }
        catch (error) {
            const message = getErrorMessage(error) + ` in action "${actionName}"`;
            throw new ConfigurationError(message);
        }
    }
    async _expandTemplateActions({ actionName, jsonActionTemplate, }) {
        const log = this.log;
        log.trace(`${Actions.name}.#expandTemplateActions(${actionName})`);
        if (jsonActionTemplate.matrix == undefined) {
            throw new ConfigurationError(`action "${actionName}" has no matrix`);
        }
        if (!isJsonObject(jsonActionTemplate.matrix)) {
            throw new ConfigurationError(`action "${actionName}" matrix is not an object`);
        }
        if (jsonActionTemplate.template == undefined) {
            throw new ConfigurationError(`action "${actionName}" has no template`);
        }
        if (!isString(jsonActionTemplate.template) &&
            !isJsonArray(jsonActionTemplate.template)) {
            throw new ConfigurationError(`action "${actionName}" template is not a string or array`);
        }
        const expander = new TemplateExpander({
            engine: this.engine,
            substitutionsVariables: this.substitutionsVariables,
            log: this.log,
        });
        return await expander.expandTemplate({
            templateName: actionName,
            matrix: jsonActionTemplate.matrix,
            templateContent: jsonActionTemplate.template,
            templateType: 'action',
            instanceFactory: (expandedName, combination, templateContent) => new Action({
                actionName: expandedName,
                jsonAction: templateContent,
                parentActions: this,
                matrixParameters: { ...combination },
            }),
        });
    }
}
export class Action {
    name;
    jsonAction;
    parentActions;
    _matrixParameters;
    _commands;
    _isInitialised = false;
    constructor({ actionName, jsonAction, parentActions, matrixParameters, }) {
        assert(actionName, 'actionName is required');
        assert(parentActions, 'parentActions is required');
        const log = parentActions.log;
        log.trace(`${Action.name}(${actionName})`);
        this.name = actionName;
        this.jsonAction = jsonAction;
        this.parentActions = parentActions;
        if (matrixParameters !== undefined) {
            this._matrixParameters = matrixParameters;
        }
    }
    async initialise() {
        const log = this.parentActions.log;
        if (this._isInitialised) {
            log.trace(`${Action.name}.initialise(${this.name}) again`);
            return false;
        }
        log.trace(`${Action.name}.initialise(${this.name})`);
        const jsonAction = this.jsonAction;
        const inputCommands = Array.isArray(jsonAction)
            ? jsonAction.join(os.EOL)
            : jsonAction;
        let substitutedCommands;
        if (hasLiquidSyntax(inputCommands)) {
            try {
                substitutedCommands = await performSubstitutions({
                    input: inputCommands,
                    engine: this.parentActions.engine,
                    substitutionsVariables: {
                        ...this.parentActions.substitutionsVariables,
                        matrix: this._matrixParameters ?? {},
                    },
                    log,
                });
            }
            catch (error) {
                const message = getErrorMessage(error) +
                    ` in action "${this.name}" commands substitution`;
                throw new ConfigurationError(message);
            }
        }
        else {
            substitutedCommands = inputCommands;
        }
        this._commands = substitutedCommands
            .replace(new RegExp(os.EOL + '$'), '')
            .split(os.EOL);
        log.trace(`${Action.name}.initialise() =>`, this.name);
        log.trace(this.name, 'commands =>', this._commands);
        this._isInitialised = true;
        return true;
    }
    get commands() {
        assert(this._isInitialised, 'Action must be initialised before accessing commands');
        assert(this._commands, 'Action _commands not initialised');
        return this._commands;
    }
}
//# sourceMappingURL=actions.js.map