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

// https://www.npmjs.com/package/liquidjs
import { Liquid, Context, Drop } from 'liquidjs'

// https://www.npmjs.com/package/@xpack/logger
import { Logger } from '@xpack/logger'
import { XpmLiquidSubstitutionParameters } from './map.js'

// ----------------------------------------------------------------------------

// https://liquidjs.com/

export class XpmLiquidPropertiesDrop extends Drop {
  readonly #log: Logger
  readonly #properties: XpmLiquidSubstitutionParameters
  readonly #engine: Liquid

  constructor ({
    log,
    engine,
    properties
  }: {
    log: Logger
    engine: Liquid
    properties: XpmLiquidSubstitutionParameters
  }) {
    super()

    this.#log = log
    this.#engine = engine
    this.#properties = properties
  }

  override async liquidMethodMissing (
    key: string,
    context: Context
  ): Promise<string | string[]> {
    if (this.#properties[key] === undefined) {
      throw new Error(`properties have no ${key} key`)
    }

    const log = this.#log

    const value = this.#properties[key] ?? ''
    log.trace(
      `XpmLiquidPropertiesDrop.liquidMethodMissing('${key}') value = |`,
      value, '|')

    let result: string | string[]

    const valueString = Array.isArray(value) ? value.join('') : value
    if (valueString?.includes('{{') || valueString?.includes('{%')) {
      result = await this.#engine.parseAndRender(valueString, context)
    } else {
      result = value
    }
    log.trace(
      `XpmLiquidPropertiesDrop.liquidMethodMissing('${key}') result = |`,
      result, '|')
    return result
  }
}

// ----------------------------------------------------------------------------
