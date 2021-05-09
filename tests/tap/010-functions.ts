/*
 * This file is part of the xPack project (http://xpack.github.io).
 * Copyright (c) 2021 Liviu Ionescu. All rights reserved.
 *
 * Licensed under the terms of the MIT License.
 * See LICENSE in the project root for license information.
 */

/* eslint max-len: [ "error", 80, { "ignoreUrls": true } ] */
/* eslint-disable @typescript-eslint/no-floating-promises */

// ----------------------------------------------------------------------------

import * as os from 'os'

// The `[node-tap](http://www.node-tap.org)` framework.
import * as tap from 'tap'
import { filterPath } from '../../src/lib/xpm-liquid'

tap.test('filterPath', (t): void => {
  if (os.platform() === 'win32') {
    t.equal(filterPath('a\\b'), 'a\\b', 'preserves windows path separator \\')
  } else {
    t.equal(filterPath('a/b'), 'a/b', 'preserves posix path separator /')
  }

  t.equal(filterPath('AB'), 'ab', 'changes to lowercase')

  t.equal(filterPath('A!B'), 'a-b', 'replaces by dash')
  t.equal(filterPath('A--B'), 'a-b', 'replaces two dashes')
  t.equal(filterPath('A---B'), 'a-b', 'replaces three dashes')

  t.end()
})

// ----------------------------------------------------------------------------