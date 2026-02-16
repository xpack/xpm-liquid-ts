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
// import * as path from 'node:path'
// import { AssertionError } from 'node:assert'

// https://www.npmjs.com/package/tap
import t from 'tap'

// ----------------------------------------------------------------------------

import * as xpm from '../../../../src/index.js'
import { log } from '../../../helpers/index.js'

// ============================================================================

const engine = new xpm.LiquidEngine()
// const log = new Logger({ level: 'info' })

// ----------------------------------------------------------------------------

await t.test('Actions - template errors', async (t): Promise<void> => {
  await t.test(
    'Actions - template error no matrix',
    async (t): Promise<void> => {
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

      await t.rejects(
        async () => await actions.initialise(),
        {
          constructor: xpm.ConfigurationError,
          message: /has no matrix/,
        },
        'throws ConfigurationError when template has no matrix'
      )
    }
  )

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

      await t.rejects(
        () => actions.initialise(),
        {
          constructor: xpm.ConfigurationError,
          message: /matrix is not an object/,
        },
        'throws xpm.ConfigurationError with "matrix is not an object"'
      )
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

      await t.rejects(
        () => actions.initialise(),
        {
          constructor: xpm.ConfigurationError,
          message: /has no template/,
        },
        'throws xpm.ConfigurationError with "has no template"'
      )
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

      await t.rejects(
        () => actions.initialise(),
        {
          constructor: xpm.ConfigurationError,
          message: /template is not a string/,
        },
        'throws xpm.ConfigurationError with "template is not a string"'
      )
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

      await t.rejects(
        () => actions.initialise(),
        {
          constructor: xpm.ConfigurationError,
          message: /is not an array/,
        },
        'throws xpm.ConfigurationError with "is not an array"'
      )
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

      await t.rejects(
        () => actions.initialise(),
        {
          constructor: xpm.ConfigurationError,
          message: /value is not a string/,
        },
        'throws xpm.ConfigurationError with "value is not a string"'
      )
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

      await t.rejects(
        () => actions.initialise(),
        {
          constructor: xpm.ConfigurationError,
          message: /undefined variable/,
        },
        'throws xpm.ConfigurationError with "undefined variable"'
      )
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

      await t.rejects(
        () => actions.initialise(),
        {
          constructor: xpm.ConfigurationError,
          message: /name substitution/,
        },
        'throws xpm.ConfigurationError with "name substitution"'
      )
    }
  )
})

await t.test('Action - errors', async (t): Promise<void> => {
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

  await t.rejects(
    () => actionOne.initialise(),
    {
      constructor: xpm.ConfigurationError,
      message: /commands substitution/,
    },
    'throws xpm.ConfigurationError with "commands substitution"'
  )
})
