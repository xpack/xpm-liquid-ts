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
import { JsonActions, JsonActionContent, JsonActionTemplate } from './types.js'
import { performSubstitutions } from './functions/perform-substitutions.js'
import { isJsonArray, isJsonObject, isString } from './functions/utils.js'
import { XpmError } from './errors.js'

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
        // Expand template and return multiple actions.
        try {
          const expandedActionsMap = await this.#expandTemplateActions({
            actionName,
            jsonActionTemplate: jsonAction as JsonActionTemplate,
          })
          for (const [
            expandedActionName,
            expandedAction,
          ] of expandedActionsMap) {
            this.#actionsMap.set(expandedActionName, expandedAction)
            this.#jsonActionsNamesMap.set(expandedActionName, actionName)
          }
        } catch (error) {
          if (error instanceof Error) {
            this.log.error(error.message)
          }
        }
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
      const jsonAction: JsonActionContent = (this.jsonActions[jsonActionName] ??
        '') as JsonActionContent
      action = new XpmLiquidAction({
        actionName,
        jsonAction,
        parentActions: this,
      })
      this.#actionsMap.set(actionName, action)
    }

    return action
  }

  async #expandTemplateActions({
    actionName,
    jsonActionTemplate,
  }: {
    actionName: string
    jsonActionTemplate: JsonActionTemplate
  }): Promise<Map<string, XpmLiquidAction>> {
    const newActionsMap = new Map<string, XpmLiquidAction>()

    if (!isJsonObject(jsonActionTemplate.matrix)) {
      throw new XpmError(`action '${actionName}' matrix is not an object`)
    }
    if (
      !isString(jsonActionTemplate.template) &&
      !isJsonArray(jsonActionTemplate.template)
    ) {
      throw new XpmError(
        `action '${actionName}' template is not a string or array`
      )
    }
    // Validate matrix structure and collect keys/values
    const matrixKeys: string[] = []
    const matrixValues: string[][] = []

    for (const [matrixKey, matrixValueArray] of Object.entries(
      jsonActionTemplate.matrix
    )) {
      if (!isJsonArray(matrixValueArray)) {
        throw new XpmError(
          `action '${actionName}' matrix.${matrixKey} is not an array`
        )
      }
      for (const matrixValue of matrixValueArray) {
        if (!isString(matrixValue)) {
          throw new XpmError(
            `action '${actionName}' matrix.${matrixKey} value is not a string`
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
    const createSubstitutedAction = async (
      combination: Record<string, string>
    ): Promise<void> => {
      // console.log(combination)

      const substitutedActionName = await performSubstitutions({
        input: actionName,
        engine: this.engine,
        substitutionsVariables: {
          ...this.substitutionsVariables,
          matrix: combination,
        },
        log: this.log,
      })
      // console.log(substitutedActionName)

      const newAction = new XpmLiquidAction({
        actionName: substitutedActionName,
        jsonAction: jsonActionTemplate.template,
        parentActions: this,
        matrixParameters: { ...combination },
      })

      await newAction.initialise()

      newActionsMap.set(substitutedActionName, newAction)
    }

    // const matrixKeys: string[] = Object.keys(jsonAction.matrix)
    // const matrixValues: string[][] = Object.values(jsonAction.matrix)

    // Compute all combinations (cartesian product)

    // Inner function
    const generateCombinationsRecursively = async (
      index: number,
      combination: Record<string, string>
    ): Promise<void> => {
      if (index === matrixKeys.length) {
        await createSubstitutedAction(combination)

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

    return newActionsMap
  }
}

// ----------------------------------------------------------------------------

// An individual action.
export class XpmLiquidAction {
  // --------------------------------------------------------------------------
  // Members.

  // Both required to construct copy of the action.
  readonly actionName: string
  readonly jsonAction: JsonActionContent

  // Currently used only during tests.
  readonly parentActions: XpmLiquidActions

  // For templates, the actual values.
  readonly #matrixParameters?: XpmLiquidSubstitutionsStrings
  #commands?: string[]

  #isInitialised = false

  // --------------------------------------------------------------------------
  // Constructor and async initialiser.

  constructor({
    actionName,
    jsonAction,
    parentActions,
    matrixParameters,
  }: {
    actionName: string
    jsonAction: JsonActionContent
    parentActions: XpmLiquidActions
    matrixParameters?: XpmLiquidSubstitutionsStrings
  }) {
    assert(actionName)
    assert(parentActions)

    parentActions.log.trace(`${XpmLiquidAction.name}(${actionName})`)

    this.actionName = actionName
    // this.jsonActionName = jsonActionName
    this.jsonAction = jsonAction
    this.parentActions = parentActions
    if (matrixParameters !== undefined) {
      this.#matrixParameters = matrixParameters
    }
  }

  async initialise(): Promise<boolean> {
    if (this.#isInitialised) {
      return false
    }

    const log = this.parentActions.log

    // Silently accept empty or non-existing actions.
    const jsonAction = this.jsonAction
    const inputCommands = Array.isArray(jsonAction)
      ? jsonAction.join(os.EOL)
      : jsonAction

    const substitutedCommands = await performSubstitutions({
      input: inputCommands,
      engine: this.parentActions.engine,
      substitutionsVariables: {
        ...this.parentActions.substitutionsVariables,
        matrix: this.#matrixParameters ?? {},
      },
      log,
    })

    this.#commands = substitutedCommands
      .replace(new RegExp(os.EOL + '$'), '')
      .split(os.EOL)

    log.trace(`${XpmLiquidAction.name}.initialise() =>`, this.actionName)

    log.trace('commands =>', this.#commands)

    this.#isInitialised = true
    return true
  }

  // --------------------------------------------------------------------------
  // Methods.

  get commands(): string[] {
    assert(this.#commands, 'Action not initialised, commands are undefined')
    return this.#commands
  }
}

// ----------------------------------------------------------------------------
