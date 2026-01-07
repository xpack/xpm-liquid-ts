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
import { fileURLToPath } from 'node:url'
import * as path from 'node:path'

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/tap
import { test } from 'tap'

// ----------------------------------------------------------------------------

import { XpmPackage } from '../../src/index.js'
import { Logger } from '@xpack/logger'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const fixturesFolderPath = path.join(path.dirname(__dirname), 'fixtures')

const log = new Logger({ level: 'info' })

// ----------------------------------------------------------------------------

await test('constructor', async (t): Promise<void> => {
  const packageFolderPath = path.join(fixturesFolderPath, 'package-no-json')
  const xpmPackage = new XpmPackage({
    log,
    packageFolderPath,
  })

  t.equal(xpmPackage.packageFolderPath, packageFolderPath, 'packageFolderPath')

  t.end()
})

await test('no package.json', async (t): Promise<void> => {
  const packageFolderPath = path.join(fixturesFolderPath, 'package-no-json')
  const xpmPackage = new XpmPackage({
    log,
    packageFolderPath,
  })

  const jsonPackage = await xpmPackage.readPackageDotJson()
  t.equal(jsonPackage, undefined, 'no package.json')

  try {
    await xpmPackage.readPackageDotJson({ withThrow: true })
    t.fail('should throw')
  } catch (error) {
    t.type(error, Error, 'throws Error')
    t.match(
      (error as Error).message,
      'no package.json in folder',
      'error message is "no package.json"'
    )
  }

  t.end()
})

await test('bad package.json', async (t): Promise<void> => {
  const packageFolderPath = path.join(fixturesFolderPath, 'package-bad-json')
  const xpmPackage = new XpmPackage({
    log,
    packageFolderPath,
  })

  const jsonPackage = await xpmPackage.readPackageDotJson()
  t.equal(jsonPackage, undefined, 'bad package.json')

  try {
    await xpmPackage.readPackageDotJson({ withThrow: true })
    t.fail('should throw')
  } catch (error) {
    t.type(error, Error, 'throws Error')
    t.match(
      (error as Error).message,
      'invalid package.json in folder',
      'error message is "invalid package.json"    '
    )
  }

  t.end()
})

// ----------------------------------------------------------------------------
