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

import * as os from 'os'
import * as path from 'path'

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/tap
import { test } from 'tap'

// ----------------------------------------------------------------------------

import { Logger } from '@xpack/logger'
import {
  buildFolderRelativePathPropertyName,
  JsonBuildConfigurations,
  XpmAction,
  XpmActions,
  XpmBuildConfigurations,
  XpmError,
  XpmLiquidEngine,
  xpmLiquidSubstitutionsVariablesBase,
} from '../../../src/index.js'
import { AssertionError } from 'assert'
import { inherits } from 'util'

// ----------------------------------------------------------------------------

const log = new Logger({ level: 'info' })
const engine = new XpmLiquidEngine()

// ----------------------------------------------------------------------------

await test('XpmBuildConfigurations undefined', async (t) => {
  const buildConfigurations = new XpmBuildConfigurations({
    log,
    engine,
    substitutionsVariables: xpmLiquidSubstitutionsVariablesBase,
    jsonBuildConfigurations: undefined,
  })

  t.equal(buildConfigurations.size, 0, 'size 0')
  t.equal(buildConfigurations.isEmpty, true, 'empty')
  t.equal(buildConfigurations.names.length, 0, 'names.length 0')

  let isInitialised = await buildConfigurations.initialise()
  t.equal(isInitialised, true, 'initialise() => true')
  isInitialised = await buildConfigurations.initialise()
  t.equal(isInitialised, false, 'initialise() again => false')

  try {
    const buildConfiguration = buildConfigurations.get('nonexistent')
    t.fail(
      'should have thrown an error, got ' +
        buildConfiguration.buildConfigurationName
    )
  } catch (error) {
    t.throws(XpmError, 'throws XpmError')
    t.match(
      (error as Error).message,
      'does not exist',
      'throws "does not exist"'
    )
  }

  t.end()
})

