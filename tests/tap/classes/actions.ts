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

import * as os from 'node:os'
// import * as path from 'node:path'
import { AssertionError } from 'node:assert'

// https://www.npmjs.com/package/tap
import t from 'tap'

// ----------------------------------------------------------------------------

import * as xpm from '../../../src/index.js'
import { log } from '../../common.js'

// ============================================================================

const engine = new xpm.LiquidEngine()
// const log = new Logger({ level: 'info' })

// ----------------------------------------------------------------------------

await t.test('Actions - uninitialised', async (t): Promise<void> => {
  const actions = new xpm.Actions({
    log,
    engine,
    substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
    jsonActions: undefined,
  })

  try {
    actions.size
    t.fail(
      'should have thrown an error when accessing size before initialise()'
    )
  } catch (error) {
    t.throws(AssertionError, 'size throws AssertionError')
    t.match(
      (error as Error).message,
      'must be initialised',
      'size throws "must be initialised"'
    )
  }

  try {
    actions.isEmpty
    t.fail(
      'should have thrown an error when accessing isEmpty before initialise()'
    )
  } catch (error) {
    t.throws(AssertionError, 'isEmpty throws AssertionError')
    t.match(
      (error as Error).message,
      'must be initialised',
      'isEmpty throws "must be initialised"'
    )
  }

  try {
    actions.names
    t.fail(
      'should have thrown an error when accessing names before initialise()'
    )
  } catch (error) {
    t.throws(AssertionError, 'names throws AssertionError')
    t.match(
      (error as Error).message,
      'must be initialised',
      'names throws "must be initialised"'
    )
  }

  try {
    actions.has('nonexistent')
    t.fail(
      'should have thrown an error when accessing has() before initialise()'
    )
  } catch (error) {
    t.throws(AssertionError, 'has() throws AssertionError')
    t.match(
      (error as Error).message,
      'must be initialised',
      'has() throws "must be initialised"'
    )
  }

  try {
    actions.get('nonexistent')
    t.fail(
      'should have thrown an error when accessing get() before initialise()'
    )
  } catch (error) {
    t.throws(AssertionError, 'get() throws AssertionError')
    t.match(
      (error as Error).message,
      'must be initialised',
      'get() throws "must be initialised"'
    )
  }

  t.end()
})

