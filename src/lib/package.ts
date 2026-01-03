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
import * as os from 'node:os'
import * as path from 'node:path'
import util from 'node:util'
import stream from 'node:stream'

// https://www.npmjs.com/package/@npmcli/arborist
import { Arborist } from '@npmcli/arborist'

// https://www.npmjs.com/package/pacote
import pacote, { AbbreviatedManifest, ManifestResult } from 'pacote'

// https://www.npmjs.com/package/cacache
import cacache, { put } from 'cacache'

// https://www.npmjs.com/package/decompress
import decompress from 'decompress'

// https://www.npmjs.com/package/semver
import semver from 'semver'

// https://www.npmjs.com/package/del
import { deleteAsync } from 'del'

// https://www.npmjs.com/package/proxy-from-env
import { getProxyForUrl } from 'proxy-from-env'

// https://www.npmjs.com/package/https-proxy-agent
import { HttpsProxyAgent } from 'https-proxy-agent'

// https://www.npmjs.com/package/node-fetch
import fetch, { Response } from 'node-fetch'

// https://www.npmjs.com/package/@xpack/logger
import { Logger } from '@xpack/logger'

// ----------------------------------------------------------------------------

import {
  JsonBuildConfiguration,
  // JsonNpmPackage,
  JsonXpmPackage,
  XpmConfig,
} from './types.js'
import { chmodRecursive } from './functions/chmod-recursive.js'
import { XpmPolicies } from './policies.js'
import { XpmError, XpmInputError, XpmPrerequisitesError } from './errors.js'

// ----------------------------------------------------------------------------

