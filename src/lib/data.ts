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
import os from 'os'

import { isJsonObject } from './utils.js'
import {
  xmlLiquidSubstitutionMapBase,
  XpmLiquidSubstitutionMap,
  XpmLiquidSubstitutionParameters,
} from './map.js'
import { Logger } from '@xpack/logger'
import { XpmLiquidEngine } from './engine.js'
import { Context, Liquid } from 'liquidjs'
import { XpmLiquidPropertiesDrop } from './liquid-drop.js'

// ----------------------------------------------------------------------------

export type JsonActionValue = string | string[]

export type JsonPropertyValue = string

export type JsonProperties = Record<string, JsonPropertyValue>

export type JsonBuildConfigurationInherits = Record<string, string>

export type JsonActions = Record<string, JsonActionValue>

export type JsonScripts = Record<string, string>

export type JsonDependencies = Record<string, string>

export interface JsonBuildConfiguration {
  inherit?: JsonBuildConfigurationInherits | string
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

export type XpmLiquidActionsMapValue = {
  matrixProperties?: XpmLiquidSubstitutionParameters // For templates, the actual values.
  commands: XpmLiquidActionCommands
}

export type XpmLiquidActionsMap = Map<
  string,
  XpmLiquidActionsMapValue | undefined
>

export type XpmLiquidBuildConfigurationMapValue = {
  matrixProperties?: XpmLiquidSubstitutionParameters // For templates, the actual values.
  actions?: XpmLiquidActionsMap
}

export type XpmLiquidBuildConfigurationsMap = Map<
  string,
  XpmLiquidBuildConfigurationMapValue | undefined
>

export class XpmLiquidData {
  #log: Logger
  #packageJson: JsonXpmPackage
  // #topActions?: XpmLiquidActionsMap
  topActions: XpmLiquidActions
  #buildConfigurations?: XpmLiquidBuildConfigurationsMap
  #engine: Liquid
  #topLiquidSubstitutionMap: XpmLiquidSubstitutionMap

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

    this.#topLiquidSubstitutionMap = {
      ...xmlLiquidSubstitutionMapBase,
      package: packageJson,
    }

    if (isJsonObject(packageJson.xpack.properties)) {
      this.#topLiquidSubstitutionMap.properties = {
        ...packageJson.xpack.properties,
      }
    }

    this.topActions = new XpmLiquidActions({
      log: this.#log,
      engine: this.#engine,
      substitutionMap: this.#topLiquidSubstitutionMap,
      jsonActions: this.#packageJson.xpack.actions,
    })
  }

  // --------------------------------------------------------------------------

  hasBuildConfigurations(): boolean {
    if (this.#buildConfigurations !== undefined) {
      return true
    }

    return isJsonObject(this.#packageJson.xpack.buildConfigurations)
  }

  #prepareBuildConfigurationsAtFirstUse() {
    if (this.#buildConfigurations === undefined) {
      const buildConfigurations = this.#packageJson.xpack.buildConfigurations
      assert(
        buildConfigurations !== undefined && isJsonObject(buildConfigurations)
      )
      this.#buildConfigurations =
        this.#prepareBuildConfigurations(buildConfigurations)
    }
  }

  #prepareBuildConfigurations(
    jsonBuildConfigurations: JsonBuildConfigurations
  ): XpmLiquidBuildConfigurationsMap {
    const map = new Map<string, undefined>()

    for (const name of Object.keys(jsonBuildConfigurations)) {
      // TODO: expand templates in names
      map.set(name, undefined)
    }
    return map
  }

  listBuildConfigurationsNames(): string[] {
    this.#prepareBuildConfigurationsAtFirstUse()
    assert(this.#buildConfigurations !== undefined)

    const names = Array.from(this.#buildConfigurations.keys())
    this.#log.trace('XpmLiquidData.listBuildConfigurationsNames()', names)
    return names
  }

  hasBuildConfigurationActions(configurationName: string): boolean {
    this.#prepareBuildConfigurationsAtFirstUse()

    return false
  }

  async getBuildConfigurationActionCommands(
    buildConfigurationName: string
  ): Promise<XpmLiquidActionCommands> {
    this.#prepareBuildConfigurationsAtFirstUse()

    assert(this.#buildConfigurations)
    let buildConfigurationValue = this.#buildConfigurations.get(
      buildConfigurationName
    )
    if (buildConfigurationValue === undefined) {
      buildConfigurationValue = {}
      this.#buildConfigurations?.set(
        buildConfigurationName,
        buildConfigurationValue
      )
    }
    if (buildConfigurationValue.actions === undefined) {
    }

    return []
  }

  // --------------------------------------------------------------------------
}

