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

import assert from 'assert'

import { Logger } from '@xpack/logger'
import { Context } from 'liquidjs'
import { XpmLiquidEngine } from './engine.js'
import { XpmLiquidPropertiesDrop } from './liquid-drop.js'
import { XpmLiquidSubstitutionsVariables } from './substitutions-variables.js'

// ----------------------------------------------------------------------------
/**
 * Perform substitution on the input string.
 * Repeat until no more Liquid variables or tags are identified.
 *
 * @param input - The input string, possibly with substitutions.
 * @param map - The substitution map.
 * @returns The substituted string.
 *
 * @throws Liquid exceptions
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

  let context
  // Wrap properties into a liquid drop (a mechanism to process
  // substitutions immediately).
  if (Object.keys(substitutionsVariables.properties).length > 0) {
    context = new Context({
      ...substitutionsVariables,
      properties: new XpmLiquidPropertiesDrop({
        log,
        engine,
        properties: substitutionsVariables.properties,
      }),
    })
  } else {
    context = new Context(substitutionsVariables)
  }

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
          `performSubstitutions() ${String(count)} => |`,
          substituted,
          '| did not change'
        )

        break
      } /* c8 ignore stop */
    } catch (ex) {
      if (ex instanceof Error) {
        // log.error(ex)
        log.error(ex.message)
      } else {
        log.error(new Error(String(ex)))
      }
      // Return the current (unsubstituted) value.
      substituted = current
    }

    log.trace(`performSubstitutions() ${String(count)} => |`, substituted, '|')
    current = substituted
  }

  return substituted
}

// ----------------------------------------------------------------------------
