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
  JsonBuildConfigurationTemplate,
  JsonDependencies,
} from './types.js'
import { performSubstitutions } from './functions/perform-substitutions.js'
import { XpmLiquidAction, XpmLiquidActions } from './liquid-actions.js'
import { isJsonArray, isJsonObject, isString } from './functions/utils.js'
import { filterPath } from './functions/utils.js'
import { XpmError } from './errors.js'

// ----------------------------------------------------------------------------

// A collection of build configurations.
export class XpmLiquidBuildConfigurations {
  // --------------------------------------------------------------------------
  // Members.

  readonly log: Logger
  readonly engine: XpmLiquidEngine
  readonly substitutionsVariables: XpmLiquidSubstitutionsVariables
  readonly jsonBuildConfigurations: JsonBuildConfigurations

  readonly #buildConfigurationsMap: Map<
    string,
    XpmLiquidBuildConfiguration | undefined
  >
  readonly #jsonBuildConfigurationsNamesMap: Map<string, string>

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

    // Possibly empty if there are no build configurations.
    this.#buildConfigurationsMap = new Map<
      string,
      XpmLiquidBuildConfiguration | undefined
    >()
    this.#jsonBuildConfigurationsNamesMap = new Map<string, string>()
    // log.trace('substitutionsVariables => ', this.substitutionsVariables)
  }

  async initialise(): Promise<boolean> {
    if (this.#isInitialised) {
      return false
    }

    for (const buildConfigurationName of Object.keys(
      this.jsonBuildConfigurations
    )) {
      if (buildConfigurationName.includes('{{')) {
        // Expand templates and generate multiple build configurations.
        try {
          const expandedBuildConfigurationsMap =
            await this.expandTemplateBuildConfigurations({
              buildConfigurationName,
              jsonBuildConfigurationTemplate: this.jsonBuildConfigurations[
                buildConfigurationName
              ] as JsonBuildConfigurationTemplate,
            })
          for (const [
            expandedBuildConfigurationName,
            expandedBuildConfiguration,
          ] of expandedBuildConfigurationsMap) {
            this.#buildConfigurationsMap.set(
              expandedBuildConfigurationName,
              expandedBuildConfiguration
            )
            this.#jsonBuildConfigurationsNamesMap.set(
              expandedBuildConfigurationName,
              buildConfigurationName
            )
          }
        } catch (error) {
          if (error instanceof Error) {
            this.log.error(error.message)
          }
        }
      } else {
        this.#buildConfigurationsMap.set(buildConfigurationName, undefined)
        this.#jsonBuildConfigurationsNamesMap.set(
          buildConfigurationName,
          buildConfigurationName
        )
      }
    }

    this.log.trace(
      `${XpmLiquidBuildConfigurations.name}.initialise() =>`,
      Array.from(this.#buildConfigurationsMap.keys())
    )

    this.#isInitialised = true
    return true
  }

  // --------------------------------------------------------------------------
  // Methods.

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

  async get(
    buildConfigurationName: string
  ): Promise<XpmLiquidBuildConfiguration> {
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
        // jsonBuildConfigurationName,
        jsonBuildConfiguration,
        parentBuildConfigurations: this,
      })
      await buildConfiguration.initialise()
      this.#buildConfigurationsMap.set(
        buildConfigurationName,
        buildConfiguration
      )
    }

    return buildConfiguration
  }

  getJsonName(buildConfigurationName: string): string {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.#jsonBuildConfigurationsNamesMap.get(buildConfigurationName)!
  }

  async expandTemplateBuildConfigurations({
    buildConfigurationName,
    jsonBuildConfigurationTemplate,
  }: {
    buildConfigurationName: string
    jsonBuildConfigurationTemplate: JsonBuildConfigurationTemplate
  }): Promise<Map<string, XpmLiquidBuildConfiguration>> {
    const newBuildConfigurationsMap = new Map<
      string,
      XpmLiquidBuildConfiguration
    >()

    if (!isJsonObject(jsonBuildConfigurationTemplate.matrix)) {
      throw new XpmError(
        `buildConfiguration '${buildConfigurationName}' ` +
          `matrix is not an object`
      )
    }
    if (
      !isString(jsonBuildConfigurationTemplate.template) &&
      !isJsonArray(jsonBuildConfigurationTemplate.template)
    ) {
      throw new XpmError(
        `buildConfiguration '${buildConfigurationName}' ` +
          `template is not a string or array`
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
          `buildConfiguration '${buildConfigurationName}' ` +
            `matrix.${matrixKey} is not an array`
        )
      }
      for (const matrixValue of matrixValueArray) {
        if (!isString(matrixValue)) {
          throw new XpmError(
            `buildConfiguration '${buildConfigurationName}' ` +
              `matrix.${matrixKey} value is not a string`
          )
        }
      }
      matrixKeys.push(matrixKey)
      const stringValue = matrixValueArray.join(os.EOL)
      if (stringValue.includes('{{') || stringValue.includes('{%')) {
        const substitutedValue = await performSubstitutions({
          input: stringValue,
          engine: this.engine,
          substitutionsVariables: {
            ...this.substitutionsVariables,
          },
          log: this.log,
        })
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

      const substitutedBuildConfigurationName = await performSubstitutions({
        input: buildConfigurationName,
        engine: this.engine,
        substitutionsVariables: {
          ...this.substitutionsVariables,
          matrix: combination,
        },
        log: this.log,
      })
      // console.log(substitutedActionName)

      const newBuildConfiguration = new XpmLiquidBuildConfiguration({
        buildConfigurationName: substitutedBuildConfigurationName,
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

  readonly hidden: boolean
  properties: XpmLiquidSubstitutionsStrings = {}

  jsonDependencies: JsonDependencies = {}
  jsonDevDependencies: JsonDependencies = {}

  // Points to the actual (un-substituted) buildConfiguration in package.json.
  readonly #jsonBuildConfiguration: JsonBuildConfigurationContent

  #substitutionsVariables: XpmLiquidSubstitutionsVariables

  // For templates, the actual values.
  readonly #matrixParameters?: XpmLiquidSubstitutionsStrings

  // The name after performing the substitutions.
  readonly #buildConfigurationName: string

  readonly #parentBuildConfigurations: XpmLiquidBuildConfigurations

  #actions: XpmLiquidActions | undefined

  #buildFolderRelativePath?: string

  #isInitialised = false

  // --------------------------------------------------------------------------
  // Constructor and async initialiser.

  constructor({
    buildConfigurationName, // The Liquid-processed name.
    // jsonBuildConfigurationName, // The raw name from package.json.
    jsonBuildConfiguration,
    parentBuildConfigurations,
    matrixParameters,
  }: {
    buildConfigurationName: string
    // jsonBuildConfigurationName: string
    jsonBuildConfiguration: JsonBuildConfigurationContent
    parentBuildConfigurations: XpmLiquidBuildConfigurations
    matrixParameters?: XpmLiquidSubstitutionsStrings
  }) {
    assert(buildConfigurationName)
    // assert(jsonBuildConfigurationName)
    assert(jsonBuildConfiguration)
    assert(parentBuildConfigurations)

    parentBuildConfigurations.log.trace(
      `${XpmLiquidBuildConfiguration.name}(${buildConfigurationName})`
    )

    this.#buildConfigurationName = buildConfigurationName
    // this.jsonBuildConfigurationName = jsonBuildConfigurationName
    this.#jsonBuildConfiguration = jsonBuildConfiguration
    this.#parentBuildConfigurations = parentBuildConfigurations
    if (matrixParameters !== undefined) {
      this.#matrixParameters = matrixParameters
    }

    this.#substitutionsVariables = {
      ...this.#parentBuildConfigurations.substitutionsVariables,
    }

    this.hidden = this.#jsonBuildConfiguration.hidden ?? false

    // The rest of the initialisation is done in the async initialiser.
  }

  async initialise(): Promise<boolean> {
    if (this.#isInitialised) {
      return false
    }

    const log = this.#parentBuildConfigurations.log

    const stringifiedJsonBuildConfiguration = JSON.stringify(
      this.#jsonBuildConfiguration
    )

    let jsonSubstitutedBuildConfiguration: JsonBuildConfigurationContent

    if (
      stringifiedJsonBuildConfiguration.includes('{{') ||
      stringifiedJsonBuildConfiguration.includes('{%')
    ) {
      const substitutedBuildConfiguration = await performSubstitutions({
        input: stringifiedJsonBuildConfiguration,
        engine: this.#parentBuildConfigurations.engine,
        substitutionsVariables: {
          ...this.#substitutionsVariables,
          matrix: this.#matrixParameters ?? {},
        },
        log,
      })
      jsonSubstitutedBuildConfiguration = JSON.parse(
        substitutedBuildConfiguration
      ) as JsonBuildConfigurationContent
    } else {
      jsonSubstitutedBuildConfiguration = this.#jsonBuildConfiguration
    }

    // Process both the new 'inherits' and the deprecated 'inherit'.
    let jsonInherits: string[] = []
    if (isString(jsonSubstitutedBuildConfiguration.inherits)) {
      jsonInherits = [jsonSubstitutedBuildConfiguration.inherits]
    } else if (Array.isArray(jsonSubstitutedBuildConfiguration.inherits)) {
      jsonInherits = jsonSubstitutedBuildConfiguration.inherits as string[]
    } else if (isString(jsonSubstitutedBuildConfiguration.inherit)) {
      jsonInherits = [jsonSubstitutedBuildConfiguration.inherit]
    } else if (Array.isArray(jsonSubstitutedBuildConfiguration.inherit)) {
      jsonInherits = jsonSubstitutedBuildConfiguration.inherit as string[]
    }

    const inheritedActionsMap: Map<string, XpmLiquidAction> = new Map<
      string,
      XpmLiquidAction
    >()

    // Add inherited configuration properties.
    // TODO: detect circular references.
    for (const inheritedBuildConfigurationName of jsonInherits) {
      if (
        this.#parentBuildConfigurations.hasJson(inheritedBuildConfigurationName)
      ) {
        const inheritedBuildConfiguration =
          await this.#parentBuildConfigurations.get(
            inheritedBuildConfigurationName
          )

        this.properties = {
          ...this.properties,
          ...inheritedBuildConfiguration.properties,
        }

        this.jsonDependencies = {
          ...this.jsonDependencies,
          ...inheritedBuildConfiguration.jsonDependencies,
        }
        this.jsonDevDependencies = {
          ...this.jsonDevDependencies,
          ...inheritedBuildConfiguration.jsonDevDependencies,
        }

        await inheritedBuildConfiguration.actions.initialise()
        for (const actionName of inheritedBuildConfiguration.actions.names()) {
          const action = inheritedBuildConfiguration.actions.get(actionName)
          inheritedActionsMap.set(actionName, action)
        }
      } else {
        log.warn(
          'buildConfiguration',
          this.#buildConfigurationName,
          'inherits from missing',
          inheritedBuildConfigurationName,
          '(ignored)'
        )
      }
    }

    this.properties = {
      ...this.properties,
      ...jsonSubstitutedBuildConfiguration.properties,
    }

    this.jsonDependencies = {
      ...this.jsonDependencies,
      ...jsonSubstitutedBuildConfiguration.dependencies,
    }
    this.jsonDevDependencies = {
      ...this.jsonDevDependencies,
      ...jsonSubstitutedBuildConfiguration.devDependencies,
    }

    this.#substitutionsVariables = {
      ...this.#parentBuildConfigurations.substitutionsVariables,
      properties: {
        ...this.#substitutionsVariables.properties,
        ...this.properties,
      },
      configuration: {
        ...jsonSubstitutedBuildConfiguration,
        name: this.#buildConfigurationName,
      },
    }

    // Add the buildFolderRelativePath property.
    // Note: the async initialiser was needed due to this async operation.
    const properties = this.#substitutionsVariables.properties
    properties.buildFolderRelativePath = await this.getBuildFolderRelativePath()

    this.#actions = new XpmLiquidActions({
      log: this.#parentBuildConfigurations.log,
      engine: this.#parentBuildConfigurations.engine,
      substitutionsVariables: {
        ...this.#substitutionsVariables,
        matrix: this.#matrixParameters ?? {},
      },
      inheritedActionsMap,
      jsonActions: this.#jsonBuildConfiguration.actions,
    })
    // Note: this must be done manually by the application.
    // await this.#actions.initialise()

    log.trace(
      `${XpmLiquidBuildConfiguration.name}.initialise() =>`,
      this.#buildConfigurationName
    )
    log.trace('properties => ', this.properties)
    log.trace('dependencies => ', this.jsonDependencies)
    log.trace('devDependencies => ', this.jsonDevDependencies)
    // log.trace('substitutionsVariables => ', this.substitutionsVariables)

    this.#isInitialised = true
    return true
  }

  // --------------------------------------------------------------------------
  // Methods.

  get actions(): XpmLiquidActions {
    assert(this.#actions !== undefined)
    return this.#actions
  }

  async getBuildFolderRelativePath(): Promise<string> {
    this.#buildFolderRelativePath ??= await this.#getBuildFolderRelativePath()
    return this.#buildFolderRelativePath
  }

  async #getBuildFolderRelativePath(): Promise<string> {
    const log = this.#parentBuildConfigurations.log

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
          return await performSubstitutions({
            log,
            engine: this.#parentBuildConfigurations.engine,
            input: folderPath,
            substitutionsVariables: this.#substitutionsVariables,
          })
        } catch (err) {
          log.trace(err)
        }
      }
    }

    // Provide a default value, based on the name.
    return path.join('build', filterPath(this.#buildConfigurationName))
  }
}

// ----------------------------------------------------------------------------
