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

import { Logger } from '@xpack/logger'

import { XpmLiquidEngine } from './liquid-engine.js'
import {
  XpmLiquidSubstitutionsVariables,
  XpmLiquidSubstitutionsStrings,
} from './substitutions-variables.js'
import { buildFolderRelativePathPropertyName } from './liquid-package.js'
import {
  JsonBuildConfiguration,
  JsonBuildConfigurations,
  JsonDependencies,
} from './types.js'
import { performSubstitutions } from './functions/perform-substitutions.js'
import { XpmLiquidAction, XpmLiquidActions } from './liquid-actions.js'
import { isString } from './functions/utils.js'
import { filterPath } from './functions/utils.js'

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

  // eslint-disable-next-line @typescript-eslint/require-await
  async initialise(): Promise<boolean> {
    if (this.#isInitialised) {
      return false
    }

    for (const buildConfigurationName of Object.keys(
      this.jsonBuildConfigurations
    )) {
      if (buildConfigurationName.includes('{{')) {
        // TODO: expand templates and generate multiple build configurations.
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
    return (
      this.jsonBuildConfigurations[this.getJsonName(buildConfigurationName)]
        .hidden ?? false
    )
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

      const jsonBuildConfiguration =
        this.jsonBuildConfigurations[jsonBuildConfigurationName] ?? {}

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
}

// ----------------------------------------------------------------------------

// An individual build configuration.
export class XpmLiquidBuildConfiguration {
  // --------------------------------------------------------------------------
  // Members.

  readonly hidden: boolean

  // The actual (un-substituted) name from package.json.
  // readonly jsonBuildConfigurationName: string
  // Points to the actual buildConfiguration in package.json.
  readonly jsonBuildConfiguration: JsonBuildConfiguration

  substitutionsVariables: XpmLiquidSubstitutionsVariables

  properties: XpmLiquidSubstitutionsStrings = {}

  jsonDependencies: JsonDependencies = {}
  jsonDevDependencies: JsonDependencies = {}

  // For templates, the actual values.
  matrixParameters?: XpmLiquidSubstitutionsStrings

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
  }: {
    buildConfigurationName: string
    // jsonBuildConfigurationName: string
    jsonBuildConfiguration: JsonBuildConfiguration
    parentBuildConfigurations: XpmLiquidBuildConfigurations
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
    this.jsonBuildConfiguration = jsonBuildConfiguration
    this.#parentBuildConfigurations = parentBuildConfigurations

    this.substitutionsVariables = {
      ...this.#parentBuildConfigurations.substitutionsVariables,
    }

    this.hidden = this.jsonBuildConfiguration.hidden ?? false

    // The rest of the initialisation is done in the async initialiser.
  }

  async initialise(): Promise<boolean> {
    if (this.#isInitialised) {
      return false
    }

    const log = this.#parentBuildConfigurations.log
    const jsonBuildConfiguration = this.jsonBuildConfiguration

    // TODO: add matrixParameters

    // Process both the new 'inherits' and the deprecated 'inherit'.
    let inherits: string[] = []
    if (isString(jsonBuildConfiguration.inherits)) {
      inherits = [jsonBuildConfiguration.inherits]
    } else if (Array.isArray(jsonBuildConfiguration.inherits)) {
      inherits = jsonBuildConfiguration.inherits as string[]
    } else if (isString(jsonBuildConfiguration.inherit)) {
      inherits = [jsonBuildConfiguration.inherit]
    } else if (Array.isArray(jsonBuildConfiguration.inherit)) {
      inherits = jsonBuildConfiguration.inherit as string[]
    }

    const inheritedActionsMap: Map<string, XpmLiquidAction> = new Map<
      string,
      XpmLiquidAction
    >()

    // Add inherited configuration properties.
    // TODO: detect circular references.
    for (const inheritedBuildConfigurationName of inherits) {
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
      ...jsonBuildConfiguration.properties,
    }

    this.jsonDependencies = {
      ...this.jsonDependencies,
      ...jsonBuildConfiguration.dependencies,
    }
    this.jsonDevDependencies = {
      ...this.jsonDevDependencies,
      ...jsonBuildConfiguration.devDependencies,
    }

    this.substitutionsVariables = {
      ...this.#parentBuildConfigurations.substitutionsVariables,
      properties: {
        ...this.substitutionsVariables.properties,
        ...this.properties,
      },
      configuration: {
        ...jsonBuildConfiguration,
        name: this.#buildConfigurationName,
      },
    }

    // Add the buildFolderRelativePath property.
    // Note: the async initialiser was needed due to this async operation.
    const properties = this.substitutionsVariables.properties
    properties.buildFolderRelativePath = await this.getBuildFolderRelativePath()

    // Please note that substitutionsVariables is not fully set at this point;
    // it will be in the async initialiser after the constructor returns.
    this.#actions = new XpmLiquidActions({
      log: this.#parentBuildConfigurations.log,
      engine: this.#parentBuildConfigurations.engine,
      substitutionsVariables: this.substitutionsVariables,
      inheritedActionsMap,
      jsonActions: this.jsonBuildConfiguration.actions,
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
      this.substitutionsVariables.properties
    ) {
      folderPath = this.substitutionsVariables.properties[
        buildFolderRelativePathPropertyName
      ] as string
      if (folderPath !== '') {
        try {
          return await performSubstitutions({
            log,
            engine: this.#parentBuildConfigurations.engine,
            input: folderPath,
            substitutionsVariables: this.substitutionsVariables,
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
