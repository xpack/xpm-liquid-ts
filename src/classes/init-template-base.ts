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
import { XpmError, XpmOutputError, XpmSyntaxError } from './errors.js'
import {
  XpmInitTemplateItemValue,
  XpmInitTemplatePropertiesDefinitions,
  XpmInitTemplateSubstitutionsVariables,
} from '../types/xpm-init-template.js'
import {
  isBoolean,
  isNumber,
  isObject,
  isString,
} from '../functions/is-something.js'

// ============================================================================

export interface XpmInitTemplateConstructorParameters {
  context: XpmContext
  __dirname: string
  templatesPath: string
  propertiesDefinitions: XpmInitTemplatePropertiesDefinitions
  process?: NodeJS.Process
}

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
 * <li>The <code>XpmInitTemplateBase.generate()</code> method creates project
 * files</li>
 * </ol>
 *
 * Derived classes must implement {@link XpmInitTemplateBase.generate}
 * to define the specific files and folder structure to create.
 */
export abstract class XpmInitTemplateBase {
  // --------------------------------------------------------------------------
  // Public Members.

  // --------------------------------------------------------------------------
  // Protected Members.

  /**
   * The <b>xpm</b> context containing configuration and logging utilities.
   */
  protected _context: XpmContext

  /**
   * The logger instance for output and diagnostics.
   */
  protected _log: Logger

  /**
   * Definitions of all properties supported by this template.
   */
  protected _propertiesDefinitions: XpmInitTemplatePropertiesDefinitions = {}

  /**
   * The absolute path to the module folder.
   */
  protected __dirname: string

  /**
   * The absolute path to the templates folder.
   */
  protected _templatesPath: string

  /**
   * The Liquid templating engine instance.
   */
  protected _engine: Liquid

  /**
   * The variables to be used for template substitutions.
   */
  protected _substitutionsVariables?: XpmInitTemplateSubstitutionsVariables

  protected _isInteractive = false