export interface XpmPackageSpecifier {
  scope?: string
  name?: string
  version?: string
}

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

  getMinimumXpmRequired(): string | undefined {
    const log = this.#log
    const jsonPackage = this.jsonPackage

    log.trace(`${XpmPackage.name}.getMinimumXpmRequired()`)

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const version = jsonPackage?.xpack?.minimumXpmRequired
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
  }): XpmPackageSpecifier {
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

  getPlatformKey({
    doForce32bit = false,
  }: {
    doForce32bit?: boolean
  } = {}): string {
    const log = this.#log

    const platform = process.platform
    let arch = process.arch
    if (doForce32bit) {
      if (platform === 'win32' && arch === 'x64') {
        arch = 'ia32'
      } else if (platform === 'linux' && arch === 'x64') {
        arch = 'ia32'
      } else if (platform === 'linux' && arch === 'arm64') {
        arch = 'arm'
      }
    }
    const key = `${platform}-${arch}`
    log.trace(`platform key: ${key}`)
    return key
  }

  async pacoteCreateManifest({
    specifier,
    cacheFolderPath,
  }: {
    specifier: string
    cacheFolderPath: string
  }): Promise<AbbreviatedManifest & ManifestResult> {
    const log = this.#log
    log.trace(`${XpmPackage.name}.pacoteCreateManifest('${specifier}')`)
    const manifest = await pacote.manifest(specifier, {
      cache: cacheFolderPath,
    })

    return manifest
  }

  async pacoteExtractPackage({
    packFullName,
    specifier,
    destinationFolderPath,
    cacheFolderPath,
    setReadOnly,
    verboseMessage,
    config,
    policies,
  }: {
    packFullName: string
    specifier: string
    destinationFolderPath: string
    cacheFolderPath: string
    setReadOnly: boolean
    verboseMessage: string
    config: XpmConfig
    policies: XpmPolicies
  }): Promise<void> {
    assert(packFullName)
    assert(specifier)
    assert(destinationFolderPath)
    assert(cacheFolderPath)
    assert(verboseMessage)
    assert(config)
    assert(policies)

    const log = this.#log
    log.trace(`${XpmPackage.name}.pacoteExtractContent('${specifier}')`)

    let destinationXpmPackage = new XpmPackage({
      log,
      packageFolderPath: destinationFolderPath,
    })
    const jsonDestination = await destinationXpmPackage.readPackageDotJson()
    if (jsonDestination) {
      // The package is already present in the destination folder.
      if (!config.doForce) {
        if (!config.doSkipIfInstalled) {
          log.warn(
            `package ${packFullName} already installed, ` +
              'use --force to overwrite'
          )
        }
        return // Not an error, proceed to other packages.
      }

      if (setReadOnly) {
        if (config.isDryRun) {
          log.verbose('Pretend changing permissions to read-write...')
          log.verbose(
            'Pretend removing existing package from ' +
              `'${destinationFolderPath}'...`
          )
        } else {
          log.verbose('Changing permissions to read-write...')
          await chmodRecursive({
            inputPath: destinationFolderPath,
            readOnly: false,
            log,
          })

          log.verbose(
            `Removing existing package from '${destinationFolderPath}'...`
          )
          await deleteAsync(destinationFolderPath, { force: true })
        }
      }
    }

    const destinationTmpFolderPath = destinationFolderPath + '.tmp'
    log.trace(`del(${destinationTmpFolderPath})`)
    await deleteAsync(destinationTmpFolderPath, { force: true })

    if (log.isVerbose && verboseMessage) {
      log.verbose(verboseMessage)
    }

    if (config.isDryRun) {
      if (!log.isVerbose) {
        log.info(`${packFullName} => '${destinationFolderPath}' (dry run)`)
      }
    } else {
      await this.pacoteExtract({
        specifier: specifier,
        destinationFolderPath: destinationTmpFolderPath,
        cacheFolderPath,
      })
      if (!log.isVerbose) {
        log.info(`${packFullName} => '${destinationFolderPath}'`)
      }
      destinationXpmPackage = new XpmPackage({
        log,
        packageFolderPath: destinationTmpFolderPath,
      })
    }

    await destinationXpmPackage.readPackageDotJson()
    if (!destinationXpmPackage.isXpmPackage()) {
      if (!policies.shareNpmDependencies) {
        log.trace(`del(${destinationTmpFolderPath})`)
        await deleteAsync(destinationTmpFolderPath, { force: true })
        throw new XpmInputError(
          `${packFullName} is not an xpm package, use npm to install it`
        )
      }
      log.debug(
        `'${destinationFolderPath}' doesn't look like an ` +
          'xpm package, package.json has no "xpack"'
      )
      return
    }

    if (config.isDryRun) {
      if (setReadOnly) {
        log.verbose('Pretend changing permissions to read-only...')
      }
    } else {
      await this.#downloadBinaries({
        destinationXpmPackage,
        destinationFolderPath,
        cacheFolderPath,
        config,
      })

      // When everything is ready, rename the folder to the desired name.
      await fs.rename(destinationTmpFolderPath, destinationFolderPath)
      log.trace(`rename(${destinationTmpFolderPath}, ${destinationFolderPath})`)

      log.trace(`in '${destinationFolderPath}'`)
      if (setReadOnly) {
        log.verbose('Changing permissions to read-only...')
        await chmodRecursive({
          inputPath: destinationFolderPath,
          readOnly: true,
          log,
        })
      }
    }
  }

  async pacoteExtract({
    specifier,
    destinationFolderPath,
    cacheFolderPath,
  }: {
    specifier: string
    destinationFolderPath: string
    cacheFolderPath: string
  }): Promise<void> {
    assert(specifier)
    assert(destinationFolderPath)
    assert(cacheFolderPath)

    const log = this.#log
    log.trace(`${XpmPackage.name}.pacoteExtract(${specifier})`)

    try {
      log.trace(`pacote.extract(${specifier})`)
      const fetchResult = await pacote.extract(
        specifier,
        destinationFolderPath,
        { cache: cacheFolderPath, Arborist }
      )
      log.trace(`fetchResult: ${util.inspect(fetchResult)}`)
    } catch (err) {
      log.trace(util.inspect(err))
      throw new XpmInputError(`Package ${specifier} not found`)
    }
  }

  async #downloadBinaries({
    destinationXpmPackage,
    destinationFolderPath,
    cacheFolderPath,
    config,
  }: {
    destinationXpmPackage: XpmPackage
    destinationFolderPath: string
    cacheFolderPath: string
    config: XpmConfig
  }): Promise<void> {
    assert(destinationXpmPackage)
    assert(destinationFolderPath)
    assert(cacheFolderPath)
    assert(config)

    const log = this.#log
    const packageFolderPath = destinationXpmPackage.packageFolderPath
    const jsonPackage = destinationXpmPackage.jsonPackage
    assert(jsonPackage)

    log.trace(`${XpmPackage.name}.downloadBinaries(${packageFolderPath})`)
    if (!destinationXpmPackage.isXpmPackage()) {
      log.debug(
        "doesn't look like an xpm package, " + 'package.json has no "xpack"'
      )
      return
    }
    if (!destinationXpmPackage.isBinaryXpmPackage()) {
      log.debug(
        "doesn't look like an xpm package, " +
          'package.json has no "xpack.executables" and "xpack.binaries"'
      )
      return
    }

    const platformKey = this.getPlatformKey()
    const platformKeyAliases = new Set<string>()

    if (['linux-x32', 'linux-x86', 'linux-ia32'].includes(platformKey)) {
      platformKeyAliases.add('linux-x32')
      platformKeyAliases.add('linux-x86')
      platformKeyAliases.add('linux-ia32') // official
    } else if (['win32-x32', 'win32-x86', 'win32-ia32'].includes(platformKey)) {
      platformKeyAliases.add('win32-x32')
      platformKeyAliases.add('win32-x86')
      platformKeyAliases.add('win32-ia32') // official
    } else {
      platformKeyAliases.add(platformKey)
    }

    assert(jsonPackage.xpack.binaries)
    const platforms = jsonPackage.xpack.binaries.platforms

    let platform
    for (const item of platformKeyAliases) {
      if (Object.prototype.hasOwnProperty.call(platforms, item)) {
        platform = platforms[item]
        break
      }
    }
    if (!platform) {
      throw new XpmInputError(`platform ${platformKey} not supported`)
    }

    if (!jsonPackage.xpack.binaries.baseUrl) {
      throw new XpmInputError(
        'missing "xpack.binaries.baseUrl" in package.json'
      )
    }

    if (platform.skip) {
      log.warn('no binaries are available for this platform, command ignored')
      return
    }

    if (!platform.fileName) {
      throw new XpmInputError(
        `missing xpack.binaries.platform[${platformKey}].fileName`
      )
    }

    // Prefer the platform specific URL, if available, otherwise
    // use the common URL.
    let fileUrl = platform.baseUrl ?? jsonPackage.xpack.binaries.baseUrl
    if (!fileUrl.endsWith('/')) {
      fileUrl += '/'
    }

    fileUrl += platform.fileName

    let hashAlgorithm = '?'
    let hexSum = '?'
    if (platform.sha256) {
      hashAlgorithm = 'sha256'
      hexSum = platform.sha256
    } else if (platform.sha512) {
      hashAlgorithm = 'sha512'
      hexSum = platform.sha512
    }

    let integrityDigest = '?'
    if (hexSum) {
      const buff = Buffer.from(hexSum, 'hex')
      integrityDigest = `${hashAlgorithm}-${buff.toString('base64')}`
    }
    log.trace(`expected integrity digest ${integrityDigest} for ${hexSum}`)

    if (config.isDryRun) {
      log.info(`Pretend downloading ${fileUrl}...`)
      log.info(`Pretend extracting '${platform.fileName}'...`)
      return
    }

    const cacheKey = `xpm:binaries:${platform.fileName}`
    log.trace(`getting cacache info(${cacheFolderPath}, ${cacheKey})...`)
    // Debug only, to force the downloads.
    // await cacache.rm.entry(cacheFolderPath, cacheKey)
    let cacheInfo = await cacache.get.info(cacheFolderPath, cacheKey)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!cacheInfo) {
      // If the cache has no idea of the desired file, proceed with
      // the download.
      log.info(`Downloading ${fileUrl}...`)
      const opts: { integrity?: string } = {}
      if (integrityDigest) {
        // Enable hash checking.
        opts.integrity = integrityDigest
      }
      try {
        await this.cacheArchive({
          url: fileUrl,
          cacheFolderPath,
          key: cacheKey,
          opts,
        })
        log.trace(`cache written for ${fileUrl}`)
      } catch (err) {
        log.trace(util.inspect(err))
        // Do not throw yet, only display the error.
        if (err instanceof Error) {
          log.info(err.message)
        } else {
          log.info(String(err))
        }
        if (os.platform() === 'win32') {
          log.info(
            'If you have an aggressive antivirus, try to ' +
              'reconfigure it, or temporarily disable it'
          )
        }
        throw new XpmError('download failed, quit')
      }
      // Update the cache info after downloading the file.
      cacheInfo = await cacache.get.info(cacheFolderPath, cacheKey)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (!cacheInfo) {
        throw new XpmError('download failed, quit')
      }
    }

    log.trace(`cache path ${cacheInfo.path} for ${fileUrl}`)

    // The number of initial folder levels to skip.
    let skip = 0
    if (jsonPackage.xpack.binaries.skip) {
      try {
        skip = jsonPackage.xpack.binaries.skip
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        // Ignore invalid skip value, use default
      }
    }
    log.trace(`skip ${skip.toString()} levels`)

    const contentFolderRelativePath =
      jsonPackage.xpack.binaries.destination || '.content'
    const contentFolderPath = path.join(
      packageFolderPath,
      contentFolderRelativePath
    )
    const destinationContentFolderPath = path.join(
      destinationFolderPath,
      contentFolderRelativePath
    )

    log.trace(`del ${contentFolderPath}`)
    await deleteAsync(contentFolderPath, { force: true })

    const cacheInfoPath = cacheInfo.path
    log.trace(`cacheInfoPath ${cacheInfoPath}`)
    let res: decompress.File[] = []
    // Currently this includes decompressTar(), decompressTarbz2(),
    // decompressTargz(), decompressUnzip().
    log.info(`Extracting '${platform.fileName}'...`)

    res = await decompress(cacheInfoPath, contentFolderPath, {
      strip: skip,
    })

    if (log.isVerbose) {
      // The common value is self relative ./.content; remove the folder.
      const shownFolderRelativePath = contentFolderRelativePath.replace(
        /^\.\//,
        ''
      )
      assert(jsonPackage.version)
      log.verbose(
        `${res.length.toString()} files extracted in ` +
          `'${jsonPackage.version}/${shownFolderRelativePath}'`
      )
    } else {
      log.info(
        `${res.length.toString()} files => '${destinationContentFolderPath}'`
      )
    }
  }

  // Returns nothing. Used by downloadBinaries().
  async cacheArchive({
    url,
    cacheFolderPath,
    key,
    opts,
  }: {
    url: string
    cacheFolderPath: string
    key: string

    opts: put.Options
  }): Promise<void> {
    assert(url)
    assert(cacheFolderPath)
    assert(key)
    assert(opts)
    const log = this.#log

    // https://github.com/node-fetch/node-fetch/blob/main/docs/ERROR-HANDLING.md
    // https://github.com/node-fetch/node-fetch/blob/main/test/main.js
    // https://www.scrapingbee.com/blog/proxy-node-fetch/
    // https://iproyal.com/blog/how-do-i-use-a-node-fetch-proxy/

    let response: Response | undefined
    let timeoutMillis = 1000
    // If no proxy is set, an empty string is returned.

    const proxyUrl: string = getProxyForUrl(url)
    log.trace(`proxyUrl ${proxyUrl}`)
    const maxRetry = 5
    for (let retry = 0; retry < maxRetry; ++retry) {
      try {
        if (proxyUrl.length > 0) {
          const proxyAgent = new HttpsProxyAgent(proxyUrl)
          log.trace(`proxyAgent ${util.inspect(proxyAgent)} for ${url}`)
          response = await fetch(url, { agent: proxyAgent })
        } else {
          response = await fetch(url)
        }
      } catch (err) {
        log.trace(util.inspect(err))
        const errorMessage = err instanceof Error ? err.message : String(err)
        throw new XpmError(`${errorMessage} in fetch ${url}`)
      }

      log.debug(`fetch.status ${response.status.toString()} ${url}`)
      log.trace(`fetch.statusText ${response.statusText} ${url}`)

      if (!response.ok) {
        break
      }

      // the HTTP response status was [200, 300).
      // https://en.wikipedia.org/wiki/List_of_HTTP_status_codes#2xx_success

      const pipelinePromise = util.promisify(stream.pipeline)

      log.trace(`create write stream for ${key}`)

      const cacacheWriteStream = cacache.put.stream(cacheFolderPath, key, opts)
      log.trace(`create pipeline for ${key}`)
      try {
        assert(response.body)
        await pipelinePromise(response.body, cacacheWriteStream)
        // If no exception, everything must be ok.
        return
      } catch (err) {
        log.trace(util.inspect(err))
        const errorMessage = err instanceof Error ? err.message : String(err)
        if (retry >= maxRetry) {
          throw new XpmError(`${errorMessage} in pipeline ${url}`)
        }
        // For now retry on all errors during download.
        // TODO: identify non recoverable and quit.
        log.warn(`${errorMessage} while downloading ${url}, retrying...`)
        const tenPercent = timeoutMillis * 0.1
        // +/- 10%
        // Math.random() * (max - min) + min
        const jitter = Math.floor(
          Math.random() * (tenPercent - -tenPercent) + -tenPercent
        )
        timeoutMillis = timeoutMillis + jitter
        log.debug(`timeoutMillis: ${timeoutMillis.toString()}`)
        const sleep = (ms: number) =>
          new Promise((resolve) => setTimeout(resolve, ms))
        await sleep(timeoutMillis)

        // 1 2 4 8 16... seconds
        timeoutMillis = timeoutMillis * 2
      }
    }

    // res.status < 200 || res.status >= 300 (4xx, 5xx)
    // 1xx informational
    // 3xx: redirection messages
    // 4xx: client error
    // 5xx: server error
    // TODO: detect cases that can be retried.
    assert(response)
    throw new XpmError(
      `server returned ${response.status.toString()}: ` +
        `${response.statusText} for ${key}`
    )
  }
}

// ----------------------------------------------------------------------------
