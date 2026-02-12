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

// https://www.npmjs.com/package/tap
import t from 'tap'

// ----------------------------------------------------------------------------

import * as xpm from '../../../src/index.js'

// ============================================================================

t.test('filterPath - platform-agnostic tests', (t): void => {
  const originalPlatform = process.platform

  // Test Windows behaviour.
  Object.defineProperty(process, 'platform', {
    value: 'win32',
    configurable: true,
  })
  t.equal(
    xpm.filterPath('a\\b'),
    'a\\b',
    'preserves windows path separator \\ (mocked win32)'
  )
  t.equal(
    xpm.filterPath('C:\\path'),
    'C:\\path',
    'preserves drive letter and paths (mocked win32)'
  )
  t.equal(
    xpm.filterPath('a/b'),
    'a-b',
    'replaces forward slash on Windows (mocked win32)'
  )

  // Test POSIX behaviour.
  Object.defineProperty(process, 'platform', {
    value: 'linux',
    configurable: true,
  })
  t.equal(
    xpm.filterPath('a/b'),
    'a/b',
    'preserves posix path separator / (mocked linux)'
  )
  t.equal(
    xpm.filterPath('a\\b'),
    'a-b',
    'replaces backslash on POSIX (mocked linux)'
  )

  // Restore original platform.
  Object.defineProperty(process, 'platform', {
    value: originalPlatform,
    configurable: true,
  })

  t.end()
})

t.test('filterPath - platform-specific functions', (t): void => {
  t.equal(
    xpm.filterWin32Path('a\\b'),
    'a\\b',
    'preserves windows path separator \\'
  )
  t.equal(xpm.filterPosixPath('a/b'), 'a/b', 'preserves posix path separator /')

  t.equal(xpm.filterWin32Path('a/b'), 'a-b', 'replaces by dash')
  t.equal(xpm.filterPosixPath('a\\b'), 'a-b', 'replaces by dash')

  t.end()
})

t.test('filterPath - common behaviour', (t): void => {
  t.equal(xpm.filterPath('A!B'), 'A-B', 'replaces special characters')
  t.equal(xpm.filterPath('A--B'), 'A-B', 'replaces two dashes')
  t.equal(xpm.filterPath('A---B'), 'A-B', 'replaces three dashes')
  t.equal(
    xpm.filterPath('foo!!bar'),
    'foo-bar',
    'replaces multiple special chars'
  )

  t.end()
})

// ----------------------------------------------------------------------------
