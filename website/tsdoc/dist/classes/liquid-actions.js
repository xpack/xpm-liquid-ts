/*
 * This file is part of the xPack project (http://xpack.github.io).
 * Copyright (c) 2021-2026 Liviu Ionescu. All rights reserved.
 *
 * Permission to use, copy, modify, and/or distribute this software
 * for any purpose is hereby granted, under the terms of the MIT license.
 *
 * If a copy of the license was not distributed with this file, it can
 * be obtained from https://opensource.org/license/mit.
 */
/* eslint max-len: [ "error", 80, { "ignoreUrls": true } ] */
// ----------------------------------------------------------------------------
import assert from 'node:assert';
import * as os from 'node:os';
import { performSubstitutions } from '../functions/perform-substitutions.js';
import { getErrorMessage } from '../functions/utils.js';
import { isJsonArray, isJsonObject, isString, } from '../functions/is-something.js';
import { XpmError } from './errors.js';
// ============================================================================
/**
 * A collection of xpm actions for a build configuration or the entire package.
 *
 * @remarks
 * This class manages a collection of named actions, each containing one or
 * more commands to be executed. Actions can belong to a package or a build
 * configuration and support template-based definitions with matrix expansion
 * to generate multiple actions from a single template.
 *
 * Action lifecycle phases:
 *
 * 1. Construction: Basic setup with optional inheritance from parent package.
 *
 * 2. Initialisation: Template name expansion without content evaluation.
 *
 * 3. Retrieval: On-demand instantiation when accessed via get().
 *
 * 4. Action Initialisation: Liquid template evaluation and substitution.
 *
 * This multi-phase approach ensures efficient resource usage by deferring
 * expensive operations until actions are actually needed.
 *
 * @public
 */
