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

import assert from 'node:assert'
import * as path from 'node:path'
import * as os from 'node:os'

import { Logger } from '@xpack/logger'

import { XpmLiquidEngine } from './liquid-engine.js'
import {
  XpmLiquidSubstitutionsVariables,
  XpmLiquidSubstitutionsStrings,
} from '../data/substitutions-variables.js'
import { buildFolderRelativePathPropertyName } from './data-model.js'
import {
  JsonBuildConfiguration,
  JsonBuildConfigurationContent,
  JsonBuildConfigurations,
  JsonBuildConfigurationInherits,
  JsonBuildConfigurationTemplate,
  JsonDependencies,
} from '../types/json.js'
import { performSubstitutions } from '../functions/perform-substitutions.js'
import { XpmAction, XpmActions } from './actions.js'
import { getErrorMessage } from '../functions/utils.js'
import {
  isJsonArray,
  isJsonObject,
  isString,
} from '../functions/is-something.js'
import { filterPath } from '../functions/filter-paths.js'
import { XpmError, XpmInputError } from './errors.js'

// ============================================================================

/**
 * A collection of <b>xpm</b> build configurations.
 *
 * @remarks
 * This class manages build configurations defined in package metadata,
 * including template expansion with matrix parameters and initialisation of
 * derived configuration instances.
 *
 * Configuration lifecycle phases:
 *
 * <ol>
 * <li><b>Construction:</b> Basic setup without processing configurations.</li>
 * <li><b>Initialisation:</b> Template name expansion without content
 *    evaluation.</li>
 * <li><b>Retrieval:</b> On-demand instantiation when accessed via
 *    <code>get()</code>.</li>
 * <li><b>Configuration Initialisation:</b> Full processing including
 *    inheritance, property resolution, dependency substitution, and
 *    action preparation.</li>
 * </ol>
 *
 * This lazy evaluation strategy ensures that only configurations actually
 * used incur the cost of template evaluation, inheritance resolution, and
 * variable substitution.
 */
export class XpmBuildConfigurations {
  // --------------------------------------------------------------------------
  // Members.

  /**
   * The logger instance for output and diagnostics.
   *
   * @remarks
   * This logger provides trace-level diagnostics throughout the build
   * configuration lifecycle, including template expansion, inheritance
   * resolution, property merging, and dependency substitution. It enables
   * detailed debugging of complex build configuration hierarchies without
   * impacting runtime performance when tracing is disabled.
   */
  readonly log: Logger

  /**
   * The Liquid templating engine for variable substitution.
   *
   * @remarks
   * This engine instance is shared across all build configurations and
   * configured with custom filters for platform detection, path
   * manipulation, and xpm-specific operations. It processes templates in
   * configuration names, matrix parameters, properties, dependencies, and
   * actions, ensuring consistent template evaluation throughout the
   * configuration lifecycle.
   */
  readonly engine: XpmLiquidEngine

  /**
   * The variables available for substitution in configuration definitions.
   *
   * @remarks
   * This comprehensive variable hierarchy provides the base context for all
   * build configuration template evaluation, extended per-configuration with
   * specific properties, dependencies, and matrix parameters.
   *
   * Base hierarchy includes:
   *
   * <ol>
   * <li><b>Environment variables:</b> <code>env</code> namespace with system
   *    environment.</li>
   * <li><b>Platform detection:</b> <code>os</code> namespace with
   *    platform-specific values.</li>
   * <li><b>Path utilities:</b> <code>path</code> namespace with path
   *    manipulationfunctions.</li>
   * <li><b>Package metadata:</b> <code>package</code> namespace with
   *    name, version, dependencies.</li>
   * </ol>
   *
   * Individual configurations extend this with their own `properties`,
   * `configuration`, and `matrix` namespaces during initialisation.
   */
  readonly substitutionsVariables: XpmLiquidSubstitutionsVariables

  /**
   * The JSON object containing build configuration definitions.
   *
   * @remarks
   * This object holds raw build configuration definitions from the
   * `package.json` `xpack.buildConfigurations` section. Configurations can be:
   *
   * <ol>
   * <li><b>Regular configurations:</b> Direct objects with properties,
   *    dependencies, actions, and inheritance.</li>
   * <li><b>Template configurations:</b> Objects with <code>matrix</code>
   *    and <code>template</code>
   *    properties for generating multiple configurations from a single
   *    definition.</li>
   * </ol>
   *
   * Template configuration names (containing `{{` markers) trigger matrix
   * expansion during initialisation, creating concrete configurations from
   * the Cartesian product of matrix parameter values. Each configuration
   * can inherit from others, creating complex dependency hierarchies.
   */
  readonly jsonBuildConfigurations: JsonBuildConfigurations

  /**
   * Map of build configuration names to their corresponding instances.
   *
   * @remarks
   * This map serves as the primary configuration registry, populated during
   * collection initialisation with entries for all discovered configurations.
   *
   * Key characteristics:
   *
   * <ol>
   * <li>Known only after <code>XpmBuildConfigurations.initialise()</code>
   *    completes.</li>
   * <li>Possibly empty if there are no build configurations defined.</li>
   * <li>Values can be <code>undefined</code> to indicate a configuration
   *    exists but hasn't been instantiated yet (lazy loading).</li>
   * <li>For template configurations, contains one entry per expanded
   *    combination, not the original template definition.</li>
   * </ol>
   *
   * Configurations transition from `undefined` to instantiated when first
   * accessed via {@link XpmBuildConfigurations.get}, implementing the
   * lazy evaluation pattern to avoid unnecessary processing.
   */
  protected readonly _buildConfigurationsMap: Map<
    string,
    XpmBuildConfiguration | undefined
  > = new Map<string, XpmBuildConfiguration | undefined>()

  /**
   * Map of expanded build configuration names to their JSON source names.
   *
   * @remarks
   * This reverse mapping enables retrieving the original configuration
   * definition from `jsonBuildConfigurations` when lazy-loading
   * configuration instances.
   *
   * Mapping behavior:
   *
   * <ol>
   * <li><b>For regular configurations:</b> Maps configuration name to itself
   *    (identity mapping).</li>
   * <li><b>For template configurations:</b> Maps each generated configuration
   *    name
   *    back to the original template name (e.g., <code>release-x64</code> →
   *    <code>release-\{\{ matrix.arch \}\}</code>).</li>
   * <li>Known only after <code>XpmBuildConfigurations.initialise()</code>
   *    completes.</li>
   * <li>Enables <code>XpmBuildConfigurations.get()</code> to locate the
   *    correct JSON definition when instantiating a configuration on
   *    demand.</li>
   * </ol>
   *
   * This indirection is essential for lazy evaluation, allowing deferred
   * instantiation while maintaining the connection to original definitions.
   */
  protected readonly _jsonBuildConfigurationsNamesMap: Map<string, string> =
    new Map<string, string>()

