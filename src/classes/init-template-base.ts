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

import { XpmContext } from '../types/xpm.js'
import { XpmOutputError, XpmSyntaxError } from './errors.js'
import {
  XpmInitTemplatePropertiesDefinitions,
  XpmInitTemplateSubstitutionsVariables,
} from '../types/xpm-init-template.js'

// ============================================================================

/**
 * Base class for <b>xpm</b> initialisation templates.
 *
 * @remarks
 * This abstract class provides the foundation for template-based project
 * initialisation. It handles the complete workflow: property validation,
 * interactive user prompts for missing mandatory values, variable
 * substitution, and file generation using the Liquid templating engine.
 *
 * Template workflow:
 *
 * <ol>
 * <li>Properties are validated against their definitions</li>
 * <li>Missing mandatory properties trigger interactive prompts (if TTY)</li>
 * <li>Substitution variables are prepared from properties</li>
 * <li>The <code>XpmInitTemplateBase.generate</code> method creates project
 * files</li>
 * </ol>
 *
 * Derived classes must implement {@link XpmInitTemplateBase.generate}
 * to define the specific files and folder structure to create.
 */
export abstract class XpmInitTemplateBase {
  // --------------------------------------------------------------------------
  // Members.

  /**
   * The <b>xpm</b> context containing configuration and logging utilities.
   */
  context: XpmContext

  /**
   * The logger instance for output and diagnostics.
   */
  log: Logger

  /**
   * Definitions of all properties supported by this template.
   */
  propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {}

  /**
   * The absolute path to the module folder.
   */
  __dirname: string

  /**
   * The absolute path to the templates folder.
   */
  templatesPath: string

  /**
   * The Liquid templating engine instance.
   */
  engine: Liquid

  /**
   * The variables to be used for template substitutions.
   */
  substitutionsVariables?: XpmInitTemplateSubstitutionsVariables

  // --------------------------------------------------------------------------
  // Constructor.