export class XpmLiquidActions {
    // --------------------------------------------------------------------------
    // Members.
    /**
     * The logger instance for output and diagnostics.
     *
     * @remarks
     * This logger is used throughout the lifecycle of actions collection to
     * provide trace-level diagnostics for debugging template expansion, action
     * instantiation, and variable substitution. It enables visibility into the
     * lazy evaluation process without impacting runtime performance when tracing
     * is disabled.
     *
     * @public
     */
    log;
    /**
     * The Liquid templating engine for variable substitution.
     *
     * @remarks
     * This engine instance is shared across all actions in the collection and
     * configured with custom filters for platform detection, path manipulation,
     * and xpm-specific operations. It's used during both template action name
     * expansion and later during individual action command substitution,
     * ensuring consistent template processing throughout the action lifecycle.
     *
     * @public
     */
    engine;
    /**
     * The variables available for substitution in action definitions.
     *
     * @remarks
     * This comprehensive variable hierarchy provides context for template
     * evaluation, including package metadata, build configuration properties,
     * environment variables, platform detection, and path utilities.
     *
     * The hierarchy structure:
     *
     * 1. Base variables: `env`, `os`, `path` (always available).
     *
     * 2. Package variables: name, version, dependencies, devDependencies.
     *
     * 3. Configuration variables: build folder paths, compiler settings.
     *
     * 4. Properties: custom key-value pairs from package or configuration.
     *
     * 5. Matrix: parameter combinations for template-generated actions (added
     *    per action during initialisation).
     *
     * These variables are accessible in Liquid templates using dot notation
     * (e.g., `{{ package.name }}`,
     * `{{ configuration.buildFolderRelativePath }}`).
     *
     * @public
     */
    substitutionsVariables;
    /**
     * The JSON object containing action definitions from the package manifest.
     *
     * @remarks
     * This object holds the raw action definitions as they appear in the
     * package.json `xpack.actions` section or within a build configuration's
     * actions. Action definitions can be:
     *
     * 1. Simple strings: Single command to execute.
     *
     * 2. String arrays: Multiple commands executed sequentially.
     *
     * 3. Template objects: With `matrix` and `template` properties for
     *    generating multiple actions from a single definition.
     *
     * Template action names (containing `{{` markers) trigger matrix expansion
     * during initialisation, creating concrete actions from the Cartesian
     * product of matrix parameter values.
     *
     * @public
     */
    jsonActions;
    /**
     * Map of action names to their corresponding action instances.
     *
     * @remarks
     * This map serves as the primary action registry, populated during
     * collection initialisation with entries for all discovered actions.
     *
     * Key characteristics:
     *
     * 1. Known only after {@link XpmLiquidActions.initialise} completes.
     *
     * 2. Possibly empty if there are no actions defined.
     *
     * 3. Values can be `undefined` to indicate an action exists but hasn't
     *    been instantiated yet (lazy loading).
     *
     * 4. For template actions, contains one entry per expanded combination,
     *    not the original template definition.
     *
     * Actions transition from `undefined` to instantiated when first accessed
     * via {@link XpmLiquidActions.get}, implementing the lazy evaluation
     * pattern.
     *
     * @public
     */
    _actionsMap = new Map();
    /**
     * Set of all action names for quick lookup.
     *
     * @remarks
     * This set provides O(1) existence checks for action names, enabling
     * efficient validation during template expansion and duplicate detection.
     *
     * Key characteristics:
     *
     * 1. Known only after {@link XpmLiquidActions.initialise} completes.
     *
     * 2. Contains all action names including those generated from templates.
     *
     * 3. Used to detect duplicate action names that might arise from template
     *    expansion conflicts or explicit duplicates in package.json.
     *
     * This redundant storage (alongside `_actionsMap`) is justified by the
     * performance benefit for name existence checks, especially in packages
     * with many actions.
     *
     * @public
     */
    _actionsNamesSet = new Set();
    /**
     * Map of expanded action names to their original JSON action names.
     *
     * @remarks
     * This reverse mapping enables retrieving the original action definition
     * from `jsonActions` when lazy-loading action instances.
     *
     * Mapping behavior:
     *
     * 1. For regular actions: Maps action name to itself (identity mapping).
     *
     * 2. For template actions: Maps each generated action name back to the
     *    original template name (e.g., `test-x64` → `test-{{ matrix.arch }}`).
     *
     * 3. Enables {@link XpmLiquidActions.get} to locate the correct JSON
     *    definition when instantiating an action on demand.
     *
     * This indirection is essential for the lazy evaluation pattern, allowing
     * deferred instantiation while maintaining the connection to original
     * definitions.
     *
     * @public
     */
    _jsonActionsNamesMap = new Map();
    /**
     * The build configuration this actions collection belongs to, if any.
     *
     * @remarks
     * This optional reference establishes the hierarchical relationship between
     * actions and build configurations, affecting variable substitution scope
     * and action inheritance.
     *
     * When defined:
     *
     * 1. Actions inherit configuration-specific variables (build folder paths,
     *    compiler settings, toolchain properties).
     *
     * 2. Actions belong to a specific configuration namespace rather than the
     *    package root.
     *
     * 3. Logging and diagnostics include the configuration name for context.
     *
     * When `undefined`:
     *
     * 1. Actions belong to the package root (`xpack.actions` in package.json).
     *
     * 2. Only package-level and global variables are available for
     *    substitution.
     *
     * @public
     */
    buildConfiguration;
    /**
     * Flag indicating whether the actions collection has been initialised.
     *
     * @remarks
     * This flag prevents redundant initialisation and ensures idempotent
     * behavior when {@link XpmLiquidActions.initialise} is called multiple
     * times.
     *
     * State transitions:
     *
     * 1. Initially `false` after construction.
     *
     * 2. Set to `true` after successful template expansion and action name
     *    registration.
     *
     * 3. Checked at the beginning of {@link XpmLiquidActions.initialise} to
     *    return early if already initialised.
     *
     * This pattern supports safe repeated calls during complex initialisation
     * sequences without duplicating work or corrupting internal state.
     *
     * @public
     */
    _isInitialised = false;
    // --------------------------------------------------------------------------
    // Constructor and async initialiser.
    /**
     * Constructs an actions collection instance.
     *
     * @remarks
     * The constructor performs partial initialisation. Complete initialisation
     * requires calling the {@link XpmLiquidActions.initialise} method.
     *
     * @param log - The logger instance for output and diagnostics.
     * @param engine - The Liquid templating engine for variable substitution.
     * @param substitutionsVariables - The variables available for substitution.
     * @param inheritedActionsMap - Optional map of actions inherited from a
     * parent package.
     * @param jsonActions - The JSON object containing action definitions, or
     * undefined if no actions are defined.
     * @param buildConfiguration - Optional build configuration this actions
     * collection belongs to.
     *
     * @public
     */
    constructor({ log, engine, substitutionsVariables, inheritedActionsMap, jsonActions, buildConfiguration, }) {
        assert(log);
        assert(engine);
        assert(substitutionsVariables);
        if (buildConfiguration !== undefined) {
            log.trace(`${XpmLiquidActions.name}()` +
                ` @${buildConfiguration.buildConfigurationName}`);
        }
        else {
            log.trace(`${XpmLiquidActions.name}()`);
        }
        this.log = log;
        this.engine = engine;
        this.substitutionsVariables = substitutionsVariables;
        this.jsonActions = jsonActions ?? {};
        this.buildConfiguration = buildConfiguration;
        if (inheritedActionsMap !== undefined) {
            for (const [inheritedActionName, inheritedAction,] of inheritedActionsMap) {
                // Make copies of the actions, do not alter the inherited ones.
                const action = new XpmLiquidAction({
                    actionName: inheritedActionName,
                    jsonAction: inheritedAction.jsonAction,
                    parentActions: this,
                });
                this._actionsMap.set(inheritedActionName, action);
            }
        }
        // The rest of the initialisation is done in the async initialiser.
    }
    /**
     * Completes the async initialisation of the actions collection.
     *
     * @remarks
     * This method implements the first step of lazy evaluation. It processes
     * all action definitions by expanding template action names based on matrix
     * parameters, but does not evaluate the action content or perform Liquid
     * substitutions. The actual template evaluation and variable substitution
     * occur later when individual actions are initialised via
     * {@link XpmLiquidAction.initialise}, and only for actions that are
     * actually used. This approach avoids unnecessary operations on unused
     * actions. The method also validates that all expanded action names are
     * unique.
     *
     * @returns A promise that resolves to `true` if initialisation was
     * performed, or `false` if already initialised.
     *
     * @throws {@link XpmError}
     * If duplicate action names are detected or if template expansion fails.
     *
     * @public
     */
    async initialise() {
        const log = this.log;
        if (this._isInitialised) {
            if (this.buildConfiguration !== undefined) {
                log.trace(`${XpmLiquidActions.name}.initialise()` +
                    ` @${this.buildConfiguration.buildConfigurationName} again`);
            }
            else {
                log.trace(`${XpmLiquidActions.name}.initialise() again`);
            }
            return false;
        }
        if (this.buildConfiguration !== undefined) {
            log.trace(`${XpmLiquidActions.name}.initialise()` +
                ` @${this.buildConfiguration.buildConfigurationName}`);
        }
        else {
            log.trace(`${XpmLiquidActions.name}.initialise()`);
        }
        for (const [actionName, jsonAction] of Object.entries(this.jsonActions)) {
            if (actionName.includes('{{')) {
                // Expand template and return multiple actions.
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
    // --------------------------------------------------------------------------
    // Public methods.
    /**
     * Determines whether the actions collection is empty.
     *
     * @remarks
     * This value is known only after initialisation.
     *
     * @returns `true` if there are no actions, `false` otherwise.
     *
     * @public
     */
    empty() {
        return this._actionsMap.size === 0;
    }
    /**
     * Retrieves the names of all actions in the collection.
     *
     * @remarks
     * This value is known only after initialisation.
     *
     * @returns An array of action names.
     *
     * @public
     */
    names() {
        const actionNames = Array.from(this._actionsMap.keys());
        this.log.trace(`${XpmLiquidActions.name}.names() =>`, actionNames);
        return actionNames;
    }
    /**
     * Checks whether an action with the specified name exists.
     *
     * @remarks
     * This value is known only after initialisation.
     *
     * @param actionName - The name of the action to check.
     * @returns `true` if the action exists, `false` otherwise.
     *
     * @public
     */
    has(actionName) {
        return this._actionsMap.has(actionName);
    }
    /**
     * Retrieves an action by name, creating it if not yet instantiated.
     *
     * @remarks
     * This method implements lazy evaluation to avoid unnecessary operations.
     * Actions are instantiated on demand but remain uninitialised until actually
     * used. The two-step process works as follows:
     *
     * 1. During collection initialisation ({@link XpmLiquidActions.initialise}),
     *    only the matrix of options is evaluated for each template, expanding
     *    only the action names without processing their content.
     *
     * 2. Later, when an action is accessed via this method and subsequently
     *    initialised ({@link XpmLiquidAction.initialise}), the template is
     *    fully evaluated and Liquid substitutions are performed on the commands.
     *
     * This approach ensures that only actions that are actually used incur the
     * cost of template evaluation and variable substitution.
     *
     * @param actionName - The name of the action to retrieve.
     * @returns The action instance.
     *
     * @public
     */
    get(actionName) {
        const log = this.log;
        log.trace(`${XpmLiquidActions.name}.get(${actionName})`);
        let action = this._actionsMap.get(actionName);
        if (action === undefined) {
            const jsonActionName = 
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            this._jsonActionsNamesMap.get(actionName);
            const jsonAction = (this.jsonActions[jsonActionName] ??
                '');
            action = new XpmLiquidAction({
                actionName,
                jsonAction,
                parentActions: this,
            });
            this._actionsMap.set(actionName, action);
        }
        return action;
    }
    // --------------------------------------------------------------------------
    // Private methods.
    /**
     * Expands a template action into multiple concrete actions.
     *
     * @remarks
     * This method computes the Cartesian product of all matrix parameter values
     * and creates a separate action for each combination, substituting matrix
     * values into both the action name and command templates.
     *
     * Processing steps:
     *
     * 1. Validates matrix structure (object with array values).
     *
     * 2. Validates template format (string or array).
     *
     * 3. Performs Liquid substitutions on matrix values if they contain
     *    template syntax.
     *
     * 4. Recursively generates all combinations using Cartesian product.
     *
     * 5. Creates an action instance for each combination with matrix
     *    parameters available for later substitution.
     *
     * Matrix variables are scoped to individual actions and accessible via
     * the `matrix` namespace during action command evaluation.
     *
     * @param actionName - The template action name containing Liquid variables.
     * @param jsonActionTemplate - The JSON action template definition containing
     * matrix parameters and a template.
     * @returns A promise that resolves to a map of expanded action names to
     * their corresponding action instances.
     *
     * @throws {@link XpmError}
     * If the matrix structure is invalid, template format is incorrect, or
     * substitution fails.
     *
     * @public
     */
    async _expandTemplateActions({ actionName, jsonActionTemplate, }) {
        const log = this.log;
        log.trace(`${XpmLiquidActions.name}.#expandTemplateActions(${actionName})`);
        const newActionsMap = new Map();
        if (!isJsonObject(jsonActionTemplate.matrix)) {
            throw new XpmError(`action "${actionName}" matrix is not an object`);
        }
        if (!isString(jsonActionTemplate.template) &&
            !isJsonArray(jsonActionTemplate.template)) {
            throw new XpmError(`action "${actionName}" template is not a string or array`);
        }
        // Validate matrix structure and collect keys/values
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
                // console.log('substitutedValue =>', substitutedValue)
                matrixValues.push(substitutedValue.replace(new RegExp(os.EOL + '$'), '').split(os.EOL));
            }
            else {
                matrixValues.push(matrixValueArray);
            }
        }
        // Inner function.
        const createSubstitutedAction = async (combination) => {
            // console.log(combination)
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
            // console.log(substitutedActionName)
            const newAction = new XpmLiquidAction({
                actionName: substitutedActionName,
                jsonAction: jsonActionTemplate.template,
                parentActions: this,
                matrixParameters: { ...combination },
            });
            newActionsMap.set(substitutedActionName, newAction);
        };
        // const matrixKeys: string[] = Object.keys(jsonAction.matrix)
        // const matrixValues: string[][] = Object.values(jsonAction.matrix)
        // Compute all combinations (cartesian product)
        // Inner function
        const generateCombinationsRecursively = async (index, combination) => {
            const log = this.log;
            log.trace(`${XpmLiquidActions.name}.#expandTemplateActions().` +
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
// ============================================================================
/**
 * An individual xpm action containing commands to be executed.
 *
 * @remarks
 * Actions are lazily initialised, with variable substitution performed
 * only when the action is first retrieved and initialised. This allows for
 * efficient handling of large numbers of actions generated
 * from templates.
 *
 * An action can exist in three states:
 *
 * 1. Undefined: Name is known but instance not yet created.
 *
 * 2. Instantiated: Object exists but commands not yet evaluated.
 *
 * 3. Initialised: Commands fully evaluated with Liquid substitutions.
 *
 * This design minimizes memory usage and computation for actions that are
 * defined but never executed, which is common when using matrix templates
 * to generate platform-specific or configuration-specific actions.
 *
 * @public
 */
export class XpmLiquidAction {
    // --------------------------------------------------------------------------
    // Members.
    /**
     * The name of the action.
     *
     * @remarks
     * This is the final, expanded action name used for identification and
     * execution. For template-generated actions, this is the concrete name
     * after matrix substitution (e.g., `test-x64` rather than
     * `test-{{ matrix.arch }}`).
     *
     * The name is used for:
     *
     * 1. User-facing identification when listing or executing actions.
     *
     * 2. Logging and diagnostic output to track action lifecycle.
     *
     * 3. Creating copies of inherited actions with preserved names.
     *
     * Names must be unique within the actions collection, enforced during
     * {@link XpmLiquidActions.initialise}.
     *
     * @public
     */
    actionName;
    /**
     * The JSON definition of the action commands.
     *
     * @remarks
     * This holds the raw command definition as it appears in package.json,
     * before variable substitution. The format can be:
     *
     * 1. Simple string: Single command line.
     *
     * 2. String array: Multiple commands for sequential execution.
     *
     * The definition is preserved in its original form to enable:
     *
     * 1. Creating copies of inherited actions with identical definitions.
     *
     * 2. Deferred template evaluation during
     *    {@link XpmLiquidAction.initialise}.
     *
     * 3. Re-evaluation if needed with different variable contexts.
     *
     * This immutable storage ensures actions can be safely copied and
     * initialised multiple times without side effects.
     *
     * @public
     */
    jsonAction;
    /**
     * The parent actions collection this action belongs to.
     *
     * @remarks
     * This reference maintains the hierarchical relationship between individual
     * actions and their containing collection, providing essential context for
     * action initialisation and execution.
     *
     * The parent collection provides access to:
     *
     * 1. Liquid templating engine for variable substitution.
     *
     * 2. Substitution variables hierarchy (package metadata, configuration,
     *    environment, platform detection).
     *
     * 3. Logger instance for diagnostic output.
     *
     * 4. Build configuration context when actions belong to a specific
     *    configuration rather than the package root.
     *
     * This design enables actions to access shared resources without duplicating
     * them, while maintaining proper scoping for template evaluation. During
     * initialisation, the action combines parent-level substitution variables
     * with its own matrix parameters to create a complete context for Liquid
     * template processing.
     *
     * @public
     */
    parentActions;
    /**
     * The matrix parameter values for template-generated actions.
     *
     * @remarks
     * For template-generated actions, this object contains the specific matrix
     * parameter values that produced this action instance from the template.
     *
     * Usage pattern:
     *
     * 1. Undefined for regular (non-template) actions.
     *
     * 2. For template actions, contains key-value pairs from the matrix
     *    combination (e.g., `{ arch: 'x64', platform: 'linux' }`).
     *
     * 3. Merged into substitution variables during
     *    {@link XpmLiquidAction.initialise}, making values accessible via the
     *    `matrix` namespace in command templates.
     *
     * 4. Enables the same command template to generate different concrete
     *    commands for each matrix combination.
     *
     * Example: A template with `{{ matrix.arch }}` becomes `x64` when this
     * action's matrix parameters include `{ arch: 'x64' }`.
     *
     * @public
     */
    _matrixParameters;
    /**
     * The array of command strings after variable substitution.
     *
     * @remarks
     * This array contains the fully evaluated command lines ready for
     * execution, with all Liquid template variables substituted.
     *
     * Lifecycle states:
     *
     * 1. Undefined initially and until {@link XpmLiquidAction.initialise} is
     *    called.
     *
     * 2. Populated during initialisation by evaluating `jsonAction` with the
     *    Liquid engine and complete variable context.
     *
     * 3. Array-based JSON definitions are joined, substituted, then split back
     *    into individual command lines.
     *
     * 4. Each string represents one command line to be executed sequentially.
     *
     * Attempting to access via the `commands` getter before initialisation
     * will trigger an assertion error, enforcing correct usage order.
     *
     * @public
     */
    _commands;
    /**
     * Flag indicating whether the action has been initialised.
     *
     * @remarks
     * This flag ensures idempotent initialization and prevents redundant
     * template evaluation when {@link XpmLiquidAction.initialise} is called
     * multiple times.
     *
     * State transitions:
     *
     * 1. Initially `false` after construction.
     *
     * 2. Set to `true` after successful command substitution and evaluation.
     *
     * 3. Checked at the start of {@link XpmLiquidAction.initialise} to return
     *    early if already initialised.
     *
     * This pattern allows safe repeated calls during complex initialization
     * sequences or when actions are accessed multiple times, avoiding the
     * computational cost of re-evaluating templates unnecessarily.
     *
     * @public
     */
    _isInitialised = false;
    // --------------------------------------------------------------------------
    // Constructor and async initialiser.
    /**
     * Constructs an action instance.
     *
     * @remarks
     * The constructor performs partial initialisation. Variable substitution
     * requires calling the {@link XpmLiquidAction.initialise} method.
     *
     * @param actionName - The name of the action.
     * @param jsonAction - The JSON definition of the action commands.
     * @param parentActions - The parent actions collection this action belongs
     * to.
     * @param matrixParameters - Optional matrix parameter values for
     * template-generated actions.
     *
     * @public
     */
    constructor({ actionName, jsonAction, parentActions, matrixParameters, }) {
        assert(actionName);
        assert(jsonAction);
        assert(parentActions);
        const log = parentActions.log;
        log.trace(`${XpmLiquidAction.name}(${actionName})`);
        this.actionName = actionName;
        this.jsonAction = jsonAction;
        this.parentActions = parentActions;
        if (matrixParameters !== undefined) {
            this._matrixParameters = matrixParameters;
        }
    }
    /**
     * Completes the async initialisation of the action.
     *
     * @remarks
     * This method performs variable substitution on the action commands using
     * the Liquid templating engine and the available substitution variables,
     * including any matrix parameters for template-generated actions.
     *
     * The substitution context includes:
     *
     * 1. All package-level substitution variables (configuration, package
     *    metadata, platform detection, etc.).
     *
     * 2. Build configuration variables if this action belongs to a
     *    configuration.
     *
     * 3. Matrix parameters for template-generated actions, accessible via
     *    the `matrix` namespace (e.g., `{{ matrix.arch }}`).
     *
     * Array-based command definitions are joined with newlines before
     * substitution, then split back into individual commands after processing.
     * This allows commands to span multiple array elements while maintaining
     * clean formatting in the package manifest.
     *
     * @returns A promise that resolves to `true` if initialisation was
     * performed, or `false` if already initialised.
     *
     * @throws {@link XpmError}
     * If command substitution fails.
     *
     * @public
     */
    async initialise() {
        const log = this.parentActions.log;
        if (this._isInitialised) {
            log.trace(`${XpmLiquidAction.name}.initialise(${this.actionName}) again`);
            return false;
        }
        log.trace(`${XpmLiquidAction.name}.initialise(${this.actionName})`);
        // Silently accept empty or non-existing actions.
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
        log.trace(`${XpmLiquidAction.name}.initialise() =>`, this.actionName);
        log.trace(this.actionName, 'commands =>', this._commands);
        this._isInitialised = true;
        return true;
    }
    // --------------------------------------------------------------------------
    // Public methods.
    /**
     * Retrieves the array of command strings for this action.
     *
     * @remarks
     * The action must be initialised via {@link XpmLiquidAction.initialise}
     * before accessing this property. Attempting to access commands from an
     * uninitialised action will result in an assertion error.
     *
     * @returns The array of command strings after variable substitution.
     *
     * @throws `AssertionError`
     * If the action has not been initialised.
     *
     * @public
     */
    get commands() {
        assert(this._commands, 'Action not initialised, commands are undefined');
        return this._commands;
    }
}
// ----------------------------------------------------------------------------
