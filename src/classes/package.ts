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
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

// https://www.npmjs.com/package/semver
import semver from 'semver'

// https://www.npmjs.com/package/@xpack/logger
import { Logger } from '@xpack/logger'

// ----------------------------------------------------------------------------

import {
  JsonBuildConfiguration,
  JsonBuildConfigurationContent,
  JsonBuildConfigurationTemplate,
  JsonXpmPackage,
} from '../types/json.js'
import { XpmInputError, XpmPrerequisitesError } from './errors.js'
import { JsonPackageSpecifier } from '../types/json.js'

// ----------------------------------------------------------------------------

export class XpmPackage {
  // --------------------------------------------------------------------------
  // Members.

  packageFolderPath: string
  jsonPackage?: JsonXpmPackage

  readonly #log: Logger

  // --------------------------------------------------------------------------
  // Constructor.

  constructor({
    log,
    packageFolderPath,
  }: {
    log: Logger
    packageFolderPath: string
  }) {
    this.#log = log
    this.packageFolderPath = packageFolderPath

    log.trace(`${XpmPackage.name}(${packageFolderPath})`)
  }

  // --------------------------------------------------------------------------
  // Methods.

  async readPackageDotJson({
    withThrow = false,
  }: {
    withThrow?: boolean
  } = {}): Promise<JsonXpmPackage | undefined> {
    const jsonFilePath = path.join(this.packageFolderPath, 'package.json')

    let fileContent: string | Buffer
    try {
      fileContent = await fs.readFile(jsonFilePath)
    } catch (err) {
      if (withThrow) {
        if (err instanceof Error) {
          this.#log.trace(err.message)
        }
        throw new XpmInputError(
          `no package.json in folder ‘${this.packageFolderPath}’`
        )
      } else {
        return undefined
      }
    }

    try {
      this.jsonPackage = JSON.parse(fileContent.toString()) as JsonXpmPackage
    } catch (err) {
      if (withThrow) {
        this.jsonPackage = undefined
        if (err instanceof Error) {
          this.#log.trace(err.message)
        }
        throw new XpmInputError(
          `invalid package.json in folder ‘${this.packageFolderPath}’`
        )
      } else {
        return undefined
      }
    }
    return this.jsonPackage
  }

  // Note: the json is explicitly passed.
  async rewritePackageDotJson(jsonPackage: JsonXpmPackage): Promise<void> {
    const log = this.#log

    assert(jsonPackage)
    const jsonString = JSON.stringify(jsonPackage, null, 2) + '\n'

    const jsonFilePath = path.join(this.packageFolderPath, 'package.json')
    log.trace(`write filePath: '${jsonFilePath}'`)
    await fs.writeFile(jsonFilePath, jsonString)
  }

  isNpmPackage(): boolean {
    const jsonPackage = this.jsonPackage
    if (jsonPackage?.name === undefined || jsonPackage.version === undefined) {
      return false
    }
    const name = jsonPackage.name.trim()
    if (name.length === 0) {
      return false
    }
    const version = jsonPackage.version.trim()
    if (version.length === 0) {
      return false
    }
    return true
  }

  isXpmPackage(): boolean {
    const jsonPackage = this.jsonPackage
    if (!this.isNpmPackage()) {
      return false
    }
    if (jsonPackage?.xpack === undefined) {
      return false
    }
    return true
  }

