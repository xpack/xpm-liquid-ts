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

import { Logger } from '@xpack/logger'

import { XpmLiquidEngine } from './liquid-engine.js'
import {
  XpmLiquidSubstitutionsVariables,
  XpmLiquidSubstitutionsStrings,
} from './substitutions-variables.js'
import { JsonActions, JsonActionValue } from './types.js'
import { performSubstitutions } from './functions/perform-substitutions.js'

// ----------------------------------------------------------------------------

// A collection of actions.
export class XpmLiquidActions {
  // --------------------------------------------------------------------------
  // Members.

  readonly log: Logger
  readonly engine: XpmLiquidEngine
  readonly substitutionsVariables: XpmLiquidSubstitutionsVariables
  readonly jsonActions: JsonActions

  readonly #actionsMap: Map<string, XpmLiquidAction | undefined>
  readonly #jsonActionsNamesMap: Map<string, string>

  #isInitialised = false

  // --------------------------------------------------------------------------
  // Constructor and async initialiser.

  constructor({
    log,
    engine,
    substitutionsVariables,
    inheritedActionsMap,
    jsonActions,
  }: {
    log: Logger
    engine: XpmLiquidEngine
    substitutionsVariables: XpmLiquidSubstitutionsVariables
    inheritedActionsMap?: Map<string, XpmLiquidAction>
    jsonActions: JsonActions | undefined
  }) {
    log.trace(`${XpmLiquidActions.name}()`)

    this.log = log
    this.engine = engine
    this.substitutionsVariables = substitutionsVariables
    this.jsonActions = jsonActions ?? {}

    // Possibly empty if there are no actions.
    this.#actionsMap = new Map<string, XpmLiquidAction | undefined>()

    if (inheritedActionsMap !== undefined) {
      for (const [
        inheritedActionName,
        inheritedAction,
      ] of inheritedActionsMap) {
        // Make copies of the actions, do not alter the inherited ones.
        const action = new XpmLiquidAction({
          actionName: inheritedActionName,
          jsonAction: inheritedAction.jsonAction,
          parentActions: this,
        })
        this.#actionsMap.set(inheritedActionName, action)
      }
    }

    this.#jsonActionsNamesMap = new Map<string, string>()

    // log.trace('substitutionsVariables => ', this.substitutionsVariables)
    // The rest of the initialisation is done in the async initialiser.
  }

  async initialise(): Promise<boolean> {
    if (this.#isInitialised) {
      return false
    }
    for (const [actionName, jsonAction] of Object.entries(this.jsonActions)) {
      if (actionName.includes('{{')) {
        // TODO: expand templates and generate multiple actions.
      } else {
        this.#actionsMap.set(actionName, undefined)
        this.#jsonActionsNamesMap.set(actionName, actionName)
      }
    }

    this.log.trace(
      `${XpmLiquidActions.name}.initialise() =>`,
      Array.from(this.#actionsMap.keys())
    )

    this.#isInitialised = true

    return true
  }

  // --------------------------------------------------------------------------
  // Methods.

  empty(): boolean {
    return this.#actionsMap.size === 0
  }

  names(): string[] {
    const actionNames = Array.from(this.#actionsMap.keys())

    this.log.trace(`${XpmLiquidActions.name}.names() =>`, actionNames)
    return actionNames
  }

  has(actionName: string): boolean {
    return this.#actionsMap.has(actionName)
  }

  get(actionName: string): XpmLiquidAction {
    let action = this.#actionsMap.get(actionName)
    if (action === undefined) {
      const jsonActionName: string =
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        this.#jsonActionsNamesMap.get(actionName)!
      const jsonAction = this.jsonActions[jsonActionName] ?? ''
      action = new XpmLiquidAction({
        actionName,
        jsonAction,
        parentActions: this,
      })
      this.#actionsMap.set(actionName, action)
    }

    return action
  }
}

// ----------------------------------------------------------------------------

// An individual action.
export class XpmLiquidAction {
  // --------------------------------------------------------------------------
  // Members.

  readonly actionName: string
  // readonly jsonActionName: string
  readonly jsonAction: JsonActionValue
  parentActions: XpmLiquidActions

  // For templates, the actual values.
  matrixParameters?: XpmLiquidSubstitutionsStrings
  #commands?: string[]

  // --------------------------------------------------------------------------
  // Constructor.

  constructor({
    actionName,
    // jsonActionName,
    jsonAction,
    parentActions,
  }: {
    actionName: string
    // jsonActionName: string
    jsonAction: JsonActionValue
    parentActions: XpmLiquidActions
  }) {
    assert(actionName)
    // assert(jsonActionName)
    assert(parentActions)

    parentActions.log.trace(`${XpmLiquidAction.name}(${actionName})`)

    this.actionName = actionName
    // this.jsonActionName = jsonActionName
    this.jsonAction = jsonAction
    this.parentActions = parentActions
  }

  // --------------------------------------------------------------------------
  // Methods.

  async getCommands(): Promise<string[]> {
    if (this.#commands === undefined) {
      // Silently accept empty or non-existing actions.
      const jsonAction = this.jsonAction
      const input = Array.isArray(jsonAction)
        ? jsonAction.join(os.EOL)
        : jsonAction

      const substituted = await performSubstitutions({
        input,
        engine: this.parentActions.engine,
        substitutionsVariables: this.parentActions.substitutionsVariables,
        log: this.parentActions.log,
      })

      this.#commands = substituted.split(os.EOL)
    }

    this.parentActions.log.trace(
      `${XpmLiquidAction.name}.commands() =>`,
      this.#commands
    )
    return this.#commands
  }
}

// ----------------------------------------------------------------------------
