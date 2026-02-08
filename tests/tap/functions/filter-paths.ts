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

import * as os from 'node:os'

// https://www.npmjs.com/package/tap
import t from 'tap'

// ----------------------------------------------------------------------------

import * as xpm from '../../../src/index.js'

// ============================================================================

t.test('filterPath', (t): void => {
  if (os.platform() === 'win32') {
    t.equal(
      xpm.filterPath('a\\b'),
      'a\\b',
      'preserves windows path separator \\'
    )
  } else {
    t.equal(xpm.filterPath('a/b'), 'a/b', 'preserves posix path separator /')
  }

  t.equal(
    xpm.filterWin32Path('a\\b'),
    'a\\b',
    'preserves windows path separator \\'
  )
  t.equal(xpm.filterPosixPath('a/b'), 'a/b', 'preserves posix path separator /')

  t.equal(xpm.filterPath('A!B'), 'A-B', 'replaces by dash')

  t.equal(xpm.filterWin32Path('a/b'), 'a-b', 'replaces by dash')
  t.equal(xpm.filterPosixPath('a\\b'), 'a-b', 'replaces by dash')

  t.equal(xpm.filterPath('A--B'), 'A-B', 'replaces two dashes')
  t.equal(xpm.filterPath('A---B'), 'A-B', 'replaces three dashes')

  t.end()
})

// ----------------------------------------------------------------------------
