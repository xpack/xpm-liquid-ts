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
import assert, { AssertionError } from 'node:assert'

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/tap
import t from 'tap'

import { Logger } from '@xpack/logger'

// ----------------------------------------------------------------------------

import * as xpm from '../../../src/index.js'
import { log } from '../../common.js'

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

    try {
      buildConfigurations.size
      t.fail('size should have thrown an error')
    } catch (error) {
      t.throws(AssertionError, 'size throws AssertionError')
      t.match(
        (error as Error).message,
        'must be initialised',
        'size throws "must be initialised"'
      )
    }

    try {
      buildConfigurations.isEmpty
      t.fail('isEmpty should have thrown an error')
    } catch (error) {
      t.throws(AssertionError, 'isEmpty throws AssertionError')
      t.match(
        (error as Error).message,
        'must be initialised',
        'isEmpty throws "must be initialised"'
      )
    }

    try {
      buildConfigurations.names
      t.fail('names should have thrown an error')
    } catch (error) {
      t.throws(AssertionError, 'names throws AssertionError')
      t.match(
        (error as Error).message,
        'must be initialised',
        'names throws "must be initialised"'
      )
    }

    try {
      buildConfigurations.getJsonName('undefined')
      t.fail('getJsonName() should have thrown an error')
    } catch (error) {
      t.throws(AssertionError, 'getJsonName() throws AssertionError')
      t.match(
        (error as Error).message,
        'must be initialised',
        'getJsonName() throws "must be initialised"'
      )
    }

    try {
      buildConfigurations.hasJson('undefined')
      t.fail('hasJson() should have thrown an error')
    } catch (error) {
      t.throws(AssertionError, 'hasJson() throws AssertionError')
      t.match(
        (error as Error).message,
        'must be initialised',
        'hasJson() throws "must be initialised"'
      )
    }

    try {
      buildConfigurations.getJson('undefined')
      t.fail('getJson() should have thrown an error')
    } catch (error) {
      t.throws(AssertionError, 'getJson() throws AssertionError')
      t.match(
        (error as Error).message,
        'must be initialised',
        'getJson() throws "must be initialised"'
      )
    }

    try {
      buildConfigurations.isHidden('undefined')
      t.fail('isHidden() should have thrown an error')
    } catch (error) {
      t.throws(AssertionError, 'isHidden() throws AssertionError')
      t.match(
        (error as Error).message,
        'must be initialised',
        'isHidden() throws "must be initialised"'
      )
    }

    try {
      buildConfigurations.has('undefined')
      t.fail('has() should have thrown an error')
    } catch (error) {
      t.throws(AssertionError, 'has() throws AssertionError')
      t.match(
        (error as Error).message,
        'must be initialised',
        'has() throws "must be initialised"'
      )
    }

    try {
      buildConfigurations.get('undefined')
      t.fail('get() should have thrown an error')
    } catch (error) {
      t.throws(AssertionError, 'get() throws AssertionError')
      t.match(
        (error as Error).message,
        'must be initialised',
        'get() throws "must be initialised"'
      )
    }

    t.end()
  }
)

await t.test('BuildConfigurations undefined', async (t): Promise<void> => {
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

  try {
    const buildConfiguration = buildConfigurations.get('nonexistent')
    t.fail(
      'should have thrown an error, got ' +
        buildConfiguration.buildConfigurationName
    )
  } catch (error) {
    t.throws(xpm.ConfigurationError, 'throws xpm.Error')
    t.match(
      (error as Error).message,
      'does not exist',
      'throws "does not exist"'
    )
  }

  t.end()
})

await t.test('BuildConfigurations', async (t): Promise<void> => {
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
    /undefined variable/,
    'throws xpm.ConfigurationError with "undefined variable"'
  )

  t.end()
})

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
      /undefined variable/,
      'throws xpm.ConfigurationError with "undefined variable"'
    )

    t.end()
  }
)

