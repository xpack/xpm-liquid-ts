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
import { test } from 'tap'

// ----------------------------------------------------------------------------

import { getErrorMessage, getPlatformKey } from '../../../src/index.js'

// ----------------------------------------------------------------------------

test('getErrorMessage', (t): void => {
  t.equal(
    getErrorMessage(new Error('test')),
    'test',
    'extracts message from Error'
  )
  t.equal(
    getErrorMessage('simple string'),
    'simple string',
    'string remains string'
  )
  t.equal(getErrorMessage(42), '42', 'number converted to string')
  t.equal(getErrorMessage(null), 'null', 'null converted to string')
  t.equal(
    getErrorMessage(undefined),
    'undefined',
    'undefined converted to string'
  )
  t.equal(
    getErrorMessage({ toString: () => 'custom object' }),
    'custom object',
    'object with toString()'
  )
  t.end()
})

test('getPlatformKey', (t): void => {
  const defaultKey = `${process.platform}-${process.arch}`
  t.equal(getPlatformKey(), defaultKey, 'default platform key')

  if (process.arch === 'x64') {
    const forced32bitKey = `${process.platform}-ia32`
    t.equal(
      getPlatformKey({ doForce32bit: true }),
      forced32bitKey,
      'forced 32-bit platform key'
    )
  } else if (process.arch === 'arm64') {
    const forced32bitKey = `${process.platform}-arm`
    t.equal(
      getPlatformKey({ doForce32bit: true }),
      forced32bitKey,
      'forced 32-bit platform key for arm64'
    )
  } else {
    t.equal(
      getPlatformKey({ doForce32bit: true }),
      defaultKey,
      'no change for non-x64/arm64 architectures'
    )
  }
  t.end()
})

// ----------------------------------------------------------------------------
