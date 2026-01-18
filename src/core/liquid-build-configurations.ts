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
} from './substitutions-variables.js'
import { buildFolderRelativePathPropertyName } from './liquid-package.js'
import {
  JsonBuildConfiguration,
  JsonBuildConfigurationContent,
  JsonBuildConfigurations,
  JsonBuildConfigurationInherits,
  JsonBuildConfigurationTemplate,
  JsonDependencies,
} from './types.js'
import { performSubstitutions } from '../functions/perform-substitutions.js'
import { XpmLiquidAction, XpmLiquidActions } from './liquid-actions.js'
import {
  getErrorMessage,
  isJsonArray,
  isJsonObject,
  isString,
} from '../functions/utils.js'
import { filterPath } from '../functions/utils.js'
import { XpmError, XpmInputError } from './errors.js'

// ----------------------------------------------------------------------------

// A collection of build configurations.
export class XpmLiquidBuildConfigurations {
  // --------------------------------------------------------------------------
  // Members.

  readonly log: Logger
  readonly engine: XpmLiquidEngine
  readonly substitutionsVariables: XpmLiquidSubstitutionsVariables
  readonly jsonBuildConfigurations: JsonBuildConfigurations

  // Known only after initialisation.
  // Possibly empty if there are no build configurations.
  readonly #buildConfigurationsMap: Map<
    string,
    XpmLiquidBuildConfiguration | undefined
  > = new Map<string, XpmLiquidBuildConfiguration | undefined>()

  // Known only after initialisation.
  readonly #jsonBuildConfigurationsNamesMap: Map<string, string> = new Map<
    string,
    string
  >()

  readonly #buildComfigurationsNamesSet: Set<string> = new Set<string>()

  #isInitialised = false

  // --------------------------------------------------------------------------
  // Constructor and async initialiser.

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
    assert(log)
    assert(engine)
    assert(substitutionsVariables)

    log.trace(`${XpmLiquidBuildConfigurations.name}()`)

    this.log = log
    this.engine = engine
    this.substitutionsVariables = substitutionsVariables
    this.jsonBuildConfigurations = jsonBuildConfigurations ?? {}

