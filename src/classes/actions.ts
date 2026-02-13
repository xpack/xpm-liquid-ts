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

// ----------------------------------------------------------------------------

import assert from 'node:assert'
import * as os from 'node:os'

import { Logger } from '@xpack/logger'

// ----------------------------------------------------------------------------

import {
  LiquidSubstitutionsVariables,
  LiquidSubstitutionsStrings,
} from '../data/substitutions-variables.js'
import {
  isJsonObject,
  isString,
  isJsonArray,
} from '../functions/is-something.js'
import { processMatrixForExpansion } from '../functions/matrix-expander.js'
import { performSubstitutions } from '../functions/perform-substitutions.js'
import { getErrorMessage, hasLiquidSyntax } from '../functions/utils.js'
import {
  JsonActionContent,
  JsonActions,
  JsonActionTemplate,
} from '../types/json.js'
import { BuildConfiguration } from './build-configurations.js'
import { CombinationsGenerator } from './combinations-generator.js'
import { ConfigurationError } from './errors.js'
import { LiquidEngine } from './liquid-engine.js'

// ============================================================================

/**
 * Configuration parameters for constructing an actions collection instance.
 *
 * @remarks
 * This interface defines the required configuration for creating an
 * instance of {@link Actions}. Most properties are mandatory except for
 * the optional <code>inheritedActionsMap</code> and
 * <code>buildConfiguration</code> parameters.
 *
 * The parameters provide the actions collection with access to the Liquid
 * templating engine, substitution variables hierarchy, action definitions
 * from the package manifest, optional inherited actions from a parent
 * package, optional build configuration context, and the logger for
 * diagnostic output.
 */
export interface ActionsConstructorParameters {
  /**
   * The Liquid templating engine for variable substitution.
   */
  engine: LiquidEngine

  /**
   * The variables available for substitution in action definitions.
   */
  substitutionsVariables: LiquidSubstitutionsVariables

  /**
   * The JSON object containing action definitions, or undefined if there are
   * no actions.
   */
  jsonActions: JsonActions | undefined

  /**
   * Optional map of actions inherited from a parent package.
   */
  inheritedActionsMap?: Map<string, Action>

  /**
   * Optional build configuration this actions collection belongs to.
   */
  buildConfiguration?: BuildConfiguration

  /**
   * The logger instance for output and diagnostics.
   */
  log: Logger
}

/**
 * A collection of <b>xpm</b> actions for a build configuration or
 * the entire package.
 *
 * @remarks
 * This class manages a collection of named actions, each containing one or
 * more commands to be executed. Actions can belong to a package or a build
 * configuration and support template-based definitions with matrix expansion
 * to generate multiple actions from a single template.
 *
 * The collection always exists, even as empty if no actions are defined.
 *
 * Action lifecycle phases:
 *
 * <ol>
 * <li><b>Construction:</b> Basic setup with optional inheritance from parent
 *    package.</li>
 * <li><b>Initialisation:</b> Template name expansion without content
 *    evaluation.</li>
 * <li><b>Retrieval:</b> On-demand instantiation when accessed via
 *    <code>get()</code>.</li>
 * <li><b>Action Initialisation:</b> Liquid template evaluation and
 *    substitution.</li>
 * </ol>
 *
 * This multi-phase approach ensures efficient resource usage by deferring
 * expensive operations until actions are actually needed.
 */
export class Actions {
  // --------------------------------------------------------------------------
  // Public Members.

  /**
   * The logger instance for output and diagnostics.
   *
   * @remarks
   * This logger is used throughout the lifecycle of actions collection to
   * provide trace-level diagnostics for debugging template expansion, action
   * instantiation, and variable substitution. It enables visibility into the
   * lazy evaluation process without impacting runtime performance when tracing
   * is disabled.
   */
  readonly log: Logger