  /**
   * Set of all build configuration names for duplicate detection.
   *
   * @remarks
   * This set provides O(1) existence checks for configuration names,
   * enabling efficient validation during template expansion to prevent
   * duplicate configurations.
   *
   * Duplicate scenarios detected:
   *
   * <ol>
   * <li>Explicit duplicates in <code>package.json</code> with identical
   *    names.</li>
   * <li>Template expansion conflicts where different templates generate the
   *    same concrete configuration name.</li>
   * <li>Conflicts between template-generated names and explicitly defined
   *    configuration names.</li>
   * </ol>
   *
   * Detection occurs during {@link XpmBuildConfigurations.initialise},
   * throwing {@link XpmError} when duplicates are found to ensure
   * configuration name uniqueness.
   */
  protected readonly _buildComfigurationsNamesSet: Set<string> =
    new Set<string>()

  /**
   * Flag indicating whether the collection has been initialised.
   *
   * @remarks
   * This flag prevents redundant initialisation and ensures idempotent
   * behavior when {@link XpmBuildConfigurations.initialise} is called
   * multiple times.
   *
   * State transitions:
   *
   * <ol>
   * <li>Initially <code>false</code> after construction.</li>
   * <li>Set to <code>true</code> after successful template expansion
   *    and configuration
   *    name registration.</li>
   * <li>Checked at the beginning of
   *    <code>XpmBuildConfigurations.initialise()</code> to return early if
   *    already initialised.</li>
   * </ol>
   *
   * This pattern supports safe repeated calls during complex initialisation
   * sequences without duplicating work or corrupting internal state.
   */
  protected _isInitialised = false

  /**
   * Cached array of all build configuration names in the collection.
   *
   * @remarks
   * This array provides O(1) access to configuration names without
   * repeatedly creating new arrays from the map keys, improving performance
   * when the names are accessed multiple times.
   *
   * Key characteristics:
   *
   * <ol>
   * <li>Empty initially after construction.</li>
   * <li>Populated during
   *    <code>XpmBuildConfigurations.initialise()</code> after all
   *    configuration names are determined.</li>
   * <li>Contains all configuration names including those generated from
   *    templates.</li>
   * <li>Returned by the <code>names</code> getter for efficient repeated
   *    access.</li>
   * </ol>
   *
   * This cached approach avoids the overhead of calling
   * `Array.from(map.keys())` on every access whilst still
   * providing a clean getter interface.
   */
  protected _buildConfigurationsNames: string[] = []

  // --------------------------------------------------------------------------
  // Constructor and async initialiser.

  /**
   * Constructs a build configurations collection.
   *
   * @remarks
   * The constructor performs partial initialisation. Complete
   * initialisation requires calling
   * {@link XpmBuildConfigurations.initialise}.
   *
   * @param log - The logger instance for output and diagnostics.
   * @param engine - The Liquid templating engine for variable substitution.
   * @param substitutionsVariables - The variables available for substitution.
   * @param jsonBuildConfigurations - The JSON build configurations definitions,
   * or undefined if no build configurations are defined.
   */
  constructor({
    log,
    engine,
    substitutionsVariables,
    jsonBuildConfigurations,
  }: {
    log: Logger
    engine: XpmLiquidEngine
    substitutionsVariables: XpmLiquidSubstitutionsVariables
    jsonBuildConfigurations: JsonBuildConfigurations | undefined
  }) {
    assert(log, 'log is required')
    assert(engine, 'engine is required')
    assert(substitutionsVariables, 'substitutionsVariables is required')

    log.trace(`${XpmBuildConfigurations.name}()`)

    this.log = log
    this.engine = engine
    this.substitutionsVariables = substitutionsVariables
    this.jsonBuildConfigurations = jsonBuildConfigurations ?? {}

    // log.trace('substitutionsVariables => ', this.substitutionsVariables)
  }

  /**
   * Completes the async initialisation of the build configurations collection.
   *
   * @remarks
   * This method implements the first step of lazy evaluation. It processes
   * all build configuration definitions by expanding template configuration
   * names based on matrix parameters, but does not evaluate the configuration
   * content or perform Liquid substitutions. The actual template evaluation
   * and variable substitution occur later when individual configurations are
   * initialised via {@link XpmBuildConfiguration.initialise}, and only
   * for configurations that are actually used. This approach avoids unnecessary
   * operations on unused configurations. The method also validates that all
   * expanded configuration names are unique and prepares the internal lookup
   * maps.
   *
   * @returns A promise that resolves to `true` if initialisation was performed,
   * or `false` if already initialised.
   *
   * @throws {@link XpmError}
   * If duplicate names are detected or template expansion fails.
   */
  async initialise(): Promise<boolean> {
    const log = this.log

    if (this._isInitialised) {
      log.trace(`${XpmBuildConfigurations.name}.initialise() again`)
      return false
    }

    log.trace(`${XpmBuildConfigurations.name}.initialise()`)

    for (const buildConfigurationName of Object.keys(
      this.jsonBuildConfigurations
    )) {
      if (buildConfigurationName.includes('{{')) {
        // Expand templates and generate multiple build configurations.
        try {
          const jsonBuildConfigurationTemplate = this.jsonBuildConfigurations[
            buildConfigurationName
          ] as JsonBuildConfigurationTemplate
          const expandedBuildConfigurationsMap =
            await this._expandTemplateBuildConfigurations({
              buildConfigurationName,
              jsonBuildConfigurationTemplate,
            })
          for (const [
            expandedBuildConfigurationName,
            expandedBuildConfiguration,
          ] of expandedBuildConfigurationsMap) {
            if (
              this._buildComfigurationsNamesSet.has(
                expandedBuildConfigurationName
              )
            ) {
              throw new XpmError(
                `duplicate build configuration name ` +
                  `"${expandedBuildConfigurationName}" ` +
                  `generated from template.`
              )
            } else {
              this._buildConfigurationsMap.set(
                expandedBuildConfigurationName,
                expandedBuildConfiguration
              )
              this._jsonBuildConfigurationsNamesMap.set(
                expandedBuildConfigurationName,
                buildConfigurationName
              )
            }
          }
        } catch (error) {
          const message =
            getErrorMessage(error) +
            ` in buildConfiguration "${buildConfigurationName}"`
          throw new XpmError(message)
        }
      } else {
        if (this._buildComfigurationsNamesSet.has(buildConfigurationName)) {
          throw new XpmError(
            `duplicate build configuration name ` +
              `"${buildConfigurationName}" ` +
              `possibly already generated from template.`
          )
        } else {
          this._buildConfigurationsMap.set(buildConfigurationName, undefined)
          this._jsonBuildConfigurationsNamesMap.set(
            buildConfigurationName,
            buildConfigurationName
          )
        }
      }
    }

    const buildConfigurationsNames = Array.from(
      this._buildConfigurationsMap.keys()
    )
    this._buildConfigurationsNames = buildConfigurationsNames

    log.trace(
      `${XpmBuildConfigurations.name}.initialise() =>`,
      buildConfigurationsNames
    )

    this._isInitialised = true
    return true
  }