    // log.trace('substitutionsVariables => ', this.substitutionsVariables)
  }

  async initialise(): Promise<boolean> {
    const log = this.log

    if (this.#isInitialised) {
      log.trace(`${XpmLiquidBuildConfigurations.name}.initialise() again`)
      return false
    }

    log.trace(`${XpmLiquidBuildConfigurations.name}.initialise()`)

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
            await this.#expandTemplateBuildConfigurations({
              buildConfigurationName,
              jsonBuildConfigurationTemplate,
            })
          for (const [
            expandedBuildConfigurationName,
            expandedBuildConfiguration,
          ] of expandedBuildConfigurationsMap) {
            if (
              this.#buildComfigurationsNamesSet.has(
                expandedBuildConfigurationName
              )
            ) {
              throw new XpmError(
                `duplicate build configuration name ` +
                  `"${expandedBuildConfigurationName}" ` +
                  `generated from template.`
              )
            } else {
              this.#buildConfigurationsMap.set(
                expandedBuildConfigurationName,
                expandedBuildConfiguration
              )
              this.#jsonBuildConfigurationsNamesMap.set(
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
        if (this.#buildComfigurationsNamesSet.has(buildConfigurationName)) {
          throw new XpmError(
            `duplicate build configuration name ` +
              `"${buildConfigurationName}" ` +
              `possibly already generated from template.`
          )
        } else {
          this.#buildConfigurationsMap.set(buildConfigurationName, undefined)
          this.#jsonBuildConfigurationsNamesMap.set(
            buildConfigurationName,
            buildConfigurationName
          )
        }
      }
    }

    log.trace(
      `${XpmLiquidBuildConfigurations.name}.initialise() =>`,
      Array.from(this.#buildConfigurationsMap.keys())
    )

    this.#isInitialised = true
    return true
  }

  // --------------------------------------------------------------------------
  // Public methods.

  empty(): boolean {
    return this.#buildConfigurationsMap.size === 0
  }

  names(): string[] {
    const buildConfigurationsNames = Array.from(
      this.#buildConfigurationsMap.keys()
    )

    this.log.trace(
      `${XpmLiquidBuildConfigurations.name}.names() =>`,
      buildConfigurationsNames
    )
    return buildConfigurationsNames
  }

  getJsonName(buildConfigurationName: string): string {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.#jsonBuildConfigurationsNamesMap.get(buildConfigurationName)!
  }

  hasJson(buildConfigurationName: string): boolean {
    return this.#jsonBuildConfigurationsNamesMap.has(buildConfigurationName)
  }

  getJson(buildConfigurationName: string): JsonBuildConfiguration {
    return this.jsonBuildConfigurations[
      this.getJsonName(buildConfigurationName)
    ]
  }

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

  has(buildConfigurationName: string): boolean {
    return this.#buildConfigurationsMap.has(buildConfigurationName)
  }

  get(buildConfigurationName: string): XpmLiquidBuildConfiguration {
    const log = this.log
    log.trace(
      `${XpmLiquidBuildConfigurations.name}.get(${buildConfigurationName})`
    )

    let buildConfiguration = this.#buildConfigurationsMap.get(
      buildConfigurationName
    )
    if (buildConfiguration === undefined) {
      const jsonBuildConfigurationName: string =
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.#jsonBuildConfigurationsNamesMap.get(buildConfigurationName)!

      const jsonBuildConfiguration: JsonBuildConfigurationContent = (this
        .jsonBuildConfigurations[jsonBuildConfigurationName] ??
        {}) as JsonBuildConfigurationContent

      buildConfiguration = new XpmLiquidBuildConfiguration({
        buildConfigurationName,
        jsonBuildConfiguration,
        parentBuildConfigurations: this,
      })
      this.#buildConfigurationsMap.set(
        buildConfigurationName,
        buildConfiguration
      )
    }

    // await buildConfiguration.initialise()
    return buildConfiguration
  }

  // --------------------------------------------------------------------------
  // Private methods.

  // Template expansion.
  async #expandTemplateBuildConfigurations({
    buildConfigurationName,
    jsonBuildConfigurationTemplate,
  }: {
    buildConfigurationName: string
    jsonBuildConfigurationTemplate: JsonBuildConfigurationTemplate
  }): Promise<Map<string, XpmLiquidBuildConfiguration>> {
    const log = this.log
    log.trace(
      `${XpmLiquidBuildConfigurations.name}.` +
        `#expandTemplateBuildConfigurations(${buildConfigurationName})`
    )

    const newBuildConfigurationsMap = new Map<
      string,
      XpmLiquidBuildConfiguration
    >()

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

      const newBuildConfiguration = new XpmLiquidBuildConfiguration({
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
        `${XpmLiquidBuildConfigurations.name}.` +
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

// ----------------------------------------------------------------------------

// An individual build configuration.
export class XpmLiquidBuildConfiguration {
  // --------------------------------------------------------------------------
  // Members.

  // The name after performing the substitutions.
  readonly buildConfigurationName: string
  readonly templateBuildConfigurationName?: string
  readonly parentBuildConfigurations: XpmLiquidBuildConfigurations

  inheritsNames: string[] = []

  readonly hidden: boolean
  properties: XpmLiquidSubstitutionsStrings = {}

  // After substitutions.
  dependencies: JsonDependencies = {}
  devDependencies: JsonDependencies = {}

  // Points to the actual (un-substituted) buildConfiguration in package.json.
  // Modified by xpm uninstall.
  jsonBuildConfiguration: JsonBuildConfigurationContent

  #substitutionsVariables: XpmLiquidSubstitutionsVariables

  // For templates, the actual values.
  readonly #matrixParameters?: XpmLiquidSubstitutionsStrings

  #actions: XpmLiquidActions | undefined

  #buildFolderRelativePath?: string

  #inheritedNamesSet: Set<string> = new Set<string>()

  #isInitialised = false
  isTemplate: boolean

  // --------------------------------------------------------------------------
  // Constructor and async initialiser.

  constructor({
    buildConfigurationName, // The Liquid-processed name.
    templateBuildConfigurationName,
    jsonBuildConfiguration,
    parentBuildConfigurations,
    matrixParameters,
  }: {
    buildConfigurationName: string
    templateBuildConfigurationName?: string
    jsonBuildConfiguration: JsonBuildConfigurationContent
    parentBuildConfigurations: XpmLiquidBuildConfigurations
    matrixParameters?: XpmLiquidSubstitutionsStrings
  }) {
    assert(buildConfigurationName)
    assert(jsonBuildConfiguration)
    assert(parentBuildConfigurations)

    const log = parentBuildConfigurations.log
    log.trace(`${XpmLiquidBuildConfiguration.name}(${buildConfigurationName})`)

    this.buildConfigurationName = buildConfigurationName
    this.jsonBuildConfiguration = jsonBuildConfiguration
    this.parentBuildConfigurations = parentBuildConfigurations
    if (matrixParameters !== undefined) {
      this.#matrixParameters = matrixParameters
    }
    if (templateBuildConfigurationName !== undefined) {
      this.templateBuildConfigurationName = templateBuildConfigurationName
    }

    this.#substitutionsVariables = {
      ...this.parentBuildConfigurations.substitutionsVariables,
    }

    this.hidden = this.jsonBuildConfiguration.hidden ?? false

    this.isTemplate = this.templateBuildConfigurationName !== undefined

    // The rest of the initialisation is done in the async initialiser.
  }

  async initialise(): Promise<boolean> {
    const log = this.parentBuildConfigurations.log
    log.trace(
      `${XpmLiquidBuildConfiguration.name}.initialise()` +
        ` @${this.buildConfigurationName}`
    )

    if (this.#isInitialised) {
      log.trace(
        `${XpmLiquidBuildConfiguration.name}.initialise()` +
          ` @${this.buildConfigurationName} again`
      )
      return false
    }

    log.trace(
      `${XpmLiquidBuildConfiguration.name}.initialise()` +
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
              ...this.#substitutionsVariables,
              matrix: this.#matrixParameters ?? {},
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
              ...this.#substitutionsVariables,
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

    const inheritedActionsMap: Map<string, XpmLiquidAction> = new Map<
      string,
      XpmLiquidAction
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

        if (this.#inheritedNamesSet.has(inheritedBuildConfigurationName)) {
          throw new XpmInputError(
            'buildConfiguration' +
              ` '${this.buildConfigurationName}'` +
              ' inherits from circular reference' +
              ` '${inheritedBuildConfigurationName}'`
          )
        }
        this.#inheritedNamesSet.add(inheritedBuildConfigurationName)

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
        for (const actionName of inheritedBuildConfiguration.actions.names()) {
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
    this.#substitutionsVariables = {
      ...this.parentBuildConfigurations.substitutionsVariables,
      properties: {
        ...this.#substitutionsVariables.properties,
        ...this.properties,
      },
      matrix: this.#matrixParameters ?? {},
      configuration: {
        ...localJsonBuildConfiguration,
        name: this.buildConfigurationName,
      },
    }

    if (!this.hidden) {
      this.#buildFolderRelativePath = await this.#getBuildFolderRelativePath()

      // Add the buildFolderRelativePath property.
      // Note: the async initialiser was needed due to this async operation.
      const properties = this.#substitutionsVariables.properties
      properties.buildFolderRelativePath = this.#buildFolderRelativePath
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
          substitutionsVariables: this.#substitutionsVariables,
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

    this.#actions = new XpmLiquidActions({
      log: this.parentBuildConfigurations.log,
      engine: this.parentBuildConfigurations.engine,
      substitutionsVariables: this.#substitutionsVariables,
      inheritedActionsMap,
      jsonActions: localJsonBuildConfiguration.actions,
      buildConfiguration: this,
    })

    log.trace(
      `${XpmLiquidBuildConfiguration.name}.initialise() `,
      `@{this.buildConfigurationName}`
    )

    if (!this.hidden) {
      log.trace(
        this.buildConfigurationName,
        'buildFolderRelativePath =>',
        this.#buildFolderRelativePath
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
    log.trace(this.buildConfigurationName, 'actions => ', this.#actions.names())

    this.#isInitialised = true
    return true
  }

  // --------------------------------------------------------------------------
  // Public methods.

  get actions(): XpmLiquidActions {
    assert(this.#actions !== undefined)
    return this.#actions
  }

  get buildFolderRelativePath(): string {
    assert(this.#buildFolderRelativePath !== undefined)
    return this.#buildFolderRelativePath
  }

  // --------------------------------------------------------------------------
  // Private Methods.

  async #getBuildFolderRelativePath(): Promise<string> {
    const log = this.parentBuildConfigurations.log

    let folderPath: string
    if (
      buildFolderRelativePathPropertyName in
      this.#substitutionsVariables.properties
    ) {
      folderPath = this.#substitutionsVariables.properties[
        buildFolderRelativePathPropertyName
      ] as string
      if (folderPath !== '') {
        try {
          // log.trace(this.#substitutionsVariables.configuration)
          const substitutedFolderPath = await performSubstitutions({
            log,
            engine: this.parentBuildConfigurations.engine,
            input: folderPath,
            substitutionsVariables: this.#substitutionsVariables,
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