  // Binary packages must have both executables and binaries, but
  // the presence of one implies the other, so validate.
  isBinaryXpmPackage() {
    const jsonPackage = this.jsonPackage
    if (!this.isXpmPackage()) {
      return false
    }
    // Since Nov. 2024, `executables` is preferred to `bin`.
    if (jsonPackage?.xpack.executables ?? jsonPackage?.xpack.bin) {
      // If it has `executables` or `bin`, it must have `binaries` and
      // `binaries.platforms` too.
      if (!jsonPackage.xpack.binaries) {
        throw new XpmInputError(
          "doesn't look like a proper binary xpm package, " +
            'package.json has no "xpack.binaries"'
        )
      }

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!jsonPackage.xpack.binaries.platforms) {
        throw new XpmInputError(
          "doesn't look like a proper binary xpm package, " +
            'package.json has no "xpack.binaries.platforms"'
        )
      }
      return true
    }
    if (jsonPackage?.xpack.binaries) {
      // If it has `binaries`, it must have `binaries.platforms` and
      // `executables` too.

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!jsonPackage.xpack.binaries.platforms) {
        throw new XpmInputError(
          "doesn't look like a proper binary xpm package, " +
            'package.json has no "xpack.binaries.platforms"'
        )
      }
      if (!(jsonPackage.xpack.executables ?? jsonPackage.xpack.bin)) {
        throw new XpmInputError(
          "doesn't look like a proper binary xpm package, " +
            'package.json has no "xpack.executables"'
        )
      }
      return true
    }
    return false
  }

  isNodeModule() {
    const jsonPackage = this.jsonPackage
    return !!jsonPackage && !jsonPackage.xpack
  }

  isBinaryNodeModule() {
    const jsonPackage = this.jsonPackage

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return this.isNodeModule() && !!jsonPackage?.bin
  }

  hasNpmScripts(): boolean {
    const jsonPackage = this.jsonPackage
    if (
      jsonPackage?.scripts !== undefined &&
      Object.keys(jsonPackage.scripts).length > 0
    ) {
      return true
    }

    return false
  }

  hasXpmActions(): boolean {
    const json = this.jsonPackage
    if (!this.isXpmPackage()) {
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
        for (const buildConfigurationName of Object.keys(
          json.xpack.buildConfigurations
        )) {
          const buildConfiguration: JsonBuildConfiguration =
            json.xpack.buildConfigurations[buildConfigurationName]
          if (
            buildConfigurationName.includes('{{') ||
            buildConfigurationName.includes('{%')
          ) {
            const buildConfigurationTemplate =
              buildConfiguration as JsonBuildConfigurationTemplate
            if (
              buildConfigurationTemplate.template.actions !== undefined &&
              Object.keys(buildConfigurationTemplate.template.actions).length >
                0
            ) {
              return true
            }
          } else {
            const buildConfigurationContent =
              buildConfiguration as JsonBuildConfigurationContent
            if (
              buildConfigurationContent.actions !== undefined &&
              Object.keys(buildConfigurationContent.actions).length > 0
            ) {
              return true
            }
          }
        }
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      // In case xpack is not an option to get its properties.
    }

    return false
  }

  getMinimumXpmRequired(): string | undefined {
    const log = this.#log
    const jsonPackage = this.jsonPackage

    log.trace(`${XpmPackage.name}.getMinimumXpmRequired()`)

    const version = jsonPackage?.xpack.minimumXpmRequired
    if (version === undefined) {
      return undefined
    }
    // Remove the pre-release part.
    return version.replace(/-.*$/, '')
  }

  async checkMinimumXpmRequired({
    xpmRootFolderPath,
  }: {
    xpmRootFolderPath: string
  }): Promise<string | undefined> {
    const log = this.#log
    const jsonPackage = this.jsonPackage

    log.trace(`${XpmPackage.name}.checkMinimumXpmRequired()`)

    if (!jsonPackage) {
      // Not in a package.
      return undefined
    }

    if (!this.isXpmPackage() || !jsonPackage.xpack.minimumXpmRequired) {
      log.trace('minimumXpmRequired not used, no checks')
      return undefined
    }
    // Remove the pre-release part.
    const cleanedVersion = semver.clean(
      jsonPackage.xpack.minimumXpmRequired.replace(/-.*$/, '')
    )
    if (!cleanedVersion) {
      return undefined
    }
    const minimumXpmRequired: string = cleanedVersion

    log.trace(`minimumXpmRequired: ${minimumXpmRequired}`)

    let jsonXpmCliPackage: JsonXpmPackage | undefined
    try {
      const cliXpmPackage = new XpmPackage({
        log,
        packageFolderPath: xpmRootFolderPath,
      })
      jsonXpmCliPackage = await cliXpmPackage.readPackageDotJson({
        withThrow: true,
      })
    } catch (err) {
      if (err instanceof Error) {
        log.trace(err.message)
      } else {
        log.trace(err)
      }
      return undefined
    }
    assert(jsonXpmCliPackage)
    log.trace(jsonXpmCliPackage.version)

    if (!jsonXpmCliPackage.version) {
      return undefined
    }

    // Remove the pre-release part.
    const xpmVersion = semver.clean(
      jsonXpmCliPackage.version.replace(/-.*$/, '')
    )
    if (!xpmVersion) {
      return undefined
    }
    if (semver.lt(xpmVersion, minimumXpmRequired)) {
      throw new XpmPrerequisitesError(
        'package ' +
          (jsonPackage.name ? `'${jsonPackage.name}' ` : '') +
          `requires xpm v${minimumXpmRequired} or later, please upgrade`
      )
    }
    // Check passed.
    return minimumXpmRequired
  }

  parsePackageSpecifier({
    npmPackageSpecifier,
  }: {
    npmPackageSpecifier: string
  }): JsonPackageSpecifier {
    assert(npmPackageSpecifier)

    const log = this.#log

    let scope
    let name
    let version

    if (npmPackageSpecifier.startsWith('@')) {
      const arr = npmPackageSpecifier.split('/')
      if (arr.length > 2) {
        throw new XpmInputError(`'${npmPackageSpecifier}' not a package name`)
      }
      scope = arr[0]
      if (arr.length > 1) {
        const arr2 = arr[1].split('@')
        name = arr2[0]
        if (arr2.length > 1) {
          version = arr2[1]
        }
      }
    } else {
      const arr2 = npmPackageSpecifier.split('@')
      name = arr2[0]
      if (arr2.length > 1) {
        version = arr2[1]
      }
    }
    log.trace(
      `${npmPackageSpecifier} => ` +
        `${scope ?? '?'} ${name ?? '?'} ${version ?? '?'}`
    )

    return { scope, name, version }
  }
}

// ----------------------------------------------------------------------------
