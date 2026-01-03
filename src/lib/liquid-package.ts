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
import * as os from 'node:os'

import { Liquid } from 'liquidjs'

import { Logger } from '@xpack/logger'

import { isJsonObject } from './functions/utils.js'
import {
  xpmLiquidSubstitutionsVariablesBase,
  XpmLiquidSubstitutionsVariables,
} from './substitutions-variables.js'
import { XpmLiquidEngine } from './liquid-engine.js'
import { XpmLiquidActions } from './liquid-actions.js'
import { XpmLiquidBuildConfigurations } from './liquid-build-configurations.js'
import { JsonXpmPackage } from './types.js'

// ----------------------------------------------------------------------------

export const buildFolderRelativePathPropertyName = 'buildFolderRelativePath'

// ----------------------------------------------------------------------------

export class XpmLiquidPackage {
  // --------------------------------------------------------------------------
  // Members.

  readonly #log: Logger
  readonly #engine: Liquid
  readonly #jsonPackage: JsonXpmPackage

  readonly topLiquidSubstitutionsVariables: XpmLiquidSubstitutionsVariables

  readonly topActions: XpmLiquidActions
  readonly buildConfigurations: XpmLiquidBuildConfigurations

  // --------------------------------------------------------------------------
  // Constructor and async initialiser.

  constructor({
    log,
    jsonPackage,
  }: {
    log: Logger
    jsonPackage: JsonXpmPackage
  }) {
    log.trace(`${XpmLiquidPackage.name}()`)

    this.#log = log
    this.#engine = new XpmLiquidEngine()

    assert(isJsonObject(jsonPackage.xpack))
    this.#jsonPackage = jsonPackage

    // os.version() available since 12.x
    assert(
      typeof os.version === 'function',
      'Mandatory os.version available only since 12.x'
    )

    this.topLiquidSubstitutionsVariables = {
      ...xpmLiquidSubstitutionsVariablesBase,
      package: jsonPackage,
    }

    if (isJsonObject(jsonPackage.xpack.properties)) {
      this.topLiquidSubstitutionsVariables.properties = {
        ...jsonPackage.xpack.properties,
      }
    }

    // Prevent adding/removing properties.
    Object.seal(this.topLiquidSubstitutionsVariables)

    // Empty actions.
    this.topActions = new XpmLiquidActions({
      log: this.#log,
      engine: this.#engine,
      substitutionsVariables: this.topLiquidSubstitutionsVariables,
      jsonActions: this.#jsonPackage.xpack.actions,
    })

    // Empty build configurations.
    this.buildConfigurations = new XpmLiquidBuildConfigurations({
      log: this.#log,
      engine: this.#engine,
      substitutionsVariables: this.topLiquidSubstitutionsVariables,
      jsonBuildConfigurations: this.#jsonPackage.xpack.buildConfigurations,
    })
  }
}

// ----------------------------------------------------------------------------