  /**
   * The Liquid templating engine for variable substitution.
   *
   * @remarks
   * This engine instance is shared across all actions in the collection and
   * configured with custom filters for platform detection, path manipulation,
   * and xpm-specific operations. It's used during both template action name
   * expansion and later during individual action command substitution,
   * ensuring consistent template processing throughout the action lifecycle.
   */
  readonly engine: LiquidEngine

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
   * <ol>
   * <li><b>Base variables:</b> <code>env</code>, <code>os</code>,
   *    <code>path</code> (always available).</li>
   * <li><b>Package variables:</b> <code>name</code>, <code>version</code>,
   *    <code>dependencies</code>,
   *    <code>devDependencies</code>.</li>
   * <li><b>Configuration variables:</b> build folder paths, compiler
   *    settings.</li>
   * <li><b>Properties:</b> custom key-value pairs from package or
   *    configuration.</li>
   * <li><b>Matrix:</b> parameter combinations for template-generated
   *    actions (added per action during initialisation).</li>
   * </ol>
   *
   * These variables are accessible in Liquid templates using dot notation
   * (e.g., `{{ package.name }}`,
   * `{{ configuration.buildFolderRelativePath }}`).
   */
  readonly substitutionsVariables: LiquidSubstitutionsVariables

  /**
   * The JSON object containing action definitions from the package manifest.
   *
   * @remarks
   * This object holds the raw action definitions as they appear in the
   * `package.json` `xpack.actions` section or within a build configuration's
   * actions. Action definitions can be:
   *
   * <ol>
   * <li><b>Simple strings:</b> Single command to execute.</li>
   * <li><b>String arrays:</b> Multiple commands executed sequentially.</li>
   * <li><b>Template objects:</b> With <code>matrix</code> and
   *    <code>template</code> properties for
   *    generating multiple actions from a single definition.</li>
   * </ol>
   *
   * Template action names (containing `{{` markers) trigger matrix expansion
   * during initialisation, creating concrete actions from the Cartesian
   * product of matrix parameter values.
   */
  readonly jsonActions: JsonActions

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
   * <ol>
   * <li>Actions inherit configuration-specific variables (build folder paths,
   *   compiler settings, toolchain properties).</li>
   * <li>Actions belong to a specific configuration namespace rather than the
   *   package root.</li>
   * <li>Logging and diagnostics include the configuration name for
   *   context.</li>
   * </ol>
   *
   * When `undefined`:
   *
   * <ol>
   * <li>Actions belong to the package root (<code>xpack.actions</code> in
   *    <code>package.json</code>).</li>
   * <li>Only package-level and global variables are available for
   *    substitution.</li>
   * </ol>
   */
  readonly buildConfiguration: BuildConfiguration | undefined

  // --------------------------------------------------------------------------
  // Protected Members.

  /**
   * Map of action names to their corresponding action instances.
   *
   * @remarks
   * This map serves as the primary action registry, populated during
   * collection initialisation with entries for all discovered actions.
   *
   * Key characteristics:
   *
   * <ol>
   * <li>Known only after <code>Actions.initialise()</code>
   *   completes.</li>
   * <li>Possibly empty if there are no actions defined.</li>
   * <li>Values can be <code>undefined</code> to indicate an action
   *   exists but hasn't
   *   been instantiated yet (lazy loading).</li>
   * <li>For template actions, contains one entry per expanded combination,
   *   not the original template definition.</li>
   * </ol>
   *
   * Actions transition from `undefined` to instantiated when first accessed
   * via {@link Actions.get}, implementing the lazy evaluation
   * pattern.
   */
  protected readonly _actionsMap: Map<string, Action | undefined> = new Map<
    string,
    Action | undefined
  >()

  /**
   * Set of all action names for quick lookup.
   *
   * @remarks
   * This set provides O(1) existence checks for action names, enabling
   * efficient validation during template expansion and duplicate detection.
   *
   * Key characteristics:
   *
   * <ol>
   * <li>Known only after <code>Actions.initialise()</code>
   *    completes.</li>
   * <li>Contains all action names including those generated from
   *    templates.</li>
   * <li>Used to detect duplicate action names that might arise from template
   *    expansion conflicts or explicit duplicates in
   *    <code>package.json</code>.</li>
   * </ol>
   *
   * This redundant storage (alongside `_actionsMap`) is justified by the
   * performance benefit for name existence checks, especially in packages
   * with many actions.
   */
  protected readonly _actionsNamesSet: Set<string> = new Set<string>()

