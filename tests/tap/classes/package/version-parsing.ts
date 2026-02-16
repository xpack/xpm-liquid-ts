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
import { fileURLToPath } from 'node:url'
import * as path from 'node:path'
// import * as fs from 'node:fs/promises'
// import * as os from 'node:os'

// https://www.npmjs.com/package/tap
import t from 'tap'

// import { Logger } from '@xpack/logger'

// ----------------------------------------------------------------------------

import * as xpm from '../../../../src/index.js'
import { log } from '../../../common.js'

// ============================================================================

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const fixturesFolderPath = path.join(
  path.dirname(path.dirname(path.dirname(__dirname))),
  'fixtures'
)

// ----------------------------------------------------------------------------

t.test('Package - getMinimumXpmRequired', (t): void => {
  const xpmPackage = new xpm.Package({
    log,
    packageFolderPath: '/tmp',
  })

  t.equal(
    xpmPackage.getMinimumXpmRequired(),
    undefined,
    'without package has no minimumXpmRequired'
  )

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
    xpack: {
      minimumXpmRequired: 42,
    },
  } as unknown as xpm.JsonXpmPackage

  t.equal(
    xpmPackage.getMinimumXpmRequired(),
    undefined,
    'with non string minimumXpmRequired'
  )

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
    xpack: {
      minimumXpmRequired: '1.2.3-4',
    },
  } as unknown as xpm.JsonXpmPackage

  t.equal(xpmPackage.getMinimumXpmRequired(), '1.2.3', 'has minimumXpmRequired')

  t.end()
})

await t.test('Package - checkMinimumXpmRequired', async (t): Promise<void> => {
  const xpmPackage = new xpm.Package({
    log,
    packageFolderPath: '/tmp',
  })

  t.equal(
    await xpmPackage.checkMinimumXpmRequired({ xpmRootFolderPath: '-' }),
    undefined,
    'not an xpm package, not checked'
  )

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
    xpack: {},
  } as unknown as xpm.JsonXpmPackage
  t.equal(
    await xpmPackage.checkMinimumXpmRequired({ xpmRootFolderPath: '-' }),
    undefined,
    'without minimumXpmRequired, not checked'
  )

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
    xpack: {
      minimumXpmRequired: '1.2.3',
    },
  } as unknown as xpm.JsonXpmPackage

  let packageFolderPath = path.join(fixturesFolderPath, 'package-bad-json')
  t.equal(
    await xpmPackage.checkMinimumXpmRequired({
      xpmRootFolderPath: packageFolderPath,
    }),
    undefined,
    'without package.json, not checked'
  )

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
    xpack: {
      minimumXpmRequired: '1.2.3',
    },
  } as unknown as xpm.JsonXpmPackage

  packageFolderPath = path.join(fixturesFolderPath, 'package-no-version')
  t.equal(
    await xpmPackage.checkMinimumXpmRequired({
      xpmRootFolderPath: packageFolderPath,
    }),
    undefined,
    'without package.json version, not checked'
  )

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
    xpack: {
      minimumXpmRequired: '1.2.3',
    },
  } as unknown as xpm.JsonXpmPackage

  packageFolderPath = path.join(fixturesFolderPath, 'package-bad-version')
  t.equal(
    await xpmPackage.checkMinimumXpmRequired({
      xpmRootFolderPath: packageFolderPath,
    }),
    undefined,
    'with package.json bad version, not checked'
  )

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
    xpack: {
      minimumXpmRequired: '1.2.3',
    },
  } as unknown as xpm.JsonXpmPackage

  packageFolderPath = path.join(fixturesFolderPath, 'package-version')
  t.equal(
    await xpmPackage.checkMinimumXpmRequired({
      xpmRootFolderPath: packageFolderPath,
    }),
    '1.2.3',
    'with package.json same version, check passed'
  )

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
    xpack: {
      minimumXpmRequired: '1.2.4',
    },
  } as unknown as xpm.JsonXpmPackage

  packageFolderPath = path.join(fixturesFolderPath, 'package-version')

  await t.rejects(
    async () =>
      await xpmPackage.checkMinimumXpmRequired({
        xpmRootFolderPath: packageFolderPath,
      }),
    {
      constructor: xpm.PrerequisitesError,
      message: /please upgrade/,
    },
    'throws PrerequisitesError when version requirement not met'
  )
})

t.test('Package - parsePackageSpecifier', (t): void => {
  const xpmPackage = new xpm.Package({
    log,
    packageFolderPath: '/tmp',
  })

  t.throws(
    () => xpmPackage.parsePackageSpecifier({ npmPackageSpecifier: '@a/b/c' }),
    {
      constructor: xpm.InputError,
      message: /not a package name/,
    },
    'throws InputError with "not a package name"'
  )

  let spec = xpmPackage.parsePackageSpecifier({
    npmPackageSpecifier: '@a',
  })
  t.equal(spec.scope, '@a', 'scope @a parsed')
  t.equal(spec.name, undefined, 'no name')
  t.equal(spec.version, undefined, 'no version')

  spec = xpmPackage.parsePackageSpecifier({
    npmPackageSpecifier: '@b/c',
  })
  t.equal(spec.scope, '@b', 'scope @b parsed')
  t.equal(spec.name, 'c', 'name c parsed')
  t.equal(spec.version, undefined, 'no version')

  spec = xpmPackage.parsePackageSpecifier({
    npmPackageSpecifier: '@b/c@1.2.3',
  })
  t.equal(spec.scope, '@b', 'scope @b parsed')
  t.equal(spec.name, 'c', 'name c parsed')
  t.equal(spec.version, '1.2.3', 'version 1.2.3 parsed')

  spec = xpmPackage.parsePackageSpecifier({
    npmPackageSpecifier: 'd',
  })
  t.equal(spec.scope, undefined, 'scope @b parsed')
  t.equal(spec.name, 'd', 'name c parsed')
  t.equal(spec.version, undefined, 'no version')

  spec = xpmPackage.parsePackageSpecifier({
    npmPackageSpecifier: 'e@4.5.6',
  })
  t.equal(spec.scope, undefined, 'scope @b parsed')
  t.equal(spec.name, 'e', 'name c parsed')
  t.equal(spec.version, '4.5.6', 'version 4.5.6 parsed')

  t.end()
})

// ----------------------------------------------------------------------------