await t.test('BuildConfigurations inheritance', async (t): Promise<void> => {
  const substitutionsVariables = {
    ...xpm.liquidSubstitutionsVariablesBase,
    properties: {
      package3version: '3.2.1',
      inherits: 'configOne',
    },
  }

  const jsonBuildConfigurations: xpm.JsonBuildConfigurations = {
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

  const buildConfigurations = new xpm.BuildConfigurations({
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
  await t.rejects(
    async () => await configFour.initialise(),
    {
      constructor: xpm.ConfigurationError,
      message: /inherits from missing/,
    },
    'throws ConfigurationError for inheriting from missing configuration'
  )

  const configFive = buildConfigurations.get('configFive')
  await t.rejects(
    async () => await configFive.initialise(),
    {
      constructor: xpm.ConfigurationError,
      message: /circular reference/,
    },
    'throws ConfigurationError for circular reference in inheritance'
  )

  const configSeven = buildConfigurations.get('configSeven')
  await configSeven.initialise()

  t.equal(configSeven.properties.p1, 'v1.1', 'inherited properties.p1 is v1.1')

  const configEight = buildConfigurations.get('configEight')
  await t.rejects(
    async () => await configEight.initialise(),
    {
      constructor: xpm.ConfigurationError,
      message: /undefined variable/,
    },
    'throws ConfigurationError for undefined variable in templates'
  )

  const configNine = buildConfigurations.get('configNine')
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

await t.test('BuildConfigurations templates', async (t): Promise<void> => {
  const jsonBuildConfigurations: xpm.JsonBuildConfigurations = {
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

  const buildConfigurations = new xpm.BuildConfigurations({
    log,
    engine,
    substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
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
  await t.rejects(
    () => configSixA1.initialise(),
    /undefined variable/,
    'throws xpm.ConfigurationError with "undefined variable"'
  )

  t.end()
})

await t.test(
  'BuildConfigurations templates errors',
  async (t): Promise<void> => {
    const jsonBuildConfigurations: xpm.JsonBuildConfigurations = {
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

    const buildConfigurations = new xpm.BuildConfigurations({
      log,
      engine,
      substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
      jsonBuildConfigurations,
    })
    await t.rejects(
      async () => await buildConfigurations.initialise(),
      {
        constructor: xpm.ConfigurationError,
        message: /undefined variable/,
      },
      'throws ConfigurationError for undefined variable'
    )

    t.end()
  }
)

await t.test(
  'BuildConfigurations templates matrix',
  async (t): Promise<void> => {
    const substitutionsVariables = {
      ...xpm.liquidSubstitutionsVariablesBase,
      properties: {
        alfa2: 'a2',
      },
    }

    const jsonBuildConfigurations: xpm.JsonBuildConfigurations = {
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

    const buildConfigurations = new xpm.BuildConfigurations({
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
  }
)

await t.test(
  'BuildConfigurations templates matrix errors',
  async (t): Promise<void> => {
    await t.test(
      'BuildConfigurations template matrix error undefined variable',
      async (t): Promise<void> => {
        const jsonBuildConfigurations = {
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

        const buildConfigurations = new xpm.BuildConfigurations({
          log,
          engine,
          substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
          jsonBuildConfigurations,
        })
        await t.rejects(
          () => buildConfigurations.initialise(),
          /undefined variable/,
          'throws xpm.ConfigurationError with "undefined variable"'
        )

        t.end()
      }
    )

    await t.test(
      'BuildConfigurations template matrix error value is not a string',
      async (t): Promise<void> => {
        const jsonBuildConfigurations: xpm.JsonBuildConfigurations = {
          configOne: {
            properties: {
              p1: 'v1',
            },
          },
          'configTwo-{{ matrix.alfa }}-{{ matrix.beta }}': {
            matrix: {
              alfa: [42 as unknown as string, 'a2'],
              beta: ['b1', 'b2'],
            },
            template: {
              properties: {
                p2: 'v{{ matrix.alfa }}.{{ matrix.beta }}',
              },
            },
          },
        }

        const buildConfigurations = new xpm.BuildConfigurations({
          log,
          engine,
          substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
          jsonBuildConfigurations,
        })
        await t.rejects(
          async () => await buildConfigurations.initialise(),
          {
            constructor: xpm.ConfigurationError,
            message: /value is not a string/,
          },
          'throws ConfigurationError when matrix value is not a string'
        )

        t.end()
      }
    )

    await t.test(
      'BuildConfigurations template matrix error matrix is not an array',
      async (t): Promise<void> => {
        const jsonBuildConfigurations: xpm.JsonBuildConfigurations = {
          configOne: {
            properties: {
              p1: 'v1',
            },
          },
          'configTwo-{{ matrix.alfa }}-{{ matrix.beta }}': {
            matrix: {
              alfa: 42 as unknown as string[],
              beta: ['b1', 'b2'],
            },
            template: {
              properties: {
                p2: 'v{{ matrix.alfa }}.{{ matrix.beta }}',
              },
            },
          },
        }

        const buildConfigurations = new xpm.BuildConfigurations({
          log,
          engine,
          substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
          jsonBuildConfigurations,
        })
        await t.rejects(
          async () => await buildConfigurations.initialise(),
          {
            constructor: xpm.ConfigurationError,
            message: /is not an array/,
          },
          'throws ConfigurationError when matrix value is not an array'
        )

        t.end()
      }
    )

    await t.test(
      'BuildConfigurations template matrix error template is not a JSON object',
      async (t): Promise<void> => {
        const jsonBuildConfigurations: xpm.JsonBuildConfigurations = {
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
            template: 42 as unknown as xpm.JsonBuildConfigurationContent,
          },
        }

        const buildConfigurations = new xpm.BuildConfigurations({
          log,
          engine,
          substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
          jsonBuildConfigurations,
        })
        await t.rejects(
          async () => await buildConfigurations.initialise(),
          {
            constructor: xpm.ConfigurationError,
            message: /template is not a JSON object/,
          },
          'throws ConfigurationError when template is not a JSON object'
        )

        t.end()
      }
    )

    await t.test(
      'BuildConfigurations template matrix error matrix is not an object',
      async (t): Promise<void> => {
        const jsonBuildConfigurations: xpm.JsonBuildConfigurations = {
          configOne: {
            properties: {
              p1: 'v1',
            },
          },
          'configTwo-{{ matrix.alfa }}-{{ matrix.beta }}': {
            matrix: 42 as unknown as xpm.JsonTemplateMatrix,
            template: {
              properties: {
                p2: 'v{{ matrix.alfa }}.{{ matrix.beta }}',
              },
            },
          },
        }

        const buildConfigurations = new xpm.BuildConfigurations({
          log,
          engine,
          substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
          jsonBuildConfigurations,
        })
        await t.rejects(
          async () => await buildConfigurations.initialise(),
          {
            constructor: xpm.ConfigurationError,
            message: /matrix is not an object/,
          },
          'throws ConfigurationError when matrix is not an object'
        )
        t.end()
      }
    )

    t.end()
  }
)

await t.test(
  'BuildConfigurations templates duplicates',
  async (t): Promise<void> => {
    await t.test(
      'BuildConfigurations templates duplicate could not be generated',
      async (t): Promise<void> => {
        const jsonBuildConfigurations = {
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

        const buildConfigurations = new xpm.BuildConfigurations({
          log,
          engine,
          substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
          jsonBuildConfigurations,
        })
        await t.rejects(
          async () => await buildConfigurations.initialise(),
          {
            constructor: xpm.ConfigurationError,
            message: /could not be generated/,
          },
          'throws ConfigurationError for duplicate that could not be generated'
        )
        t.end()
      }
    )

    await t.test(
      'BuildConfigurations templates duplicate already defined',
      async (t): Promise<void> => {
        const jsonBuildConfigurations = {
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

        const buildConfigurations = new xpm.BuildConfigurations({
          log,
          engine,
          substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
          jsonBuildConfigurations,
        })
        await t.rejects(
          async () => await buildConfigurations.initialise(),
          {
            constructor: xpm.ConfigurationError,
            message: /already defined/,
          },
          'throws ConfigurationError for duplicate already defined'
        )
        t.end()
      }
    )

    t.end()
  }
)

// ----------------------------------------------------------------------------

await t.test('configurations', async (t): Promise<void> => {
  const json: xpm.JsonXpmPackage = {
    name: 'test',
    version: '1.2.3',
    xpack: {
      properties: {
        p1: '1',
        p2: '2',
      },
      buildConfigurations: {
        alfa: {
          dependencies: {
            dep1: '^1.0.0',
            dep2: { specifier: '^2.0.0', local: 'link' },
          },
          devDependencies: {
            ddep1: '^10.0.0',
            ddep2: { specifier: '^20.0.0', local: 'copy', platforms: 'any' },
          },
          properties: { p2: '2a' },
          actions: {
            one: 'echo {{ properties.p1 }} command',
            two: 'echo {{ properties.p2 }} command',
          },
        },
      },
    },
  }

  const xpmDataModel = new xpm.DataModel({
    log,
    jsonPackage: json,
  })

  const buildConfigurations = xpmDataModel.buildConfigurations
  t.ok(buildConfigurations, 'has buildConfigurations')

  // console.log(buildConfigurations.substitutionsVariables.properties)
  assert(json.xpack.properties, 'json.xpack.properties is defined')
  t.equal(
    Object.keys(buildConfigurations.substitutionsVariables.properties).length,
    Object.keys(json.xpack.properties).length,
    'properties length matches'
  )

  t.equal(
    buildConfigurations.substitutionsVariables.properties.p1,
    '1',
    'properties.p1 is 1'
  )

  // -----

  let isInitialised = await buildConfigurations.initialise()
  t.equal(isInitialised, true, 'buildConfigurations.initialise() => true')
  isInitialised = await buildConfigurations.initialise()
  t.equal(
    isInitialised,
    false,
    'buildConfigurations.initialise() again => false'
  )

  const buildConfigurationsNames = buildConfigurations.names
  t.equal(
    buildConfigurationsNames.length,
    Object.keys(json.xpack!.buildConfigurations!).length,
    'buildConfigurations has' + buildConfigurationsNames.length + 'names'
  )

  // -----

  t.equal(
    buildConfigurationsNames[0],
    'alfa',
    'buildConfigurations names[0] is "alfa"'
  )

  t.equal(buildConfigurations.hasJson('alfa'), true, 'hasJson("alfa") is true')
  t.ok(buildConfigurations.getJson('alfa'), 'getJson("alfa")')
  t.equal(
    buildConfigurations.getJsonName('alfa'),
    'alfa',
    'getJsonName("alfa") is "alfa"'
  )

  t.equal(
    buildConfigurations.isHidden('alfa'),
    false,
    'isHidden("alfa") is false'
  )

  t.ok(
    buildConfigurations.has('alfa'),
    'buildConfigurations has configuration "alfa"'
  )

  const buildConfiguration = buildConfigurations.get('alfa')
  t.ok(buildConfiguration, 'buildConfigurationsNames.get("alfa")')

  t.equal(
    buildConfiguration.parentBuildConfigurations,
    buildConfigurations,
    'parentBuildConfigurations'
  )
  t.equal(
    buildConfiguration.buildConfigurationName,
    'alfa',
    'buildConfigurationName is "alfa"'
  )

  await buildConfiguration.initialise()

  // console.log(buildConfiguration.dependenciesMap)
  t.equal(
    Object.keys(buildConfiguration.dependencies).length,
    Object.keys(
      (
        json.xpack!.buildConfigurations!
          .alfa! as xpm.JsonBuildConfigurationContent
      ).dependencies!
    ).length,
    'dependencies length matches'
  )
  t.equal(
    buildConfiguration.dependencies['dep1'],
    '^1.0.0',
    'dependency dep1 matches'
  )
  // console.log(buildConfiguration.devDependenciesMap)
  t.equal(
    Object.keys(buildConfiguration.devDependencies).length,
    Object.keys(
      (
        json.xpack!.buildConfigurations!
          .alfa! as xpm.JsonBuildConfigurationContent
      ).devDependencies!
    ).length,
    'devDependencies length matches'
  )
  t.equal(
    buildConfiguration.devDependencies['ddep1'],
    '^10.0.0',
    'devDependency ddep1 matches'
  )

  const actions = buildConfiguration.actions
  t.ok(actions, 'has actions')

  isInitialised = await actions.initialise()
  t.equal(isInitialised, true, 'actions.initialise() => true')
  isInitialised = await actions.initialise()
  t.equal(isInitialised, false, 'actions.initialise() again => false')

  t.equal(actions.isEmpty, false, 'actions is not empty after init')

  const actionsNames = actions.names
  t.equal(actionsNames.length, 2, 'actions has 2 names')

  // -----

  t.equal(actionsNames[0], 'one', 'actions names[0] is "one"')
  t.ok(actions.has('one'), 'actions has action "one"')

  const actionOne = actions.get('one')
  t.ok(actionOne, 'actions.get("one")')

  t.equal(actionOne.parentActions, actions, 'parentActions')
  t.equal(actionOne.actionName, 'one', 'actionName is "one"')

  t.equal(
    actionOne.jsonAction,
    'echo {{ properties.p1 }} command',
    'jsonAction'
  )

  isInitialised = await actionOne.initialise()
  t.equal(isInitialised, true, 'actionOne.initialise() => true')

  let commands = actionOne.commands
  // console.log(commands)
  t.equal(commands.length, 1, 'actionOne has 1 command')
  t.equal(commands[0], 'echo 1 command', 'command is as expected')

  const actionTwo = actions.get('two')
  t.ok(actionTwo, 'actions.get("two")')

  isInitialised = await actionTwo.initialise()
  t.equal(isInitialised, true, 'actionTwo.initialise() => true')

  commands = actionTwo.commands
  t.equal(commands.length, 1, 'actionTwo has 1 command')
  t.equal(commands[0], 'echo 2a command', 'command is as expected')

  // -----

  t.end()
})

await t.test('configurations inheritance', async (t): Promise<void> => {
  const json: xpm.JsonXpmPackage = {
    name: 'test',
    version: '1.2.3',
    xpack: {
      properties: {
        buildFolderRelativePath:
          "{{ 'build' | path_join: configuration.name | to_filename | downcase }}",
        buildFolderRelativePathPosix:
          "{{ 'build' | path_posix_join: configuration.name | downcase }}",
        commandCMakePrepare:
          '{{ properties.commandCMakeReconfigure }} --log-level=VERBOSE',
        commandCMakePrepareWithToolchain:
          '{{ properties.commandCMakePrepare }} -D CMAKE_TOOLCHAIN_FILE=xpacks/@micro-os-plus/build-helper/cmake/toolchains/{{ properties.toolchainFileName }}',
        commandCMakeReconfigure:
          "cmake -S . -B {{ properties.buildFolderRelativePathPosix }} -G Ninja{% if os.platform == 'win32' %} -D CMAKE_MAKE_PROGRAM=ninja.cmd{% endif %} -D CMAKE_BUILD_TYPE={{ properties.buildType }} -D PLATFORM_NAME={{ properties.platformName }} -D CMAKE_EXPORT_COMPILE_COMMANDS=ON",
        commandCMakeBuild:
          'cmake --build {{ properties.buildFolderRelativePathPosix }}',
        commandCMakeBuildVerbose:
          'cmake --build {{ properties.buildFolderRelativePathPosix }} --verbose',
        commandCMakeClean:
          'cmake --build {{ properties.buildFolderRelativePathPosix }} --target clean',
        commandCMakePerformTests:
          'cd {{ properties.buildFolderRelativePath }} && ctest -V',
      },
      buildConfigurations: {
        'cmake-actions': {
          hidden: true,
          actions: {
            prepare: '{{ properties.commandCMakePrepareWithToolchain }}',
            build: [
              '{{ properties.commandCMakeReconfigure }}',
              '{{ properties.commandCMakeBuild }}',
            ],
            test: '{{ properties.commandCMakePerformTests }}',
            clean: '{{ properties.commandCMakeClean }}',
          },
        },
        'native-dependencies': {
          hidden: true,
          devDependencies: {
            '@micro-os-plus/architecture-synthetic-posix': '4.0.3',
          },
        },
        'native-actions': {
          hidden: true,
          actions: {
            install: ['xpm install --config {{ configuration.name }}'],
            'link-deps': [
              'xpm link --config {{ configuration.name }} @micro-os-plus/architecture-synthetic-posix',
            ],
          },
        },
        'gcc14-dependencies': {
          hidden: true,
          $devDependenciesUrl:
            'https://www.npmjs.com/package/@xpack-dev-tools/gcc',
          devDependencies: {
            '@xpack-dev-tools/gcc': {
              specifier: '14.2.0-2.1',
              platforms: 'linux-x64,linux-arm64,win32-x64',
            },
          },
        },
        'native-cmake-gcc': {
          hidden: true,
          inherits: ['cmake-actions', 'native-actions', 'native-dependencies'],
          properties: {
            buildType: 'Debug',
            platformName: 'native',
            toolchainFileName: 'gcc.cmake',
          },
        },
        'native-cmake-gcc14-debug': {
          inherits: ['native-cmake-gcc', 'gcc14-dependencies'],
        },
        'native-cmake-gcc14-release': {
          inherits: ['native-cmake-gcc14-debug'],
          properties: {
            buildType: 'Release',
          },
        },
      },
    },
  }

  const xpmDataModel = new xpm.DataModel({
    log,
    jsonPackage: json,
  })

  const buildConfigurations = xpmDataModel.buildConfigurations
  t.ok(buildConfigurations, 'has buildConfigurations')

  let isInitialised = await buildConfigurations.initialise()
  t.equal(isInitialised, true, 'buildConfigurations.initialise() => true')

  const buildConfigurationsNames = buildConfigurations.names
  t.equal(
    buildConfigurationsNames.length,
    Object.keys(json.xpack!.buildConfigurations!).length,
    'buildConfigurations has ' + buildConfigurationsNames.length + ' names'
  )

  t.ok(
    buildConfigurations.has('native-cmake-gcc14-release'),
    'buildConfigurations has configuration "native-cmake-gcc14-release"'
  )

  // log.level = 'trace'
  const buildConfiguration = buildConfigurations.get(
    'native-cmake-gcc14-release'
  )
  // log.level = 'info'
  t.ok(
    buildConfiguration,
    'buildConfigurationsNames.get("native-cmake-gcc14-release")'
  )

  await buildConfiguration.initialise()

  t.equal(
    Object.keys(buildConfiguration.properties).length,
    3,
    'buildConfiguration.properties length is 3'
  )
  t.equal(
    buildConfiguration.properties.buildType,
    'Release',
    'buildConfiguration.properties.buildType'
  )
  t.equal(
    buildConfiguration.properties.platformName,
    'native',
    'buildConfiguration.properties.platformName'
  )
  t.equal(
    buildConfiguration.properties.toolchainFileName,
    'gcc.cmake',
    'buildConfiguration.properties.toolchainFileName'
  )

  t.equal(
    Object.keys(buildConfiguration.devDependencies).length,
    2,
    'devDependencies length matches'
  )

  t.equal(
    buildConfiguration.devDependencies.hasOwnProperty('@xpack-dev-tools/gcc'),
    true,
    'has devDependency @xpack-dev-tools/gcc'
  )
  t.equal(
    buildConfiguration.devDependencies.hasOwnProperty(
      '@micro-os-plus/architecture-synthetic-posix'
    ),
    true,
    'has devDependency @micro-os-plus/architecture-synthetic-posix'
  )

  const actions = buildConfiguration.actions
  t.ok(actions, 'has actions')

  isInitialised = await actions.initialise()
  t.equal(isInitialised, true, 'actions.initialise() => true')

  const actionsNames = actions.names
  // console.log(actionsNames)
  t.equal(
    actionsNames.length,
    6,
    'actions has ' + actionsNames.length + ' names'
  )

  const action = await actions.get('build')
  t.ok(action, 'actions.get("build")')

  isInitialised = await action.initialise()
  const commands = action.commands
  t.equal(commands.length, 2, 'action "build" has 2 commands')
  t.match(
    commands[0],
    'cmake -S . -B build/native-cmake-gcc14-release -G Ninja'
  )
  t.equal(
    commands[1],
    'cmake --build build/native-cmake-gcc14-release',
    'second command is cmake --build'
  )

  // -----

  t.end()
})

await t.test('configurations template', async (t): Promise<void> => {
  const json: xpm.JsonXpmPackage = {
    name: 'test',
    version: '1.2.3',
    xpack: {
      properties: {
        dummyMap: {
          one: '11',
          two: '22',
          three: '33',
        },
        builders: ['cmake', 'meson'],
        'native-gcc-releases': {
          '15': {
            specifier: '15.2.0-1.1',
            platforms: 'linux-x64,linux-arm64,win32-x64',
          },
          '14': {
            specifier: '14.3.0-1.1',
            platforms: 'linux-x64,linux-arm64,win32-x64',
          },
        },
        'native-gcc-versions': [
          '{{ properties.native-gcc-releases | keys | join_lines }}',
        ],
      },
      actions: {
        dummy: '{{ properties.dummyMap["one"] }}',
      },
      buildConfigurations: {
        alfa: {},
        'native-gcc{{ matrix.native-gcc-version}}-dependencies': {
          matrix: {
            'native-gcc-version': [
              '',
              '{{ properties.native-gcc-versions | join_lines }}',
            ],
          },
          template: {
            hidden: true,
            devDependencies: {
              '@xpack-dev-tools/gcc': {
                specifier:
                  '{{ properties.native-gcc-releases[matrix.native-gcc-version].specifier }}',
                platforms:
                  '{{ properties.native-gcc-releases[matrix.native-gcc-version].platforms }}',
              },
            },
          },
        },
        'native-actions': {
          hidden: true,
          actions: {
            install: ['xpm install --config {{ configuration.name }}'],
            'link-dependencies': [
              'xpm link --config {{ configuration.name }} @micro-os-plus/architecture-synthetic-posix',
            ],
          },
        },
        'native-dependencies': {
          hidden: true,
          devDependencies: {
            '@micro-os-plus/architecture-synthetic-posix': '4.0.3',
          },
        },
        'cmake-actions': {
          hidden: true,
          actions: {
            prepare: '{{ properties.commandCMakePrepareWithToolchain }}',
            build: [
              '{{ properties.commandCMakeReconfigure }}',
              '{{ properties.commandCMakeBuild }}',
            ],
            test: '{{ properties.commandCMakePerformTests }}',
            clean: '{{ properties.commandCMakeClean }}',
          },
        },
        'native-cmake-gcc': {
          hidden: true,
          inherits: ['cmake-actions', 'native-actions', 'native-dependencies'],
          properties: {
            buildType: 'Debug',
            platformName: 'native',
            toolchainFileName: 'gcc.cmake',
          },
        },
        'native-meson-gcc': {
          hidden: true,
          inherits: [
            'native-actions',
            'meson-native-actions',
            'native-dependencies',
          ],
          properties: {
            buildType: 'debug',
            platformName: 'native',
            toolchainFileName: 'gcc-{{ os.platform }}.ini',
          },
        },
        'meson-native-actions': {
          hidden: true,
          actions: {
            prepare: '{{ properties.commandMesonPrepareWithToolchain }}',
            build: [
              '{{ properties.commandMesonReconfigure }}',
              '{{ properties.commandMesonBuild }}',
            ],
            test: '{{ properties.commandMesonPerformTests }}',
            clean: '{{ properties.commandMesonClean }}',
          },
        },
        'native-{{ matrix.builder }}-gcc{{ matrix.native-gcc-version }}-debug':
          {
            matrix: {
              builder: ['{{ properties.builders | join_lines }}'],
              'native-gcc-version': [
                '',
                '{{ properties.native-gcc-versions | join_lines }}',
              ],
            },
            template: {
              inherits: [
                'native-{{ matrix.builder }}-gcc',
                'native-gcc{{ matrix.native-gcc-version }}-dependencies',
              ],
            },
          },
        'native-{{ matrix.builder }}-gcc{{ matrix.native-gcc-version }}-release':
          {
            matrix: {
              builder: ['{{ properties.builders | join_lines }}'],
              'native-gcc-version': [
                '',
                '{{ properties.native-gcc-versions | join_lines }}',
              ],
            },
            template: {
              inherits: [
                'native-{{ matrix.builder }}-gcc{{ matrix.native-gcc-version }}-debug',
              ],
              properties: {
                buildType:
                  "{% case matrix.builder %}{% when 'cmake' %}Release{% when 'meson' %}release{% else %}unknown{% endcase %}",
              },
            },
          },
        bravo: {},
      },
    },
  }

  // log.level = 'trace'
  const xpmDataModel = new xpm.DataModel({
    log,
    jsonPackage: json,
  })

  // -----
  const actions = xpmDataModel.actions
  t.ok(actions, 'has actions')

  const actionsInitialised = await actions.initialise()
  t.equal(actionsInitialised, true, 'actions.initialise() => true')

  const actionsNames = actions.names
  t.equal(
    actionsNames.length,
    1,
    'actions has ' + actionsNames.length + ' names'
  )

  const action = await actions.get('dummy')
  t.ok(action, 'actions.get("dummy")')

  await action.initialise()
  const commands = action.commands
  t.equal(commands.length, 1, 'action "dummy" has 1 command')
  t.equal(commands[0], '11', 'command is as expected')

  // -----

  const buildConfigurations = xpmDataModel.buildConfigurations
  t.ok(buildConfigurations, 'has buildConfigurations')

  // -----
  const isInitialised = await buildConfigurations.initialise()
  t.equal(isInitialised, true, 'buildConfigurations.initialise() => true')

  const buildConfigurationsNames = buildConfigurations.names
  // console.log(buildConfigurationsNames)
  t.equal(
    buildConfigurationsNames.length,
    23,
    'buildConfigurations has ' + 23 + ' names'
  )

  t.equal(
    buildConfigurationsNames[0],
    'alfa',
    'buildConfigurations names[0] is "alfa"'
  )
  t.equal(
    buildConfigurationsNames[2],
    'native-gcc14-dependencies',
    'buildConfigurations names[2] is "native-gcc14-dependencies"'
  )
  t.equal(
    buildConfigurationsNames[3],
    'native-gcc15-dependencies',
    'buildConfigurations names[3] is "native-gcc15-dependencies"'
  )
  t.equal(
    buildConfigurationsNames[11],
    'native-cmake-gcc14-debug',
    'buildConfigurations names[11] is "native-cmake-gcc14-debug"'
  )
  t.equal(
    buildConfigurationsNames[21],
    'native-meson-gcc15-release',
    'buildConfigurations names[21] is "native-meson-gcc15-release"'
  )
  t.equal(
    buildConfigurationsNames[22],
    'bravo',
    'buildConfigurations names[22] is "bravo"'
  )

  await t.test(
    'configurations template native-gcc15-dependencies',
    async (t): Promise<void> => {
      const buildConfiguration = buildConfigurations.get(
        'native-gcc15-dependencies'
      )
      t.ok(
        buildConfiguration,
        'buildConfigurationsNames.get("native-gcc15-dependencies")'
      )

      const isInitialised = await buildConfiguration.initialise()
      const devDepGcc = buildConfiguration.devDependencies
      t.equal(
        (devDepGcc['@xpack-dev-tools/gcc'] as xpm.JsonDependencyExtended)
          .specifier,
        '15.2.0-1.1',
        'gcc specifier is "15.2.0-1.1"'
      )
      t.equal(
        (devDepGcc['@xpack-dev-tools/gcc'] as xpm.JsonDependencyExtended)
          .platforms,
        'linux-x64,linux-arm64,win32-x64',
        'gcc platforms is "linux-x64,linux-arm64,win32-x64"'
      )

      t.end()
    }
  )

  await t.test(
    'configurations template native-cmake-gcc15-release',
    async (t): Promise<void> => {
      const buildConfiguration = buildConfigurations.get(
        'native-cmake-gcc15-release'
      )
      t.ok(
        buildConfiguration,
        'buildConfigurationsNames.get("native-cmake-gcc15-release")'
      )

      await buildConfiguration.initialise()

      const actions = buildConfiguration.actions
      t.ok(actions, 'has actions')

      const isInitialised = await actions.initialise()
      t.equal(isInitialised, true, 'actions.initialise() => true')

      const actionsNames = actions.names
      // console.log(actionsNames)
      t.equal(actionsNames.length, 6, 'actions has ' + 6 + ' names')

      const devDependencies = buildConfiguration.devDependencies
      t.equal(
        (devDependencies['@xpack-dev-tools/gcc'] as xpm.JsonDependencyExtended)
          .specifier,
        '15.2.0-1.1',
        'gcc specifier is "15.2.0-1.1"'
      )
      t.equal(
        (devDependencies['@xpack-dev-tools/gcc'] as xpm.JsonDependencyExtended)
          .platforms,
        'linux-x64,linux-arm64,win32-x64',
        'gcc platforms is "linux-x64,linux-arm64,win32-x64"'
      )
      t.equal(
        devDependencies['@micro-os-plus/architecture-synthetic-posix'],
        '4.0.3',
        'architecture-synthetic-posix specifier is "4.0.3"'
      )
      t.end()
    }
  )

  t.end()
})

// ----------------------------------------------------------------------------