  /**
   * Map of expanded action names to their original JSON action names.
   *
   * @remarks
   * This reverse mapping enables retrieving the original action definition
   * from `jsonActions` when lazy-loading action instances.
   *
   * Mapping behavior:
   *
   * <ol>
   * <li><b>For regular actions:</b> Maps action name to itself (identity
   *    mapping).</li>
   * <li><b>For template actions:</b> Maps each generated action name back to
   *    the original template name (e.g.,
   *    <code>test-x64</code> → <code>test-\{\{ matrix.arch \}\}</code>).</li>
   * <li>Enables <code>Actions.get()</code> to locate the correct JSON
   *    definition when instantiating an action on demand.</li>
   * </ol>
   *
   * This indirection is essential for the lazy evaluation pattern, allowing
   * deferred instantiation while maintaining the connection to original
   * definitions.
   */
  protected readonly _jsonActionsNamesMap: Map<string, string> = new Map<
    string,
    string
  >()

  /**
   * Flag indicating whether the actions collection has been initialised.
   *
   * @remarks
   * This flag prevents redundant initialisation and ensures idempotent
   * behavior when {@link Actions.initialise} is called multiple
   * times.
   *
   * State transitions:
   *
   * <ol>
   * <li>Initially <code>false</code> after construction.</li>
   * <li>Set to <code>true</code> after successful template expansion and
   *   action name
   *   registration.</li>
   * <li>Checked at the beginning of <code>Actions.initialise()</code> to
   *   return early if already initialised.</li>
   * </ol>
   *
   * This pattern supports safe repeated calls during complex initialisation
   * sequences without duplicating work or corrupting internal state.
   */
  protected _isInitialised = false

  /**
   * Cached array of all action names in the collection.
   *
   * @remarks
   * This array provides O(1) access to action names without repeatedly
   * creating new arrays from the map keys, improving performance when the
   * names are accessed multiple times.
   *
   * Key characteristics:
   *
   * <ol>
   * <li>Empty initially after construction.</li>
   * <li>Populated during <code>Actions.initialise()</code> after all
   *    action names
   *    are determined.</li>
   * <li>Contains all action names including those generated from
   *    templates.</li>
   * <li>Returned by the <code>names</code> getter for efficient repeated
   *    access.</li>
   * </ol>
   *
   * This cached approach avoids the overhead of calling
   * `Array.from(map.keys())` on every access whilst still
   * providing a clean getter interface.
   */
  protected _actionsNames: string[] = []

  // --------------------------------------------------------------------------
  // Constructor and async initialiser.

