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

/*
 * This module includes the LiquidJS code used to perform
 * substitutions in xpm and related (like the VS Code extensions).
 *
 * The main code is the map used for substitutions and the list
 * of custom tags.
 */

// ----------------------------------------------------------------------------

import { strict as assert } from 'node:assert'
import * as os from 'os'
import * as path from 'path'
import * as process from 'process'

// https://www.npmjs.com/package/liquidjs
import { Liquid, Context } from 'liquidjs'

// https://www.npmjs.com/package/@xpack/logger
import { Logger } from '@xpack/logger'
import { XpmLiquidPropertiesDrop } from './liquid-drop.js'
import {
  XpmLiquidSubstitutionsVariables,
  XpmLiquidSubstitutionsStrings,
} from './substitutions-variables.js'
import { XpmLiquidEngine } from './engine.js'

// ----------------------------------------------------------------------------
// Types.

export interface Properties extends XpmLiquidSubstitutionsStrings {}

// ----------------------------------------------------------------------------
// General purpose functions.

function _isPrimitive(value: any): boolean {
  return (
    (typeof value !== 'object' && typeof value !== 'function') || value === null
  )
}

function _isJsonObject(value: any): boolean {
  return value !== undefined && !_isPrimitive(value) && !Array.isArray(value)
}

/**
 * Replace non alphanumeric chars with dashes to make the paths
 * comply with filesystem names.
 *
 * @param {string} input A path candidate.
 * @returns {string} A validated path.
 */
export function filterPath(input: string): string {
  /* c8 ignore start */ /* istanbul ignore next */
  const fixed =
    os.platform() === 'win32'
      ? input.replace(/[^a-zA-Z0-9\\:]+/g, '-')
      : input.replace(/[^a-zA-Z0-9/]+/g, '-')
  /* c8 ignore stop */

  return fixed.replace(/--/g, '-')
}

/**
 * Replace non alphanumeric chars with dashes to make the paths
 * comply with Posix filesystem names.
 *
 * @param {string} input A path candidate.
 * @returns {string} A validated path.
 */
export function filterPosixPath(input: string): string {
  /* istanbul ignore next */
  const fixed = input.replace(/[^a-zA-Z0-9/]+/g, '-')

  return fixed.replace(/--/g, '-')
}

/**
 * Replace non alphanumeric chars with dashes to make the paths
 * comply with Windows filesystem names.
 *
 * @param {string} input A path candidate.
 * @returns {string} A validated path.
 */
export function filterWin32Path(input: string): string {
  /* istanbul ignore next */
  const fixed = input.replace(/[^a-zA-Z0-9\\:]+/g, '-')

  return fixed.replace(/--/g, '-')
}

// ============================================================================

export class XpmLiquid {
  // --------------------------------------------------------------------------
  // Members.

  readonly log: Logger
  readonly engine: Liquid

  // --------------------------------------------------------------------------
  // Constructor.

  constructor(log: Logger) {
    this.log = log

    this.engine = new XpmLiquidEngine()
  }

  // --------------------------------------------------------------------------
  // Methods.

  /**
   * Return the base for a liquid map.
   *
   * @returns A map of properties.
   */
  prepareMap(
    packageJson: any,
    buildConfigurationName?: string
  ): XpmLiquidSubstitutionsVariables {
    assert(packageJson)

    // os.version() available since 12.x
    assert(
      typeof os.version === 'function',
      'Mandatory os.version available only since 12.x'
    )

    const liquidMap: XpmLiquidSubstitutionsVariables = {
      env: process.env,
      os: {
        EOL: os.EOL,
        arch: os.arch(),
        constants: {
          signals: os.constants.signals,
          errno: os.constants.errno,
        },
        cpus: os.cpus(),
        endianness: os.endianness(),
        homedir: os.homedir(),
        hostname: os.hostname(),
        platform: os.platform(),
        release: os.release(),
        tmpdir: os.tmpdir(),
        type: os.type(),
        // os.version() available since 12.x
        version: os.version(),
      },
      path: {
        delimiter: path.delimiter,
        sep: path.sep,
        win32: {
          delimiter: path.win32.delimiter,
          sep: path.win32.sep,
        },
        posix: {
          delimiter: path.posix.delimiter,
          sep: path.posix.sep,
        },
      },
      package: packageJson,
      properties: {},
    }

    if (_isJsonObject(packageJson.xpack)) {
      if (_isJsonObject(packageJson.xpack.properties)) {
        liquidMap.properties = packageJson.xpack.properties
      }

      if (
        buildConfigurationName !== undefined &&
        buildConfigurationName !== null &&
        buildConfigurationName.trim() !== ''
      ) {
        if (packageJson.xpack.buildConfigurations === undefined) {
          throw new Error('package.json has no buildConfigurations')
        }
        const buildConfiguration =
          packageJson.xpack.buildConfigurations[buildConfigurationName]
        if (buildConfiguration === undefined) {
          throw new Error(
            'package.json has no buildConfiguration.' + buildConfigurationName
          )
        }

        liquidMap.configuration = {
          ...buildConfiguration,
          name: buildConfigurationName,
        }

        if (_isJsonObject(buildConfiguration.properties)) {
          liquidMap.properties = {
            ...liquidMap.properties,
            ...buildConfiguration.properties,
          }
        }
      }
    }

    return liquidMap
  }

  // --------------------------------------------------------------------------

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
  async performSubstitutions(
    input: string,
    map: XpmLiquidSubstitutionsVariables
  ): Promise<string> {
    assert(map)

    if (input.trim() === '') {
      // Spare it the trouble for empty strings.
      return input
    }

    const { log } = this

    let context
    if (Object.keys(map.properties).length > 0) {
      context = new Context({
        ...map,
        properties: new XpmLiquidPropertiesDrop({
          log: log,
          engine: this.engine,
          properties: map.properties,
        }),
      })
    } else {
      context = new Context(map)
    }

    log.trace(`XpmLiquidMap.performSubstitutions('${input}')`)

    let current: string = input
    let substituted: string = current
    let count = 0

    // Iterate until all substitutions are done.
    while (current.includes('{{') || current.includes('{%')) {
      ++count
      // May throw.
      substituted = await this.engine.parseAndRender(current, context)

      log.trace(
        `XpmLiquidMap.performSubstitutions() ${count}: |`,
        substituted,
        '|'
      )
      /* c8 ignore start */ /* istanbul ignore next */
      if (substituted === current) {
        // If nothing changed, we're done.
        // Just a safety net, should not get there.
        break
      } /* c8 ignore stop */
      current = substituted
    }

    return substituted
  }
}

// ----------------------------------------------------------------------------
