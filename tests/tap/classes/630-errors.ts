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

import { Logger } from '@xpack/logger'

// ----------------------------------------------------------------------------

import { XpmPolicies } from '../../../src/index.js'

// ----------------------------------------------------------------------------

const log = new Logger({ level: 'info' })

// ----------------------------------------------------------------------------

test('XpmErrors', (t): void => {
  t.end()
})

// ----------------------------------------------------------------------------
