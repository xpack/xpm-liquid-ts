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
// import assert, { AssertionError } from 'node:assert'

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/tap
import t from 'tap'

// import { Logger } from '@xpack/logger'

// ----------------------------------------------------------------------------

import * as xpm from '../../../../src/index.js'
import { log } from '../../../helpers/index.js'

// ============================================================================

const engine = new xpm.LiquidEngine()
// const log = new Logger({ level: 'info' })

// ----------------------------------------------------------------------------

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
          {
            constructor: xpm.ConfigurationError,
            message: /undefined variable/,
          },
          'throws xpm.ConfigurationError with "undefined variable"'
        )
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
      }
    )
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
      }
    )
  }
)
