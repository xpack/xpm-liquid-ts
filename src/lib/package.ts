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

import { isJsonObject } from './utils.js'
import {
  xpmLiquidSubstitutionsVariablesBase,
  XpmLiquidSubstitutionsVariables,
} from './substitutions-variables.js'
import { Logger } from '@xpack/logger'
import { XpmLiquidEngine } from './engine.js'
import { Liquid } from 'liquidjs'
import { XpmLiquidActions } from './actions.js'
import { XpmLiquidBuildConfigurations } from './build-configurations.js'

// ----------------------------------------------------------------------------

export type JsonActionValue = string | string[]

export type JsonPropertyValue = string

export type JsonProperties = Record<string, JsonPropertyValue>

export type JsonBuildConfigurationInherits = string[]

export type JsonActions = Record<string, JsonActionValue>

export type JsonScripts = Record<string, string>

export type JsonDependencies = Record<string, string | JsonDependencyExtended>

export type JsonDependencyExtended = Record<string, string>

export interface JsonBuildConfiguration {
  inherits?: JsonBuildConfigurationInherits | string
  inherit?: JsonBuildConfigurationInherits | string // Deprecated
  hidden?: boolean
  properties?: JsonProperties
  actions?: JsonActions
  dependencies?: JsonDependencies
  devDependencies?: JsonDependencies
}

export type JsonBuildConfigurations = Record<string, JsonBuildConfiguration>

export interface JsonXpack {
  properties?: JsonProperties
  actions?: JsonActions
  dependencies?: JsonDependencies
  devDependencies?: JsonDependencies
  buildConfigurations?: JsonBuildConfigurations
}

export interface JsonNpmPackage {
  name?: string
  version?: string
  scripts?: JsonScripts
  dependencies?: JsonDependencies
  devDependencies?: JsonDependencies
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any // Allow any additional property
}

export interface JsonXpmPackage extends JsonNpmPackage {
  xpack: JsonXpack
}

export type XpmLiquidActionCommands = string[] // Always array of strings.

export const buildFolderRelativePathPropertyName = 'buildFolderRelativePath'

// ----------------------------------------------------------------------------

export class XpmLiquidPackage {
  // --------------------------------------------------------------------------
  // Members.

  readonly #log: Logger
  readonly #engine: Liquid
  readonly #packageJson: JsonXpmPackage

  readonly topLiquidSubstitutionsVariables: XpmLiquidSubstitutionsVariables

  readonly topActions: XpmLiquidActions
  readonly buildConfigurations: XpmLiquidBuildConfigurations

  // --------------------------------------------------------------------------
  // Constructor and async initialiser.

  constructor({
    log,
    packageJson,
  }: {
    log: Logger
    packageJson: JsonXpmPackage
  }) {
    this.#log = log
    this.#engine = new XpmLiquidEngine()

    assert(isJsonObject(packageJson.xpack))
    this.#packageJson = packageJson

    this.topLiquidSubstitutionsVariables = {
      ...xpmLiquidSubstitutionsVariablesBase,
      package: packageJson,
    }

    if (isJsonObject(packageJson.xpack.properties)) {
      this.topLiquidSubstitutionsVariables.properties = {
        ...packageJson.xpack.properties,
      }
    }

    // Prevent adding/removing properties.
    Object.seal(this.topLiquidSubstitutionsVariables)

    // Empty actions.
    this.topActions = new XpmLiquidActions({
      log: this.#log,
      engine: this.#engine,
      substitutionsVariables: this.topLiquidSubstitutionsVariables,
      jsonActions: this.#packageJson.xpack.actions,
    })

    // Empty build configurations.
    this.buildConfigurations = new XpmLiquidBuildConfigurations({
      log: this.#log,
      engine: this.#engine,
      substitutionsVariables: this.topLiquidSubstitutionsVariables,
      jsonBuildConfigurations: this.#packageJson.xpack.buildConfigurations,
    })
  }

  // If necessary, the inits can be called directly from the application.
  async initialise(): Promise<void> {
    await this.topActions.initialise()
    await this.buildConfigurations.initialise()
  }
}

// ----------------------------------------------------------------------------
