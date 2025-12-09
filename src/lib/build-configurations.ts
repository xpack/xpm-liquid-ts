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

// import assert from 'assert'

import { Logger } from '@xpack/logger'
import { XpmLiquidEngine } from './engine.js'
import {
  XpmLiquidSubstitutionsVariables,
  XpmLiquidSubstitutionsStrings,
} from './substitutions-variables.js'
import {
  buildFolderRelativePathPropertyName,
  JsonBuildConfiguration,
  JsonBuildConfigurations,
  JsonDependencies,
  performSubstitutions,
} from './package.js'
import { XpmLiquidActions } from './actions.js'
import { isString } from './utils.js'
import { filterPath } from './xpm-liquid.js'
import path from 'path'

// ----------------------------------------------------------------------------

// A map of actions.
export class XpmLiquidBuildConfigurations {
  // --------------------------------------------------------------------------
  // Members.

  readonly log: Logger
  readonly engine: XpmLiquidEngine
  readonly substitutionsVariables: XpmLiquidSubstitutionsVariables
  readonly jsonBuildConfigurations: JsonBuildConfigurations

  #buildConfigurationsMap:
    | Map<string, XpmLiquidBuildConfiguration | undefined>
    | undefined

  // --------------------------------------------------------------------------
  // Constructor.

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
    this.log = log
    this.engine = engine
    this.substitutionsVariables = substitutionsVariables
    this.jsonBuildConfigurations = jsonBuildConfigurations ?? {}
  }

  // --------------------------------------------------------------------------
  // Methods.

  // Lazy processing.
  #getBuildConfigurationsMap() {
    if (this.#buildConfigurationsMap == undefined) {
      // Possibly empty if there are no build configurations.
      this.#buildConfigurationsMap = new Map<
        string,
        XpmLiquidBuildConfiguration | undefined
      >()

      for (const buildConfigurationName of Object.keys(
        this.jsonBuildConfigurations
      )) {
        // TODO: expand templates in names
        this.#buildConfigurationsMap.set(buildConfigurationName, undefined)
      }
    }

    return this.#buildConfigurationsMap
  }

  hasBuildConfigurations(): boolean {
    return this.#getBuildConfigurationsMap().size > 0
  }

  getBuildConfigurationsNames(): string[] {
    const buildConfigurationsNames = Array.from(
      this.#getBuildConfigurationsMap().keys()
    )
    this.log.trace(
      'XpmLiquidBuildConfigurations.getBuildConfigurationsNames() ->',
      buildConfigurationsNames
    )
    return buildConfigurationsNames
  }

  hasJsonBuildConfiguration(buildConfigurationName: string): boolean {
    return buildConfigurationName in this.jsonBuildConfigurations
  }

  getJsonBuildConfiguration(
    buildConfigurationName: string
  ): JsonBuildConfiguration {
    return this.jsonBuildConfigurations[buildConfigurationName]
  }

  isHidden(buildConfigurationName: string): boolean {
    return this.jsonBuildConfigurations[buildConfigurationName].hidden ?? false
  }

  hasBuildConfiguration(buildConfigurationName: string): boolean {
    return this.#getBuildConfigurationsMap().has(buildConfigurationName)
  }

  getBuildConfiguration(
    buildConfigurationName: string
  ): XpmLiquidBuildConfiguration {
    let buildConfiguration = this.#getBuildConfigurationsMap().get(
      buildConfigurationName
    )
    if (buildConfiguration === undefined) {
      buildConfiguration = new XpmLiquidBuildConfiguration(
        buildConfigurationName,
        this
      )
      // The conditional is used only to silence the compiler.
      this.#buildConfigurationsMap?.set(
        buildConfigurationName,
        buildConfiguration
      )
    }

    return buildConfiguration
  }
}

// ----------------------------------------------------------------------------

// An individual action.
export class XpmLiquidBuildConfiguration {
  // --------------------------------------------------------------------------
  // Members.

  #buildConfigurationName: string
  #parentBuildConfigurations: XpmLiquidBuildConfigurations

  substitutionsVariables: XpmLiquidSubstitutionsVariables

  actions: XpmLiquidActions
  properties: XpmLiquidSubstitutionsStrings = {}
  jsonDependencies: JsonDependencies = {}
  jsonDevDependencies: JsonDependencies = {}

  // For templates, the actual values.
  matrixParameters?: XpmLiquidSubstitutionsStrings

  buildFolderRelativePath?: string

  // --------------------------------------------------------------------------
  // Constructor.

  constructor(
    buildConfigurationName: string,
    parentBuildConfigurations: XpmLiquidBuildConfigurations
  ) {
    this.#buildConfigurationName = buildConfigurationName
    this.#parentBuildConfigurations = parentBuildConfigurations

    const log = this.#parentBuildConfigurations.log

    const jsonBuildConfiguration =
      this.#parentBuildConfigurations.jsonBuildConfigurations[
        this.#buildConfigurationName
      ] ?? {}

    this.substitutionsVariables = {
      ...this.#parentBuildConfigurations.substitutionsVariables,
    }
    // TODO: add matrixParameters

    let inherit: string[] = []
    if (isString(jsonBuildConfiguration.inherit)) {
      inherit = [jsonBuildConfiguration.inherit]
    } else if (Array.isArray(jsonBuildConfiguration.inherit)) {
      inherit = jsonBuildConfiguration.inherit as string[]
    }

    // Add inherited configuration properties.
    // TODO: detect circular references.
    for (const inheritedBuildConfigurationName of inherit) {
      if (
        this.#parentBuildConfigurations.hasJsonBuildConfiguration(
          inheritedBuildConfigurationName
        )
      ) {
        const buildConfiguration =
          this.#parentBuildConfigurations.getBuildConfiguration(
            inheritedBuildConfigurationName
          )

        this.properties = {
          ...this.properties,
          ...buildConfiguration.properties,
        }

        this.jsonDependencies = {
          ...this.jsonDependencies,
          ...buildConfiguration.jsonDependencies,
        }
        this.jsonDevDependencies = {
          ...this.jsonDevDependencies,
          ...buildConfiguration.jsonDevDependencies,
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

    this.actions = new XpmLiquidActions({
      log: this.#parentBuildConfigurations.log,
      engine: this.#parentBuildConfigurations.engine,
      substitutionsVariables: this.substitutionsVariables,
      jsonActions: jsonBuildConfiguration.actions,
    })

    log.trace('XpmLiquidBuildConfiguration')
    log.trace('properties => ', this.properties)
    log.trace('dependencies => ', this.jsonDependencies)
    log.trace('devDependencies => ', this.jsonDevDependencies)
  }

  // --------------------------------------------------------------------------
  // Methods.

  async getBuildFolderRelativePath(): Promise<string> {
    this.buildFolderRelativePath ??= await this.#getBuildFolderRelativePath()
    return this.buildFolderRelativePath
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
