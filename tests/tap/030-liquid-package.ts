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
// import { fileURLToPath } from 'node:url'
// import * as path from 'node:path'

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/tap
import { test } from 'tap'

// ----------------------------------------------------------------------------

import { JsonXpmPackage, XpmLiquidPackage } from '../../src/index.js'
import { Logger } from '@xpack/logger'
import { AssertionError } from 'node:assert'

// const __filename = fileURLToPath(import.meta.url)
// const __dirname = path.dirname(__filename)
// const fixturesFolderPath = path.join(path.dirname(__dirname), 'fixtures')

const log = new Logger({ level: 'info' })

// ----------------------------------------------------------------------------

await test('constructor', async (t): Promise<void> => {
  const jsonNoXpack = { name: 'test', version: '1.2.3', xpack: [] }
  try {
    new XpmLiquidPackage({
      log,
      jsonPackage: jsonNoXpack as JsonXpmPackage,
    })
    t.fail('should throw')
  } catch (error) {
    // console.log(error)
    t.type(error, AssertionError, 'throws AssertionError')
    t.match(
      (error as Error).message,
      'xpack section missing',
      'error message is "xpack section missing"'
    )
  }

  const json = {
    name: 'test-package',
    version: '1.2.3',
    xpack: { properties: { one: '1' } },
  }

  const xpmLiquidPackage = new XpmLiquidPackage({
    log,
    jsonPackage: json as JsonXpmPackage,
  })

  // console.log(xpmLiquidPackage)
  t.ok(
    xpmLiquidPackage.substitutionsVariables,
    'has topLiquidSubstitutionsVariables'
  )
  t.ok(
    xpmLiquidPackage.substitutionsVariables.package,
    'has topLiquidSubstitutionsVariables.package'
  )
  t.equal(
    xpmLiquidPackage.substitutionsVariables.package.version,
    '1.2.3',
    'package.version is 1.2.3'
  )

  t.ok(
    xpmLiquidPackage.substitutionsVariables.properties,
    'has substitutionsVariables.properties'
  )
  t.equal(
    xpmLiquidPackage.substitutionsVariables.properties.one,
    '1',
    'properties.one is 1'
  )

  const topActions = xpmLiquidPackage.actions
  t.ok(topActions, 'has topActions')
  t.equal(topActions.empty(), true, 'topActions is empty')
  const actionsNames = topActions.names()
  t.ok(Array.isArray(actionsNames), 'topActions.names() is array')
  t.equal(actionsNames.length, 0, 'topActions has 0 names')

  const buildConfigurations = xpmLiquidPackage.buildConfigurations

  t.ok(buildConfigurations, 'has buildConfigurations')
  t.equal(buildConfigurations.empty(), true, 'buildConfigurations is empty')
  const buildConfigurationsNames = buildConfigurations.names()
  t.ok(
    Array.isArray(buildConfigurationsNames),
    'buildConfigurations.names() is array'
  )
  t.equal(buildConfigurationsNames.length, 0, 'buildConfigurations has 0 names')

  t.end()
})

// ----------------------------------------------------------------------------