  /**
   * Constructs an <b>xpm</b> initialisation template instance.
   *
   * @param context - The <b>xpm</b> context containing configuration and
   *    logging.
   * @param __dirname - The absolute path to the module folder.
   * @param templatesPath - The absolute path to the templates folder.
   * @param propertiesDefinitions - The definitions of all supported properties.
   */
  constructor({
    context,
    __dirname,
    templatesPath,
    propertiesDefinitions,
  }: {
    context: XpmContext
    __dirname: string
    templatesPath: string
    propertiesDefinitions: XpmInitTemplatePropertiesDefinitions
  }) {
    assert(context)
    assert(context.log)
    assert(__dirname)
    assert(templatesPath)
    assert(propertiesDefinitions)

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

  /**
   * Executes the template initialisation process.
   *
   * @remarks
   * This method orchestrates the complete template initialisation workflow.
   * It validates all provided properties, determines whether interactive
   * mode is required (when mandatory properties are missing), prompts for
   * missing values if in a TTY environment, prepares substitution variables
   * including the current year, and invokes the template-specific
   * {@link XpmInitTemplateBase.generate} method to create project files.
   *
   * The method automatically applies default values to optional properties
   * that were not explicitly set. In interactive mode, the timer is reset
   * after user input to exclude interactive time from performance metrics.
   *
   * @returns A promise that resolves to 0 on success.
   *
   * @throws {@link XpmSyntaxError}
   * If property validation fails or interactive mode is required but not
   * available (non-TTY environment).
   */
  async run(): Promise<number> {
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

    return 0 // success
  }

  /**
   * Generates the project files from the template.
   *
   * @remarks
   * This abstract method must be implemented by derived classes to define
   * the specific files and folder structure to create for the project.
   * Implementations should use {@link XpmInitTemplateBase.copyFile},
   * {@link XpmInitTemplateBase.copyFolder}, and
   * {@link XpmInitTemplateBase.render} to create the project structure.
   * The substitution variables are available via the
   * {@link XpmInitTemplateBase.substitutionsVariables} property.
   *
   * @param isInteractive - Whether the template was run in interactive mode.
   * @returns A promise that resolves when generation is complete.
   */
  abstract generate(isInteractive: boolean): Promise<void>

  /**
   * Validates a property value against its definition.
   *
   * @remarks
   * This method checks whether the provided value is valid for the
   * specified property according to its type definition. It performs
   * type-specific validation and conversion:
   *
   * <ul>
   * <li><b>For <code>select</code> properties:</b> validates against
   *    allowed items andchecks platform compatibility if specified</li>
   * <li><b>For <code>boolean</code> properties:</b> converts
   *    <code>'true'</code>/<code>'false'</code>
   *    strings to booleans</li>
   * <li><b>For <code>number</code> properties:</b> converts strings
   *    to numbers</li>
   * </ul>
   *
   * If the value is empty and a default is defined, the default value is
   * returned. For select properties with platform restrictions, only
   * platform-compatible items are considered valid.
   *
   * @param name - The property name to validate.
   * @param value - The property value to validate.
   * @returns The validated and potentially converted value (string,
   * boolean, or number).
   *
   * @throws `Error`
   * If the property is unsupported or the value is invalid.
   */
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

  /**
   * Prompts the user interactively for missing property values.
   *
   * @remarks
   * This method creates a readline interface and iteratively prompts the
   * user to provide values for properties without explicit values. For
   * each property, the prompt displays:
   *
   * <ul>
   * <li>The property label</li>
   * <li>Valid options (for select and boolean types)</li>
   * <li>The default value in brackets, if available</li>
   * </ul>
   *
   * If the user enters '?', help text is displayed showing the property
   * description and all valid options with their descriptions. Invalid
   * responses are rejected and the prompt is repeated until a valid value
   * is provided. Platform-incompatible options are excluded from select
   * properties.
   *
   * @returns A promise that resolves when all missing values have been
   * collected.
   */
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

  /**
   * Determines whether the current platform is supported.
   *
   * @remarks
   * This method checks platform compatibility using a two-tier matching
   * strategy. First, it looks for an exact match with the current
   * platform-architecture combination (e.g., `darwin-arm64`). If not
   * found, it checks for a platform-only match (e.g., `darwin`). Returns
   * `false` if the platforms array is undefined, empty, or contains no
   * matches for the current execution environment.
   *
   * @param platforms - The array of supported platform identifiers, or
   * undefined if no platforms are specified.
   * @returns `true` if the current platform is supported, `false`
   * otherwise.
   */
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

  /**
   * Copies a single file from the templates folder to the destination.
   *
   * @remarks
   * This method resolves the source file path relative to the templates
   * folder and copies it to the destination, creating any necessary
   * parent directories. The file is copied without modifications,
   * preserving its content and structure. Use
   * {@link XpmInitTemplateBase.render} instead if variable substitution
   * is needed.
   *
   * @param sourceFileRelativePath - The relative path to the source file
   * within the templates folder.
   * @param destinationFilePath - The destination file path (defaults to
   * the same relative path as the source).
   * @returns A promise that resolves when the file has been copied.
   */
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

  /**
   * Copies an entire folder from the templates folder to the destination.
   *
   * @remarks
   * This method recursively copies the complete folder structure,
   * including all files and subfolders, from the source to the
   * destination. The entire folder tree is replicated, preserving the
   * relative paths and structure. Files are copied without
   * modifications; use {@link XpmInitTemplateBase.render} for
   * individual files that require variable substitution.
   *
   * @param source - The relative path to the source folder within the
   * templates folder.
   * @param destination - The destination folder path (defaults to the
   * same relative path as the source).
   * @returns A promise that resolves when the folder has been copied.
   */
  async copyFolder(source: string, destination = source): Promise<void> {
    const log = this.log

    await this._copyFolderRecursively(
      path.resolve(this.templatesPath, source),
      path.resolve(destination)
    )
    log.info(`Folder '${destination}' copied.`)
  }

  /**
   * Recursively copies all contents of a source folder to a destination folder.
   *
   * @remarks
   * This internal method traverses the source folder structure and replicates
   * it at the destination, copying all files and recursively processing
   * subfolders.
   *
   * @param sourceFolderPath - The absolute path to the source folder.
   * @param destinationFolderPath - The absolute path to the destination folder.
   * @returns A promise that resolves when all contents have been copied.
   */
  protected async _copyFolderRecursively(
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
        await this._copyFolderRecursively(
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

  /**
   * Renders a template file using Liquid and writes the output.
   *
   * @remarks
   * This method processes a template file through the Liquid templating
   * engine with the provided substitution variables, generating the final
   * output file. Parent directories are created automatically if they do
   * not exist. The template file should be located in the templates
   * folder and use Liquid syntax for variable references (e.g.,
   * `{{ variableName }}`).
   *
   * The substitution variables include all project properties plus
   * additional context like the current year. If substitutionsVariables
   * is not provided, the instance's substitutionsVariables property is
   * used.
   *
   * @param inputFileRelativePath - The relative path to the template
   * file within the templates folder.
   * @param outputFileRelativePath - The destination path for the rendered
   * file.
   * @param substitutionsVariables - The variables to use for template
   * substitutions (defaults to the instance's substitutionsVariables).
   * @returns A promise that resolves when the file has been rendered and
   * written.
   *
   * @throws {@link XpmOutputError}
   * If template rendering fails.
   */
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