await test('XpmBuildConfigurations', async (t) => {
  const jsonBuildConfigurations: JsonBuildConfigurations = {
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
  const buildConfigurations = new XpmBuildConfigurations({
    log,
    engine,
    substitutionsVariables: xpmLiquidSubstitutionsVariablesBase,
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
  try {
    await configTwo.initialise()
  } catch (error) {
    t.throws(XpmError, 'throws XpmError')
    t.match(
      (error as Error).message,
      'undefined variable',
      'throws "undefined variable"'
    )
  }

  t.end()
})

await test('XpmBuildConfigurations buildFolderRelativePath', async (t) => {
  const substitutionsVariables = {
    ...xpmLiquidSubstitutionsVariablesBase,
    properties: {
      buildFolderRelativePath:
        "{{ 'topBuild' | path_join: configuration.name | to_filename | downcase }}",
    },
  }

  const jsonBuildConfigurations: JsonBuildConfigurations = {
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
  const buildConfigurations = new XpmBuildConfigurations({
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

  try {
    await configThree.initialise()
  } catch (error) {
    t.throws(XpmError, 'throws XpmError')
    t.match(
      (error as Error).message,
      'undefined variable',
      'throws "undefined variable"'
    )
  }

  t.end()
})

await test('XpmBuildConfigurations inheritance', async (t) => {
  const substitutionsVariables = {
    ...xpmLiquidSubstitutionsVariablesBase,
    properties: {
      package3version: '3.2.1',
      inherits: 'configOne',
    },
  }

  const jsonBuildConfigurations: JsonBuildConfigurations = {
    configOne: {
      inherits: ' ',
      properties: {
        p1: 'v1.1',
        p2: 'v1.2',
        p3: 'v1.3',
      },
      actions: {
        buildOne: 'echo Build One action',
      },
    },
    configTwo: {
      inherits: 'configOne',
      properties: {
        p2: 'v2.2',
        p3: 'v2.3',
        p4: 'v2.4',
      },
      actions: {
        buildTwo: 'echo Build Two action',
      },
      dependencies: {
        package2a: '^1.0.0',
      },
      devDependencies: {
        package2b: '^2.0.0',
      },
    },
    configThree: {
      inherits: ['configTwo'],
      properties: {
        p3: 'v3.3',
        p4: 'v3.4',
      },
      actions: {
        buildThree: 'echo Build Three action',
      },
      dependencies: {
        package3a: '^{{ properties.package3version }}',
      },
      devDependencies: {
        package3b: '^2.0.0',
      },
    },
    configFour: {
      inherits: ['unknownConfig'],
    },
    configFive: {
      inherit: 'configSix',
    },
    configSix: {
      inherit: ['configFive'],
    },
    configSeven: {
      inherits: '{{properties.inherits}}',
    },
    configEight: {
      inherits: '{{undefined}}',
    },
    configNine: {
      dependencies: {
        package9a: '^{{ properties.package3version }}',
      },
    },
    configTen: {
      devDependencies: {
        package10a: '^{{ properties.package3version }}',
      },
    },
  }

  const buildConfigurations = new XpmBuildConfigurations({
    log,
    engine,
    substitutionsVariables,
    jsonBuildConfigurations,
  })

  await buildConfigurations.initialise()
  t.equal(buildConfigurations.size, 10, 'size 10')

  const configThree = buildConfigurations.get('configThree')
  await configThree.initialise()

  t.equal(configThree.properties.p1, 'v1.1', 'inherited properties.p1 is v1.1')
  t.equal(configThree.properties.p2, 'v2.2', 'inherited properties.p2 is v2.2')
  t.equal(configThree.properties.p3, 'v3.3', 'own properties.p3 is v3.3')
  t.equal(configThree.properties.p4, 'v3.4', 'own properties.p4 is v3.4')

  const actionsThree = configThree.actions
  await actionsThree.initialise()
  t.equal(actionsThree.size, 3, 'actionsThree size 3')
  const actionBuildThree = actionsThree.get('buildThree')
  await actionBuildThree.initialise()
  t.equal(actionBuildThree.commands.length, 1, 'actionBuildThree has 1 command')
  t.equal(
    actionBuildThree.commands[0],
    'echo Build Three action',
    'actionBuildThree command is correct'
  )

  t.equal(
    configThree.dependencies['package2a'],
    '^1.0.0',
    'inherited dependencies package2a'
  )
  t.equal(
    configThree.dependencies['package3a'],
    '^3.2.1',
    'own dependencies package3a'
  )
  t.equal(
    configThree.devDependencies['package2b'],
    '^2.0.0',
    'inherited devDependencies package2b'
  )
  t.equal(
    configThree.devDependencies['package3b'],
    '^2.0.0',
    'own devDependencies package3b'
  )

  const configTwo = buildConfigurations.get('configTwo')
  let isInitialised = await configTwo.initialise()
  // It was initialised while processing configOne inheritance.
  t.equal(isInitialised, false, 'configTwo initialise() again => false')

  t.equal(configTwo.properties.p1, 'v1.1', 'inherited properties.p1 is v1.1')
  t.equal(configTwo.properties.p2, 'v2.2', 'own properties.p2 is v2.2')
  t.equal(configTwo.properties.p3, 'v2.3', 'own properties.p3 is v2.3')
  t.equal(configTwo.properties.p4, 'v2.4', 'own properties.p4 is v2.4')

  t.equal(
    configTwo.dependencies['package2a'],
    '^1.0.0',
    'own dependencies package2a'
  )
  t.equal(
    configTwo.devDependencies['package2b'],
    '^2.0.0',
    'own devDependencies package2b'
  )

  const actionsTwo = configTwo.actions
  await actionsTwo.initialise()
  t.equal(actionsTwo.size, 2, 'actionsTwo size 2')
  const actionBuildTwo = actionsTwo.get('buildTwo')
  await actionBuildTwo.initialise()
  t.equal(actionBuildTwo.commands.length, 1, 'actionBuildTwo has 1 command')
  t.equal(
    actionBuildTwo.commands[0],
    'echo Build Two action',
    'actionBuildTwo command is correct'
  )

  const configFour = buildConfigurations.get('configFour')
  try {
    await configFour.initialise()
    t.fail('should have thrown an error')
  } catch (error) {
    t.throws(AssertionError, 'throws AssertionError')
    t.match(
      (error as Error).message,
      'inherits from missing',
      'throws "inherits from missing"'
    )
  }

  const configFive = buildConfigurations.get('configFive')
  try {
    await configFive.initialise()
    t.fail('should have thrown an error')
  } catch (error) {
    t.throws(XpmError, 'throws XpmError')
    t.match(
      (error as Error).message,
      'circular reference',
      'throws "circular reference"'
    )
  }

  const configSeven = buildConfigurations.get('configSeven')
  await configSeven.initialise()

  t.equal(configSeven.properties.p1, 'v1.1', 'inherited properties.p1 is v1.1')

  const configEight = buildConfigurations.get('configEight')
  try {
    await configEight.initialise()
    t.fail('should have thrown an error')
  } catch (error) {
    t.throws(XpmError, 'throws XpmError')
    t.match(
      (error as Error).message,
      'undefined variable',
      'throws "undefined variable"'
    )
  }

  const configNine = buildConfigurations.get('configNine')
  debugger
  await configNine.initialise()
  t.equal(
    configNine.dependencies['package9a'],
    '^3.2.1',
    'dependencies package9a'
  )

  const configTen = buildConfigurations.get('configTen')
  await configTen.initialise()
  t.equal(
    configTen.devDependencies['package10a'],
    '^3.2.1',
    'devDependencies package10a'
  )

  t.end()
})

await test('XpmBuildConfigurations templates', async (t) => {
  const jsonBuildConfigurations: JsonBuildConfigurations = {
    configOne: {
      properties: {
        p1: 'v1',
      },
    },
    'configTwo-{{ matrix.alfa }}-{{ matrix.beta }}': {
      matrix: {
        alfa: ['a1', 'a2'],
        beta: ['b1', 'b2'],
      },
      template: {
        hidden: true,
        properties: {
          p2: 'v{{ matrix.alfa }}.{{ matrix.beta }}',
        },
      },
    },
    configThree: {
      properties: {
        p3: 'v3',
      },
    },
    'configFour-{{ matrix.gamma }}-{{ matrix.delta }}': {
      matrix: {
        gamma: ['a1', 'a2'],
        delta: ['b1', 'b2'],
      },
      template: {
        inherits: 'configTwo-{{ matrix.gamma }}-{{ matrix.delta }}',
        properties: {
          p4: 'v{{ matrix.gamma }}.{{ matrix.delta }}',
        },
      },
    },
    'configFive-{{ matrix.epsilon }}': {
      matrix: {
        epsilon: ['a1', 'a2'],
      },
      template: {
        // No substitutions.
        properties: {
          p4: 'v4',
        },
      },
    },
    'configSix-{{ matrix.zeta }}': {
      matrix: {
        zeta: ['a1', 'a2'],
      },
      template: {
        properties: {
          p4: '{{ undefined }}',
        },
      },
    },
  }

  const buildConfigurations = new XpmBuildConfigurations({
    log,
    engine,
    substitutionsVariables: xpmLiquidSubstitutionsVariablesBase,
    jsonBuildConfigurations,
  })

  await buildConfigurations.initialise()
  t.equal(buildConfigurations.size, 14, 'size 14')

  const configNames = buildConfigurations.names
  t.equal(configNames[0], 'configOne', 'configNames[0] is configOne')

  t.equal(
    configNames[1],
    'configTwo-a1-b1',
    'configNames[1] is configTwo-a1-b1'
  )
  t.equal(
    configNames[2],
    'configTwo-a1-b2',
    'configNames[2] is configTwo-a1-b2'
  )
  t.equal(
    configNames[3],
    'configTwo-a2-b1',
    'configNames[3] is configTwo-a2-b1'
  )
  t.equal(
    configNames[4],
    'configTwo-a2-b2',
    'configNames[4] is configTwo-a2-b2'
  )

  t.equal(
    buildConfigurations.isHidden('configTwo-a1-b1'),
    true,
    'isHidden(configTwo-a1-b1) is true'
  )

  t.equal(
    buildConfigurations.isHidden('configFour-a2-b2'),
    false,
    'isHidden(configFour-a2-b2) is false'
  )

  const configTwoA1B1 = buildConfigurations.get('configTwo-a1-b1')
  await configTwoA1B1.initialise()
  t.equal(
    configTwoA1B1.properties.p2,
    'va1.b1',
    'configTwo-a1-b1 properties.p2 is va1.b1'
  )
  t.equal(configTwoA1B1.isHidden, true, 'configTwo-a1-b1 isHidden is true')

  const configTwoA2B2 = buildConfigurations.get('configTwo-a2-b2')
  await configTwoA2B2.initialise()
  t.equal(
    configTwoA2B2.properties.p2,
    'va2.b2',
    'configTwo-a2-b2 properties.p2 is va2.b2'
  )
  t.equal(configTwoA2B2.isHidden, true, 'configTwo-a2-b2 isHidden is true')

  const configFourA1B2 = buildConfigurations.get('configFour-a1-b2')
  await configFourA1B2.initialise()
  t.equal(
    configFourA1B2.properties.p2,
    'va1.b2',
    'configFour-a1-b2 inherited properties.p2 is va1.b2'
  )
  t.equal(
    configFourA1B2.properties.p4,
    'va1.b2',
    'configFour-a1-b2 own properties.p4 is va1.b2'
  )
  t.equal(configFourA1B2.isHidden, false, 'configFour-a1-b2 isHidden is false')

  const configFiveA1 = buildConfigurations.get('configFive-a1')
  await configFiveA1.initialise()
  t.equal(configFiveA1.properties.p4, 'v4', 'configFive-a1 properties.p4 is v4')

  const configSixA1 = buildConfigurations.get('configSix-a1')
  try {
    await configSixA1.initialise()
  } catch (error) {
    t.throws(XpmError, 'throws XpmError')
    t.match(
      (error as Error).message,
      'undefined variable',
      'throws "undefined variable"'
    )
  }

  t.end()
})

await test('XpmBuildConfigurations templates errors', async (t) => {
  const jsonBuildConfigurations: JsonBuildConfigurations = {
    configOne: {
      properties: {
        p1: 'v1',
      },
    },
    'configTwo-{{ matrix.alfa }}-{{ matrix.beta }}-{{ undefined }}': {
      matrix: {
        alfa: ['a1', 'a2'],
        beta: ['b1', 'b2'],
      },
      template: {
        properties: {
          p2: 'v{{ matrix.alfa }}.{{ matrix.beta }}',
        },
      },
    },
  }

  const buildConfigurations = new XpmBuildConfigurations({
    log,
    engine,
    substitutionsVariables: xpmLiquidSubstitutionsVariablesBase,
    jsonBuildConfigurations,
  })
  try {
    await buildConfigurations.initialise()
    t.fail('should have thrown an error')
  } catch (error) {
    t.throws(XpmError, 'throws XpmError')
    t.match(
      (error as Error).message,
      'undefined variable',
      'throws "undefined variable"'
    )
  }

  t.end()
})

await test('XpmBuildConfigurations templates matrix', async (t) => {
  const substitutionsVariables = {
    ...xpmLiquidSubstitutionsVariablesBase,
    properties: {
      alfa2: 'a2',
    },
  }

  const jsonBuildConfigurations: JsonBuildConfigurations = {
    configOne: {
      properties: {
        p1: 'v1',
      },
    },
    'configTwo-{{ matrix.alfa }}-{{ matrix.beta }}': {
      matrix: {
        alfa: ['a1', '{{ properties.alfa2 }}'],
        beta: ['b1', 'b2'],
      },
      template: {
        properties: {
          p2: 'v{{ matrix.alfa }}.{{ matrix.beta }}',
        },
      },
    },
  }

  const buildConfigurations = new XpmBuildConfigurations({
    log,
    engine,
    substitutionsVariables,
    jsonBuildConfigurations,
  })

  await buildConfigurations.initialise()
  t.equal(buildConfigurations.size, 5, 'size 5')

  const configNames = buildConfigurations.names
  t.equal(configNames[0], 'configOne', 'configNames[0] is configOne')

  t.equal(
    configNames[1],
    'configTwo-a1-b1',
    'configNames[1] is configTwo-a1-b1'
  )
  t.equal(
    configNames[2],
    'configTwo-a1-b2',
    'configNames[2] is configTwo-a1-b2'
  )

  t.end()
})

await test('XpmBuildConfigurations templates matrix errors', async (t) => {
  let jsonBuildConfigurations: JsonBuildConfigurations
  let buildConfigurations

  jsonBuildConfigurations = {
    configOne: {
      properties: {
        p1: 'v1',
      },
    },
    'configTwo-{{ matrix.alfa }}-{{ matrix.beta }}': {
      matrix: {
        alfa: ['a1', '{{ undefined }}'],
        beta: ['b1', 'b2'],
      },
      template: {
        properties: {
          p2: 'v{{ matrix.alfa }}.{{ matrix.beta }}',
        },
      },
    },
  }

  buildConfigurations = new XpmBuildConfigurations({
    log,
    engine,
    substitutionsVariables: xpmLiquidSubstitutionsVariablesBase,
    jsonBuildConfigurations,
  })
  try {
    await buildConfigurations.initialise()
    t.fail('should have thrown an error')
  } catch (error) {
    t.throws(XpmError, 'throws XpmError')
    t.match(
      (error as Error).message,
      'undefined variable',
      'throws "undefined variable"'
    )
  }

  jsonBuildConfigurations = {
    configOne: {
      properties: {
        p1: 'v1',
      },
    },
    'configTwo-{{ matrix.alfa }}-{{ matrix.beta }}': {
      matrix: {
        alfa: [42, 'a2'],
        beta: ['b1', 'b2'],
      },
      template: {
        properties: {
          p2: 'v{{ matrix.alfa }}.{{ matrix.beta }}',
        },
      },
    },
  }

  buildConfigurations = new XpmBuildConfigurations({
    log,
    engine,
    substitutionsVariables: xpmLiquidSubstitutionsVariablesBase,
    jsonBuildConfigurations,
  })
  try {
    await buildConfigurations.initialise()
    t.fail('should have thrown an error')
  } catch (error) {
    t.throws(XpmError, 'throws XpmError')
    t.match(
      (error as Error).message,
      'value is not a string',
      'throws "value is not a string"'
    )
  }

  jsonBuildConfigurations = {
    configOne: {
      properties: {
        p1: 'v1',
      },
    },
    'configTwo-{{ matrix.alfa }}-{{ matrix.beta }}': {
      matrix: {
        alfa: 42,
        beta: ['b1', 'b2'],
      },
      template: {
        properties: {
          p2: 'v{{ matrix.alfa }}.{{ matrix.beta }}',
        },
      },
    },
  }

  buildConfigurations = new XpmBuildConfigurations({
    log,
    engine,
    substitutionsVariables: xpmLiquidSubstitutionsVariablesBase,
    jsonBuildConfigurations,
  })
  try {
    await buildConfigurations.initialise()
    t.fail('should have thrown an error')
  } catch (error) {
    t.throws(XpmError, 'throws XpmError')
    t.match(
      (error as Error).message,
      'is not an array',
      'throws "is not an array"'
    )
  }

  jsonBuildConfigurations = {
    configOne: {
      properties: {
        p1: 'v1',
      },
    },
    'configTwo-{{ matrix.alfa }}-{{ matrix.beta }}': {
      matrix: {
        alfa: ['a1', 'a2'],
        beta: ['b1', 'b2'],
      },
      template: 42,
    },
  }

  buildConfigurations = new XpmBuildConfigurations({
    log,
    engine,
    substitutionsVariables: xpmLiquidSubstitutionsVariablesBase,
    jsonBuildConfigurations,
  })
  try {
    await buildConfigurations.initialise()
    t.fail('should have thrown an error')
  } catch (error) {
    t.throws(XpmError, 'throws XpmError')
    t.match(
      (error as Error).message,
      'template is not a JSON object',
      'throws "template is not a JSON object"'
    )
  }

  jsonBuildConfigurations = {
    configOne: {
      properties: {
        p1: 'v1',
      },
    },
    'configTwo-{{ matrix.alfa }}-{{ matrix.beta }}': {
      matrix: 42,
      template: {
        properties: {
          p2: 'v{{ matrix.alfa }}.{{ matrix.beta }}',
        },
      },
    },
  }

  buildConfigurations = new XpmBuildConfigurations({
    log,
    engine,
    substitutionsVariables: xpmLiquidSubstitutionsVariablesBase,
    jsonBuildConfigurations,
  })
  try {
    await buildConfigurations.initialise()
    t.fail('should have thrown an error')
  } catch (error) {
    t.throws(XpmError, 'throws XpmError')
    t.match(
      (error as Error).message,
      'matrix is not an object',
      'throws "matrix is not an object"'
    )
  }

  t.end()
})

await test('XpmBuildConfigurations templates duplicates', async (t) => {
  let jsonBuildConfigurations: JsonBuildConfigurations
  let buildConfigurations

  jsonBuildConfigurations = {
    'configTwo-a1-b1': {
      properties: {
        p1: 'v1',
      },
    },
    'configTwo-{{ matrix.alfa }}-{{ matrix.beta }}': {
      matrix: {
        alfa: ['a1', 'a2'],
        beta: ['b1', 'b2'],
      },
      template: {
        properties: {
          p2: 'v{{ matrix.alfa }}.{{ matrix.beta }}',
        },
      },
    },
  }

  buildConfigurations = new XpmBuildConfigurations({
    log,
    engine,
    substitutionsVariables: xpmLiquidSubstitutionsVariablesBase,
    jsonBuildConfigurations,
  })
  try {
    await buildConfigurations.initialise()
    t.fail('should have thrown an error')
  } catch (error) {
    t.throws(XpmError, 'throws XpmError')
    t.match(
      (error as Error).message,
      'could not be generated',
      'throws "could not be generated"'
    )
  }

  jsonBuildConfigurations = {
    'configTwo-{{ matrix.alfa }}-{{ matrix.beta }}': {
      matrix: {
        alfa: ['a1', 'a2'],
        beta: ['b1', 'b2'],
      },
      template: {
        properties: {
          p2: 'v{{ matrix.alfa }}.{{ matrix.beta }}',
        },
      },
    },
    'configTwo-a1-b1': {
      properties: {
        p1: 'v1',
      },
    },
  }

  buildConfigurations = new XpmBuildConfigurations({
    log,
    engine,
    substitutionsVariables: xpmLiquidSubstitutionsVariablesBase,
    jsonBuildConfigurations,
  })
  try {
    await buildConfigurations.initialise()
    t.fail('should have thrown an error')
  } catch (error) {
    t.throws(XpmError, 'throws XpmError')
    t.match(
      (error as Error).message,
      'already defined',
      'throws "already defined"'
    )
  }

  t.end()
})

// ----------------------------------------------------------------------------