  // --------------------------------------------------------------------------
  // Public methods.

  /**
   * The number of build configurations in the collection.
   *
   * @remarks
   * This value is known only after `initialise()`.
   *
   * This getter provides direct access to the collection size, enabling
   * callers to check for emptiness or iterate with knowledge of the
   * collection's extent.
   *
   * @returns The number of build configurations in the collection.
   */
  get size(): number {
    return this._buildConfigurationsMap.size
  }

  /**
   * Indicates whether the collection is empty.
   *
   * @remarks
   * This value is known only after `initialise()`.
   *
   * @returns `true` if there are no build configurations, `false` otherwise.
   */
  get isEmpty(): boolean {
    return this._buildConfigurationsMap.size === 0
  }

  /**
   * The names of all build configurations.
   *
   * @remarks
   * This value is known only after `initialise()`.
   *
   * This getter returns the cached array of configuration names for
   * efficient repeated access without recreating the array.
   *
   * @returns An array of build configuration names.
   */
  get names(): string[] {
    return this._buildConfigurationsNames
  }

  /**
   * Retrieves the JSON configuration name for a build configuration.
   *
   * @param buildConfigurationName - The build configuration name to resolve.
   * @returns The JSON configuration name associated with the given build
   * configuration name.
   *
   * @remarks
   * For template-generated configurations, this returns the template
   * name.
   */
  getJsonName(buildConfigurationName: string): string {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this._jsonBuildConfigurationsNamesMap.get(buildConfigurationName)!
  }

  /**
   * Determines whether a JSON definition exists for a build configuration.
   *
   * @param buildConfigurationName - The build configuration name to check.
   * @returns `true` if a JSON definition exists, `false` otherwise.
   */
  hasJson(buildConfigurationName: string): boolean {
    return this._jsonBuildConfigurationsNamesMap.has(buildConfigurationName)
  }

  /**
   * Retrieves the JSON build configuration definition.
   *
   * @param buildConfigurationName - The build configuration name to resolve.
   * @returns The JSON build configuration definition.
   */
  getJson(buildConfigurationName: string): JsonBuildConfiguration {
    return this.jsonBuildConfigurations[
      this.getJsonName(buildConfigurationName)
    ]
  }

  /**
   * Determines whether a build configuration is hidden.
   *
   * @param buildConfigurationName - The build configuration name to check.
   * @returns `true` if the configuration is hidden, `false` otherwise.
   */
  isHidden(buildConfigurationName: string): boolean {
    const jsonBuildConfigurationName = this.getJsonName(buildConfigurationName)
    if (jsonBuildConfigurationName.includes('{{')) {
      const jsonBuildConfigurationTemplate: JsonBuildConfigurationTemplate =
        this.jsonBuildConfigurations[
          jsonBuildConfigurationName
        ] as JsonBuildConfigurationTemplate
      return jsonBuildConfigurationTemplate.template.hidden ?? false
    }

    const jsonBuildConfigurationContent: JsonBuildConfigurationContent = this
      .jsonBuildConfigurations[
      jsonBuildConfigurationName
    ] as JsonBuildConfigurationContent
    return jsonBuildConfigurationContent.hidden ?? false
  }

  /**
   * Determines whether a build configuration exists in the collection.
   *
   * @param buildConfigurationName - The build configuration name to check.
   * @returns `true` if the configuration exists, `false` otherwise.
   */
  has(buildConfigurationName: string): boolean {
    return this._buildConfigurationsMap.has(buildConfigurationName)
  }

  /**
   * Retrieves a build configuration by name, creating it if required.
   *
   * @remarks
   * This method implements lazy evaluation to avoid unnecessary
   * operations. Build configurations are instantiated on demand but
   * remain uninitialised until actually used. The two-step process
   * works as follows:
   *
   * <ol>
   * <li>During collection initialisation
   *    (<code>XpmBuildConfigurations.initialise()</code>), only the
   *    matrix of options is evaluated for each template, expanding
   *    configuration names without processing their content.</li>
   * <li>Later, when a configuration is accessed via this method and
   *    subsequently initialised
   *    (<code>XpmBuildConfiguration.initialise()</code>), the template
   *    is fully evaluated and Liquid substitutions are performed on
   *    all properties.</li>
   * </ol>
   *
   * This approach ensures that only build configurations that are
   * actually used incur the cost of template evaluation and variable
   * substitution.
   *
   * @param buildConfigurationName - The build configuration name to retrieve.
   * @returns The build configuration instance.
   */
  get(buildConfigurationName: string): XpmBuildConfiguration {
    const log = this.log
    log.trace(`${XpmBuildConfigurations.name}.get(${buildConfigurationName})`)

    let buildConfiguration = this._buildConfigurationsMap.get(
      buildConfigurationName
    )
    if (buildConfiguration === undefined) {
      const jsonBuildConfigurationName: string =
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this._jsonBuildConfigurationsNamesMap.get(buildConfigurationName)!

      const jsonBuildConfiguration: JsonBuildConfigurationContent = (this
        .jsonBuildConfigurations[jsonBuildConfigurationName] ??
        {}) as JsonBuildConfigurationContent

      buildConfiguration = new XpmBuildConfiguration({
        buildConfigurationName,
        jsonBuildConfiguration,
        parentBuildConfigurations: this,
      })
      this._buildConfigurationsMap.set(
        buildConfigurationName,
        buildConfiguration
      )
    }

    // await buildConfiguration.initialise()
    return buildConfiguration
  }

  // --------------------------------------------------------------------------
  // Private methods.

