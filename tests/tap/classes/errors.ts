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

// import * as os from 'node:os'

// https://www.npmjs.com/package/tap
import t from 'tap'

import { Logger } from '@xpack/logger'

// ----------------------------------------------------------------------------

import * as xpm from '../../../src/index.js'

// ============================================================================

// const log = new Logger({ level: 'info' })

// ----------------------------------------------------------------------------

t.test('xpm.Errors', (t): void => {
  let error = new xpm.Error('Test error')
  t.equal(error.message, 'Test error', 'xpm.Error error message')

  error = new xpm.PrerequisitesError('Test prerequisites error')
  t.equal(
    error.message,
    'Test prerequisites error',
    'xpm.PrerequisitesError error message'
  )

  error = new xpm.InputError('Test input error')
  t.equal(error.message, 'Test input error', 'xpm.InputError error message')

  error = new xpm.JsonSyntaxError('Test syntax error')
  t.equal(
    error.message,
    'Test syntax error',
    'xpm.JsonSyntaxError error message'
  )

  error = new xpm.OutputError('Test output error')
  t.equal(error.message, 'Test output error', 'xpm.OutputError error message')

  t.end()
})

// ----------------------------------------------------------------------------
