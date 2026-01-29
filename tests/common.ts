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

import { Logger } from '@xpack/logger'

import {
  performSubstitutions,
  XpmLiquidEngine,
  xpmLiquidSubstitutionsVariablesBase,
} from '../src/index.js'

// ----------------------------------------------------------------------------

export const log = new Logger({ level: 'info' })

const engine = new XpmLiquidEngine()

export async function performSubstitutionsTest(
  input: string,
  substitutionsVariables: Record<string, unknown>
): Promise<string> {
  return await performSubstitutions({
    log,
    engine,
    input,
    substitutionsVariables: {
      ...xpmLiquidSubstitutionsVariablesBase,
      ...substitutionsVariables,
    },
  })
}

// ----------------------------------------------------------------------------