  /**
   * Expands a template build configuration into multiple configurations.
   *
   * @remarks
   * This method computes the Cartesian product of matrix parameter
   * values and creates a configuration for each combination, substituting
   * matrix values into both the configuration name and content.
   *
   * Processing steps:
   *
   * <ol>
   * <li>Validates matrix structure (object with array values).</li>
   * <li>Validates template format (must be a JSON object).</li>
   * <li>Performs Liquid substitutions on matrix values if they contain
   *    template syntax.</li>
   * <li>Recursively generates all combinations using Cartesian product.</li>
   * <li>Creates a configuration instance for each combination with matrix
   *    parameters stored for later full evaluation.</li>
   * </ol>
   *
   * Matrix variables are scoped to individual configurations and accessible
   * via the `matrix` namespace during property, dependency, and action
   * evaluation.
   *
   * @param buildConfigurationName - The template configuration name containing
   * Liquid variables.
   * @param jsonBuildConfigurationTemplate - The template definition containing
   * matrix parameters and a configuration template.
   * @returns A promise that resolves to a map of expanded configuration names
   * to their corresponding instances.
   *
   * @throws {@link XpmError}
   * If the matrix structure is invalid or substitution fails.
   */
  protected async _expandTemplateBuildConfigurations({
    buildConfigurationName,
    jsonBuildConfigurationTemplate,
  }: {
    buildConfigurationName: string
    jsonBuildConfigurationTemplate: JsonBuildConfigurationTemplate
  }): Promise<Map<string, XpmBuildConfiguration>> {
    const log = this.log
    log.trace(
      `${XpmBuildConfigurations.name}.` +
        `#expandTemplateBuildConfigurations(${buildConfigurationName})`
    )

    const newBuildConfigurationsMap = new Map<string, XpmBuildConfiguration>()

    if (!isJsonObject(jsonBuildConfigurationTemplate.matrix)) {
      throw new XpmError(
        `buildConfiguration "${buildConfigurationName}" ` +
          `matrix is not an object`
      )
    }
    if (!isJsonObject(jsonBuildConfigurationTemplate.template)) {
      throw new XpmError(
        `buildConfiguration "${buildConfigurationName}" ` +
          `template is not a JSON object`
      )
    }
    // Validate matrix structure and collect keys/values
    const matrixKeys: string[] = []
    const matrixValues: string[][] = []

    for (const [matrixKey, matrixValueArray] of Object.entries(
      jsonBuildConfigurationTemplate.matrix
    )) {
      if (!isJsonArray(matrixValueArray)) {
        throw new XpmError(
          `buildConfiguration "${buildConfigurationName}" ` +
            `matrix.${matrixKey} is not an array`
        )
      }
      for (const matrixValue of matrixValueArray) {
        if (!isString(matrixValue)) {
          throw new XpmError(
            `buildConfiguration "${buildConfigurationName}" ` +
              `matrix.${matrixKey} value is not a string`
          )
        }
      }
      matrixKeys.push(matrixKey)
      const stringValue = matrixValueArray.join(os.EOL)
      if (stringValue.includes('{{') || stringValue.includes('{%')) {
        let substitutedValue
        try {
          substitutedValue = await performSubstitutions({
            input: stringValue,
            engine: this.engine,
            substitutionsVariables: {
              ...this.substitutionsVariables,
            },
            log: this.log,
          })
        } catch (error) {
          const message =
            getErrorMessage(error) +
            ` in buildConfiguration "${buildConfigurationName}" ` +
            `matrix substitution`
          throw new XpmError(message)
        }

        // console.log('substitutedValue =>', substitutedValue)
        matrixValues.push(
          substitutedValue.replace(new RegExp(os.EOL + '$'), '').split(os.EOL)
        )
      } else {
        matrixValues.push(matrixValueArray)
      }
    }

    // Inner function.
    const createSubstitutedBuildConfiguration = async (
      combination: Record<string, string>
    ): Promise<void> => {
      // console.log(combination)

      let substitutedBuildConfigurationName
      try {
        substitutedBuildConfigurationName = await performSubstitutions({
          input: buildConfigurationName,
          engine: this.engine,
          substitutionsVariables: {
            ...this.substitutionsVariables,
            matrix: combination,
          },
          log: this.log,
        })
      } catch (error) {
        const message =
          getErrorMessage(error) +
          ` in buildConfiguration "${buildConfigurationName}" ` +
          `name substitution`
        throw new XpmError(message)
      }

      // console.log(substitutedActionName)

      const newBuildConfiguration = new XpmBuildConfiguration({
        buildConfigurationName: substitutedBuildConfigurationName,
        templateBuildConfigurationName: buildConfigurationName,
        jsonBuildConfiguration: jsonBuildConfigurationTemplate.template,
        parentBuildConfigurations: this,
        matrixParameters: { ...combination },
      })

      newBuildConfigurationsMap.set(
        substitutedBuildConfigurationName,
        newBuildConfiguration
      )
    }

    // const matrixKeys: string[] = Object.keys(jsonAction.matrix)
    // const matrixValues: string[][] = Object.values(jsonAction.matrix)

    // Compute all combinations (cartesian product)

    // Inner function.
    const generateCombinationsRecursively = async (
      index: number,
      combination: Record<string, string>
    ): Promise<void> => {
      const log = this.log
      log.trace(
        `${XpmBuildConfigurations.name}.` +
          `#expandTemplateBuildConfigurations().` +
          `generateCombinationsRecursively(${String(index)}, ${JSON.stringify(
            combination
          )})`
      )

      if (index === matrixKeys.length) {
        await createSubstitutedBuildConfiguration(combination)

        return
      }

      const key = matrixKeys[index]
      const values = matrixValues[index]

      for (const value of values) {
        combination[key] = value
        await generateCombinationsRecursively(index + 1, combination)
      }
    }

    await generateCombinationsRecursively(0, {})

    return newBuildConfigurationsMap
  }
}

// ============================================================================

/**
 * An individual <b>xpm</b> build configuration.
 *
 * @remarks
 * Build configurations are initialised lazily and may inherit
 * properties, dependencies, and actions from other configurations.
 *
 * A configuration can exist in three states:
 *
 * <ol>
 * <li><b>Undefined:</b> Name is known but instance not yet created.</li>
 * <li><b>Instantiated:</b> Object exists but not yet fully processed.</li>
 * <li><b>Initialised:</b> Inheritance resolved, properties evaluated,
 *    dependencies substituted, and actions prepared.</li>
 * </ol>
 *
 * Inheritance is processed recursively with circular reference detection.
 * Later inherited properties override earlier ones, and local properties
 * override all inherited ones. Dependencies and actions are merged from
 * all inherited configurations.
 */
export class XpmBuildConfiguration {
  // --------------------------------------------------------------------------
  // Members.

  /**
   * The build configuration name after substitution.
   *
   * @remarks
   * This is the final, expanded configuration name used for identification
   * and selection. For template-generated configurations, this is the
   * concrete name after matrix substitution (e.g., `release-x64` rather than
   * `release-{{ matrix.arch }}`).
   *
   * The name is used for:
   *
   * <ol>
   * <li>User-facing identification when listing or selecting
   *   configurations.</li>
   * <li><b>Build folder path generation (default:</b>
   *   <code>build/\{name\}</code>).</li>
   * <li>Logging and diagnostic output to track configuration lifecycle.</li>
   * <li>Inheritance references from other configurations.</li>
   * </ol>
   *
   * Names must be unique within the configurations collection, enforced
   * during {@link XpmBuildConfigurations.initialise}.
   */
  readonly buildConfigurationName: string

  /**
   * The template build configuration name, if derived from a template.
   *
   * @remarks
   * For template-generated configurations, this preserves the original
   * template name containing Liquid variables (e.g.,
   * `release-{{ matrix.arch }}`), while `buildConfigurationName` holds the
   * expanded concrete name.
   *
   * Usage:
   *
   * <ol>
   * <li>Undefined for regular (non-template) configurations.</li>
   * <li>Set to the template name for configurations generated from matrix
   *    expansion.</li>
   * <li>Used to determine whether full JSON substitution is needed during
   *    initialisation (templates require complete substitution, regular
   *    configurations only substitute specific fields).</li>
   * <li>Enables tracing and debugging of template expansion process.</li>
   * </ol>
   */
  readonly templateBuildConfigurationName?: string

