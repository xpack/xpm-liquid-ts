/*
 * This file is part of the xPack project (http://xpack.github.io).
 * Copyright (c) 2021 Liviu Ionescu. All rights reserved.
 *
 * Permission to use, copy, modify, and/or distribute this software
 * for any purpose is hereby granted, under the terms of the MIT license.
 *
 * If a copy of the license was not distributed with this file, it can
 * be obtained from https://opensource.org/license/mit/.
 */

/* eslint max-len: [ "error", 80, { "ignoreUrls": true } ] */

// ----------------------------------------------------------------------------

import * as os from 'os'

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/tap
import { test } from 'tap'

// ----------------------------------------------------------------------------

import {
  filterPath,
  filterPosixPath,
  filterWin32Path
} from '../../src/index.js'

// ----------------------------------------------------------------------------

await test('filterPath', (t): void => {
  if (os.platform() === 'win32') {
    t.equal(filterPath('a\\b'), 'a\\b', 'preserves windows path separator \\')
  } else {
    t.equal(filterPath('a/b'), 'a/b', 'preserves posix path separator /')
  }

  t.equal(filterWin32Path('a\\b'), 'a\\b',
    'preserves windows path separator \\')
  t.equal(filterPosixPath('a/b'), 'a/b', 'preserves posix path separator /')

  t.equal(filterPath('A!B'), 'A-B', 'replaces by dash')

  t.equal(filterWin32Path('a/b'), 'a-b', 'replaces by dash')
  t.equal(filterPosixPath('a\\b'), 'a-b', 'replaces by dash')

  t.equal(filterPath('A--B'), 'A-B', 'replaces two dashes')
  t.equal(filterPath('A---B'), 'A-B', 'replaces three dashes')

  t.end()
})

// ----------------------------------------------------------------------------
