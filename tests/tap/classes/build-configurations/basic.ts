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
import * as path from 'node:path'
// import assert, { AssertionError } from 'node:assert'

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/tap
import t from 'tap'

// import { Logger } from '@xpack/logger'

// ----------------------------------------------------------------------------

import * as xpm from '../../../../src/index.js'
import { log } from '../../../common.js'

// ============================================================================

const engine = new xpm.LiquidEngine()
// const log = new Logger({ level: 'info' })

// ----------------------------------------------------------------------------

await t.test(
  'BuildConfigurations - uninitialised',
  async (t): Promise<void> => {
    const buildConfigurations = new xpm.BuildConfigurations({
      log,
      engine,
      substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
      jsonBuildConfigurations: undefined,
    })

    t.throws(
      () => buildConfigurations.size,
      { name: 'AssertionError', message: /must be initialised/ },
      'size throws AssertionError with "must be initialised"'
    )

    t.throws(
      () => buildConfigurations.isEmpty,
      { name: 'AssertionError', message: /must be initialised/ },
      'isEmpty throws AssertionError with "must be initialised"'
    )

    t.throws(
      () => buildConfigurations.names,
      { name: 'AssertionError', message: /must be initialised/ },
      'names throws AssertionError with "must be initialised"'
    )

    t.throws(
      () => buildConfigurations.getJsonName('undefined'),
      { name: 'AssertionError', message: /must be initialised/ },
      'getJsonName() throws AssertionError with "must be initialised"'
    )

    t.throws(
      () => buildConfigurations.hasJson('undefined'),
      { name: 'AssertionError', message: /must be initialised/ },
      'hasJson() throws AssertionError with "must be initialised"'
    )

    t.throws(
      () => buildConfigurations.getJson('undefined'),
      { name: 'AssertionError', message: /must be initialised/ },
      'getJson() throws AssertionError with "must be initialised"'
    )

    t.throws(
      () => buildConfigurations.isHidden('undefined'),
      { name: 'AssertionError', message: /must be initialised/ },
      'isHidden() throws AssertionError with "must be initialised"'
    )

    t.throws(
      () => buildConfigurations.has('undefined'),
      { name: 'AssertionError', message: /must be initialised/ },
      'has() throws AssertionError with "must be initialised"'
    )

    t.throws(
      () => buildConfigurations.get('undefined'),
      { name: 'AssertionError', message: /must be initialised/ },
      'get() throws AssertionError with "must be initialised"'
    )
  }
)

await t.test('BuildConfigurations - undefined', async (t): Promise<void> => {
  const buildConfigurations = new xpm.BuildConfigurations({
    log,
    engine,
    substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
    jsonBuildConfigurations: undefined,
  })

  let isInitialised = await buildConfigurations.initialise()
  t.equal(isInitialised, true, 'initialise() => true')
  isInitialised = await buildConfigurations.initialise()
  t.equal(isInitialised, false, 'initialise() again => false')

  t.equal(buildConfigurations.size, 0, 'size 0')
  t.equal(buildConfigurations.isEmpty, true, 'empty')
  t.equal(buildConfigurations.names.length, 0, 'names.length 0')

  t.throws(
    () => buildConfigurations.get('nonexistent'),
    {
      constructor: xpm.ConfigurationError,
      message: /does not exist/,
    },
    'throws ConfigurationError with "does not exist"'
  )
})