  /**
   * The parent build configurations collection.
   *
   * @remarks
   * This reference maintains the hierarchical relationship between
   * individual configurations and their containing collection, providing
   * essential context for configuration initialisation.
   *
   * The parent collection provides access to:
   *
   * <ol>
   * <li>Liquid templating engine for variable substitution.</li>
   * <li>Base substitution variables hierarchy (package metadata,
   *    environment, platform detection).</li>
   * <li>Logger instance for diagnostic output.</li>
   * <li>JSON build configurations lookup for inheritance resolution.</li>
   * <li>Other configuration instances when processing inheritance chains.</li>
   * </ol>
   *
   * This design enables configurations to access shared resources without
   * duplicating them, while supporting complex inheritance relationships
   * where configurations reference and inherit from each other.
   */
  readonly parentBuildConfigurations: XpmBuildConfigurations

  /**
   * The list of inherited configuration names.
   *
   * @remarks
   * This array specifies the inheritance chain for this configuration,
   * processed sequentially during initialisation with later entries
   * overriding earlier ones.
   *
   * Inheritance processing:
   *
   * <ol>
   * <li>Populated from <code>inherits</code> or deprecated
   *    <code>inherit</code> field during
   *    initialisation.</li>
   * <li>Supports both string (single parent) and array (multiple parents)
   *    formats.</li>
   * <li>Each inherited configuration is initialised recursively before
   *    merging its properties, dependencies, and actions.</li>
   * <li>Circular references are detected and rejected with
   *    <code>XpmInputError</code>.</li>
   * <li>Later inherited configurations override properties from earlier
   *    ones, and local properties override all inherited ones.</li>
   * </ol>
   */
  inheritsNames: string[] = []

  /**
   * Indicates whether the configuration is hidden.
   *
   * @remarks
   * Hidden configurations are used for inheritance bases or intermediate
   * configurations that shouldn't be directly selected for building.
   *
   * Effects of hidden status:
   *
   * <ol>
   * <li>Hidden configurations don't compute build folder relative paths
   *    during initialisation (optimization for inheritance-only configs).</li>
   * <li>May be excluded from user-facing configuration lists depending on
   *    application logic.</li>
   * <li>Still fully initialised and available for inheritance by other
   *    configurations.</li>
   * <li>Derived from <code>hidden</code> field in JSON configuration definition
   *    (defaults to <code>false</code>).</li>
   * </ol>
   *
   * Common use case:
   *
   * Base configurations that define common properties,
   * dependencies, or actions inherited by multiple concrete configurations.
   */
  readonly isHidden: boolean

  /**
   * The resolved properties for this configuration.
   *
   * @remarks
   * This object contains the final merged properties after inheritance
   * resolution and becomes available in the `properties` namespace for
   * Liquid template substitution.
   *
   * Property resolution order:
   *
   * <ol>
   * <li>Start with empty object.</li>
   * <li>Merge properties from each inherited configuration in sequence
   *    (later overrides earlier).</li>
   * <li>Merge local properties from JSON definition (overrides all
   *    inherited).</li>
   * <li>Add computed <code>buildFolderRelativePath</code> property
   *    for non-hidden
   *    configurations.</li>
   * </ol>
   *
   * Properties are accessible in templates as `{{ properties.key }}` and
   * commonly used for compiler flags, toolchain paths, optimization
   * settings, and build-specific configuration values.
   */
  properties: XpmLiquidSubstitutionsStrings = {}

  /**
   * The resolved dependencies after substitutions.
   *
   * @remarks
   * This object contains the final merged dependencies after inheritance
   * resolution and Liquid template substitution.
   *
   * Dependency resolution workflow:
   *
   * <ol>
   * <li>Start with empty object.</li>
   * <li>Merge <code>dependencies</code> from each inherited configuration
   *    in sequence
   *    (later overrides earlier).</li>
   * <li>Merge local <code>dependencies</code> from JSON definition.</li>
   * <li>Perform Liquid template substitution on the entire
   *    <code>dependencies</code>
   *    object with full configuration context (properties, matrix, etc.).</li>
   * </ol>
   *
   * This enables configuration-specific dependencies with dynamic version
   * ranges or package selection based on matrix parameters, platform
   * detection, or configuration properties.
   */
  dependencies: JsonDependencies = {}

  /**
   * The resolved development dependencies after substitutions.
   *
   * @remarks
   * This object contains the final merged development dependencies after
   * inheritance resolution and Liquid template substitution.
   *
   * Resolution workflow mirrors `dependencies`:
   *
   * <ol>
   * <li>Start with empty object.</li>
   * <li>Merge <code>devDependencies</code> from each inherited configuration
   *    in sequence
   *    (later overrides earlier).</li>
   * <li>Merge local <code>devDependencies</code> from JSON definition.</li>
   * <li>Perform Liquid template substitution on the entire
   *    <code>devDependencies</code>
   *    object with full configuration context.</li>
   * </ol>
   *
   * Typical use: Test frameworks, build tools, or debugging utilities
   * specific to certain configurations (e.g., debug builds might include
   * additional analysis tools).
   */
  devDependencies: JsonDependencies = {}

  /**
   * The JSON build configuration content from package metadata.
   *
   * @remarks
   * This holds the raw configuration definition as it appears in
   * `package.json`, before inheritance resolution and variable substitution.
   *
   * The definition is preserved to:
   *
   * <ol>
   * <li>Enable external modification (e.g., <code>xpm uninstall</code>
   *    updates this
   *    directly).</li>
   * <li>Support deferred template evaluation during
   *    <code>XpmBuildConfiguration.initialise()</code>.</li>
   * <li>Provide the source for inheritance when other configurations
   *    reference this one.</li>
   * <li>Allow re-evaluation with different variable contexts if needed.</li>
   * </ol>
   *
   * This immutable storage ensures configurations can be safely referenced
   * during inheritance resolution without side effects.
   */
  jsonBuildConfiguration: JsonBuildConfigurationContent

  /**
   * The variables used for substitution in this configuration.
   *
   * @remarks
   * This extended variable hierarchy combines the base collection variables
   * with configuration-specific context, enabling accurate template
   * evaluation.
   *
   * Extension hierarchy:
   *
   * <ol>
   * <li>Starts with parent collection's base variables (env, os, path,
   *    package).</li>
   * <li>Extended with <code>properties</code>: Merged from inheritance
   *    chain and local
   *    properties.</li>
   * <li>Extended with <code>matrix</code>: Parameter values for
   *    template-generated
   *    configurations.</li>
   * <li>Extended with <code>configuration</code>: The configuration
   *    object itself
   *    (name, dependencies, properties) accessible for self-reference.</li>
   * </ol>
   *
   * This complete context is used for all substitutions within the
   * configuration: properties, dependencies, devDependencies, and actions.
   */
  protected _substitutionsVariables: XpmLiquidSubstitutionsVariables

