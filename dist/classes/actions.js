import assert from 'node:assert';
import * as os from 'node:os';
import { performSubstitutions } from '../functions/perform-substitutions.js';
import { getErrorMessage } from '../functions/utils.js';
import { isJsonArray, isJsonObject, isString, } from '../functions/is-something.js';
import { XpmError } from './errors.js';
export class XpmActions {
    log;
    engine;
    substitutionsVariables;
    jsonActions;
    _actionsMap = new Map();
    _actionsNamesSet = new Set();
    _jsonActionsNamesMap = new Map();
    buildConfiguration;
    _isInitialised = false;
    constructor({ log, engine, substitutionsVariables, inheritedActionsMap, jsonActions, buildConfiguration, }) {
        assert(log);
        assert(engine);
        assert(substitutionsVariables);
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
        this.buildConfiguration = buildConfiguration;
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
                try {
                    const expandedActionsMap = await this._expandTemplateActions({
                        actionName,
                        jsonActionTemplate: jsonAction,
                    });
                    for (const [expandedActionName, expandedAction,] of expandedActionsMap) {
                        if (this._actionsNamesSet.has(expandedActionName)) {
                            throw new XpmError(`duplicate action name "${expandedActionName}" ` +
                                `generated from template.`);
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
            else {
                if (this._actionsNamesSet.has(actionName)) {
                    throw new XpmError(`duplicate action name "${actionName}" ` +
                        `possibly already generated from template.`);
                }
                else {
                    this._actionsMap.set(actionName, undefined);
                    this._jsonActionsNamesMap.set(actionName, actionName);
                    this._actionsNamesSet.add(actionName);
                }
            }
        }
        this._isInitialised = true;
        return true;
    }
    empty() {
        return this._actionsMap.size === 0;
    }
    names() {
        const actionNames = Array.from(this._actionsMap.keys());
        this.log.trace(`${XpmActions.name}.names() =>`, actionNames);
        return actionNames;
    }
    has(actionName) {
        return this._actionsMap.has(actionName);
    }
    get(actionName) {
        const log = this.log;
        log.trace(`${XpmActions.name}.get(${actionName})`);
        let action = this._actionsMap.get(actionName);
        if (action === undefined) {
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
    async _expandTemplateActions({ actionName, jsonActionTemplate, }) {
        const log = this.log;
        log.trace(`${XpmActions.name}.#expandTemplateActions(${actionName})`);
        const newActionsMap = new Map();
        if (!isJsonObject(jsonActionTemplate.matrix)) {
            throw new XpmError(`action "${actionName}" matrix is not an object`);
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
        const createSubstitutedAction = async (combination) => {
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
                const message = getErrorMessage(error) +
                    ` in action "${actionName}" name substitution`;
                throw new XpmError(message);
            }
            const newAction = new XpmAction({
                actionName: substitutedActionName,
                jsonAction: jsonActionTemplate.template,
                parentActions: this,
                matrixParameters: { ...combination },
            });
            newActionsMap.set(substitutedActionName, newAction);
        };
        const generateCombinationsRecursively = async (index, combination) => {
            const log = this.log;
            log.trace(`${XpmActions.name}.#expandTemplateActions().` +
                `generateCombinationsRecursively(${String(index)}, ${JSON.stringify(combination)})`);
            if (index === matrixKeys.length) {
                await createSubstitutedAction(combination);
                return;
            }
            const key = matrixKeys[index];
            const values = matrixValues[index];
            for (const value of values) {
                combination[key] = value;
                await generateCombinationsRecursively(index + 1, combination);
            }
        };
        await generateCombinationsRecursively(0, {});
        return newActionsMap;
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
        assert(actionName);
        assert(jsonAction);
        assert(parentActions);
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