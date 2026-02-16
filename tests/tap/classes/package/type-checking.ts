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

t.test('Package - isNpmPackage', (t): void => {
  const xpmPackage = new xpm.Package({
    log,
    packageFolderPath: '/tmp',
  })

  xpmPackage.jsonPackage = undefined
  t.not(xpmPackage.isNpmPackage(), true, 'undefined not an npm package')

  xpmPackage.jsonPackage = {} as xpm.JsonXpmPackage
  t.not(
    xpmPackage.isNpmPackage(),
    true,
    'empty package.json not an npm package'
  )

  xpmPackage.jsonPackage = {
    name: ' ',
    version: '1.0.0',
  } as xpm.JsonXpmPackage
  t.not(xpmPackage.isNpmPackage(), true, 'empty name is not an npm package')

  xpmPackage.jsonPackage = {
    name: 'n',
    version: ' ',
  } as xpm.JsonXpmPackage
  t.not(xpmPackage.isNpmPackage(), true, 'empty version is not an npm package')

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
  } as xpm.JsonXpmPackage
  t.equal(
    xpmPackage.isNpmPackage(),
    true,
    'with name and version is an npm package'
  )

  t.end()
})

t.test('Package - isXpmPackage', (t): void => {
  const xpmPackage = new xpm.Package({
    log,
    packageFolderPath: '/tmp',
  })

  xpmPackage.jsonPackage = {} as xpm.JsonXpmPackage
  t.not(
    xpmPackage.isXpmPackage(),
    true,
    'empty package.json not an xpm package'
  )

  xpmPackage.jsonPackage = {
    name: ' ',
    version: '1.0.0',
  } as xpm.JsonXpmPackage
  t.not(xpmPackage.isXpmPackage(), true, 'empty name is not an xpm package')

  xpmPackage.jsonPackage = {
    name: 'n',
    version: ' ',
  } as xpm.JsonXpmPackage
  t.not(xpmPackage.isXpmPackage(), true, 'empty version is not an xpm package')

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
  } as xpm.JsonXpmPackage
  t.not(xpmPackage.isXpmPackage(), true, 'without xpack is not an xpm package')

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
    xpack: {},
  } as xpm.JsonXpmPackage
  t.equal(xpmPackage.isXpmPackage(), true, 'with xpack is an xpm package')

  t.end()
})

t.test('Package - isNodeModule', (t): void => {
  const xpmPackage = new xpm.Package({
    log,
    packageFolderPath: '/tmp',
  })

  xpmPackage.jsonPackage = undefined
  t.not(xpmPackage.isNodeModule(), true, 'undefined not an node module')

  xpmPackage.jsonPackage = {} as xpm.JsonXpmPackage
  t.not(
    xpmPackage.isNodeModule(),
    true,
    'empty package.json not an node module'
  )

  xpmPackage.jsonPackage = {
    name: ' ',
    version: '1.0.0',
  } as xpm.JsonXpmPackage
  t.not(xpmPackage.isNodeModule(), true, 'empty name is not an node module')
  xpmPackage.jsonPackage = {
    name: 'n',
    version: ' ',
  } as xpm.JsonXpmPackage
  t.not(xpmPackage.isNodeModule(), true, 'empty version is not an node module')

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
    xpack: {},
  } as xpm.JsonXpmPackage
  t.not(
    xpmPackage.isNodeModule(),
    true,
    'with name and version and xpack is an node module'
  )

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
  } as xpm.JsonXpmPackage
  t.equal(
    xpmPackage.isNodeModule(),
    true,
    'with name and version without xpack is an node module'
  )

  t.end()
})

t.test('Package - isBinaryNodeModule', (t): void => {
  const xpmPackage = new xpm.Package({
    log,
    packageFolderPath: '/tmp',
  })

  xpmPackage.jsonPackage = undefined
  t.not(xpmPackage.isBinaryNodeModule(), true, 'undefined not an node module')

  xpmPackage.jsonPackage = {} as xpm.JsonXpmPackage
  t.not(
    xpmPackage.isBinaryNodeModule(),
    true,
    'empty package.json not an node module'
  )

  xpmPackage.jsonPackage = {
    name: ' ',
    version: '1.0.0',
  } as xpm.JsonXpmPackage
  t.not(
    xpmPackage.isBinaryNodeModule(),
    true,
    'empty name is not an node module'
  )
  xpmPackage.jsonPackage = {
    name: 'n',
    version: ' ',
  } as xpm.JsonXpmPackage
  t.not(
    xpmPackage.isBinaryNodeModule(),
    true,
    'empty version is not an node module'
  )

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
    xpack: {},
  } as xpm.JsonXpmPackage
  t.not(xpmPackage.isBinaryNodeModule(), true, 'with xpack is an node module')

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
  } as xpm.JsonXpmPackage
  t.not(
    xpmPackage.isBinaryNodeModule(),
    true,
    'without bin is not a binary node module'
  )

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
    bin: {
      mybin: './.content/bin/mybin',
    },
  } as unknown as xpm.JsonXpmPackage
  t.equal(
    xpmPackage.isBinaryNodeModule(),
    true,
    'with bin is a binary node module'
  )

  t.end()
})