  /**
   * The matrix parameter values for template-generated configurations.
   *
   * @remarks
   * For template-generated configurations, this object contains the specific
   * matrix parameter values that produced this configuration instance from
   * the template.
   *
   * Usage pattern:
   *
   * <ol>
   * <li>Undefined for regular (non-template) configurations.</li>
   * <li>For template configurations, contains key-value pairs from the matrix
   *    combination (e.g.,
   *   <code>\{ arch: 'x64', optimize: 'speed' \}</code>).</li>
   * <li>Merged into substitution variables during initialisation, making
   *    values accessible via the <code>matrix</code> namespace throughout the
   *    configuration.</li>
   * <li>Used in configuration name substitution, property values,
   *    dependencies, and action commands.</li>
   * </ol>
   *
   * Example: A template `release-{{ matrix.arch }}` with matrix parameters
   * `{ arch: 'x64' }` becomes the concrete configuration `release-x64`.
   */
  protected readonly matrixParameters?: XpmLiquidSubstitutionsStrings

  /**
   * The actions associated with this build configuration.
   *
   * @remarks
   * This actions collection is created during configuration initialisation
   * and combines inherited actions with local action definitions.
   *
   * Action assembly workflow:
   *
   * <ol>
   * <li>Undefined until <code>XpmBuildConfiguration.initialise()</code> is
   *    called.</li>
   * <li>Collect actions from all inherited configurations in the inheritance
   *    chain.</li>
   * <li>Create new <code>XpmActions</code> collection with inherited
   *    actions map and local action definitions.</li>
   * <li>Actions inherit the configuration's substitution variables context,
   *    including properties and matrix parameters.</li>
   * </ol>
   *
   * Actions are accessible after configuration initialisation but remain
   * themselves uninitialised until retrieved and initialised individually,
   * maintaining the lazy evaluation pattern.
   */
  protected _actions: XpmActions | undefined

  /**
   * The resolved build folder relative path.
   *
   * @remarks
   * This path specifies where build outputs for this configuration should be
   * placed, computed during initialisation and added back to properties for
   * use in subsequent substitutions.
   *
   * Computation workflow:
   *
   * <ol>
   * <li>Undefined until <code>XpmBuildConfiguration.initialise()</code> is
   *    called.</li>
   * <li>Not computed for hidden configurations (optimization).</li>
   * <li>If <code>buildFolderRelativePath</code> property exists, perform Liquid
   *    substitution with full configuration context.</li>
   * <li>Otherwise, generate default path:
   *    <code>build/\{sanitized-config-name\}</code>.</li>
   * <li>Added to <code>properties.buildFolderRelativePath</code> for use
   *    in action
   *    commands and dependency references.</li>
   * </ol>
   *
   * The path is relative to the package root and used by build tools to
   * organize outputs from different configurations.
   */
  protected _buildFolderRelativePath?: string

  /**
   * Set of inherited configuration names for circular reference detection.
   *
   * @remarks
   * This set tracks the inheritance chain being processed to detect and
   * prevent circular inheritance references.
   *
   * Detection mechanism:
   *
   * <ol>
   * <li>Initially empty when configuration initialisation begins.</li>
   * <li>Each inherited configuration name is added before processing that
   *    configuration's inheritance.</li>
   * <li>If a configuration attempts to inherit from a name already in the
   *    set, a circular reference exists.</li>
   * <li>Circular references trigger <code>XpmInputError</code> with details
   * about    the problematic inheritance chain.</li>
   * </ol>
   *
   * Example: If config A inherits from B, B from C, and C from A, the
   * circular dependency is detected when C attempts to inherit from A.
   */
  protected _inheritedNamesSet: Set<string> = new Set<string>()

  /**
   * Flag indicating whether the configuration has been initialised.
   *
   * @remarks
   * This flag ensures idempotent initialization and prevents redundant
   * processing when {@link XpmBuildConfiguration.initialise} is called
   * multiple times.
   *
   * State transitions:
   *
   * <ol>
   * <li>Initially <code>false</code> after construction.</li>
   * <li>Set to <code>true</code> after successful inheritance resolution,
   *    property
   *    merging, dependency substitution, and action preparation.</li>
   * <li>Checked at the start of
   *    <code>XpmBuildConfiguration.initialise()</code> to return early if
   *    already initialised.</li>
   * </ol>
   *
   * This pattern is critical for inheritance processing, as configurations
   * may be initialised multiple times when referenced by multiple children,
   * but should only process their inheritance chain once.
   */
  protected _isInitialised = false

  /**
   * Indicates whether this configuration originates from a template.
   *
   * @remarks
   * This flag determines the substitution strategy during configuration
   * initialisation, with template configurations requiring more extensive
   * processing.
   *
   * Template vs regular configuration processing:
   *
   * <ol>
   * <li>Template configurations (<code>isTemplate === true</code>):
   *   <ul>
   *   <li>Entire JSON configuration is stringified and substituted.</li>
   *   <li>Matrix parameters available throughout all fields.</li>
   *   <li>More expensive but supports matrix references anywhere.</li>
   *   </ul>
   * </li>
   * <li>Regular configurations (<code>isTemplate === false</code>):
   *   <ul>
   *   <li>Only <code>inherits</code> field is substituted initially.</li>
   *   <li>Other fields processed selectively during inheritance
   *     resolution.</li>
   *   <li>More efficient for configurations without matrix parameters.</li>
   *   </ul>
   * </li>
   * </ol>
   *
   * Set to `true` when `templateBuildConfigurationName` is defined,
   * indicating the configuration was generated from a template expansion.
   */
  isTemplate: boolean

  // --------------------------------------------------------------------------
  // Constructor and async initialiser.

  /**
   * Constructs a build configuration instance.
   *
   * @param buildConfigurationName - The configuration name after substitution.
   * @param templateBuildConfigurationName - The template configuration name, if
   * derived from a template.
   * @param jsonBuildConfiguration - The JSON configuration definition.
   * @param parentBuildConfigurations - The parent configurations collection.
   * @param matrixParameters - Optional matrix parameter values for
   * template-generated configurations.
   *
   * @remarks
   * The constructor performs partial initialisation. Full initialisation
   * requires calling {@link XpmBuildConfiguration.initialise}.
   */
  constructor({
    buildConfigurationName,
    templateBuildConfigurationName,
    jsonBuildConfiguration,
    parentBuildConfigurations,
    matrixParameters,
  }: {
    buildConfigurationName: string
    templateBuildConfigurationName?: string
    jsonBuildConfiguration: JsonBuildConfigurationContent
    parentBuildConfigurations: XpmBuildConfigurations
    matrixParameters?: XpmLiquidSubstitutionsStrings
  }) {
    assert(buildConfigurationName, 'buildConfigurationName is required')
    assert(jsonBuildConfiguration, 'jsonBuildConfiguration is required')
    assert(parentBuildConfigurations, 'parentBuildConfigurations is required')

    const log = parentBuildConfigurations.log
    log.trace(`${XpmBuildConfiguration.name}(${buildConfigurationName})`)

    this.buildConfigurationName = buildConfigurationName
    this.jsonBuildConfiguration = jsonBuildConfiguration
    this.parentBuildConfigurations = parentBuildConfigurations
    if (matrixParameters !== undefined) {
      this.matrixParameters = matrixParameters
    }
    if (templateBuildConfigurationName !== undefined) {
      this.templateBuildConfigurationName = templateBuildConfigurationName
    }

    this._substitutionsVariables = {
      ...this.parentBuildConfigurations.substitutionsVariables,
    }

    this.isHidden = this.jsonBuildConfiguration.hidden ?? false

    this.isTemplate = this.templateBuildConfigurationName !== undefined

    // The rest of the initialisation is done in the async initialiser.
  }

