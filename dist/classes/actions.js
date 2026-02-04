import assert from 'node:assert';
import * as os from 'node:os';
import { performSubstitutions } from '../functions/perform-substitutions.js';
import { getErrorMessage } from '../functions/utils.js';
import { isJsonArray, isJsonObject, isString, } from '../functions/is-something.js';
import { XpmError } from './errors.js';
import { CombinationsGenerator } from './combinations-generator.js';
export class XpmActions {
    log;
    engine;
    substitutionsVariables;
    jsonActions;
    buildConfiguration;
    _actionsMap = new Map();
    _actionsNamesSet = new Set();
    _jsonActionsNamesMap = new Map();
    _isInitialised = false;
    _actionsNames = [];
    constructor({ log, engine, substitutionsVariables, jsonActions, inheritedActionsMap, buildConfiguration, }) {
        assert(log, 'log is required');
        assert(engine, 'engine is required');
        assert(substitutionsVariables, 'substitutionsVariables is required');
        if (buildConfiguration !== undefined) {
            log.trace(`${XpmActions.name}()` +
                ` @${buildConfiguration.buildConfigurationName}`);
        }
        else {
            log.trace(`${XpmActions.name}()`);
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
                const action = new XpmAction({
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
                log.trace(`${XpmActions.name}.initialise()` +
                    ` @${this.buildConfiguration.buildConfigurationName} again`);
            }
            else {
                log.trace(`${XpmActions.name}.initialise() again`);
            }
            return false;
        }
        if (this.buildConfiguration !== undefined) {
            log.trace(`${XpmActions.name}.initialise()` +
                ` @${this.buildConfiguration.buildConfigurationName}`);
        }
        else {
            log.trace(`${XpmActions.name}.initialise()`);
        }
        for (const [actionName, jsonAction] of Object.entries(this.jsonActions)) {
            if (actionName.includes('{{')) {
                await this._processTemplate({
                    actionName,
                    jsonActionTemplate: jsonAction,
                });
            }
            else {
                if (this._actionsNamesSet.has(actionName)) {
                    throw new XpmError(`action name "${actionName}" already defined.`);
                }
                else {
                    this._actionsMap.set(actionName, undefined);
                    this._jsonActionsNamesMap.set(actionName, actionName);
                    this._actionsNamesSet.add(actionName);
                }
            }
        }
        const actionsNames = Array.from(this._actionsMap.keys());
        this._actionsNames = actionsNames;
        this.log.trace(`${XpmActions.name}.initialise() =>`, actionsNames);
        this._isInitialised = true;
        return true;
    }
    get size() {
        return this._actionsMap.size;
    }
    get isEmpty() {
        return this._actionsMap.size === 0;
    }
    get names() {
        return this._actionsNames;
    }
    has(actionName) {
        return this._actionsMap.has(actionName);
    }
    get(actionName) {
        const log = this.log;
        log.trace(`${XpmActions.name}.get(${actionName})`);
        let action = this._actionsMap.get(actionName);
        if (action === undefined) {
            if (!this._jsonActionsNamesMap.has(actionName)) {
                throw new XpmError(`action "${actionName}" does not exist`);
            }
            const jsonActionName = this._jsonActionsNamesMap.get(actionName);
            const jsonAction = (this.jsonActions[jsonActionName] ??
                '');
            action = new XpmAction({
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
                    throw new XpmError(`duplicate action name "${expandedActionName}" ` +
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
            throw new XpmError(message);
        }
    }
    async _expandTemplateActions({ actionName, jsonActionTemplate, }) {
        const log = this.log;
        log.trace(`${XpmActions.name}.#expandTemplateActions(${actionName})`);
        const newActionsMap = new Map();
        if (jsonActionTemplate.matrix == undefined) {
            throw new XpmError(`action "${actionName}" has no matrix`);
        }
        if (!isJsonObject(jsonActionTemplate.matrix)) {
            throw new XpmError(`action "${actionName}" matrix is not an object`);
        }
        if (jsonActionTemplate.template == undefined) {
            throw new XpmError(`action "${actionName}" has no template`);
        }
        if (!isString(jsonActionTemplate.template) &&
            !isJsonArray(jsonActionTemplate.template)) {
            throw new XpmError(`action "${actionName}" template is not a string or array`);
        }
        const matrixKeys = [];
        const matrixValues = [];
        for (const [matrixKey, matrixValueArray] of Object.entries(jsonActionTemplate.matrix)) {
            if (!isJsonArray(matrixValueArray)) {
                throw new XpmError(`action "${actionName}" matrix.${matrixKey} is not an array`);
            }
            for (const matrixValue of matrixValueArray) {
                if (!isString(matrixValue)) {
                    throw new XpmError(`action "${actionName}" matrix.${matrixKey} value is not a string`);
                }
            }
            matrixKeys.push(matrixKey);
            const stringValue = matrixValueArray.join(os.EOL);
            if (stringValue.includes('{{') || stringValue.includes('{%')) {
                let substitutedValue;
                try {
                    substitutedValue = await performSubstitutions({
                        input: stringValue,
                        engine: this.engine,
                        substitutionsVariables: {
                            ...this.substitutionsVariables,
                        },
                        log: this.log,
                    });
                }
                catch (error) {
                    const message = getErrorMessage(error) +
                        ` in action "${actionName}" matrix.${matrixKey}`;
                    throw new XpmError(message);
                }
                matrixValues.push(substitutedValue.replace(new RegExp(os.EOL + '$'), '').split(os.EOL));
            }
            else {
                matrixValues.push(matrixValueArray);
            }
        }
        const combinationsGenerator = new CombinationsGenerator({
            matrixKeys,
            matrixValues,
            log: this.log,
        });
        const combinations = combinationsGenerator.generate();
        log.trace('combinations =>', combinations);
        for (const combination of combinations) {
            await this._createSubstitutedAction({
                actionName,
                jsonAction: jsonActionTemplate.template,
                combination,
                newActionsMap,
            });
        }
        return newActionsMap;
    }
    async _createSubstitutedAction({ actionName, jsonAction, combination, newActionsMap, }) {
        let substitutedActionName;
        try {
            substitutedActionName = await performSubstitutions({
                input: actionName,
                engine: this.engine,
                substitutionsVariables: {
                    ...this.substitutionsVariables,
                    matrix: combination,
                },
                log: this.log,
            });
        }
        catch (error) {
            const message = getErrorMessage(error) + ` in action "${actionName}" name substitution`;
            throw new XpmError(message);
        }
        const newAction = new XpmAction({
            actionName: substitutedActionName,
            jsonAction,
            parentActions: this,
            matrixParameters: { ...combination },
        });
        newActionsMap.set(substitutedActionName, newAction);
    }
}
export class XpmAction {
    actionName;
    jsonAction;
    parentActions;
    _matrixParameters;
    _commands;
    _isInitialised = false;
    constructor({ actionName, jsonAction, parentActions, matrixParameters, }) {
        assert(actionName, 'actionName is required');
        assert(parentActions, 'parentActions is required');
        const log = parentActions.log;
        log.trace(`${XpmAction.name}(${actionName})`);
        this.actionName = actionName;
        this.jsonAction = jsonAction;
        this.parentActions = parentActions;
        if (matrixParameters !== undefined) {
            this._matrixParameters = matrixParameters;
        }
    }
    async initialise() {
        const log = this.parentActions.log;
        if (this._isInitialised) {
            log.trace(`${XpmAction.name}.initialise(${this.actionName}) again`);
            return false;
        }
        log.trace(`${XpmAction.name}.initialise(${this.actionName})`);
        const jsonAction = this.jsonAction;
        const inputCommands = Array.isArray(jsonAction)
            ? jsonAction.join(os.EOL)
            : jsonAction;
        let substitutedCommands;
        if (inputCommands.includes('{{') || inputCommands.includes('{%')) {
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
                    ` in action "${this.actionName}" commands substitution`;
                throw new XpmError(message);
            }
        }
        else {
            substitutedCommands = inputCommands;
        }
        this._commands = substitutedCommands
            .replace(new RegExp(os.EOL + '$'), '')
            .split(os.EOL);
        log.trace(`${XpmAction.name}.initialise() =>`, this.actionName);
        log.trace(this.actionName, 'commands =>', this._commands);
        this._isInitialised = true;
        return true;
    }
    get commands() {
        assert(this._commands, 'Action not initialised, commands are undefined');
        return this._commands;
    }
}
//# sourceMappingURL=actions.js.map