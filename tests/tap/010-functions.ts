/*
 * This file is part of the xPack project (http://xpack.github.io).
 * Copyright (c) 2021 Liviu Ionescu. All rights reserved.
 *
 * Licensed under the terms of the MIT License.
 * See LICENSE in the project root for license information.
 */

// ----------------------------------------------------------------------------

import * as os from 'os'

// The `[node-tap](http://www.node-tap.org)` framework.
import { test } from 'tap'

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