  /**
   * Completes the async initialisation of the build configuration.
   *
   * @remarks
   * This method resolves inheritance, applies variable substitutions,
   * computes dependencies, and prepares actions.
   *
   * Initialisation workflow:
   *
   * <ol>
   * <li>For template configurations: Substitute matrix parameters throughout
   *    the entire JSON structure.</li>
   * <li>For non-template configurations: Substitute only the inherits
   * field.</li>
   * <li>Process inheritance chain recursively with circular reference
   *    detection.</li>
   * <li>Merge properties, dependencies, and devDependencies from inherited
   *    configurations (later overrides earlier).</li>
   * <li>Apply local properties and update substitution variables context.</li>
   * <li>For visible configurations: Compute build folder relative path.</li>
   * <li>Substitute Liquid templates in dependencies and devDependencies.</li>
   * <li>Create actions collection with inherited actions and local
   * actions.</li>
   * </ol>
   *
   * The substitution context includes package variables, configuration
   * properties, matrix parameters (for templates), and the configuration
   * object itself accessible via `configuration.name`, etc.
   *
   * @returns A promise that resolves to `true` if initialisation was performed,
   * or `false` if already initialised.
   *
   * @throws {@link XpmError}
   * If substitutions fail.
   *
   * @throws {@link XpmInputError}
   * If inheritance references are invalid or circular.
   */
  async initialise(): Promise<boolean> {
    const log = this.parentBuildConfigurations.log
    log.trace(
      `${XpmBuildConfiguration.name}.initialise()` +
        ` @${this.buildConfigurationName}`
    )

    if (this._isInitialised) {
      log.trace(
        `${XpmBuildConfiguration.name}.initialise()` +
          ` @${this.buildConfigurationName} again`
      )
      return false
    }

    log.trace(
      `${XpmBuildConfiguration.name}.initialise()` +
        ` @${this.buildConfigurationName}`
    )
    let localJsonBuildConfiguration: JsonBuildConfigurationContent

    if (this.isTemplate) {
      // For templates, perform substitutions on the entire build
      // configuration JSON, since there can be matrix references everywhere.
      const stringifiedJsonBuildConfiguration = JSON.stringify(
        this.jsonBuildConfiguration
      )
      if (
        stringifiedJsonBuildConfiguration.includes('{{') ||
        stringifiedJsonBuildConfiguration.includes('{%')
      ) {
        let substitutedJsonBuildConfiguration
        try {
          substitutedJsonBuildConfiguration = await performSubstitutions({
            log,
            engine: this.parentBuildConfigurations.engine,
            input: stringifiedJsonBuildConfiguration,
            substitutionsVariables: {
              ...this._substitutionsVariables,
              matrix: this.matrixParameters ?? {},
              configuration: {
                ...this.jsonBuildConfiguration,
                name: this.buildConfigurationName,
              },
            },
          })
        } catch (error) {
          const message =
            getErrorMessage(error) +
            ` in buildConfiguration "${this.buildConfigurationName}"`
          throw new XpmError(message)
        }

        localJsonBuildConfiguration = JSON.parse(
          substitutedJsonBuildConfiguration
        ) as JsonDependencies
      } else {
        localJsonBuildConfiguration = this.jsonBuildConfiguration
      }
    } else {
      // For non-templates, first perform substitutions on 'inherits' only.
      // The rest of the entries are collected as-is and processed later.
      const stringifiedJsonInherits = JSON.stringify(
        this.jsonBuildConfiguration.inherits ?? {}
      )
      if (
        stringifiedJsonInherits.includes('{{') ||
        stringifiedJsonInherits.includes('{%')
      ) {
        let substitutedJsonInherits
        try {
          substitutedJsonInherits = await performSubstitutions({
            log,
            engine: this.parentBuildConfigurations.engine,
            input: stringifiedJsonInherits,
            substitutionsVariables: {
              ...this._substitutionsVariables,
              configuration: {
                ...this.jsonBuildConfiguration,
                name: this.buildConfigurationName,
              },
            },
          })
        } catch (error) {
          const message =
            getErrorMessage(error) +
            ` in buildConfiguration "${this.buildConfigurationName}" inherits`
          throw new XpmError(message)
        }

        localJsonBuildConfiguration = {
          ...this.jsonBuildConfiguration,
          inherits: JSON.parse(
            substitutedJsonInherits
          ) as JsonBuildConfigurationInherits,
        }
      } else {
        localJsonBuildConfiguration = this.jsonBuildConfiguration
      }
    }

    // Process both the new 'inherits' and the deprecated 'inherit'.
    let jsonInherits: string[] = []
    if (isString(localJsonBuildConfiguration.inherits)) {
      jsonInherits = [localJsonBuildConfiguration.inherits]
    } else if (Array.isArray(localJsonBuildConfiguration.inherits)) {
      jsonInherits = localJsonBuildConfiguration.inherits as string[]
    } else if (isString(localJsonBuildConfiguration.inherit)) {
      jsonInherits = [localJsonBuildConfiguration.inherit]
    } else if (Array.isArray(localJsonBuildConfiguration.inherit)) {
      jsonInherits = localJsonBuildConfiguration.inherit as string[]
    }
    // console.log(jsonInherits)

    let inheritsNames = jsonInherits
    if (jsonInherits.length > 0) {
      const joinedInherits = jsonInherits.join(os.EOL)
      inheritsNames = joinedInherits.split(os.EOL)
    }
    this.inheritsNames = inheritsNames
    // console.log(this.inheritsNames)
    log.trace(this.buildConfigurationName, 'inherits from', this.inheritsNames)

    const inheritedActionsMap: Map<string, XpmAction> = new Map<
      string,
      XpmAction
    >()

    // Add inherited configuration properties.
    // TODO: detect circular references.
    for (const inheritedBuildConfigurationName of inheritsNames) {
      if (
        this.parentBuildConfigurations.hasJson(inheritedBuildConfigurationName)
      ) {
        if (inheritedBuildConfigurationName.trim() === '') {
          continue
        }

        if (this._inheritedNamesSet.has(inheritedBuildConfigurationName)) {
          throw new XpmInputError(
            'buildConfiguration' +
              ` '${this.buildConfigurationName}'` +
              ' inherits from circular reference' +
              ` '${inheritedBuildConfigurationName}'`
          )
        }
        this._inheritedNamesSet.add(inheritedBuildConfigurationName)

        const inheritedBuildConfiguration = this.parentBuildConfigurations.get(
          inheritedBuildConfigurationName
        )

        await inheritedBuildConfiguration.initialise()

        // Merge properties, dependencies, devDependencies.
        // Later ones override earlier ones.
        this.properties = {
          ...this.properties,
          ...inheritedBuildConfiguration.properties,
        }

        this.dependencies = {
          ...this.dependencies,
          ...inheritedBuildConfiguration.dependencies,
        }

        this.devDependencies = {
          ...this.devDependencies,
          ...inheritedBuildConfiguration.devDependencies,
        }

        await inheritedBuildConfiguration.actions.initialise()
        for (const actionName of inheritedBuildConfiguration.actions.names) {
          const action = inheritedBuildConfiguration.actions.get(actionName)
          inheritedActionsMap.set(actionName, action)
        }
      } else {
        throw new XpmInputError(
          'buildConfiguration' +
            ` '${this.buildConfigurationName}'` +
            ' inherits from missing' +
            ` '${inheritedBuildConfigurationName}'`
        )
      }
    }

    this.properties = {
      ...this.properties,
      ...localJsonBuildConfiguration.properties,
    }

    assert(this.buildConfigurationName, 'buildConfigurationName missing')
    this._substitutionsVariables = {
      ...this.parentBuildConfigurations.substitutionsVariables,
      properties: {
        ...this._substitutionsVariables.properties,
        ...this.properties,
      },
      matrix: this.matrixParameters ?? {},
      configuration: {
        ...localJsonBuildConfiguration,
        name: this.buildConfigurationName,
      },
    }

    if (!this.isHidden) {
      this._buildFolderRelativePath = await this._getBuildFolderRelativePath()

      // Add the buildFolderRelativePath property.
      // Note: the async initialiser was needed due to this async operation.
      const properties = this._substitutionsVariables.properties
      properties.buildFolderRelativePath = this._buildFolderRelativePath
    }

    this.dependencies = {
      ...this.dependencies,
      ...localJsonBuildConfiguration.dependencies,
    }

    this.devDependencies = {
      ...this.devDependencies,
      ...localJsonBuildConfiguration.devDependencies,
    }

    const unsubstitutedDependencies = {
      dependencies: this.dependencies,
      devDependencies: this.devDependencies,
    }

    const stringifiedDependencies = JSON.stringify(unsubstitutedDependencies)

    if (
      stringifiedDependencies.includes('{{') ||
      stringifiedDependencies.includes('{%')
    ) {
      let substitutedDependencies
      try {
        substitutedDependencies = await performSubstitutions({
          log,
          engine: this.parentBuildConfigurations.engine,
          input: stringifiedDependencies,
          substitutionsVariables: this._substitutionsVariables,
        })
      } catch (error) {
        const message =
          getErrorMessage(error) +
          ` in buildConfiguration "${this.buildConfigurationName}" dependencies`
        throw new XpmError(message)
      }
      const parsedDependencies = JSON.parse(
        substitutedDependencies
      ) as JsonBuildConfigurationContent

      this.dependencies = parsedDependencies.dependencies ?? {}
      this.devDependencies = parsedDependencies.devDependencies ?? {}
    }

    this._actions = new XpmActions({
      log: this.parentBuildConfigurations.log,
      engine: this.parentBuildConfigurations.engine,
      substitutionsVariables: this._substitutionsVariables,
      inheritedActionsMap,
      jsonActions: localJsonBuildConfiguration.actions,
      buildConfiguration: this,
    })

    log.trace(
      `${XpmBuildConfiguration.name}.initialise() `,
      `@{this.buildConfigurationName}`
    )

    if (!this.isHidden) {
      log.trace(
        this.buildConfigurationName,
        'buildFolderRelativePath =>',
        this._buildFolderRelativePath
      )
    }
    log.trace(this.buildConfigurationName, 'properties => ', this.properties)
    log.trace(
      this.buildConfigurationName,
      'dependencies => ',
      this.dependencies
    )
    log.trace(
      this.buildConfigurationName,
      'devDependencies => ',
      this.devDependencies
    )
    log.trace(this.buildConfigurationName, 'actions => ', this._actions.names)

    this._isInitialised = true
    return true
  }

