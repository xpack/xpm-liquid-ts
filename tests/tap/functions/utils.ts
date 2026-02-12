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

// ----------------------------------------------------------------------------

import * as xpm from '../../../src/index.js'

// ============================================================================

t.test('getErrorMessage', (t): void => {
  t.equal(
    xpm.getErrorMessage(new Error('test')),
    'test',
    'extracts message from Error'
  )
  t.equal(
    xpm.getErrorMessage('simple string'),
    'simple string',
    'string remains string'
  )
  t.equal(xpm.getErrorMessage(42), '42', 'number converted to string')
  t.equal(xpm.getErrorMessage(null), 'null', 'null converted to string')
  t.equal(
    xpm.getErrorMessage(undefined),
    'undefined',
    'undefined converted to string'
  )
  t.equal(
    xpm.getErrorMessage({ toString: () => 'custom object' }),
    'custom object',
    'object with toString()'
  )
  t.end()
})

t.test('getPlatformKey - default behaviour', (t): void => {
  const defaultKey = `${process.platform}-${process.arch}`
  t.equal(xpm.getPlatformKey(), defaultKey, 'default platform key')

  if (process.arch === 'x64') {
    const forced32bitKey = `${process.platform}-ia32`
    t.equal(
      xpm.getPlatformKey({ doForce32bit: true }),
      forced32bitKey,
      'forced 32-bit platform key'
    )
  } else if (process.arch === 'arm64') {
    const forced32bitKey = `${process.platform}-arm`
    t.equal(
      xpm.getPlatformKey({ doForce32bit: true }),
      forced32bitKey,
      'forced 32-bit platform key for arm64'
    )
  } else {
    t.equal(
      xpm.getPlatformKey({ doForce32bit: true }),
      defaultKey,
      'no change for non-x64/arm64 architectures'
    )
  }
  t.end()
})

t.test('getPlatformKey - platform-agnostic tests', (t): void => {
  const originalPlatform = process.platform
  const originalArch = process.arch

  // Test x64 architecture coercion.
  Object.defineProperty(process, 'platform', {
    value: 'linux',
    configurable: true,
  })
  Object.defineProperty(process, 'arch', {
    value: 'x64',
    configurable: true,
  })
  t.equal(
    xpm.getPlatformKey(),
    'linux-x64',
    'linux-x64 without forcing (mocked)'
  )
  t.equal(
    xpm.getPlatformKey({ doForce32bit: true }),
    'linux-ia32',
    'x64 coerced to ia32 when forced (mocked)'
  )

  // Test arm64 architecture coercion.
  Object.defineProperty(process, 'arch', {
    value: 'arm64',
    configurable: true,
  })
  t.equal(
    xpm.getPlatformKey(),
    'linux-arm64',
    'linux-arm64 without forcing (mocked)'
  )
  t.equal(
    xpm.getPlatformKey({ doForce32bit: true }),
    'linux-arm',
    'arm64 coerced to arm when forced (mocked)'
  )

  // Test other architectures remain unchanged.
  Object.defineProperty(process, 'arch', {
    value: 'ia32',
    configurable: true,
  })
  t.equal(
    xpm.getPlatformKey(),
    'linux-ia32',
    'linux-ia32 without forcing (mocked)'
  )
  t.equal(
    xpm.getPlatformKey({ doForce32bit: true }),
    'linux-ia32',
    'ia32 unchanged when forced (mocked)'
  )

  // Test different platforms.
  Object.defineProperty(process, 'platform', {
    value: 'darwin',
    configurable: true,
  })
  Object.defineProperty(process, 'arch', {
    value: 'arm64',
    configurable: true,
  })
  t.equal(
    xpm.getPlatformKey(),
    'darwin-arm64',
    'darwin-arm64 without forcing (mocked)'
  )
  t.equal(
    xpm.getPlatformKey({ doForce32bit: true }),
    'darwin-arm',
    'darwin arm64 coerced to arm (mocked)'
  )

  Object.defineProperty(process, 'platform', {
    value: 'win32',
    configurable: true,
  })
  Object.defineProperty(process, 'arch', {
    value: 'x64',
    configurable: true,
  })
  t.equal(
    xpm.getPlatformKey(),
    'win32-x64',
    'win32-x64 without forcing (mocked)'
  )
  t.equal(
    xpm.getPlatformKey({ doForce32bit: true }),
    'win32-ia32',
    'win32 x64 coerced to ia32 (mocked)'
  )

  // Restore original values.
  Object.defineProperty(process, 'platform', {
    value: originalPlatform,
    configurable: true,
  })
  Object.defineProperty(process, 'arch', {
    value: originalArch,
    configurable: true,
  })

  t.end()
})

// ----------------------------------------------------------------------------
