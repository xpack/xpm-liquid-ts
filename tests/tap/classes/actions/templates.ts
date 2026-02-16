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
// import { AssertionError } from 'node:assert'

// https://www.npmjs.com/package/tap
import t from 'tap'

// ----------------------------------------------------------------------------

import * as xpm from '../../../../src/index.js'
import { log } from '../../../common.js'

// ============================================================================

const engine = new xpm.LiquidEngine()
// const log = new Logger({ level: 'info' })

// ----------------------------------------------------------------------------

await t.test('Actions - template', async (t): Promise<void> => {
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

    await t.rejects(
      async () => await actions.initialise(),
      {
        constructor: xpm.ConfigurationError,
        message: /duplicate action/,
      },
      'throws ConfigurationError for duplicate action from template'
    )
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

    await t.rejects(
      async () => await actions.initialise(),
      {
        constructor: xpm.ConfigurationError,
        message: /already defined/,
      },
      'throws ConfigurationError when template duplicates existing action'
    )
  }
)