  // --------------------------------------------------------------------------
  // Public methods.

  /**
   * Retrieves the actions collection for this build configuration.
   *
   * @returns The actions collection.
   *
   * @throws `AssertionError`
   * If the configuration has not been initialised.
   */
  get actions(): XpmActions {
    assert(this._actions !== undefined, 'XpmActions not initialised')
    return this._actions
  }

  /**
   * Retrieves the build folder relative path for this configuration.
   *
   * @returns The build folder relative path.
   *
   * @throws `AssertionError`
   * If the configuration has not been initialised.
   */
  get buildFolderRelativePath(): string {
    assert(
      this._buildFolderRelativePath !== undefined,
      'XpmActions not initialised'
    )
    return this._buildFolderRelativePath
  }

  // --------------------------------------------------------------------------
  // Private Methods.

  /**
   * Computes the build folder relative path for this configuration.
   *
   * @remarks
   * This method resolves the build folder relative path property when
   * provided and uses a default value based on the configuration name
   * otherwise.
   *
   * Resolution strategy:
   *
   * <ol>
   * <li>Check if buildFolderRelativePath property exists in configuration
   *    properties.</li>
   * <li>If present and non-empty, perform Liquid substitutions with the
   *    full configuration context.</li>
   * <li>If substitution fails or property is empty/missing, generate a
   *    default path: `build/{filtered-configuration-name}` where the
   *    configuration name is sanitized for filesystem compatibility.</li>
   * </ol>
   *
   * The computed path is added back to the properties as
   * `buildFolderRelativePath` for use in subsequent substitutions.
   *
   * @returns A promise that resolves to the build folder relative path.
   */
  protected async _getBuildFolderRelativePath(): Promise<string> {
    const log = this.parentBuildConfigurations.log

    let folderPath: string
    if (
      buildFolderRelativePathPropertyName in
      this._substitutionsVariables.properties
    ) {
      folderPath = this._substitutionsVariables.properties[
        buildFolderRelativePathPropertyName
      ] as string
      if (folderPath !== '') {
        try {
          // log.trace(this.#substitutionsVariables.configuration)
          const substitutedFolderPath = await performSubstitutions({
            log,
            engine: this.parentBuildConfigurations.engine,
            input: folderPath,
            substitutionsVariables: this._substitutionsVariables,
          })
          return substitutedFolderPath
        } catch (error) {
          log.trace(error)
        }
      }
    }

    // Provide a default value, based on the name.
    const defaultFolderPath = path.join(
      'build',
      filterPath(this.buildConfigurationName)
    )
    return defaultFolderPath
  }
}

// ----------------------------------------------------------------------------
