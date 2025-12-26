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
import { XpmLiquidEngine } from './liquid-engine.js'
import { Liquid } from 'liquidjs'
import { XpmLiquidActions } from './liquid-actions.js'
import { XpmLiquidBuildConfigurations } from './liquid-build-configurations.js'

// ----------------------------------------------------------------------------

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
    log.trace(`${XpmLiquidPackage.name}()`)

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
}

// ----------------------------------------------------------------------------
