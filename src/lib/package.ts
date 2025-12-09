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
import { Context, Liquid } from 'liquidjs'
import { XpmLiquidPropertiesDrop } from './liquid-drop.js'
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

export const buildFolderRelativePathPropertyName = 'buildFolderRelativePath'

// ----------------------------------------------------------------------------

export class XpmLiquidPackage {
  // --------------------------------------------------------------------------
  // Members.

  #log: Logger
  #engine: Liquid
  #packageJson: JsonXpmPackage

  topActions: XpmLiquidActions
  buildConfigurations: XpmLiquidBuildConfigurations
  topLiquidSubstitutionsVariables: XpmLiquidSubstitutionsVariables

  // --------------------------------------------------------------------------
  // Constructor.

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

    this.topActions = new XpmLiquidActions({
      log: this.#log,
      engine: this.#engine,
      substitutionsVariables: this.topLiquidSubstitutionsVariables,
      jsonActions: this.#packageJson.xpack.actions,
    })

    this.buildConfigurations = new XpmLiquidBuildConfigurations({
      log: this.#log,
      engine: this.#engine,
      substitutionsVariables: this.topLiquidSubstitutionsVariables,
      jsonBuildConfigurations: this.#packageJson.xpack.buildConfigurations,
    })
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
export async function performSubstitutions({
  log,
  engine,
  input,
  substitutionsVariables,
}: {
  log: Logger
  engine: XpmLiquidEngine
  input: string
  substitutionsVariables: XpmLiquidSubstitutionsVariables
}): Promise<string> {
  assert(substitutionsVariables)

  if (input.trim() === '') {
    // Spare it the trouble for empty strings.
    return input
  }

  let context
  // Wrap properties into a liquid drop (a mechanism to process
  // substitutions immediately).
  if (Object.keys(substitutionsVariables.properties).length > 0) {
    context = new Context({
      ...substitutionsVariables,
      properties: new XpmLiquidPropertiesDrop({
        log,
        engine,
        properties: substitutionsVariables.properties,
      }),
    })
  } else {
    context = new Context(substitutionsVariables)
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
      substituted = (await engine.parseAndRender(current, context)) as string

      /* c8 ignore start */ /* istanbul ignore next */
      if (substituted === current) {
        // If nothing changed, we're done.
        // This test is just a safety net, normally should not get there.
        log.warn(
          `performSubstitutions() ${String(count)} => |`,
          substituted,
          '| did not change'
        )

        break
      } /* c8 ignore stop */
    } catch (ex) {
      if (ex instanceof Error) {
        // log.error(ex)
        log.error(ex.message)
      } else {
        log.error(new Error(String(ex)))
      }
      // Return the current (unsubstituted) value.
      substituted = current
    }

    log.trace(`performSubstitutions() ${String(count)} => |`, substituted, '|')
    current = substituted
  }

  return substituted
}

// ----------------------------------------------------------------------------
