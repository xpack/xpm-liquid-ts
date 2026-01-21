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

// https://www.npmjs.com/package/liquidjs
import { Liquid, Context, Drop } from 'liquidjs'

// https://www.npmjs.com/package/@xpack/logger
import { Logger } from '@xpack/logger'

// eslint-disable-next-line max-len
import { XpmLiquidSubstitutionsStrings } from '../data/substitutions-variables.js'
import { isJsonObject } from '../functions/is-something.js'
import { XpmInputError } from '../classes/errors.js'

// ============================================================================

// https://liquidjs.com/

/**
 * Liquid drop that resolves `property` values for template substitutions.
 *
 * @remarks
 * This drop exposes properties to the Liquid engine and performs
 * additional substitutions when a property value itself contains Liquid syntax.
 *
 * Implements the Liquid Drop pattern to provide lazy property resolution and
 * recursive template evaluation. When a template accesses `properties.foo`,
 * the Liquid engine calls {@link XpmLiquidPropertiesDrop.liquidMethodMissing}
 * which:
 *
 * 1. Looks up the property value in the properties map.
 *
 * 2. Checks if the value contains Liquid syntax (`{{` or `{%`).
 *
 * 3. If yes, recursively evaluates the value as a Liquid template.
 *
 * 4. Returns the final resolved value.
 *
 * This enables multi-level property references where one property can
 * reference another, which can reference yet another, with the engine
 * automatically resolving the entire chain.
 *
 * @public
 */
export class XpmLiquidPropertiesDrop extends Drop {
  // --------------------------------------------------------------------------
  // Members.

  /**
   * The logger instance for output and diagnostics.
   *
   * @public
   */
  protected _log: Logger

  /**
   * The properties map used for substitutions.
   *
   * @public
   */
  protected _properties: XpmLiquidSubstitutionsStrings

  /**
   * The Liquid engine used to render nested substitutions.
   *
   * @public
   */
  protected _engine: Liquid

  // --------------------------------------------------------------------------
  // Constructor.

  /**
   * Constructs a properties drop.
   *
   * @param log - The logger instance for output and diagnostics.
   * @param engine - The Liquid engine used to render nested substitutions.
   * @param properties - The properties map used for substitutions.
   *
   * @public
   */
  constructor({
    log,
    engine,
    properties,
  }: {
    log: Logger
    engine: Liquid
    properties: XpmLiquidSubstitutionsStrings
  }) {
    super()

    log.trace(`${XpmLiquidPropertiesDrop.name}()`)

    this._log = log
    this._engine = engine
    this._properties = properties
  }

  // --------------------------------------------------------------------------
  // Methods.

  /**
   * Resolves a missing property and performs nested substitutions.
   *
   * @remarks
   * Called by the Liquid engine when a property is accessed that doesn't
   * exist as a regular method. This implements the Drop pattern for dynamic
   * property resolution.
   *
   * Resolution process:
   *
   * 1. Validate the property exists, throw {@link XpmInputError} if not.
   *
   * 2. Retrieve the property value (string, array, or object).
   *
   * 3. If object, return as-is for Liquid to access nested properties.
   *
   * 4. If array, join elements into a single string for processing.
   *
   * 5. If the value contains Liquid syntax, recursively render it with the
   *    current context to resolve nested references.
   *
   * 6. Return the final resolved value.
   *
   * Array values are concatenated without separators, allowing properties
   * to span multiple lines in JSON while producing a single string output.
   *
   * @param key - The property name requested by the template.
   * @param context - The Liquid rendering context.
   * @returns The resolved property value.
   *
   * @throws {@link XpmInputError}
   * If the property is not defined.
   *
   * @public
   */
  override async liquidMethodMissing(
    key: string,
    context: Context
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    // console.log(key)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (this._properties[key] === undefined) {
      throw new XpmInputError(`"properties.${key}" not defined`)
    }

    const log = this._log

    const value = this._properties[key]
    log.trace(
      `${XpmLiquidPropertiesDrop.name}.liquidMethodMissing('${key}') in (`,
      value,
      ')'
    )

    let result: string | string[]

    if (isJsonObject(value)) {
      return value
    }

    // If the property value is an array, merge them into a single string.
    const valueString = Array.isArray(value) ? value.join('') : value
    if (valueString.includes('{{') || valueString.includes('{%')) {
      result = (await this._engine.parseAndRender(
        valueString,
        context
      )) as string
    } else {
      result = value
    }
    log.trace(
      `${XpmLiquidPropertiesDrop.name}.liquidMethodMissing('${key}')` + ` => (`,
      result,
      ')'
    )
    return result
  }
}

