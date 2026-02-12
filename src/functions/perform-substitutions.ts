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

// ----------------------------------------------------------------------------

import assert from 'node:assert'

import { Context } from 'liquidjs'

import { Logger } from '@xpack/logger'

// ----------------------------------------------------------------------------

import { LiquidEngine } from '../classes/liquid-engine.js'
import { ConfigurationError } from '../classes/errors.js'
import {
  LiquidPropertiesDrop,
  LiquidMatrixDrop,
} from '../classes/liquid-drop.js'
import {
  LiquidSubstitutionsVariables,
  LiquidSubstitutionsStrings,
} from '../data/substitutions-variables.js'

// ============================================================================

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
 *    <code>LiquidPropertiesDrop</code>
 *    for lazy evaluation and nested substitution support.</li>
 * <li>If <code>matrix</code> parameters exist, wrap them in
 *    <code>LiquidMatrixDrop</code>
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
 * re-thrown as {@link ConfigurationError}.
 *
 * @param log - The logger instance for output and diagnostics.
 * @param engine - The Liquid engine used to render substitutions.
 * @param input - The input string, possibly containing substitutions.
 * @param substitutionsVariables - The variables available for substitution.
 * @returns The fully substituted string.
 *
 * @throws {@link ConfigurationError}
 * If Liquid rendering fails.
 */
export async function performSubstitutions({
  log,
  engine,
  input,
  substitutionsVariables,
}: {
  log: Logger
  engine: LiquidEngine
  input: string
  substitutionsVariables: LiquidSubstitutionsVariables
}): Promise<string> {
  assert(substitutionsVariables, 'substitutionsVariables is required')

  if (input.trim() === '') {
    // Spare it the trouble for empty strings.
    return input
  }

  // Wrap properties into a liquid drop (a mechanism to process
  // substitutions immediately).
  let properties: LiquidSubstitutionsStrings | LiquidPropertiesDrop =
    substitutionsVariables.properties
  let matrix: LiquidSubstitutionsStrings | LiquidMatrixDrop | undefined =
    substitutionsVariables.matrix

  if (Object.keys(substitutionsVariables.properties).length > 0) {
    properties = new LiquidPropertiesDrop({
      log,
      engine,
      properties: substitutionsVariables.properties,
    })
  }
  if (
    substitutionsVariables.matrix &&
    Object.keys(substitutionsVariables.matrix).length > 0
  ) {
    matrix = new LiquidMatrixDrop({
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
  const MAX_ITERATIONS = 42 // Prevent infinite loops

  // Iterate until all substitutions are done.
  while (current.includes('{{') || current.includes('{%')) {
    // Safety net: This limit prevents infinite loops from circular template
    // references. In normal operation, templates resolve in a few iterations.
    // The check is unlikely to trigger because:
    // 1. Templates are validated during configuration loading
    // 2. Liquid engine throws errors for most invalid references
    // 3. The break below catches non-changing substitutions
    // However, this protects against edge cases like deeply nested context
    // references or malformed template logic that the engine doesn't catch.
    /* c8 ignore start - safety net, normally should not get there. */
    if (++count > MAX_ITERATIONS) {
      throw new ConfigurationError(
        `Substitution limit exceeded (${String(MAX_ITERATIONS)} iterations). ` +
          `Possible circular reference in template.`
      )
    }
    /* c8 ignore stop */
    // May throw.
    try {
      substituted = (await engine.parseAndRender(current, context)) as string

      // Safety net: This check detects when a substitution pass produces no
      // changes despite template markers being present. This is unlikely
      // because:
      // 1. The while condition checks for markers ({{ or {%)
      // 2. Liquid engine normally processes all markers or throws errors
      // 3. Valid markers always resolve to something (even empty string)
      // However, this catches edge cases like malformed markers that pass the
      // simple includes() check but don't match Liquid's parser, preventing
      // infinite loops when the iteration limit isn't reached.
      /* c8 ignore start - safety net, normally errors throw. */
      if (substituted === current) {
        log.warn(
          `performSubstitutions() step ${String(count)} => (`,
          substituted,
          ') did not change'
        )

        break
      } /* c8 ignore stop */
    } catch (error) {
      if (error instanceof Error) {
        log.trace(`Liquid error: ${error.message}`)
        const cleanMessage = error.message.replace(/, line:.*/g, '')
        throw new ConfigurationError(cleanMessage)
        // Safety net: This handles the unlikely case where something other than
        // an Error is thrown. JavaScript/TypeScript allows throwing any value,
        // but Liquid engine and Node.js fs operations consistently throw Error
        // instances. This provides robust error handling for unexpected
        // scenarios.
        /* c8 ignore start - safety net, currently all are Errors */
      } else {
        throw new ConfigurationError(String(error))
      }
      /* c8 ignore stop */
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
