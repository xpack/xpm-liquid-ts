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

import { Logger } from '@xpack/logger'

// ----------------------------------------------------------------------------

import * as xpm from '../../../src/index.js'
import { log } from '../../common.js'

// ============================================================================

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const fixturesFolderPath = path.join(
  path.dirname(path.dirname(__dirname)),
  'fixtures'
)

// const log = new Logger({ level: 'info' })

// ----------------------------------------------------------------------------

t.test('constructor', (t): void => {
  const packageFolderPath = path.join(fixturesFolderPath, 'package-no-json')
  const xpmPackage = new xpm.Package({
    log,
    packageFolderPath,
  })

  t.equal(xpmPackage.packageFolderPath, packageFolderPath, 'packageFolderPath')

  t.end()
})

await t.test('no package.json', async (t): Promise<void> => {
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

  t.end()
})

await t.test('bad package.json', async (t): Promise<void> => {
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

  t.end()
})

await t.test('rewritePackageDotJson', async (t): Promise<void> => {
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

  t.end()
})

t.test('isNpmPackage', (t): void => {
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

t.test('isXpmPackage', (t): void => {
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

t.test('isBinaryXpmPackage', (t): void => {
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

  try {
    xpmPackage.jsonPackage = {
      name: 'n',
      version: '1.0.0',
      xpack: {
        executables: {
          mybin: './.content/bin/mybin',
        },
      },
    } as xpm.JsonXpmPackage
    xpmPackage.isBinaryXpmPackage()
    t.fail('should have thrown an error')
  } catch (error) {
    t.type(error, xpm.ConfigurationError, 'throws xpm.ConfigurationError')
    t.match(
      (error as Error).message,
      'has no "xpack.binaries"',
      'error message is "no xpack.binaries"'
    )
  }

  try {
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

  try {
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
    xpmPackage.isBinaryXpmPackage()
    t.fail('should have thrown an error')
  } catch (error) {
    t.type(error, xpm.ConfigurationError, 'throws xpm.ConfigurationError')
    t.match(
      (error as Error).message,
      'has no "xpack.executables"',
      'error message is "no xpack.executables"'
    )
  }

  t.end()
})

t.test('isNodeModule', (t): void => {
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

t.test('isBinaryNodeModule', (t): void => {
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

t.test('hasNpmScripts', (t): void => {
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

t.test('hasXpmActions', (t): void => {
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

t.test('getMinimumXpmRequired', (t): void => {
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

await t.test('checkMinimumXpmRequired', async (t): Promise<void> => {
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

  t.end()
})

t.test('parsePackageSpecifier', (t): void => {
  const xpmPackage = new xpm.Package({
    log,
    packageFolderPath: '/tmp',
  })

  try {
    xpmPackage.parsePackageSpecifier({ npmPackageSpecifier: '@a/b/c' })
    t.fail('should have thrown an error')
  } catch (error) {
    t.type(error, xpm.InputError, 'throws xpm.InputError')
    t.match(
      (error as Error).message,
      'not a package name',
      'error message is "not a package name"'
    )
  }

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
