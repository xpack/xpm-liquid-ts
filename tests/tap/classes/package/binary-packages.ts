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
// import { fileURLToPath } from 'node:url'
// import * as path from 'node:path'
// import * as fs from 'node:fs/promises'
// import * as os from 'node:os'

// https://www.npmjs.com/package/tap
import t from 'tap'

// import { Logger } from '@xpack/logger'

// ----------------------------------------------------------------------------

import * as xpm from '../../../../src/index.js'
import { log } from '../../../helpers/index.js'

// ============================================================================

t.test('Package - isBinaryXpmPackage', (t): void => {
  const xpmPackage = new xpm.Package({
    log,
    packageFolderPath: '/tmp',
  })

  xpmPackage.jsonPackage = {} as xpm.JsonXpmPackage
  t.not(
    xpmPackage.isBinaryXpmPackage(),
    true,
    'empty package.json not a binary xpm package'
  )

  xpmPackage.jsonPackage = {
    name: ' ',
    version: '1.0.0',
  } as xpm.JsonXpmPackage
  t.not(
    xpmPackage.isBinaryXpmPackage(),
    true,
    'empty name is not a binary xpm package'
  )

  xpmPackage.jsonPackage = {
    name: 'n',
    version: ' ',
  } as xpm.JsonXpmPackage
  t.not(
    xpmPackage.isBinaryXpmPackage(),
    true,
    'empty version is not a binary xpm package'
  )

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
  } as xpm.JsonXpmPackage
  t.not(
    xpmPackage.isBinaryXpmPackage(),
    true,
    'without xpack is not a binary xpm package'
  )

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
    xpack: {},
  } as xpm.JsonXpmPackage
  t.not(
    xpmPackage.isBinaryXpmPackage(),
    true,
    'with xpack alone is not a binary xpm package'
  )

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
    xpack: {
      executables: {
        mybin: './.content/bin/mybin',
      },
    },
  } as xpm.JsonXpmPackage
  t.throws(
    () => xpmPackage.isBinaryXpmPackage(),
    {
      constructor: xpm.ConfigurationError,
      message: /has no "xpack.binaries"/,
    },
    'throws ConfigurationError with "has no xpack.binaries"'
  )

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
    xpack: {
      executables: {
        mybin: './.content/bin/mybin',
      },
      binaries: {
        destination: './.content/bin',
        baseUrl: 'https://example.com/downloads/mybin',
      } as xpm.JsonXpmBinaries,
    },
  } as xpm.JsonXpmPackage
  t.throws(
    () => xpmPackage.isBinaryXpmPackage(),
    {
      constructor: xpm.ConfigurationError,
      message: /has no "xpack.binaries.platforms"/,
    },
    'throws ConfigurationError with "has no xpack.binaries.platforms"'
  )

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
    xpack: {
      executables: {
        mybin: './.content/bin/mybin',
      },
      binaries: {
        destination: './.content/bin',
        baseUrl: 'https://example.com/downloads/mybin',
        platforms: {},
      },
    },
  } as xpm.JsonXpmPackage
  t.equal(
    xpmPackage.isBinaryXpmPackage(),
    true,
    'with executables and binaries is a binary xpm package'
  )

  try {
    xpmPackage.jsonPackage = {
      name: 'n',
      version: '1.0.0',
      xpack: {
        binaries: {
          destination: './.content/bin',
          baseUrl: 'https://example.com/downloads/mybin',
        },
      },
    } as xpm.JsonXpmPackage
    xpmPackage.isBinaryXpmPackage()
    t.fail('should have thrown an error')
  } catch (error) {
    t.type(error, xpm.ConfigurationError, 'throws xpm.ConfigurationError')
    t.match(
      (error as Error).message,
      'has no "xpack.binaries.platforms"',
      'error message is "no xpack.binaries.platforms"'
    )
  }

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
    xpack: {
      binaries: {
        destination: './.content/bin',
        baseUrl: 'https://example.com/downloads/mybin',
        platforms: {},
      },
    },
  } as xpm.JsonXpmPackage
  t.throws(
    () => xpmPackage.isBinaryXpmPackage(),
    {
      constructor: xpm.ConfigurationError,
      message: /has no "xpack.executables"/,
    },
    'throws ConfigurationError with "has no xpack.executables"'
  )

  t.end()
})
