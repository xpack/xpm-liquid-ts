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

import * as util from 'node:util'
import * as readline from 'node:readline/promises'
import * as path from 'node:path'
import * as fs from 'node:fs/promises'

// https://www.npmjs.com/package/make-dir
import { makeDirectory } from 'make-dir'

// https://www.npmjs.com/package/cp-file
import { copyFile } from 'cp-file'

// https://www.npmjs.com/package/liquidjs
import { Liquid } from 'liquidjs'

import { Logger } from '@xpack/logger'

import { XpmContext } from './types.js'
import { XpmOutputError, XpmSyntaxError } from './errors.js'
import assert from 'node:assert'

// ----------------------------------------------------------------------------

export type XpmInitTemplatePropertiesDefinitions = Record<
  string,
  XpmInitTemplatePropertiesDefinition
>

export interface XpmInitTemplatePropertiesDefinition {
  label: string
  description: string
  type: 'select' | 'string' | 'number' | 'boolean'
  items: Record<string, string | XpmInitTemplateItemValue>
  isMandatory?: boolean
  default?: string | number | boolean
}

export type XpmInitTemplatePlatform =
  | 'linux'
  | 'linux-x64'
  | 'linux-arm64'
  | 'win32'
  | 'darwin'
  | 'darwin-x64'
  | 'darwin-arm64'

export interface XpmInitTemplateItemValue {
  // 'linux', 'win32', 'darwin'
  platforms: XpmInitTemplatePlatform[]
  message: string
}

export interface XpmInitTemplateSubstitutionsVariables {
  properties: Record<string, string | boolean | number>
  [key: string]: unknown
}

// ----------------------------------------------------------------------------

export abstract class XpmInitTemplateBase {
  // --------------------------------------------------------------------------
  // Members.

  context: XpmContext
  log: Logger

  propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {}
  __dirname: string
  templatesPath: string
  engine: Liquid
  substitutionsVariables?: XpmInitTemplateSubstitutionsVariables

  // --------------------------------------------------------------------------
  // Constructor.

  constructor({
    context,
    propertiesDefinitions,
    __dirname,
    templatesPath,
  }: {
    context: XpmContext
    propertiesDefinitions: XpmInitTemplatePropertiesDefinitions
    __dirname: string
    templatesPath: string
  }) {
    this.context = context
    this.log = context.log
    this.propertiesDefinitions = propertiesDefinitions
    this.__dirname = __dirname
    this.templatesPath = templatesPath

    // https://liquidjs.com
    this.engine = new Liquid({
      root: this.templatesPath,
      cache: false,
      strictFilters: true, // default: false
      strictVariables: true, // default: false
      trimTagRight: false, // default: false
      trimTagLeft: false, // default: false
      greedy: false,
    })
  }

  async run(): Promise<void> {
    const log = this.log
    log.trace(`${this.constructor.name}.run()`)

    log.info()

    const context = this.context
    const config = context.config

    assert(config.properties)

    let isError = false
    for (const [key, val] of Object.entries(config.properties)) {
      try {
        config.properties[key] = this.validateValue(key, val as string)
      } catch (err) {
        if (err instanceof Error) {
          log.error(err.message)
        }
        isError = true
      }
    }
    if (isError) {
      throw new XpmSyntaxError()
    }

    // Properties set by `--property name=value` are in `config.properties`.

    // If there is at least one mandatory property without an explicit value,
    // enter the interactive mode and ask for the missing values.

    const mustAsk = Object.keys(this.propertiesDefinitions).some((key) => {
      return (
        this.propertiesDefinitions[key].isMandatory && !config.properties?.[key]
      )
    })

    let isInteractive
    if (mustAsk) {
      // Need to ask for more values.
      if (!(process.stdin.isTTY && process.stdout.isTTY)) {
        throw new XpmSyntaxError('Interactive mode not possible without a TTY.')
      }

      await this.askForMoreValues()
      log.trace(util.inspect(config.properties))

      // Reset start time to skip interactive time.
      context.startTime = Date.now()
      isInteractive = true
    } else {
      // Properties without explicit values get their defaults.
      Object.entries(this.propertiesDefinitions).forEach(([key, val]) => {
        assert(config.properties)
        if (!config.properties[key] && val.default) {
          config.properties[key] = val.default
        }
      })
      isInteractive = false
    }

    const currentTime = new Date()

    const substitutionsVariables: XpmInitTemplateSubstitutionsVariables = {
      // Spread all config properties.
      ...config.properties,
      // Also pass the properties grouped.
      properties: config.properties,
      propertiesNames: Object.keys(config.properties),
      projectName: config.projectName,
      year: currentTime.getFullYear().toString(),
    }

    this.substitutionsVariables = substitutionsVariables
    await this.generate(isInteractive)
  }

  abstract generate(isInteractive: boolean): Promise<void>

