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
import { chmodRecursive } from './chmod-recursive.js'
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

  folderPath: string
  jsonPackage?: JsonXpmPackage
  //packageJsonOriginal?: JsonXpmPackage

  readonly log: Logger

  // --------------------------------------------------------------------------
  // Constructor.

  constructor({ log, folderPath }: { log: Logger; folderPath: string }) {
    this.log = log
    this.folderPath = folderPath
  }

  // --------------------------------------------------------------------------
  // Methods.

  async readPackageDotJsonThrow(): Promise<JsonXpmPackage> {
    const jsonPath = path.join(this.folderPath, 'package.json')

    let fileContent: string | Buffer
    try {
      fileContent = await fs.readFile(jsonPath)
    } catch (err) {
      if (err instanceof Error) {
        this.log.trace(err.message)
      }
      throw new XpmInputError(`no package.json in folder ‘${this.folderPath}’`)
    }

    try {
      this.jsonPackage = JSON.parse(fileContent.toString()) as JsonXpmPackage
    } catch (err) {
      this.jsonPackage = undefined
      if (err instanceof Error) {
        this.log.trace(err.message)
      }
      throw new XpmInputError(
        `invalid package.json in folder ‘${this.folderPath}’`
      )
    }
    return this.jsonPackage
  }

  async readPackageDotJsonNoThrow(): Promise<JsonXpmPackage | undefined> {
    const jsonPath = path.join(this.folderPath, 'package.json')

    let fileContent: string | Buffer
    try {
      fileContent = await fs.readFile(jsonPath)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      return undefined
    }

    try {
      this.jsonPackage = JSON.parse(fileContent.toString()) as JsonXpmPackage
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (err) {
      return undefined
    }
    return this.jsonPackage
  }

  // Note: the json is explicitly passed.
  async rewritePackageDotJson(jsonPackage: JsonXpmPackage): Promise<void> {
    const log = this.log

    assert(jsonPackage)
    const jsonString = JSON.stringify(jsonPackage, null, 2) + '\n'

    const filePath = path.join(this.folderPath, 'package.json')
    log.trace(`write filePath: '${filePath}'`)
    await fs.writeFile(filePath, jsonString)
  }

  isNpmPackage(): boolean {
    const json = this.jsonPackage
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

  isXpmPackage(): boolean {
    const json = this.jsonPackage
    if (!this.isNpmPackage()) {
      return false
    }
    if (json?.xpack === undefined) {
      return false
    }
    return true
  }

  isBinaryXpmPackage() {
    const json = this.jsonPackage
    // Since Nov. 2024, `executables` is preferred to `bin`.
    return this.isXpmPackage() && !!(json?.xpack.executables ?? json?.xpack.bin)
  }

  isNodeModule() {
    const json = this.jsonPackage
    return !!json && !json.xpack
  }

  isBinaryNodeModule() {
    const json = this.jsonPackage
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return this.isNodeModule() && !!json?.bin
  }

  hasNpmScripts(): boolean {
    const json = this.jsonPackage
    if (json?.scripts !== undefined && Object.keys(json.scripts).length > 0) {
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
    const log = this.log
    const json = this.jsonPackage

    log.trace(`${XpmPackage.name}.getMinimumXpmRequired()`)

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const version = json?.xpack?.minimumXpmRequired
    if (version === undefined) {
      return undefined
    }
    // Remove the pre-release part.
    return version.replace(/-.*$/, '')
  }

  async checkMinimumXpmRequired(
    xpmRootPath: string
  ): Promise<string | undefined> {
    const log = this.log
    const json = this.jsonPackage

    log.trace(`${XpmPackage.name}.checkMinimumXpmRequired()`)

    if (!json) {
      // Not in a package.
      return undefined
    }

    if (!this.isXpmPackage() || !json.xpack.minimumXpmRequired) {
      log.trace('minimumXpmRequired not used, no checks')
      return undefined
    }
    // Remove the pre-release part.
    const cleanedVersion = semver.clean(
      json.xpack.minimumXpmRequired.replace(/-.*$/, '')
    )
    if (!cleanedVersion) {
      return undefined
    }
    const minimumXpmRequired: string = cleanedVersion

    log.trace(`minimumXpmRequired: ${minimumXpmRequired}`)
    log.trace(`rootPath: ${xpmRootPath}`)

    let jsonXpmCliPackage: JsonXpmPackage
    try {
      const xpmCliPackage = new XpmPackage({ log, folderPath: xpmRootPath })
      jsonXpmCliPackage = await xpmCliPackage.readPackageDotJsonThrow()
    } catch (err) {
      if (err instanceof Error) {
        log.trace(err.message)
      } else {
        log.trace(err)
      }
      return undefined
    }
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
          (json.name ? `'${json.name}' ` : '') +
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

    const log = this.log

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
    const log = this.log

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
    const log = this.log
    log.trace(`${XpmPackage.name}.pacoteCreateManifest('${specifier}')`)
    const manifest = await pacote.manifest(specifier, {
      cache: cacheFolderPath,
    })

    return manifest
  }

  async pacoteExtractPackage({
    packFullName,
    manifestFrom,
    destinationFolderPath,
    cacheFolderPath,
    setReadOnly,
    verboseMessage,
    config,
    policies,
  }: {
    packFullName: string
    manifestFrom: string
    destinationFolderPath: string
    cacheFolderPath: string
    setReadOnly: boolean
    verboseMessage: string
    config: XpmConfig
    policies: XpmPolicies
  }): Promise<void> {
    assert(packFullName)
    assert(manifestFrom)
    assert(destinationFolderPath)
    assert(cacheFolderPath)
    assert(verboseMessage)
    assert(config)
    assert(policies)

    const log = this.log
    log.trace(`${XpmPackage.name}.pacoteExtractContent('${manifestFrom}')`)

    const destinationPackage = new XpmPackage({
      log,
      folderPath: destinationFolderPath,
    })
    const destinationJson = await destinationPackage.readPackageDotJsonNoThrow()
    if (destinationJson) {
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

    await this.pacoteExtract({
      packFullName,
      manifestFrom,
      destinationFolderPath,
      destinationTmpFolderPath,
      cacheFolderPath,
      verboseMessage,
      config,
    })

    const json = await destinationPackage.readPackageDotJsonNoThrow()
    if (!json?.xpack) {
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
      await this.downloadBinaries({
        packagePath: destinationFolderPath,
        packageTmpPath: destinationTmpFolderPath,
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
    packFullName,
    manifestFrom,
    destinationFolderPath,
    destinationTmpFolderPath,
    cacheFolderPath,
    verboseMessage,
    config,
  }: {
    packFullName: string
    manifestFrom: string
    destinationFolderPath: string
    destinationTmpFolderPath: string
    cacheFolderPath: string
    verboseMessage: string
    config: XpmConfig
  }): Promise<void> {
    assert(packFullName)
    assert(manifestFrom)
    assert(destinationFolderPath)
    assert(destinationTmpFolderPath)
    assert(cacheFolderPath)
    assert(verboseMessage)
    assert(config)

    const log = this.log
    log.trace(`${XpmPackage.name}.pacoteExtract(${manifestFrom})`)

    if (log.isVerbose && verboseMessage) {
      log.verbose(verboseMessage)
    }

    try {
      if (!config.isDryRun) {
        log.trace(`pacote.extract(${manifestFrom})`)
        const fetchResult = await pacote.extract(
          manifestFrom,
          destinationTmpFolderPath,
          { cache: cacheFolderPath, Arborist }
        )
        log.trace(`fetchResult: ${util.inspect(fetchResult)}`)
      }
      if (!log.isVerbose) {
        if (config.isDryRun) {
          log.info(`${packFullName} => '${destinationFolderPath}' (dry run)`)
        } else {
          log.info(`${packFullName} => '${destinationFolderPath}'`)
        }
      }
    } catch (err) {
      log.trace(util.inspect(err))
      throw new XpmInputError(`Package ${packFullName} not found`)
    }
  }

  async downloadBinaries({
    packagePath,
    packageTmpPath,
    cacheFolderPath,
    config,
  }: {
    packagePath: string
    packageTmpPath: string
    cacheFolderPath: string
    config: XpmConfig
  }): Promise<void> {
    assert(packagePath)
    assert(packageTmpPath)
    assert(cacheFolderPath)
    assert(config)

    const log = this.log

    log.trace(`${XpmPackage.name}.downloadBinaries(${packageTmpPath})`)
    const tmpPackage = new XpmPackage({ log, folderPath: packageTmpPath })
    const json = await tmpPackage.readPackageDotJsonNoThrow()
    if (!tmpPackage.isXpmPackage()) {
      log.debug(
        "doesn't look like an xpm package, " + 'package.json has no "xpack"'
      )
      return
    }
    if (!tmpPackage.isBinaryXpmPackage()) {
      log.debug(
        "doesn't look like an xpm package, " +
          'package.json has no "xpack.executables"'
      )
      return
    }

    if (!json?.xpack.binaries) {
      log.debug(
        "doesn't look like a binary xpm package, " +
          'package.json has no "xpack.binaries"'
      )
      return
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!json?.xpack.binaries.platforms) {
      log.debug(
        "doesn't look like a binary xpm package, " +
          'package.json has no "xpack.binaries.platforms"'
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

    const platforms = json.xpack.binaries.platforms

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

    if (!json.xpack.binaries.baseUrl) {
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
    let fileUrl = platform.baseUrl ?? json.xpack.binaries.baseUrl
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
    if (json.xpack.binaries.skip) {
      try {
        skip = json.xpack.binaries.skip
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        // Ignore invalid skip value, use default
      }
    }
    log.trace(`skip ${skip.toString()} levels`)

    const contentFolderRelativePath =
      json.xpack.binaries.destination || '.content'
    const contentFolderPath = path.join(packagePath, contentFolderRelativePath)
    const contentFolderTmpPath = path.join(
      packageTmpPath,
      contentFolderRelativePath
    )

    log.trace(`del ${contentFolderTmpPath}`)
    await deleteAsync(contentFolderTmpPath, { force: true })

    const cacheInfoPath = cacheInfo.path
    log.trace(`cacheInfoPath ${cacheInfoPath}`)
    let res: decompress.File[] = []
    // Currently this includes decompressTar(), decompressTarbz2(),
    // decompressTargz(), decompressUnzip().
    log.info(`Extracting '${platform.fileName}'...`)

    res = await decompress(cacheInfoPath, contentFolderTmpPath, {
      strip: skip,
    })

    if (log.isVerbose) {
      // The common value is self relative ./.content; remove the folder.
      const shownFolderRelativePath = contentFolderRelativePath.replace(
        /^\.\//,
        ''
      )
      assert(json.version)
      log.verbose(
        `${res.length.toString()} files extracted in ` +
          `'${json.version}/${shownFolderRelativePath}'`
      )
    } else {
      log.info(`${res.length.toString()} files => '${contentFolderPath}'`)
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
    const log = this.log

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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
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