await t.test('Actions undefined', async (t): Promise<void> => {
  const actions = new xpm.Actions({
    log,
    engine,
    substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
    jsonActions: undefined,
  })

  let isInitialised = await actions.initialise()
  t.equal(isInitialised, true, 'initialise() => true')
  isInitialised = await actions.initialise()
  t.equal(isInitialised, false, 'initialise() again => false')

  t.equal(actions.size, 0, 'size 0')
  t.equal(actions.isEmpty, true, 'empty')
  t.equal(actions.names.length, 0, 'names.length 0')

  try {
    const action = actions.get('nonexistent')
    t.fail('should have thrown an error, got ' + action.actionName)
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

await t.test('Actions at top', async (t): Promise<void> => {
  const actions = new xpm.Actions({
    log,
    engine,
    substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
    jsonActions: {
      one: 'echo "one"',
      two: ['echo "two-1"', 'echo "two-2"'],
    },
  })

  let isInitialised = await actions.initialise()
  t.equal(isInitialised, true, 'initialise() => true')
  isInitialised = await actions.initialise()
  t.equal(isInitialised, false, 'initialise() again => false')

  t.equal(actions.size, 2, 'size 2')
  t.equal(actions.isEmpty, false, 'not empty after initialise()')
  t.equal(actions.names.length, 2, 'names.length 2')

  t.equal(actions.names[0], 'one', 'names[0] is "one"')
  t.equal(actions.names[1], 'two', 'names[1] is "two"')

  t.equal(actions.has('one'), true, 'has("one") is true')
  t.equal(actions.has('two'), true, 'has("two") is true')
  t.equal(actions.has('three'), false, 'has("three") is false')

  const one = actions.get('one')
  t.equal(one.actionName, 'one', 'actionName is "one"')
  t.equal(one.parentActions, actions, 'parentActions is actions')

  try {
    one.commands
    t.fail('one.commands should throw before initialise()')
  } catch (error) {
    t.throws(
      AssertionError,
      'one.commands throws xpm.AssertionError before initialise()'
    )
    t.match(
      (error as Error).message,
      'must be initialised',
      'one.commands throws "must be initialised"'
    )
  }
  isInitialised = await one.initialise()
  t.equal(isInitialised, true, 'one.initialise() => true')
  isInitialised = await one.initialise()
  t.equal(isInitialised, false, 'one.initialise() again => false')

  const oneCommands = one.commands
  t.equal(Array.isArray(oneCommands), true, 'one.commands is array')
  t.equal(oneCommands.length, 1, 'one.commands.length is 1')
  t.equal(oneCommands[0], 'echo "one"', 'one.commands[0] is correct')

  const two = actions.get('two')
  t.equal(two.actionName, 'two', 'actionName is "two"')
  t.equal(two.parentActions, actions, 'parentActions is actions')
  isInitialised = await two.initialise()
  t.equal(isInitialised, true, 'two.initialise() => true')

  const twoCommands = two.commands
  t.equal(Array.isArray(twoCommands), true, 'two.commands is array')
  t.equal(twoCommands.length, 2, 'two.commands.length is 2')
  t.equal(twoCommands[0], 'echo "two-1"', 'two.commands[0] is correct')
  t.equal(twoCommands[1], 'echo "two-2"', 'two.commands[1] is correct')

  t.end()
})

await t.test('Actions in configuration', async (t): Promise<void> => {
  const buildConfigurationsJson: xpm.JsonBuildConfigurations = {
    debug: {
      actions: {
        one: 'echo "one"',
      },
    },
  }

  const buildConfigurations = new xpm.BuildConfigurations({
    log,
    engine,
    substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
    jsonBuildConfigurations: buildConfigurationsJson,
  })
  await buildConfigurations.initialise()

  const buildConfiguration = buildConfigurations.get('debug')
  t.ok(buildConfiguration, 'has debug build configuration')
  debugger
  await buildConfiguration.initialise()

  const actions = buildConfiguration.actions
  t.ok(actions, 'has actions')

  let isInitialised = await actions.initialise()
  t.equal(isInitialised, true, 'actions.initialise() => true')

  isInitialised = await actions.initialise()
  t.equal(isInitialised, false, 'actions.initialise() again => false')

  const actionOne = actions.get('one')
  t.ok(actionOne, 'has action one')

  isInitialised = await actionOne.initialise()
  t.equal(isInitialised, true, 'actionOne.initialise() => true')

  const commands = actionOne.commands
  t.equal(Array.isArray(commands), true, 'actionOne.commands is array')
  t.equal(commands.length, 1, 'actionOne.commands.length is 1')

  t.end()
})

await t.test('Actions inheritance', async (t): Promise<void> => {
  const inheritedActions = new xpm.Actions({
    log,
    engine,
    substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
    jsonActions: {
      one: 'echo "one"',
      two: 'echo "two"',
    },
  })
  await inheritedActions.initialise()

  const inheritedActionsMap: Map<string, xpm.Action> = new Map()
  for (const name of inheritedActions.names) {
    const action = inheritedActions.get(name)
    inheritedActionsMap!.set(name, action)
  }

  const actions = new xpm.Actions({
    log,
    engine,
    substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
    jsonActions: {
      two: ['echo "two-1"', 'echo "two-2"'],
      three: 'echo "three"',
    },
    inheritedActionsMap,
  })
  await actions.initialise()

  t.equal(actions.size, 3, 'size 3 after initialise()')
  t.equal(actions.names.length, 3, 'names.length 3 after initialise()')

  t.equal(actions.names[0], 'one', 'names[0] is "one"')
  t.equal(actions.names[1], 'two', 'names[1] is "two"')
  t.equal(actions.names[2], 'three', 'names[2] is "three"')

  const two = actions.get('two')
  await two.initialise()

  const twoCommands = two.commands
  t.equal(Array.isArray(twoCommands), true, 'two.commands is array')
  t.equal(twoCommands.length, 2, 'two.commands.length is 2')
  t.equal(twoCommands[0], 'echo "two-1"', 'two.commands[0] is correct')
  t.equal(twoCommands[1], 'echo "two-2"', 'two.commands[1] is correct')

  t.end()
})

await t.test('Actions template', async (t): Promise<void> => {
  const substitutionsVariables = {
    ...xpm.liquidSubstitutionsVariablesBase,
    properties: {
      ab: ['a', 'b'],
      ot: ['1', '2'].join(os.EOL),
    },
  }

  const actions = new xpm.Actions({
    log,
    engine,
    substitutionsVariables: substitutionsVariables,
    jsonActions: {
      one: 'echo "{{ properties.p1 }}"',
      'two-{{matrix.alfa}}-{{matrix.beta}}': {
        matrix: {
          alfa: ['{{ properties.ab | join_lines }}'],
          beta: ['{{ properties.ot | join_lines }}'],
        },
        template: 'echo "two-{{matrix.alfa}}-{{matrix.beta}}"',
      },
      three: 'echo "three"',
      'four-{{matrix.gamma}}-{{matrix.delta}}': {
        matrix: {
          gamma: ['{{ properties.ab | join_lines }}'],
          delta: ['{{ properties.ot | join_lines }}'],
        },
        template: [
          'echo "four-{{matrix.gamma}}-{{matrix.delta}}-1"',
          'echo "four-{{matrix.gamma}}-{{matrix.delta}}-2"',
        ],
      },
      five: 'echo "five"',
    },
  })

  await actions.initialise()

  t.equal(actions.size, 11, 'size 11 after initialise()')
  t.equal(actions.names.length, 11, 'names.length 11 after initialise()')

  const expectedNames = [
    'one',
    'two-a-1',
    'two-a-2',
    'two-b-1',
    'two-b-2',
    'three',
    'four-a-1',
    'four-a-2',
    'four-b-1',
    'four-b-2',
    'five',
  ]

  for (let i = 0; i < expectedNames.length; ++i) {
    t.equal(
      actions.names[i],
      expectedNames[i],
      `names[${i}] is "${expectedNames[i]}"`
    )
  }

  let action = actions.get('two-a-1')
  await action.initialise()
  t.equal(action.commands.length, 1, 'two-a-1 commands length is 1')
  t.equal(
    action.commands[0],
    'echo "two-a-1"',
    'two-a-1 commands[0] is correct'
  )

  action = actions.get('four-b-2')
  await action.initialise()
  t.equal(action.commands.length, 2, 'four-b-2 commands length is 2')
  t.equal(
    action.commands[0],
    'echo "four-b-2-1"',
    'four-b-2 commands[0] is correct'
  )
  t.equal(
    action.commands[1],
    'echo "four-b-2-2"',
    'four-b-2 commands[1] is correct'
  )

  t.end()
})

await t.test(
  'Actions template duplicate in template',
  async (t): Promise<void> => {
    const actions = new xpm.Actions({
      log,
      engine,
      substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
      jsonActions: {
        'one-1': 'echo "one"',
        'one-{{matrix.alfa}}': {
          matrix: {
            alfa: ['1', '2'],
          },
          template: 'echo "one-{{matrix.alfa}}"',
        },
      },
    })

    try {
      await actions.initialise()
      t.fail('should have thrown an error')
    } catch (error) {
      t.throws(xpm.ConfigurationError, 'throws xpm.Error')
      t.match(
        (error as Error).message,
        'duplicate action',
        'throws "duplicate action"'
      )
    }

    t.end()
  }
)

await t.test(
  'Actions template duplicate after template',
  async (t): Promise<void> => {
    const actions = new xpm.Actions({
      log,
      engine,
      substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
      jsonActions: {
        'one-{{matrix.alfa}}': {
          matrix: {
            alfa: ['1', '2'],
          },
          template: 'echo "one-{{matrix.alfa}}"',
        },
        'one-2': 'echo "one-2"',
      },
    })

    try {
      await actions.initialise()
      t.fail('should have thrown an error')
    } catch (error) {
      t.throws(xpm.ConfigurationError, 'throws xpm.Error')
      t.match(
        (error as Error).message,
        'already defined',
        'throws "already defined"'
      )
    }

    t.end()
  }
)

await t.test('Actions template errors', async (t): Promise<void> => {
  await t.test('Actions template error no matrix', async (t): Promise<void> => {
    const actions = new xpm.Actions({
      log,
      engine,
      substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
      jsonActions: {
        'one-1': 'echo "one"',
        'one-{{matrix.alfa}}': {
          template: 42,
        } as unknown as xpm.JsonActionTemplate,
      },
    })

    try {
      await actions.initialise()
      t.fail('should have thrown an error')
    } catch (error) {
      t.throws(xpm.ConfigurationError, 'throws xpm.Error')
      t.match(
        (error as Error).message,
        'has no matrix',
        'throws "has no matrix"'
      )
    }
    t.end()
  })

  await t.test(
    'Actions template error matrix is not an object',
    async (t): Promise<void> => {
      const actions = new xpm.Actions({
        log,
        engine,
        substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
        jsonActions: {
          'one-1': 'echo "one"',
          'one-{{matrix.alfa}}': {
            matrix: 42,
            template: 42,
          } as unknown as xpm.JsonActionTemplate,
        },
      })

      try {
        await actions.initialise()
        t.fail('should have thrown an error')
      } catch (error) {
        t.throws(xpm.ConfigurationError, 'throws xpm.Error')
        t.match(
          (error as Error).message,
          'matrix is not an object',
          'throws "matrix is not an object"'
        )
      }
      t.end()
    }
  )

  await t.test(
    'Actions template error no template',
    async (t): Promise<void> => {
      const actions = new xpm.Actions({
        log,
        engine,
        substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
        jsonActions: {
          'one-1': 'echo "one"',
          'one-{{matrix.alfa}}': {
            matrix: {
              alfa: ['1', '2'],
            },
          } as unknown as xpm.JsonActionTemplate,
        },
      })

      try {
        await actions.initialise()
        t.fail('should have thrown an error')
      } catch (error) {
        t.throws(xpm.ConfigurationError, 'throws xpm.Error')
        t.match(
          (error as Error).message,
          'has no template',
          'throws "has no template"'
        )
      }
      t.end()
    }
  )

  await t.test(
    'Actions template error template is not a string',
    async (t): Promise<void> => {
      const actions = new xpm.Actions({
        log,
        engine,
        substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
        jsonActions: {
          'one-1': 'echo "one"',
          'one-{{matrix.alfa}}': {
            matrix: {
              alfa: ['1', '2'],
            },
            template: 42 as unknown as xpm.JsonActionContent,
          },
        },
      })

      try {
        await actions.initialise()
        t.fail('should have thrown an error')
      } catch (error) {
        t.throws(xpm.ConfigurationError, 'throws xpm.Error')
        t.match(
          (error as Error).message,
          'template is not a string',
          'throws "template is not a string"'
        )
      }
      t.end()
    }
  )

  await t.test(
    'Actions template error matrix is not an array',
    async (t): Promise<void> => {
      const actions = new xpm.Actions({
        log,
        engine,
        substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
        jsonActions: {
          'one-{{matrix.alfa}}': {
            matrix: {
              alfa: 42,
            },
            template: 'echo "one-{{matrix.alfa}}"',
          } as unknown as xpm.JsonActionTemplate,
          'one-2': 'echo "one-2"',
        },
      })

      try {
        await actions.initialise()
        t.fail('should have thrown an error')
      } catch (error) {
        t.throws(xpm.ConfigurationError, 'throws xpm.Error')
        t.match(
          (error as Error).message,
          'is not an array',
          'throws "is not an array"'
        )
      }
      t.end()
    }
  )

  await t.test(
    'Actions template error value is not a string',
    async (t): Promise<void> => {
      const actions = new xpm.Actions({
        log,
        engine,
        substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
        jsonActions: {
          'one-{{matrix.alfa}}': {
            matrix: {
              alfa: [42],
            },
            template: 'echo "one-{{matrix.alfa}}"',
          } as unknown as xpm.JsonActionTemplate,
          'one-2': 'echo "one-2"',
        },
      })

      try {
        await actions.initialise()
        t.fail('should have thrown an error')
      } catch (error) {
        t.throws(xpm.ConfigurationError, 'throws xpm.Error')
        t.match(
          (error as Error).message,
          'value is not a string',
          'throws "value is not a string"'
        )
      }
      t.end()
    }
  )

  await t.test(
    'Actions template error undefined variable',
    async (t): Promise<void> => {
      const actions = new xpm.Actions({
        log,
        engine,
        substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
        jsonActions: {
          'one-{{matrix.alfa}}': {
            matrix: {
              alfa: ['{{ properties.nonexistent }}'],
            },
            template: 'echo "one-{{matrix.alfa}}"',
          },
          'one-2': 'echo "one-2"',
        },
      })

      try {
        await actions.initialise()
        t.fail('should have thrown an error')
      } catch (error) {
        t.throws(xpm.ConfigurationError, 'throws xpm.Error')
        t.match(
          (error as Error).message,
          'undefined variable',
          'throws "undefined variable"'
        )
      }
      t.end()
    }
  )

  await t.test(
    'Actions template error name substitution',
    async (t): Promise<void> => {
      const actions = new xpm.Actions({
        log,
        engine,
        substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
        jsonActions: {
          'one-{{matrix.undefined}}': {
            matrix: {
              alfa: ['a', 'b'],
            },
            template: 'echo "one-{{matrix.alfa}}"',
          },
          'one-2': 'echo "one-2"',
        },
      })

      try {
        await actions.initialise()
        t.fail('should have thrown an error')
      } catch (error) {
        t.throws(xpm.ConfigurationError, 'throws xpm.Error')
        t.match(
          (error as Error).message,
          'name substitution',
          'throws "name substitution"'
        )
      }
      t.end()
    }
  )

  t.end()
})

await t.test('Action errors', async (t): Promise<void> => {
  const actions = new xpm.Actions({
    log,
    engine,
    substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
    jsonActions: {
      one: 'echo "{{ properties.one }}"',
      two: 'echo "two"',
    },
  })
  await actions.initialise()

  const actionOne = actions.get('one')

  try {
    await actionOne.initialise()
    t.fail('should have thrown an error')
  } catch (error) {
    t.throws(xpm.ConfigurationError, 'throws xpm.Error')
    t.match(
      (error as Error).message,
      'commands substitution',
      'throws "commands substitution"'
    )
  }

  t.end()
})

// ----------------------------------------------------------------------------
