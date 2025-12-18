/*
 * This file is part of the xPack project (http://xpack.github.io).
 * Copyright (c) 2021-2025 Liviu Ionescu. All rights reserved.
 *
 * Permission to use, copy, modify, and/or distribute this software
 * for any purpose is hereby granted, under the terms of the MIT license.
 *
 * If a copy of the license was not distributed with this file, it can
 * be obtained from https://opensource.org/license/mit.
 */

/* eslint max-len: [ "error", 80, { "ignoreUrls": true } ] */

// ----------------------------------------------------------------------------

import assert from 'assert'
import path from 'path'

import { Logger } from '@xpack/logger'
import { XpmLiquidEngine } from './liquid-engine.js'
import {
  XpmLiquidSubstitutionsVariables,
  XpmLiquidSubstitutionsStrings,
} from './substitutions-variables.js'
import {
  buildFolderRelativePathPropertyName,
  JsonBuildConfiguration,
  JsonBuildConfigurations,
  JsonDependencies,
} from './liquid-package.js'
import { performSubstitutions } from './perform-substitutions.js'
import { XpmLiquidActions } from './liquid-actions.js'
import { isString } from './utils.js'
import { filterPath } from './xpm-liquid.js'

// ----------------------------------------------------------------------------

// A collection of build configurations.
export class XpmLiquidBuildConfigurations {
  // --------------------------------------------------------------------------
  // Members.

  readonly log: Logger
  readonly engine: XpmLiquidEngine
  readonly substitutionsVariables: XpmLiquidSubstitutionsVariables
  readonly jsonBuildConfigurations: JsonBuildConfigurations

  readonly #map: Map<string, XpmLiquidBuildConfiguration | undefined>

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
    log.trace(`${this.constructor.name}()`)

    this.log = log
    this.engine = engine
    this.substitutionsVariables = substitutionsVariables
    this.jsonBuildConfigurations = jsonBuildConfigurations ?? {}

    // Possibly empty if there are no build configurations.
    this.#map = new Map<string, XpmLiquidBuildConfiguration | undefined>()

    // log.trace('substitutionsVariables => ', this.substitutionsVariables)
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async initialise(): Promise<void> {
    if (this.#isInitialised) {
      return
    }

    for (const buildConfigurationName of Object.keys(
      this.jsonBuildConfigurations
    )) {
      // TODO: expand templates in names
      this.#map.set(buildConfigurationName, undefined)
    }

    this.log.trace(
      `${this.constructor.name}.initialise() =>`,
      Array.from(this.#map.keys())
    )

    this.#isInitialised = true
  }

  // --------------------------------------------------------------------------
  // Methods.

  empty(): boolean {
    return this.#map.size === 0
  }

  names(): string[] {
    const buildConfigurationsNames = Array.from(this.#map.keys())

    this.log.trace(
      `${this.constructor.name}.names() =>`,
      buildConfigurationsNames
    )
    return buildConfigurationsNames
  }

  hasJson(buildConfigurationName: string): boolean {
    return buildConfigurationName in this.jsonBuildConfigurations
  }

  getJson(buildConfigurationName: string): JsonBuildConfiguration {
    return this.jsonBuildConfigurations[buildConfigurationName]
  }

  isHidden(buildConfigurationName: string): boolean {
    return this.jsonBuildConfigurations[buildConfigurationName].hidden ?? false
  }

  has(buildConfigurationName: string): boolean {
    return this.#map.has(buildConfigurationName)
  }

  async get(
    buildConfigurationName: string
  ): Promise<XpmLiquidBuildConfiguration> {
    let buildConfiguration = this.#map.get(buildConfigurationName)
    if (buildConfiguration === undefined) {
      buildConfiguration = new XpmLiquidBuildConfiguration(
        buildConfigurationName,
        this
      )
      await buildConfiguration.initialise()
      this.#map.set(buildConfigurationName, buildConfiguration)
    }

    return buildConfiguration
  }
}

// ----------------------------------------------------------------------------

// An individual build configuration.
export class XpmLiquidBuildConfiguration {
  // --------------------------------------------------------------------------
  // Members.

  readonly #buildConfigurationName: string
  readonly #parentBuildConfigurations: XpmLiquidBuildConfigurations
  readonly #jsonBuildConfiguration: JsonBuildConfiguration

  readonly hidden: boolean
  #actions: XpmLiquidActions | undefined

  substitutionsVariables: XpmLiquidSubstitutionsVariables

  properties: XpmLiquidSubstitutionsStrings = {}
  jsonDependencies: JsonDependencies = {}
  jsonDevDependencies: JsonDependencies = {}

  // For templates, the actual values.
  matrixParameters?: XpmLiquidSubstitutionsStrings

  #buildFolderRelativePath?: string

  #isInitialised = false

  // --------------------------------------------------------------------------
  // Constructor and async initialiser.

  constructor(
    buildConfigurationName: string,
    parentBuildConfigurations: XpmLiquidBuildConfigurations
  ) {
    parentBuildConfigurations.log.trace(
      `${this.constructor.name}(${buildConfigurationName})`
    )

    this.#buildConfigurationName = buildConfigurationName
    this.#parentBuildConfigurations = parentBuildConfigurations

    this.#jsonBuildConfiguration =
      parentBuildConfigurations.jsonBuildConfigurations[
        buildConfigurationName
      ] ?? {}

    this.substitutionsVariables = {
      ...this.#parentBuildConfigurations.substitutionsVariables,
    }

    this.hidden = this.#jsonBuildConfiguration.hidden ?? false

    // The rest of the initialisation is done in the async initialiser.
  }

  async initialise(): Promise<void> {
    if (this.#isInitialised) {
      return
    }

    const log = this.#parentBuildConfigurations.log
    const jsonBuildConfiguration = this.#jsonBuildConfiguration

    // TODO: add matrixParameters

    // Process both the new 'inherits' and the deprecated 'inherit'.
    let inherits: string[] = []
    if (isString(jsonBuildConfiguration.inherits)) {
      inherits = [jsonBuildConfiguration.inherits]
    } else if (Array.isArray(jsonBuildConfiguration.inherits)) {
      inherits = jsonBuildConfiguration.inherit as string[]
    } else if (isString(jsonBuildConfiguration.inherit)) {
      inherits = [jsonBuildConfiguration.inherit]
    } else if (Array.isArray(jsonBuildConfiguration.inherit)) {
      inherits = jsonBuildConfiguration.inherit as string[]
    }

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
      jsonActions: this.#jsonBuildConfiguration.actions,
    })
    // Note: this must be done manually by the application.
    // await this.#actions.initialise()

    log.trace(
      `${this.constructor.name}.initialise() =>`,
      this.#buildConfigurationName
    )
    log.trace('properties => ', this.properties)
    log.trace('dependencies => ', this.jsonDependencies)
    log.trace('devDependencies => ', this.jsonDevDependencies)
    // log.trace('substitutionsVariables => ', this.substitutionsVariables)

    this.#isInitialised = true
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