// A map of actions.
export class XpmLiquidActions {
  log: Logger
  engine: XpmLiquidEngine
  substitutionMap: XpmLiquidSubstitutionMap
  jsonActions: JsonActions

  #actionsMap: Map<string, XpmLiquidAction | undefined>

  constructor({
    log,
    engine,
    substitutionMap,
    jsonActions,
  }: {
    log: Logger
    engine: XpmLiquidEngine
    substitutionMap: XpmLiquidSubstitutionMap
    jsonActions: JsonActions | undefined
  }) {
    this.log = log
    this.engine = engine
    this.substitutionMap = substitutionMap
    this.jsonActions = jsonActions ?? {}

    // Possibly empty if there are no actions.
    this.#actionsMap = new Map<string, XpmLiquidAction | undefined>()

    if (jsonActions !== undefined) {
      for (const actionName of Object.keys(jsonActions)) {
        // TODO: expand templates in names
        this.#actionsMap.set(actionName, undefined)
      }
    }
  }

  hasActions(): boolean {
    return this.#actionsMap.size > 0
  }

  getActionNames(): string[] {
    const actionNames = Array.from(this.#actionsMap.keys())
    this.log.trace('XpmLiquidActions.listActionNames() ->', actionNames)
    return actionNames
  }

  hasAction(actionName: string): boolean {
    return this.#actionsMap.has(actionName)
  }

  getAction(actionName: string): XpmLiquidAction {
    let action = this.#actionsMap.get(actionName)
    if (action === undefined) {
      action = new XpmLiquidAction(actionName, this)
      this.#actionsMap.set(actionName, action)
    }

    return action
  }
}

// An individual action.
export class XpmLiquidAction {
  #actionName: string

  matrixParameters?: XpmLiquidSubstitutionParameters // For templates, the actual values.
  commands?: string[]

  #parentActions: XpmLiquidActions

  constructor(actionName: string, parentActions: XpmLiquidActions) {
    this.#actionName = actionName
    this.#parentActions = parentActions
  }

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
        substitutionMap: this.#parentActions.substitutionMap,
        log: this.#parentActions.log,
      })

      this.commands = substituted.split(os.EOL)
    }

    this.#parentActions.log.trace('XpmLiquidAction.getCommands() ->', this.commands)
    return this.commands
  }
}

// ----------------------------------------------------------------------------

/**
 * Perform substitution on the input string.
 * Repeat until no more Liquid variables or tags are identified.
 *
 * @param input - The input string, possibly with substitutions.
 * @param map - The substitution map.
 * @returns The substituted string.
 *
 * @throws Liquid exceptions
 */
async function performSubstitutions({
  log,
  engine,
  input,
  substitutionMap,
}: {
  log: Logger
  engine: XpmLiquidEngine
  input: string
  substitutionMap: XpmLiquidSubstitutionMap
}): Promise<string> {
  assert(substitutionMap)

  if (input.trim() === '') {
    // Spare it the trouble for empty strings.
    return input
  }

  let context
  // Wrap properties into a liquid drop (a mechanism to process
  // substitutions immediately).
  if (Object.keys(substitutionMap.properties).length > 0) {
    context = new Context({
      ...substitutionMap,
      properties: new XpmLiquidPropertiesDrop({
        log,
        engine,
        properties: substitutionMap.properties,
      }),
    })
  } else {
    context = new Context(substitutionMap)
  }

  log.trace(`performSubstitutions('${input}')`)

  let current: string = input
  let substituted: string = current
  let count = 0

  // Iterate until all substitutions are done.
  while (current.includes('{{') || current.includes('{%')) {
    ++count
    // May throw.
    try {
      substituted = await engine.parseAndRender(current, context)

      /* c8 ignore start */ /* istanbul ignore next */
      if (substituted === current) {
        // If nothing changed, we're done.
        // This test is just a safety net, normally should not get there.
        log.warn(
          `performSubstitutions() ${count} => |`,
          substituted,
          '| did not change'
        )

        break
      } /* c8 ignore stop */
    } catch (ex) {
      if (ex instanceof Error) {
        log.error(ex)
      } else {
        log.error(new Error(String(ex)))
      }
      // Return the current (unsubstituted) value.
      substituted = current
    }

    log.trace(`performSubstitutions() ${count} => |`, substituted, '|')
    current = substituted
  }

  return substituted
}

// ----------------------------------------------------------------------------