  /**
   * Constructs an actions collection instance.
   *
   * @remarks
   * The constructor performs partial initialisation. Complete initialisation
   * requires calling the `Actions.initialise()` method.
   *
   * @param log - The logger instance for output and diagnostics.
   */
  constructor({
    engine,
    substitutionsVariables,
    jsonActions,
    inheritedActionsMap,
    buildConfiguration,
    log,
  }: ActionsConstructorParameters) {
    assert(log, 'log is required')
    assert(engine, 'engine is required')
    assert(substitutionsVariables, 'substitutionsVariables is required')

    if (buildConfiguration !== undefined) {
      log.trace(
        `${Actions.name}()` + ` @${buildConfiguration.buildConfigurationName}`
      )
    } else {
      log.trace(`${Actions.name}()`)
    }

    this.log = log
    this.engine = engine
    this.substitutionsVariables = substitutionsVariables
    this.jsonActions = jsonActions ?? {}
    if (buildConfiguration !== undefined) {
      this.buildConfiguration = buildConfiguration
    }

    // If there are inherited actions, add them to the map.
    // They might be overridden by the current definitions.
    if (inheritedActionsMap !== undefined) {
      for (const [
        inheritedActionName,
        inheritedAction,
      ] of inheritedActionsMap) {
        // Make copies of the actions, do not alter the inherited ones.
        const action = new Action({
          actionName: inheritedActionName,
          jsonAction: inheritedAction.jsonAction,
          parentActions: this,
        })
        this._actionsMap.set(inheritedActionName, action)
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
   * {@link Action.initialise}, and only for actions that are
   * actually used. This approach avoids unnecessary operations on unused
   * actions. The method also validates that all expanded action names are
   * unique.
   *
   * @returns A promise that resolves to `true` if initialisation was
   * performed, or `false` if already initialised.
   *
   * @throws {@link ConfigurationError}
   * If duplicate action names are detected or if template expansion fails.
   */
  async initialise(): Promise<boolean> {
    const log = this.log

    if (this._isInitialised) {
      if (this.buildConfiguration !== undefined) {
        log.trace(
          `${Actions.name}.initialise()` +
            ` @${this.buildConfiguration.buildConfigurationName} again`
        )
      } else {
        log.trace(`${Actions.name}.initialise() again`)
      }
      return false
    }

    if (this.buildConfiguration !== undefined) {
      log.trace(
        `${Actions.name}.initialise()` +
          ` @${this.buildConfiguration.buildConfigurationName}`
      )
    } else {
      log.trace(`${Actions.name}.initialise()`)
    }

    for (const [actionName, jsonAction] of Object.entries(this.jsonActions)) {
      if (hasLiquidSyntax(actionName)) {
        await this._processTemplate({
          actionName,
          jsonActionTemplate: jsonAction as JsonActionTemplate,
        })
      } else {
        if (this._actionsNamesSet.has(actionName)) {
          throw new ConfigurationError(
            `action name "${actionName}" already defined`
          )
        } else {
          this._actionsMap.set(actionName, undefined)
          this._jsonActionsNamesMap.set(actionName, actionName)
          this._actionsNamesSet.add(actionName)
        }
      }
    }
    const actionsNames = Array.from(this._actionsMap.keys())
    this._actionsNames = actionsNames

    this.log.trace(`${Actions.name}.initialise() =>`, actionsNames)

    this._isInitialised = true
    return true
  }

  // --------------------------------------------------------------------------
  // Public Methods.

  /**
   * The number of actions in the collection.
   *
   * @remarks
   * This value is known only after `initialise()`.
   *
   * This getter provides direct access to the collection size, enabling
   * callers to check for emptiness or iterate with knowledge of the
   * collection's extent.
   *
   * @returns The number of actions in the collection.
   */
  get size(): number {
    assert(
      this._isInitialised,
      'Actions collection must be initialised before accessing size'
    )

    return this._actionsMap.size
  }

  /**
   * Indicates whether the actions collection is empty.
   *
   * @remarks
   * This value is known only after `initialise()`.
   *
   * @returns `true` if there are no actions, `false` otherwise.
   */
  get isEmpty(): boolean {
    assert(
      this._isInitialised,
      'Actions collection must be initialised before accessing isEmpty'
    )

    return this._actionsMap.size === 0
  }

  /**
   * The names of all actions in the collection.
   *
   * @remarks
   * This value is known only after `initialise()`.
   *
   * This getter returns the cached array of action names for efficient
   * repeated access without recreating the array.
   *
   * @returns An array of action names.
   */
  get names(): string[] {
    assert(
      this._isInitialised,
      'Actions collection must be initialised before accessing names'
    )
    return this._actionsNames
  }

  /**
   * Checks whether an action with the specified name exists.
   *
   * @remarks
   * This value is known only after `initialise()`.
   *
   * @param actionName - The name of the action to check.
   * @returns `true` if the action exists, `false` otherwise.
   */
  has(actionName: string): boolean {
    assert(
      this._isInitialised,
      'Actions collection must be initialised before accessing has()'
    )

    return this._actionsMap.has(actionName)
  }

  /**
   * Retrieves an action by name, creating it if not yet instantiated.
   *
   * @remarks
   * This method implements lazy evaluation to avoid unnecessary operations.
   * Actions are instantiated on demand but remain uninitialised until actually
   * used. The two-step process works as follows:
   *
   * <ol>
   * <li>During collection initialisation
   *   (<code>Actions.initialise()</code>),
   *   only the matrix of options is evaluated for each template, expanding
   *   only the action names without processing their content.</li>
   * <li>Later, when an action is accessed via this method and subsequently
   *   initialised (<code>Action.initialise()</code>), the template is
   *   fully evaluated and Liquid substitutions are performed on the
   *   commands.</li>
   * </ol>
   *
   * This approach ensures that only actions that are actually used incur the
   * cost of template evaluation and variable substitution.
   *
   * @param actionName - The name of the action to retrieve.
   * @returns The action instance.
   *
   * @throws {@link ConfigurationError}
   * If an action with that name does not exist.
   */
  get(actionName: string): Action {
    assert(
      this._isInitialised,
      'Actions collection must be initialised before accessing get()'
    )

    const log = this.log
    log.trace(`${Actions.name}.get(${actionName})`)

    let action = this._actionsMap.get(actionName)
    if (action === undefined) {
      const jsonActionName = this._jsonActionsNamesMap.get(actionName)
      if (jsonActionName === undefined) {
        throw new ConfigurationError(`action "${actionName}" does not exist`)
      }
      // Safety net: This fallback to empty string is defensive programming.
      // The jsonActions[jsonActionName] should always be defined because
      // _jsonActionsNamesMap is populated from the jsonActions keys during
      // initialisation. The ?? '' provides protection against unexpected
      // runtime inconsistencies between the map and the object.
      /* c8 ignore start - safety net, action names are not undefined. */
      const jsonAction: JsonActionContent = (this.jsonActions[jsonActionName] ??
        '') as JsonActionContent
      /* c8 ignore stop */

      action = new Action({
        actionName,
        jsonAction,
        parentActions: this,
      })
      this._actionsMap.set(actionName, action)
    }

    return action
  }

  // --------------------------------------------------------------------------
  // Private Methods.

  /**
   * Processes a template action by expanding it and registering the generated
   * actions.
   *
   * @remarks
   * This helper method is called during collection initialisation for each
   * action whose name contains template syntax (<code>\{\{</code> markers).
   *
   * Processing steps:
   *
   * <ol>
   * <li>Calls <code>_expandTemplateActions()</code> to generate all action
   *    instances from the template's matrix parameters.</li>
   * <li>Validates that each expanded action name is unique and does not
   *    conflict with existing actions.</li>
   * <li>Registers each expanded action in the internal maps:
   *   <ul>
   *   <li><code>_actionsMap</code>: Maps name to action instance.</li>
   *   <li><code>_jsonActionsNamesMap</code>: Maps expanded name back to
   *      original template name.</li>
   *   <li><code>_actionsNamesSet</code>: Tracks all registered names for
   *      duplicate detection.</li>
   *   </ul>
   * </li>
   * </ol>
   *
   * @param actionName - The template action name containing Liquid variables.
   * @param jsonActionTemplate - The JSON template definition containing matrix
   * parameters and an action template.
   * @returns A promise that resolves when processing is complete.
   *
   * @throws {@link ConfigurationError}
   * If duplicate action names are detected during expansion or if template
   * expansion fails.
   */
  protected async _processTemplate({
    actionName,
    jsonActionTemplate,
  }: {
    actionName: string
    jsonActionTemplate: JsonActionTemplate
  }): Promise<void> {
    // Expand template and generate multiple actions.
    try {
      const expandedActionsMap = await this._expandTemplateActions({
        actionName,
        jsonActionTemplate,
      })
      for (const [expandedActionName, expandedAction] of expandedActionsMap) {
        if (this._actionsNamesSet.has(expandedActionName)) {
          throw new ConfigurationError(
            `duplicate action name "${expandedActionName}" ` +
              `could not be generated from template.`
          )
        } else {
          this._actionsMap.set(expandedActionName, expandedAction)
          this._jsonActionsNamesMap.set(expandedActionName, actionName)
          this._actionsNamesSet.add(expandedActionName)
        }
      }
    } catch (error) {
      const message = getErrorMessage(error) + ` in action "${actionName}"`
      throw new ConfigurationError(message)
    }
  }

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
   * <ol>
   * <li>Validates matrix structure (object with array values).</li>
   * <li>Validates template format (string or array).</li>
   * <li>Performs Liquid substitutions on matrix values if they contain
   *   template syntax.</li>
   * <li>Recursively generates all combinations using Cartesian product.</li>
   * <li>Creates an action instance for each combination with matrix
   *   parameters available for later substitution.</li>
   * </ol>
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
   * @throws {@link ConfigurationError}
   * If the matrix structure is invalid, template format is incorrect, or
   * substitution fails.
   */
  protected async _expandTemplateActions({
    actionName,
    jsonActionTemplate,
  }: {
    actionName: string
    jsonActionTemplate: JsonActionTemplate
  }): Promise<Map<string, Action>> {
    const log = this.log
    log.trace(`${Actions.name}.#expandTemplateActions(${actionName})`)

    const newActionsMap = new Map<string, Action>()

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (jsonActionTemplate.matrix == undefined) {
      throw new ConfigurationError(`action "${actionName}" has no matrix`)
    }

    if (!isJsonObject(jsonActionTemplate.matrix)) {
      throw new ConfigurationError(
        `action "${actionName}" matrix is not an object`
      )
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (jsonActionTemplate.template == undefined) {
      throw new ConfigurationError(`action "${actionName}" has no template`)
    }

    if (
      !isString(jsonActionTemplate.template) &&
      !isJsonArray(jsonActionTemplate.template)
    ) {
      throw new ConfigurationError(
        `action "${actionName}" template is not a string or array`
      )
    }
    // Validate matrix structure and collect keys/values
    const { matrixKeys, matrixValues } = await processMatrixForExpansion({
      matrix: jsonActionTemplate.matrix,
      templateName: actionName,
      templateType: 'action',
      engine: this.engine,
      substitutionsVariables: this.substitutionsVariables,
      log: this.log,
    })

    // Compute all combinations (cartesian product)
    const combinationsGenerator = new CombinationsGenerator({
      matrixKeys,
      matrixValues,
      log: this.log,
    })

    // Use generator pattern for memory efficiency
    // Expand each template actions for its combination.
    for (const combination of combinationsGenerator.generate()) {
      await this._createSubstitutedAction({
        actionName,
        jsonAction: jsonActionTemplate.template,
        combination,
        newActionsMap,
      })
    }

    return newActionsMap
  }

  /**
   * Creates a substituted action from a template and matrix combination.
   *
   * @remarks
   * This helper method is called for each combination generated from a
   * template action's matrix parameters. It performs the actual name
   * substitution and creates the concrete action instance.
   *
   * Processing steps:
   *
   * <ol>
   * <li>Performs Liquid substitution on the template action name using the
   *    specific matrix combination values.</li>
   * <li>Creates a new <code>Action</code> instance with:
   *   <ul>
   *   <li>The substituted concrete action name.</li>
   *   <li>The action's command template (not yet evaluated).</li>
   *   <li>Reference to this parent actions collection.</li>
   *   <li>The matrix parameter values for later command substitution.</li>
   *   </ul>
   * </li>
   * <li>Stores the new action instance in the provided map.</li>
   * </ol>
   *
   * The matrix parameters are preserved in the action instance and will be
   * used later when the action is initialised to substitute matrix
   * references in the command templates.
   *
   * @param combination - The matrix parameter combination for this action
   * (e.g., <code>\{ arch: 'x64', platform: 'linux' \}</code>).
   * @param actionName - The template action name containing Liquid variables
   * (e.g., <code>test-\{\{ matrix.arch \}\}</code>).
   * @param jsonAction - The action's command template definition.
   * @param newActionsMap - The map to store the newly created action.
   * @returns A promise that resolves when the action has been created and
   * stored.
   *
   * @throws {@link ConfigurationError}
   * If the action name substitution fails.
   */
  protected async _createSubstitutedAction({
    actionName,
    jsonAction,
    combination,
    newActionsMap,
  }: {
    combination: Record<string, string>
    actionName: string
    jsonAction: JsonActionContent
    newActionsMap: Map<string, Action>
  }): Promise<void> {
    // console.log(combination)

    let substitutedActionName
    try {
      substitutedActionName = await performSubstitutions({
        input: actionName,
        engine: this.engine,
        substitutionsVariables: {
          ...this.substitutionsVariables,
          matrix: combination,
        },
        log: this.log,
      })
    } catch (error) {
      const message =
        getErrorMessage(error) + ` in action "${actionName}" name substitution`
      throw new ConfigurationError(message)
    }

    // console.log(substitutedActionName)

    const newAction = new Action({
      actionName: substitutedActionName,
      jsonAction,
      parentActions: this,
      matrixParameters: { ...combination },
    })

    newActionsMap.set(substitutedActionName, newAction)
  }
}

// ============================================================================

/**
 * Configuration parameters for constructing an action instance.
 *
 * @remarks
 * This interface defines the required configuration for creating an
 * instance of {@link Action}. Most properties are mandatory except for
 * the optional <code>matrixParameters</code>, which is only needed for
 * template-generated actions that were created from matrix expansion.
 *
 * The parameters provide the action with its identity (name), command
 * definitions, access to the parent collection for shared resources, and
 * optional matrix parameter values for template-generated actions.
 */
export interface ActionConstructorParameters {
  /**
   * The name of the action.
   */
  actionName: string

  /**
   * The JSON definition of the action commands.
   */
  jsonAction: JsonActionContent

  /**
   * The parent actions collection this action belongs to.
   */
  parentActions: Actions

  /**
   * Optional matrix parameter values for template-generated actions.
   */
  matrixParameters?: LiquidSubstitutionsStrings
}

/**
 * An individual <b>xpm</b> action containing commands to be executed.
 *
 * @remarks
 * Actions are lazily initialised, with variable substitution performed
 * only when the action is first retrieved and initialised. This allows for
 * efficient handling of large numbers of actions generated
 * from templates.
 *
 * An action can exist in three states:
 *
 * <ol>
 * <li><b>Undefined:</b> Name is known but instance not yet created.</li>
 * <li><b>Instantiated:</b> Object exists but commands not yet evaluated.</li>
 * <li><b>Initialised:</b> Commands fully evaluated with Liquid
 *    substitutions.</li>
 * </ol>
 *
 * This design minimizes memory usage and computation for actions that are
 * defined but never executed, which is common when using matrix templates
 * to generate platform-specific or configuration-specific actions.
 */
export class Action {
  // --------------------------------------------------------------------------
  // Public Members.

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
   * <ol>
   * <li>User-facing identification when listing or executing actions.</li>
   * <li>Logging and diagnostic output to track action lifecycle.</li>
   * <li>Creating copies of inherited actions with preserved names.</li>
   * </ol>
   *
   * Names must be unique within the actions collection, enforced during
   * {@link Actions.initialise}.
   */
  readonly actionName: string

  /**
   * The JSON definition of the action commands.
   *
   * @remarks
   * This holds the raw command definition as it appears in `package.json`,
   * before variable substitution. The format can be:
   *
   * <ol>
   * <li><b>Simple string:</b> Single command line.</li>
   * <li><b>String array:</b> Multiple commands for sequential execution.</li>
   * </ol>
   *
   * The definition is preserved in its original form to enable:
   *
   * <ol>
   * <li>Creating copies of inherited actions with identical definitions.</li>
   * <li>Deferred template evaluation during
   * <code>Action.initialise()</code>.</li>
   * <li>Re-evaluation if needed with different variable contexts.</li>
   * </ol>
   *
   * This immutable storage ensures actions can be safely copied and
   * initialised multiple times without side effects.
   */
  readonly jsonAction: JsonActionContent

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
   * <ol>
   * <li>Liquid templating engine for variable substitution.</li>
   * <li>Substitution variables hierarchy (package metadata, configuration,
   *   environment, platform detection).</li>
   * <li>Logger instance for diagnostic output.</li>
   * <li>Build configuration context when actions belong to a specific
   *   configuration rather than the package root.</li>
   * </ol>
   *
   * This design enables actions to access shared resources without duplicating
   * them, while maintaining proper scoping for template evaluation. During
   * initialisation, the action combines parent-level substitution variables
   * with its own matrix parameters to create a complete context for Liquid
   * template processing.
   */
  readonly parentActions: Actions

  /**
   * The matrix parameter values for template-generated actions.
   *
   * @remarks
   * For template-generated actions, this object contains the specific matrix
   * parameter values that produced this action instance from the template.
   *
   * Usage pattern:
   *
   * <ol>
   * <li>Undefined for regular (non-template) actions.</li>
   * <li>For template actions, contains key-value pairs from the matrix
   *   combination (e.g.,
   *   <code>\{ arch: 'x64', platform: 'linux' \}</code>).</li>
   * <li>Merged into substitution variables during
   *   <code>Action.initialise()</code>, making values accessible via the
   *   <code>matrix</code> namespace in command templates.</li>
   * <li>Enables the same command template to generate different concrete
   *   commands for each matrix combination.</li>
   * </ol>
   *
   * Example: A template with `{{ matrix.arch }}` becomes `x64` when this
   * action's matrix parameters include `{ arch: 'x64' }`.
   */
  protected readonly _matrixParameters?: LiquidSubstitutionsStrings

  /**
   * The array of command strings after variable substitution.
   *
   * @remarks
   * This array contains the fully evaluated command lines ready for
   * execution, with all Liquid template variables substituted.
   *
   * Lifecycle states:
   *
   * <ol>
   * <li>Undefined initially and until <code>Action.initialise()</code>
   *   is called.</li>
   * <li>Populated during initialisation by evaluating
   *   <code>jsonAction</code> with the
   *   Liquid engine and complete variable context.</li>
   * <li>Array-based JSON definitions are joined, substituted, then split back
   *   into individual command lines.</li>
   * <li>Each string represents one command line to be executed
   *   sequentially.</li>
   * </ol>
   *
   * Attempting to access via the `commands` getter before initialisation
   * will trigger an assertion error, enforcing correct usage order.
   */
  protected _commands?: string[]

  /**
   * Flag indicating whether the action has been initialised.
   *
   * @remarks
   * This flag ensures idempotent initialization and prevents redundant
   * template evaluation when {@link Action.initialise} is called
   * multiple times.
   *
   * State transitions:
   *
   * <ol>
   * <li>Initially <code>false</code> after construction.</li>
   * <li>Set to <code>true</code> after successful command substitution and
   *   evaluation.</li>
   * <li>Checked at the start of <code>Action.initialise()</code> to
   *   return early if already initialised.</li>
   * </ol>
   *
   * This pattern allows safe repeated calls during complex initialization
   * sequences or when actions are accessed multiple times, avoiding the
   * computational cost of re-evaluating templates unnecessarily.
   */
  protected _isInitialised = false

  // --------------------------------------------------------------------------
  // Constructor and async initialiser.

  /**
   * Constructs an action instance.
   *
   * @remarks
   * The constructor performs partial initialisation. Variable substitution
   * requires calling the {@link Action.initialise} method.
   *
   * @param actionName - The name of the action.
   * @param jsonAction - The JSON definition of the action commands.
   * @param parentActions - The parent actions collection this action belongs
   * to.
   * @param matrixParameters - Optional matrix parameter values for
   * template-generated actions.
   */
  constructor({
    actionName,
    jsonAction,
    parentActions,
    matrixParameters,
  }: ActionConstructorParameters) {
    assert(actionName, 'actionName is required')
    // assert(jsonAction) // Can be an empty string.
    assert(parentActions, 'parentActions is required')

    const log = parentActions.log
    log.trace(`${Action.name}(${actionName})`)

    this.actionName = actionName
    this.jsonAction = jsonAction
    this.parentActions = parentActions
    if (matrixParameters !== undefined) {
      this._matrixParameters = matrixParameters
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
   * <ol>
   * <li>All package-level substitution variables (configuration, package
   *   metadata, platform detection, etc.).</li>
   * <li>Build configuration variables if this action belongs to a
   *   configuration.</li>
   * <li>Matrix parameters for template-generated actions, accessible via
   *   the <code>matrix</code> namespace (e.g.,
   *   <code>\{\{ matrix.arch \}\}</code>).</li>
   * </ol>
   *
   * Array-based command definitions are joined with newlines before
   * substitution, then split back into individual commands after processing.
   * This allows commands to span multiple array elements while maintaining
   * clean formatting in the package manifest.
   *
   * @returns A promise that resolves to `true` if initialisation was
   * performed, or `false` if already initialised.
   *
   * @throws {@link ConfigurationError}
   * If command substitution fails.
   */
  async initialise(): Promise<boolean> {
    const log = this.parentActions.log

    if (this._isInitialised) {
      log.trace(`${Action.name}.initialise(${this.actionName}) again`)

      return false
    }

    log.trace(`${Action.name}.initialise(${this.actionName})`)

    // Silently accept empty or non-existing actions.
    const jsonAction = this.jsonAction
    const inputCommands = Array.isArray(jsonAction)
      ? jsonAction.join(os.EOL)
      : jsonAction

    let substitutedCommands
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
        })
      } catch (error) {
        const message =
          getErrorMessage(error) +
          ` in action "${this.actionName}" commands substitution`
        throw new ConfigurationError(message)
      }
    } else {
      substitutedCommands = inputCommands
    }

    this._commands = substitutedCommands
      .replace(new RegExp(os.EOL + '$'), '')
      .split(os.EOL)

    log.trace(`${Action.name}.initialise() =>`, this.actionName)
    log.trace(this.actionName, 'commands =>', this._commands)

    this._isInitialised = true
    return true
  }

  // --------------------------------------------------------------------------
  // Public Methods.

  /**
   * Retrieves the array of command strings for this action.
   *
   * @remarks
   * The action must be initialised via {@link Action.initialise}
   * before accessing this property. Attempting to access commands from an
   * uninitialised action will result in an assertion error.
   *
   * @returns The array of command strings after variable substitution.
   */
  get commands(): string[] {
    assert(
      this._isInitialised,
      'Action must be initialised before accessing commands'
    )

    assert(this._commands, 'Action _commands not initialised')
    return this._commands
  }
}

// ----------------------------------------------------------------------------