// ============================================================================

/**
 * Liquid drop that resolves `matrix` parameter values for templates.
 *
 * @remarks
 * This drop exposes matrix values to the Liquid engine and performs
 * nested substitutions when a matrix value contains Liquid syntax.
 *
 * Matrix parameters are used during template expansion to generate multiple
 * actions or build configurations from a single template definition. Each
 * expanded instance receives a specific combination of matrix values.
 *
 * Implements the same Drop pattern as {@link XpmLiquidPropertiesDrop} but
 * for matrix-scoped variables. When a template accesses `matrix.arch`, the
 * engine calls {@link XpmLiquidMatrixDrop.liquidMethodMissing} which resolves
 * the parameter value and recursively evaluates any nested Liquid syntax.
 *
 * Matrix parameters are isolated per template instance, ensuring that each
 * generated action or configuration has access only to its specific matrix
 * combination.
 *
 * @public
 */
export class XpmLiquidMatrixDrop extends Drop {
  // --------------------------------------------------------------------------
  // Members.

  /**
   * The logger instance for output and diagnostics.
   *
   * @public
   */
  protected _log: Logger

  /**
   * The matrix parameters map used for substitutions.
   *
   * @public
   */
  protected _matrix: XpmLiquidSubstitutionsStrings

  /**
   * The Liquid engine used to render nested substitutions.
   *
   * @public
   */
  protected _engine: Liquid

  // --------------------------------------------------------------------------
  // Constructor.

  /**
   * Constructs a matrix drop.
   *
   * @param log - The logger instance for output and diagnostics.
   * @param engine - The Liquid engine used to render nested substitutions.
   * @param matrix - The matrix parameters map used for substitutions.
   *
   * @public
   */
  constructor({
    log,
    engine,
    matrix,
  }: {
    log: Logger
    engine: Liquid
    matrix: XpmLiquidSubstitutionsStrings
  }) {
    super()

    log.trace(`${XpmLiquidMatrixDrop.name}()`)

    this._log = log
    this._engine = engine
    this._matrix = matrix
  }

  // --------------------------------------------------------------------------
  // Methods.

  /**
   * Resolves a missing matrix parameter and performs nested substitutions.
   *
   * @remarks
   * Called by the Liquid engine when a matrix parameter is accessed that
   * doesn't exist as a regular method. This implements the Drop pattern for
   * dynamic matrix parameter resolution.
   *
   * Resolution process:
   *
   * 1. Validate the parameter exists, throw {@link XpmInputError} if not.
   *
   * 2. Retrieve the parameter value (string, array, or object).
   *
   * 3. If object, return as-is for Liquid to access nested properties.
   *
   * 4. If array, join elements into a single string for processing.
   *
   * 5. If the value contains Liquid syntax, recursively render it with the
   *    current context to resolve nested references.
   *
   * 6. Return the final resolved value.
   *
   * This mirrors the behavior of {@link XpmLiquidPropertiesDrop} but operates
   * on matrix parameters instead of properties. Matrix values can reference
   * other substitution variables, enabling complex template expansions.
   *
   * @param key - The matrix parameter name requested by the template.
   * @param context - The Liquid rendering context.
   * @returns The resolved matrix parameter value.
   *
   * @throws {@link XpmInputError}
   * If the matrix parameter is not defined.
   *
   * @public
   */
  override async liquidMethodMissing(
    key: string,
    context: Context
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    // console.log(key)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (this._matrix[key] === undefined) {
      throw new XpmInputError(`"matrix.${key}" not defined`)
    }

    const log = this._log

    const value = this._matrix[key]
    log.trace(
      `${XpmLiquidMatrixDrop.name}.liquidMethodMissing('${key}') in (`,
      value,
      ')'
    )

    let result: string | string[]

    if (isJsonObject(value)) {
      return value
    }

    // If the property value is an array, merge them into a single string.
    const valueString = Array.isArray(value) ? value.join('') : value
    if (valueString.includes('{{') || valueString.includes('{%')) {
      result = (await this._engine.parseAndRender(
        valueString,
        context
      )) as string
    } else {
      result = value
    }
    log.trace(
      `${XpmLiquidMatrixDrop.name}.liquidMethodMissing('${key}')` + ` => (`,
      result,
      ')'
    )
    return result
  }
}

// ----------------------------------------------------------------------------
