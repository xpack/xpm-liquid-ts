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
import * as fs from 'node:fs/promises'
import * as os from 'node:os'

// https://www.npmjs.com/package/tap
import t from 'tap'

// import { Logger } from '@xpack/logger'

// ----------------------------------------------------------------------------

import * as xpm from '../../../../src/index.js'
import { log } from '../../../helpers/index.js'

// ============================================================================

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const fixturesFolderPath = path.join(
  path.dirname(path.dirname(path.dirname(__dirname))),
  'fixtures'
)

// const log = new Logger({ level: 'info' })

// ----------------------------------------------------------------------------

t.test('Package - constructor', (t): void => {
  const packageFolderPath = path.join(fixturesFolderPath, 'package-no-json')
  const xpmPackage = new xpm.Package({
    log,
    packageFolderPath,
  })

  t.equal(xpmPackage.packageFolderPath, packageFolderPath, 'packageFolderPath')

  t.end()
})

await t.test('Package - no package.json', async (t): Promise<void> => {
  const packageFolderPath = path.join(fixturesFolderPath, 'package-no-json')
  const xpmPackage = new xpm.Package({
    log,
    packageFolderPath,
  })

  const jsonPackage = await xpmPackage.readPackageDotJson()
  t.equal(jsonPackage, undefined, 'no package.json')

  await t.rejects(
    async () => await xpmPackage.readPackageDotJson({ withThrow: true }),
    {
      constructor: xpm.InputError,
      message: /no package\.json in folder/,
    },
    'throws InputError for missing package.json'
  )
})

await t.test('Package - bad package.json', async (t): Promise<void> => {
  const packageFolderPath = path.join(fixturesFolderPath, 'package-bad-json')
  const xpmPackage = new xpm.Package({
    log,
    packageFolderPath,
  })

  const jsonPackage = await xpmPackage.readPackageDotJson()
  t.equal(jsonPackage, undefined, 'bad package.json')

  await t.rejects(
    async () => await xpmPackage.readPackageDotJson({ withThrow: true }),
    {
      constructor: xpm.InputError,
      message: /invalid package\.json in folder/,
    },
    'throws InputError for invalid package.json'
  )
})

await t.test('Package - rewritePackageDotJson', async (t): Promise<void> => {
  const temporaryFolderPath = await fs.mkdtemp(path.join(os.tmpdir(), 'xpm-'))
  // console.log(`Temporary folder created at ${temporaryFolderPath}`)

  const fixturePackageFilePath = path.join(
    fixturesFolderPath,
    'rewrite',
    'package.json'
  )
  const destinationFilePath = path.join(temporaryFolderPath, 'package.json')

  await fs.copyFile(fixturePackageFilePath, destinationFilePath)

  const xpmPackage = new xpm.Package({
    log,
    packageFolderPath: temporaryFolderPath,
  })

  const jsonPackage =
    (await xpmPackage.readPackageDotJson()) as xpm.JsonXpmPackage
  t.not(jsonPackage, undefined, 'package.json')
  t.not(xpmPackage.isXpmPackage(), true, 'is not xpm package before rewrite')

  // Make it an xpm package.
  jsonPackage.xpack = {}

  await xpmPackage.rewritePackageDotJson(jsonPackage)

  await xpmPackage.readPackageDotJson()
  t.equal(xpmPackage.isXpmPackage(), true, 'is xpm package after rewrite')

  await fs.rm(temporaryFolderPath, { recursive: true, force: true })
})

t.test('Package - hasNpmScripts', (t): void => {
  const xpmPackage = new xpm.Package({
    log,
    packageFolderPath: '/tmp',
  })

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
  } as unknown as xpm.JsonXpmPackage

  t.not(xpmPackage.hasNpmScripts(), true, 'has no npm scripts')

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
    scripts: {
      start: 'node index.js',
    },
  } as unknown as xpm.JsonXpmPackage

  t.equal(xpmPackage.hasNpmScripts(), true, 'has npm scripts')

  t.end()
})

t.test('Package - hasXpmActions', (t): void => {
  const xpmPackage = new xpm.Package({
    log,
    packageFolderPath: '/tmp',
  })

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
  } as unknown as xpm.JsonXpmPackage

  t.not(xpmPackage.hasXpmActions(), true, 'without xpack has no xpm actions')

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
    xpack: {},
  } as unknown as xpm.JsonXpmPackage

  t.not(xpmPackage.hasXpmActions(), true, 'with empty xpack has no xpm actions')

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
    xpack: {
      actions: {},
    },
  } as unknown as xpm.JsonXpmPackage

  t.not(
    xpmPackage.hasXpmActions(),
    true,
    'with empty xpack.actions has no xpm actions'
  )

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
    xpack: {
      actions: {
        build: 'echo Building...',
      },
    },
  } as unknown as xpm.JsonXpmPackage

  t.equal(xpmPackage.hasXpmActions(), true, 'with top actions')

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
    xpack: {
      buildConfigurations: {
        Debug: {},
      },
    },
  } as unknown as xpm.JsonXpmPackage

  t.not(xpmPackage.hasXpmActions(), true, 'without configuration actions')

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
    xpack: {
      buildConfigurations: {
        Debug: {
          actions: {
            build: 'echo Building Debug...',
          },
        },
      },
    },
  } as unknown as xpm.JsonXpmPackage

  t.equal(xpmPackage.hasXpmActions(), true, 'with configuration actions')

  xpmPackage.jsonPackage = {
    name: 'n',
    version: '1.0.0',
    xpack: {
      buildConfigurations: {
        '{{matrix.builder}}': {
          matrix: {
            builder: ['gcc', 'clang'],
          },
          template: {
            actions: {
              build: 'echo Building Debug {{ matrix.builder }}...',
            },
          },
        },
      },
    },
  } as unknown as xpm.JsonXpmPackage

  t.equal(
    xpmPackage.hasXpmActions(),
    true,
    'with configuration template actions'
  )

  t.end()
})