  protected _process: NodeJS.Process

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
    process: _process = process,
  }: XpmInitTemplateConstructorParameters) {
    assert(context, 'context is required')
    assert(context.log, 'context.log is required')
    assert(context.config, 'context.context is required')
    assert(context.config.projectName, 'context.config.projectName is required')
    assert(context.config.properties, 'context.config.properties is required')
    assert(__dirname, '__dirname is required')
    assert(templatesPath, 'templatesPath is required')
    assert(propertiesDefinitions, 'propertiesDefinitions is required')

    this._context = context
    this._log = context.log

    this._propertiesDefinitions = propertiesDefinitions
    this.__dirname = __dirname
    this._templatesPath = templatesPath

    this._process = _process

    this._validatePropertiesDefinitions()

    // https://liquidjs.com
    this._engine = new Liquid({
      root: this._templatesPath,
      cache: false,
      strictFilters: true, // default: false
      strictVariables: true, // default: false
      trimTagRight: false, // default: false
      trimTagLeft: false, // default: false
      greedy: false,
    })
  }

  // --------------------------------------------------------------------------
  // Public Methods.

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
    const log = this._log
    log.trace(`${this.constructor.name}.run()`)

    log.info()

    const context = this._context
    const config = context.config

    assert(config.properties, 'config.properties is required')

    let isError = false
    for (const [key, val] of Object.entries(config.properties)) {
      try {
        config.properties[key] = this._validatePropertyValue(key, val as string)
      } catch (error) {
        if (error instanceof Error) {
          log.error(error.message)
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

    const mustAsk = Object.keys(this._propertiesDefinitions).some((key) => {
      return (
        this._propertiesDefinitions[key].isMandatory &&
        !config.properties?.[key]
      )
    })

    let isInteractive
    if (mustAsk) {
      // Need to ask for more values.
      if (!(this._process.stdin.isTTY && this._process.stdout.isTTY)) {
        throw new XpmSyntaxError('Interactive mode not possible without a TTY.')
      }

      await this.askForMoreValues()
      log.trace(util.inspect(config.properties))

      // Reset start time to skip interactive time.
      context.startTime = Date.now()
      isInteractive = true
    } else {
      // Properties without explicit values get their defaults.
      Object.entries(this._propertiesDefinitions).forEach(([key, val]) => {
        assert(config.properties, 'config.properties is required')
        if (!config.properties[key] && val.default !== undefined) {
          config.properties[key] = val.default
        }
      })
      isInteractive = false
    }

    this._isInteractive = isInteractive

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

    this._substitutionsVariables = substitutionsVariables
    await this.generate()

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
   * {@link XpmInitTemplateBase._substitutionsVariables} property.
   *
   * The implementation must be <b>asynchronous</b> to allow for file system
   * operations.
   *
   * @returns A promise that resolves when generation is complete.
   */
  abstract /* async */ generate(): Promise<void>

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
   * @throws {@link XpmError}
   * If the property is unsupported or the value is invalid.
   */
  protected _validatePropertyValue(
    name: string,
    value: string
  ): string | boolean | number {
    const propDef = this._propertiesDefinitions[name]
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (propDef === undefined) {
      throw new XpmError(`Unsupported property '${name}'`)
    }
    const trimmedValue = value.trim()

    switch (propDef.type) {
      case 'select':
        assert(
          propDef.items,
          `Property '${name}' of type 'select' has no items.`
        )
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
        break

      case 'boolean':
        if (trimmedValue === 'true') {
          return true
        } else if (trimmedValue === 'false') {
          return false
        }
        break

      case 'number': {
        const num = Number(trimmedValue)
        if (trimmedValue !== '' && isFinite(num)) {
          return num
        }
        // Fall through to error if not a valid number
        break
      }

      case 'string':
        if (trimmedValue !== '') {
          return value
        }

        if (propDef.default !== undefined) {
          return propDef.default
        }
        break

      default:
        throw new XpmError(
          `Unsupported property type '${String(propDef.type)}' for '${name}'`
        )
    }

    throw new XpmError(`Unsupported value '${value}' for property '${name}'`)
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
    const context = this._context
    const config = context.config

    assert(config.properties, 'config.properties is required')

    const rl = readline.createInterface({
      input: this._process.stdin,
      output: this._process.stdout,
    })

    for (const name of Object.keys(this._propertiesDefinitions)) {
      if (config.properties[name]) {
        continue
      }
      const definition = this._propertiesDefinitions[name]
      let prompt = `${definition.label}?`
      if (definition.type === 'select') {
        prompt += ' ('
        const validItems = []
        assert(definition.items, 'definition.items is required')
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
          const value = this._validatePropertyValue(name, answer)
          config.properties[name] = value
          break
        } catch (error) {
          if (error instanceof Error) {
            this._log.trace(error.message)
          }
          console.log(definition.description)
          if (definition.type === 'select') {
            assert(definition.items, 'definition.items is required')
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
    assert(platforms && platforms.length !== 0, 'platforms array is required')

    if (platforms.includes(`${this._process.platform}-${this._process.arch}`)) {
      return true
    }

    if (platforms.includes(this._process.platform)) {
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
    const log = this._log

    await makeDirectory(path.dirname(destinationFilePath))

    const sourceFileAbsolutePath = path.resolve(
      this._templatesPath,
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
    const log = this._log

    await this._copyFolderRecursively(
      path.resolve(this._templatesPath, source),
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
    substitutionsVariables = this._substitutionsVariables!
  ): Promise<void> {
    const log = this._log

    log.trace(`render(${inputFileRelativePath}, ${outputFileRelativePath})`)

    await makeDirectory(path.dirname(outputFileRelativePath))

    // const headerPath = path.resolve(codePath, `${pnam}.h`)
    try {
      const fileContent = (await this._engine.renderFile(
        inputFileRelativePath,
        substitutionsVariables
      )) as string

      await fs.writeFile(outputFileRelativePath, fileContent, 'utf8')
    } catch (error) {
      if (error instanceof Error) {
        throw new XpmOutputError(error.message)
      }
    }
    log.info(`File '${outputFileRelativePath}' generated.`)
  }

  // --------------------------------------------------------------------------
  // Protected Methods.

  protected _validatePropertiesDefinitions(): void {
    assert(
      isObject(this._propertiesDefinitions),
      'propertiesDefinitions is not an object.'
    )

    assert(
      Object.keys(this._propertiesDefinitions).length > 0,
      'propertiesDefinitions is an empty object.'
    )

    for (const [key, val] of Object.entries(this._propertiesDefinitions)) {
      assert(isString(val.label), `Property '${key}' must have a string label`)
      assert(val.label.trim() !== '', `Property '${key}' has an empty label`)

      assert(
        isString(val.description),
        `Property '${key}' must have a string description`
      )
      assert(
        val.description.trim() !== '',
        `Property '${key}' has an empty description`
      )

      if (val.isMandatory !== undefined) {
        assert(
          isBoolean(val.isMandatory),
          `Property '${key}' has a non boolean isMandatory value.`
        )
      }

      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      assert(val.type !== undefined, `Property '${key}' has no type defined.`)

      switch (val.type) {
        case 'select':
          assert(
            val.items !== undefined,
            `Property '${key}' of type 'select' has no items.`
          )

          assert(
            isObject(val.items),
            `Property '${key}' of type 'select' has invalid items.`
          )

          assert(
            Object.keys(val.items).length !== 0,
            `Property '${key}' of type 'select' has no items.`
          )

          for (const [ikey, ival] of Object.entries(val.items)) {
            assert(
              isString(ival) ||
                (isObject(ival) &&
                  Array.isArray((ival as XpmInitTemplateItemValue).platforms) &&
                  isString((ival as XpmInitTemplateItemValue).message)),
              `Property '${key}' has invalid item '${ikey}'.`
            )
          }

          if (!val.isMandatory) {
            assert(
              val.default !== undefined,
              `Property '${key}' of type 'select' ` +
                `must have a default value if not mandatory.`
            )
          }

          if (val.default !== undefined) {
            assert(
              isString(val.default),
              `Property '${key}' has a non string default value.`
            )

            assert(
              (val.default as string).trim() !== '',
              `Property '${key}' has an empty default value.`
            )
          }

          if (val.default !== undefined) {
            assert(
              Object.keys(val.items).includes(String(val.default)),
              `Property '${key}' has a default value not in items list.`
            )
          }
          break

        case 'string':
          if (val.default !== undefined) {
            assert(
              isString(val.default),
              `Property '${key}' has a non string default value.`
            )

            assert(
              (val.default as string).trim() !== '',
              `Property '${key}' has an empty default value.`
            )
          }
          break

        case 'number':
          if (val.default !== undefined) {
            assert(
              isNumber(val.default),
              `Property '${key}' has a non number default value.`
            )
          }
          break

        case 'boolean':
          if (val.default !== undefined) {
            assert(
              isBoolean(val.default),
              `Property '${key}' has a non boolean default value.`
            )
          }
          break

        default:
          assert(
            false,
            `Property '${key}' has unsupported type '${String(val.type)}'.`
          )

          break
      }
    }
  }
}

// ----------------------------------------------------------------------------