  validateValue(name: string, value: string): string | boolean | number {
    const propDef = this.propertiesDefinitions[name]
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (propDef === undefined) {
      throw new Error(`Unsupported property '${name}'`)
    }
    if (propDef.type === 'select') {
      if (propDef.items[value]) {
        if (typeof propDef.items[value] === 'string') {
          return value
        } else if (
          typeof propDef.items[value] === 'object' &&
          this.isPlatformSupported(propDef.items[value].platforms)
        ) {
          return value
        }
      }
    } else if (propDef.type === 'boolean') {
      if (value === 'true') {
        return true
      } else if (value === 'false') {
        return false
      }
    } else if (propDef.type === 'number') {
      return Number(value)
    }

    if (value === '' && propDef.default !== undefined) {
      return propDef.default
    }

    throw new Error(`Unsupported value '${value}' for property '${name}'`)
  }

  async askForMoreValues() {
    const context = this.context
    const config = context.config

    assert(config.properties)

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    })

    for (const name of Object.keys(this.propertiesDefinitions)) {
      if (config.properties[name]) {
        continue
      }
      const definition = this.propertiesDefinitions[name]
      let prompt = `${definition.label}?`
      if (definition.type === 'select') {
        prompt += ' ('
        const validItems = []
        for (const [ikey, ival] of Object.entries(definition.items)) {
          if (typeof ival === 'string') {
            validItems.push(ikey)
          } else if (
            typeof ival === 'object' &&
            this.isPlatformSupported(ival.platforms)
          ) {
            validItems.push(ikey)
          }
        }
        prompt += validItems.join(', ')
        prompt += ', ?)'
      } else if (definition.type === 'boolean') {
        prompt += ' (true, false, ?)'
      }
      if (definition.default !== undefined) {
        prompt += ` [${String(definition.default)}]`
      }
      prompt += ': '

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      while (true) {
        const answer = (await rl.question(prompt)).trim()
        try {
          const value = this.validateValue(name, answer)
          config.properties[name] = value
          break
        } catch (err) {
          if (err instanceof Error) {
            this.log.trace(err.message)
          }
          console.log(definition.description)
          if (definition.type === 'select') {
            for (const [ikey, ival] of Object.entries(definition.items)) {
              if (typeof ival === 'string') {
                console.log(`- ${ikey}: ${ival}`)
              } else if (
                typeof ival === 'object' &&
                this.isPlatformSupported(ival.platforms)
              ) {
                console.log(`- ${ikey}: ${ival.message}`)
              }
            }
          }
        }
      }
    }
  }

  isPlatformSupported(platforms: string[] | undefined): boolean {
    if (!platforms || platforms.length === 0) {
      return false
    }

    if (platforms.includes(`${process.platform}-${process.arch}`)) {
      return true
    }

    if (platforms.includes(process.platform)) {
      return true
    }

    return false
  }

  async copyFile(
    sourceFileRelativePath: string,
    destinationFilePath = sourceFileRelativePath
  ): Promise<void> {
    const log = this.log

    await makeDirectory(path.dirname(destinationFilePath))

    const sourceFileAbsolutePath = path.resolve(
      this.templatesPath,
      sourceFileRelativePath
    )
    await copyFile(sourceFileAbsolutePath, destinationFilePath)
    log.info(`File '${destinationFilePath}' copied.`)
  }

  async copyFolder(source: string, destination = source): Promise<void> {
    const log = this.log

    await this.copyFolderRecursive(
      path.resolve(this.templatesPath, source),
      path.resolve(destination)
    )
    log.info(`Folder '${destination}' copied.`)
  }

  async copyFolderRecursive(
    sourceFolderPath: string,
    destinationFolderPath: string
  ): Promise<void> {
    // const log = this.log

    await makeDirectory(path.dirname(destinationFolderPath))

    const dirents = await fs.readdir(sourceFolderPath, {
      withFileTypes: true,
    })

    for (const dirent of dirents) {
      // log.trace(dirent.name)

      if (dirent.isDirectory()) {
        await this.copyFolderRecursive(
          path.join(sourceFolderPath, dirent.name),
          path.join(destinationFolderPath, dirent.name)
        )
      } else {
        await copyFile(
          path.join(sourceFolderPath, dirent.name),
          path.join(destinationFolderPath, dirent.name)
        )
      }
    }
  }

  async render(
    inputFileRelativePath: string,
    outputFileRelativePath: string,
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    substitutionsVariables = this.substitutionsVariables!
  ): Promise<void> {
    const log = this.log

    log.trace(`render(${inputFileRelativePath}, ${outputFileRelativePath})`)

    await makeDirectory(path.dirname(outputFileRelativePath))

    // const headerPath = path.resolve(codePath, `${pnam}.h`)
    try {
      const fileContent = (await this.engine.renderFile(
        inputFileRelativePath,
        substitutionsVariables
      )) as string

      await fs.writeFile(outputFileRelativePath, fileContent, 'utf8')
    } catch (err) {
      if (err instanceof Error) {
        throw new XpmOutputError(err.message)
      }
    }
    log.info(`File '${outputFileRelativePath}' generated.`)
  }
}

// ----------------------------------------------------------------------------
