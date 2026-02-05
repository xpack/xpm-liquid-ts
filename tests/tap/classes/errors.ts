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

// import * as os from 'node:os'

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/tap
import t from 'tap'

import { Logger } from '@xpack/logger'

// ----------------------------------------------------------------------------

import {
  XpmError,
  XpmInputError,
  XpmOutputError,
  XpmPrerequisitesError,
  XpmSyntaxError,
} from '../../../src/index.js'

// ----------------------------------------------------------------------------

const log = new Logger({ level: 'info' })

// ----------------------------------------------------------------------------

t.test('XpmErrors', (t): void => {
  let error = new XpmError('Test error')
  t.equal(error.message, 'Test error', 'XpmError error message')

  error = new XpmPrerequisitesError('Test prerequisites error')
  t.equal(
    error.message,
    'Test prerequisites error',
    'XpmPrerequisitesError error message'
  )

  error = new XpmInputError('Test input error')
  t.equal(error.message, 'Test input error', 'XpmInputError error message')

  error = new XpmSyntaxError('Test syntax error')
  t.equal(error.message, 'Test syntax error', 'XpmSyntaxError error message')

  error = new XpmOutputError('Test output error')
  t.equal(error.message, 'Test output error', 'XpmOutputError error message')

  t.end()
})

// ----------------------------------------------------------------------------
