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

import assert from 'node:assert'
import * as fs from 'node:fs/promises'
import * as os from 'node:os'
import * as path from 'node:path'
import util from 'node:util'
import stream from 'node:stream'
import { Logger } from '@xpack/logger'

// import * as utils from './utils.js'
import {
  JsonBuildConfiguration,
  JsonNpmPackage,
  JsonXpmPackage,
} from './liquid-package.js'

// ----------------------------------------------------------------------------

export class XpmPackage {
  // --------------------------------------------------------------------------
  // Members.

  folderPath?: string
  jsonPackage?: JsonXpmPackage
  //packageJsonOriginal?: JsonXpmPackage

  readonly log: Logger

  // --------------------------------------------------------------------------
  // Constructor.

  constructor(log: Logger, folderPath: string | undefined = undefined) {
    this.log = log
    this.folderPath = folderPath
  }

  // --------------------------------------------------------------------------
  // Methods.

  async checkIfFolderHasPackageJson(
    folderPath?: string
  ): Promise<JsonNpmPackage | null> {
    let tmpPath: string | undefined
    if (folderPath !== undefined) {
      tmpPath = folderPath
    } else {
      tmpPath = this.folderPath
    }
    if (tmpPath === undefined) {
      return null
    }

    const jsonPath = path.join(tmpPath, 'package.json')

    try {
      const fileContent = await fs.readFile(jsonPath)
      // assert(fileContent !== null)
      const jsonPackage = JSON.parse(fileContent.toString()) as JsonXpmPackage

      // If not called with explicit path, remember the resulted json.
      if (folderPath === undefined) {
        this.jsonPackage = jsonPackage
        return this.jsonPackage
      }
      return jsonPackage
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      if (folderPath === undefined) {
        this.jsonPackage = undefined
      }
      return null
    }
  }

  isNpmPackage(
    json: JsonNpmPackage | undefined | null = this.jsonPackage
  ): boolean {
    if (json?.name === undefined || json.version === undefined) {
      return false
    }
    const name = json.name.trim()
    if (name.length === 0) {
      return false
    }
    const version = json.version.trim()
    if (version.length === 0) {
      return false
    }
    return true
  }

  isXpmPackage(json: JsonNpmPackage | undefined = this.jsonPackage): boolean {
    if (!this.isNpmPackage(json)) {
      return false
    }
    if (json?.xpack === undefined) {
      return false
    }
    return true
  }

  hasNpmScripts(json: JsonNpmPackage | undefined = this.jsonPackage): boolean {
    if (json?.scripts !== undefined && Object.keys(json.scripts).length > 0) {
      return true
    }

    return false
  }

  hasXpmActions(json: JsonXpmPackage | undefined = this.jsonPackage): boolean {
    if (!this.isXpmPackage(json)) {
      return false
    }
    try {
      if (
        json?.xpack.actions !== undefined &&
        Object.keys(json.xpack.actions).length > 0
      ) {
        return true
      }
      if (
        json?.xpack.buildConfigurations !== undefined &&
        Object.keys(json.xpack.buildConfigurations).length > 0
      ) {
        // Don't use a lambda, to return directly from the loop.
        for (const name of Object.keys(json.xpack.buildConfigurations)) {
          const buildConfiguration: JsonBuildConfiguration =
            json.xpack.buildConfigurations[name]
          if (
            buildConfiguration.actions !== undefined &&
            Object.keys(buildConfiguration.actions).length > 0
          ) {
            return true
          }
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      // In case xpack is not an option to get its properties.
    }

    return false
  }
}

// ----------------------------------------------------------------------------