await t.test(
  'BuildConfigurations - basic functionality',
  async (t): Promise<void> => {
    const jsonBuildConfigurations: xpm.JsonBuildConfigurations = {
      configOne: {
        properties: {
          p1: 'v1',
        },
        actions: {
          build: 'echo Build action',
        },
        dependencies: {
          package1a: '^1.1.0',
        },
        devDependencies: {
          package1b: '^1.2.0',
        },
      },
      configTwo: {
        hidden: true,
        properties: {
          p2: 'v2',
        },
        dependencies: {
          package2: '^{{ undefined }}',
        },
      },
    }
    const buildConfigurations = new xpm.BuildConfigurations({
      log,
      engine,
      substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
      jsonBuildConfigurations,
    })

    let isInitialised = await buildConfigurations.initialise()
    t.equal(isInitialised, true, 'initialise() => true')

    t.equal(buildConfigurations.size, 2, 'size 2')
    t.equal(buildConfigurations.isEmpty, false, 'not empty')

    const names = buildConfigurations.names
    t.equal(names.length, 2, 'names.length 2')
    t.equal(names[0], 'configOne', 'names[0] is configOne')

    t.equal(
      buildConfigurations.getJsonName('configOne'),
      'configOne',
      'getJsonName configOne'
    )

    t.equal(buildConfigurations.hasJson('configOne'), true, 'hasJson configOne')
    const jsonConfigOne = buildConfigurations.getJson('configOne')
    t.same(
      jsonConfigOne,
      jsonBuildConfigurations['configOne'],
      'getJson configOne'
    )

    t.equal(buildConfigurations.isHidden('configOne'), false, 'isHidden false')
    t.equal(buildConfigurations.isHidden('configTwo'), true, 'isHidden true')

    t.equal(buildConfigurations.has('configOne'), true, 'has configOne')

    const configOne = buildConfigurations.get('configOne')
    t.equal(
      configOne.buildConfigurationName,
      'configOne',
      'buildConfigurationName configOne'
    )

    isInitialised = await configOne.initialise()
    t.equal(isInitialised, true, 'configOne initialise() => true')
    isInitialised = await configOne.initialise()
    t.equal(isInitialised, false, 'configOne initialise() again => false')

    t.equal(configOne.properties.p1, 'v1', 'properties.p1 is v1')

    const buildFolderRelativePath = configOne.buildFolderRelativePath
    t.equal(
      buildFolderRelativePath,
      path.join('build', 'configOne'),
      'buildFolderRelativePath build/configOne'
    )

    t.equal(
      configOne.dependencies['package1a'],
      '^1.1.0',
      'dependencies package1a'
    )
    t.equal(
      configOne.devDependencies['package1b'],
      '^1.2.0',
      'devDependencies package1b'
    )

    const actions = configOne.actions
    actions.initialise()
    t.equal(actions.size, 1, 'actions size 1')
    t.equal(actions.isEmpty, false, 'actions is not empty')
    t.equal(actions.names[0], 'build', 'actions names[0] is build')

    const actionBuild = actions.get('build')
    await actionBuild.initialise()
    t.equal(actionBuild.commands.length, 1, 'actionBuild has 1 command')
    t.equal(
      actionBuild.commands[0],
      'echo Build action',
      'actionBuild command is correct'
    )

    const configTwo = buildConfigurations.get('configTwo')
    await t.rejects(
      () => configTwo.initialise(),
      {
        constructor: xpm.ConfigurationError,
        message: /undefined variable/,
      },
      'throws xpm.ConfigurationError with "undefined variable"'
    )
  }
)

await t.test(
  'BuildConfigurations buildFolderRelativePath',
  async (t): Promise<void> => {
    const substitutionsVariables = {
      ...xpm.liquidSubstitutionsVariablesBase,
      properties: {
        buildFolderRelativePath:
          "{{ 'topBuild' | path_join: configuration.name | to_filename | downcase }}",
      },
    }

    const jsonBuildConfigurations: xpm.JsonBuildConfigurations = {
      configOne: {
        properties: {
          p1: 'v1',
        },
      },
      configTwo: {
        properties: {
          buildFolderRelativePath:
            "{{ 'configBuild' | path_join: configuration.name | to_filename | downcase }}",
          p2: 'v2',
        },
      },
      configThree: {
        properties: {
          buildFolderRelativePath: '{{ undefined_variable }}',
          p3: 'v3',
        },
      },
    }
    const buildConfigurations = new xpm.BuildConfigurations({
      log,
      engine,
      substitutionsVariables,
      jsonBuildConfigurations,
    })

    await buildConfigurations.initialise()
    t.equal(buildConfigurations.size, 3, 'size 3')

    const configOne = buildConfigurations.get('configOne')
    await configOne.initialise()
    const buildFolderRelativePathOne = configOne.buildFolderRelativePath
    t.equal(
      buildFolderRelativePathOne,
      path.join('topbuild', 'configone'),
      'buildFolderRelativePath configOne'
    )

    const configTwo = buildConfigurations.get('configTwo')
    await configTwo.initialise()
    const buildFolderRelativePathTwo = configTwo.buildFolderRelativePath
    t.equal(
      buildFolderRelativePathTwo,
      path.join('configbuild', 'configtwo'),
      'buildFolderRelativePath configTwo'
    )

    const configThree = buildConfigurations.get('configThree')

    await t.rejects(
      () => configThree.initialise(),
      {
        constructor: xpm.ConfigurationError,
        message: /undefined variable/,
      },
      'throws xpm.ConfigurationError with "undefined variable"'
    )
  }
)
