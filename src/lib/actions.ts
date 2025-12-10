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
import os from 'os'

import { Logger } from '@xpack/logger'
import { XpmLiquidEngine } from './engine.js'
import {
  XpmLiquidSubstitutionsVariables,
  XpmLiquidSubstitutionsStrings,
} from './substitutions-variables.js'
import { JsonActions } from './package.js'
import { performSubstitutions } from './perform-substitutions.js'

// ----------------------------------------------------------------------------

// A map of actions.
export class XpmLiquidActions {
  // --------------------------------------------------------------------------
  // Members.

  readonly log: Logger
  readonly engine: XpmLiquidEngine
  readonly substitutionsVariables: XpmLiquidSubstitutionsVariables
  readonly jsonActions: JsonActions

  #actionsMap: Map<string, XpmLiquidAction | undefined> | undefined

  // --------------------------------------------------------------------------
  // Constructor.

  constructor({
    log,
    engine,
    substitutionsVariables,
    jsonActions,
  }: {
    log: Logger
    engine: XpmLiquidEngine
    substitutionsVariables: XpmLiquidSubstitutionsVariables
    jsonActions: JsonActions | undefined
  }) {
    this.log = log
    this.engine = engine
    this.substitutionsVariables = substitutionsVariables
    this.jsonActions = jsonActions ?? {}
  }

  // --------------------------------------------------------------------------
  // Methods.

  // Lazy processing.
  #getActionsMap() {
    if (this.#actionsMap == undefined) {
      // Possibly empty if there are no actions.
      this.#actionsMap = new Map<string, XpmLiquidAction | undefined>()

      for (const actionName of Object.keys(this.jsonActions)) {
        // TODO: expand templates in names
        this.#actionsMap.set(actionName, undefined)
      }
    }

    return this.#actionsMap
  }

  hasActions(): boolean {
    return this.#getActionsMap().size > 0
  }

  getActionsNames(): string[] {
    const actionNames = Array.from(this.#getActionsMap().keys())
    this.log.trace('XpmLiquidActions.getActionsNames() ->', actionNames)
    return actionNames
  }

  hasAction(actionName: string): boolean {
    return this.#getActionsMap().has(actionName)
  }

  getAction(actionName: string): XpmLiquidAction {
    let action = this.#getActionsMap().get(actionName)
    if (action === undefined) {
      action = new XpmLiquidAction(actionName, this)
      // The conditional is used only to silence the compiler.
      this.#actionsMap?.set(actionName, action)
    }

    return action
  }
}

// ----------------------------------------------------------------------------

// An individual action.
export class XpmLiquidAction {
  // --------------------------------------------------------------------------
  // Members.

  readonly #actionName: string
  readonly #parentActions: XpmLiquidActions

  // For templates, the actual values.
  matrixParameters?: XpmLiquidSubstitutionsStrings
  commands?: string[]

  // --------------------------------------------------------------------------
  // Constructor.

  constructor(actionName: string, parentActions: XpmLiquidActions) {
    this.#actionName = actionName
    this.#parentActions = parentActions
  }

  // --------------------------------------------------------------------------
  // Methods.

  async getCommands(): Promise<string[]> {
    if (this.commands === undefined) {
      // Silently accept empty or non-existing actions.
      const jsonAction = this.#parentActions.jsonActions[this.#actionName] ?? ''
      const input = Array.isArray(jsonAction)
        ? jsonAction.join(os.EOL)
        : jsonAction

      const substituted = await performSubstitutions({
        input,
        engine: this.#parentActions.engine,
        substitutionsVariables: this.#parentActions.substitutionsVariables,
        log: this.#parentActions.log,
      })

      this.commands = substituted.split(os.EOL)
    }

    this.#parentActions.log.trace(
      'XpmLiquidAction.getCommands() ->',
      this.commands
    )
    return this.commands
  }
}

// ----------------------------------------------------------------------------
