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

import { Context } from 'liquidjs'

import { Logger } from '@xpack/logger'

import { XpmLiquidEngine } from '../classes/liquid-engine.js'
import {
  XpmLiquidMatrixDrop,
  XpmLiquidPropertiesDrop,
} from '../classes/liquid-drop.js'

import {
  XpmLiquidSubstitutionsStrings,
  XpmLiquidSubstitutionsVariables,
} from '../data/substitutions-variables.js'
import { XpmError } from '../classes/errors.js'

// ----------------------------------------------------------------------------

/**
 * Performs substitutions on an input string using Liquid.
 *
 * @remarks
 * This function processes Liquid template syntax (variables and tags) by
 * repeatedly rendering the input until no more substitutions are detected.
 * The iterative approach supports nested substitutions where one property
 * references another.
 *
 * Processing workflow:
 *
 * <ol>
 * <li>Skip processing for empty strings to avoid unnecessary overhead.</li>
 * <li>Prepare Liquid context with substitution variables.</li>
 * <li>If <code>properties</code> exist, wrap them in
 *    <code>XpmLiquidPropertiesDrop</code>
 *    for lazy evaluation and nested substitution support.</li>
 * <li>If <code>matrix</code> parameters exist, wrap them in
 *    <code>XpmLiquidMatrixDrop</code>
 *    for template expansion variable access.</li>
 * <li>Iterate while Liquid syntax (<code>\{\{</code> or <code>\{%</code>)
 *   is present:
 *    <ul>
 *    <li>Parse and render the current string.</li>
 *    <li>Break if no changes occur (safety check).</li>
 *    <li>Continue with the substituted result.</li>
 *    </ul>
 * </li>
 * <li>Return the fully substituted string.</li>
 * </ol>
 *
 * The Drop pattern enables recursive property resolution: when a template
 * accesses `{{ properties.foo }}` and `foo` contains `{{ properties.bar }}`,
 * the next iteration resolves `bar`, and so on until no Liquid syntax
 * remains.
 *
 * Error handling:
 *
 * Liquid rendering errors are caught, stripped of line
 * number information (which can be misleading for nested templates), and
 * re-thrown as {@link XpmError}.
 *
 * @param log - The logger instance for output and diagnostics.
 * @param engine - The Liquid engine used to render substitutions.
 * @param input - The input string, possibly containing substitutions.
 * @param substitutionsVariables - The variables available for substitution.
 * @returns The fully substituted string.
 *
 * @throws {@link XpmError}
 * If Liquid rendering fails.
 */
export async function performSubstitutions({
  log,
  engine,
  input,
  substitutionsVariables,
}: {
  log: Logger
  engine: XpmLiquidEngine
  input: string
  substitutionsVariables: XpmLiquidSubstitutionsVariables
}): Promise<string> {
  assert(substitutionsVariables)

  if (input.trim() === '') {
    // Spare it the trouble for empty strings.
    return input
  }

  // Wrap properties into a liquid drop (a mechanism to process
  // substitutions immediately).
  let properties: XpmLiquidSubstitutionsStrings | XpmLiquidPropertiesDrop =
    substitutionsVariables.properties
  let matrix: XpmLiquidSubstitutionsStrings | XpmLiquidMatrixDrop | undefined =
    substitutionsVariables.matrix

  if (Object.keys(substitutionsVariables.properties).length > 0) {
    properties = new XpmLiquidPropertiesDrop({
      log,
      engine,
      properties: substitutionsVariables.properties,
    })
  }
  if (
    substitutionsVariables.matrix &&
    Object.keys(substitutionsVariables.matrix).length > 0
  ) {
    matrix = new XpmLiquidMatrixDrop({
      log,
      engine,
      matrix: substitutionsVariables.matrix,
    })
  }

  // Passing the engine options is important, otherwise unknown
  // variables do not trigger exceptions.
  const context = new Context(
    {
      ...substitutionsVariables,
      properties,
      matrix,
    },
    engine.options,
    { sync: false }
  )

  log.trace(`performSubstitutions('${input}')`)

  let current: string = input
  let substituted: string = current
  let count = 0

  // Iterate until all substitutions are done.
  while (current.includes('{{') || current.includes('{%')) {
    ++count
    // May throw.
    try {
      substituted = (await engine.parseAndRender(current, context)) as string

      /* c8 ignore start */ /* istanbul ignore next */
      if (substituted === current) {
        // If nothing changed, we're done.
        // This test is just a safety net, normally should not get there.
        log.warn(
          `performSubstitutions() step ${String(count)} => (`,
          substituted,
          ') did not change'
        )

        break
      } /* c8 ignore stop */
    } catch (error) {
      if (error instanceof Error) {
        log.trace(util.inspect(error))
        throw new XpmError(error.message.replace(/, line:.*/g, ''))
        /* c8 ignore next 3 */
      } else {
        throw new XpmError(String(error))
      }
    }

    log.trace(
      `performSubstitutions() step ${String(count)} => (`,
      substituted,
      ')'
    )
    current = substituted
  }

  return substituted
}

// ----------------------------------------------------------------------------
