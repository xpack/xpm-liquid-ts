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

// ----------------------------------------------------------------------------

import * as xpm from '../../src/index.js'
import { log } from './log.js'

const engine = new xpm.LiquidEngine()

// ----------------------------------------------------------------------------

export async function performSubstitutionsHelper(
  input: string,
  substitutionsVariables: Record<string, unknown>
): Promise<string> {
  return await xpm.performSubstitutions({
    log,
    engine,
    input,
    substitutionsVariables: {
      ...xpm.liquidSubstitutionsVariablesBase,
      ...substitutionsVariables,
    },
  })
}

// ----------------------------------------------------------------------------
