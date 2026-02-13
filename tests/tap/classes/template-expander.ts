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

// https://www.npmjs.com/package/tap
import t from 'tap'

// ----------------------------------------------------------------------------

import * as xpm from '../../../src/index.js'
import { log } from '../../common.js'

// ============================================================================

const engine = new xpm.LiquidEngine()

// ----------------------------------------------------------------------------

await t.test(
  'TemplateExpander - simple matrix expansion',
  async (t): Promise<void> => {
    interface TestTemplate {
      value: string
    }

    interface TestInstance {
      name: string
      combination: Record<string, string>
      template: TestTemplate
      originalName: string
    }

    type TestMatrix = Record<string, unknown>

    const expander = new xpm.TemplateExpander<
      TestMatrix,
      TestTemplate,
      TestInstance
    >({
      log,
      engine,
      substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
    })

    const templateName = 'test-{{ matrix.arch }}'
    const matrix: TestMatrix = {
      arch: ['x64', 'arm64'],
    }
    const templateContent: TestTemplate = { value: 'test-content' }

    const instances = await expander.expandTemplate({
      templateName,
      matrix,
      templateContent,
      templateType: 'action',
      instanceFactory: (expandedName, combination, content, originalName) => ({
        name: expandedName,
        combination,
        template: content,
        originalName,
      }),
    })

    t.equal(instances.size, 2, 'created 2 instances')
    t.ok(instances.has('test-x64'), 'has test-x64')
    t.ok(instances.has('test-arm64'), 'has test-arm64')

    const instanceX64 = instances.get('test-x64')
    t.ok(instanceX64, 'test-x64 exists')
    t.equal(instanceX64?.name, 'test-x64', 'name is test-x64')
    t.same(instanceX64?.combination, { arch: 'x64' }, 'combination is x64')
    t.equal(
      instanceX64?.originalName,
      'test-{{ matrix.arch }}',
      'original name preserved'
    )
    t.same(
      instanceX64?.template,
      templateContent,
      'template content passed through'
    )

    const instanceArm64 = instances.get('test-arm64')
    t.ok(instanceArm64, 'test-arm64 exists')
    t.equal(instanceArm64?.name, 'test-arm64', 'name is test-arm64')
    t.same(
      instanceArm64?.combination,
      { arch: 'arm64' },
      'combination is arm64'
    )

    t.end()
  }
)

await t.test(
  'TemplateExpander - multi-dimensional matrix',
  async (t): Promise<void> => {
    interface TestInstance {
      name: string
      combination: Record<string, string>
    }

    type TestMatrix = Record<string, unknown>

    const expander = new xpm.TemplateExpander<
      TestMatrix,
      unknown,
      TestInstance
    >({
      log,
      engine,
      substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
    })

    const templateName = 'build-{{ matrix.platform }}-{{ matrix.arch }}'
    const matrix: TestMatrix = {
      platform: ['linux', 'darwin'],
      arch: ['x64', 'arm64'],
    }

    const instances = await expander.expandTemplate({
      templateName,
      matrix,
      templateContent: {},
      templateType: 'buildConfiguration',
      instanceFactory: (expandedName, combination) => ({
        name: expandedName,
        combination,
      }),
    })

    t.equal(instances.size, 4, 'created 4 instances (2x2 Cartesian product)')
    t.ok(instances.has('build-linux-x64'), 'has build-linux-x64')
    t.ok(instances.has('build-linux-arm64'), 'has build-linux-arm64')
    t.ok(instances.has('build-darwin-x64'), 'has build-darwin-x64')
    t.ok(instances.has('build-darwin-arm64'), 'has build-darwin-arm64')

    const linuxX64 = instances.get('build-linux-x64')
    t.same(
      linuxX64?.combination,
      { platform: 'linux', arch: 'x64' },
      'linux-x64 combination correct'
    )

    const darwinArm64 = instances.get('build-darwin-arm64')
    t.same(
      darwinArm64?.combination,
      { platform: 'darwin', arch: 'arm64' },
      'darwin-arm64 combination correct'
    )

    t.end()
  }
)

await t.test(
  'TemplateExpander - three-dimensional matrix',
  async (t): Promise<void> => {
    interface TestInstance {
      name: string
    }

    type TestMatrix = Record<string, unknown>

    const expander = new xpm.TemplateExpander<
      TestMatrix,
      unknown,
      TestInstance
    >({
      log,
      engine,
      substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
    })

    const templateName = '{{ matrix.os }}-{{ matrix.arch }}-{{ matrix.config }}'
    const matrix: TestMatrix = {
      os: ['linux', 'darwin'],
      arch: ['x64', 'arm64'],
      config: ['debug', 'release'],
    }

    const instances = await expander.expandTemplate({
      templateName,
      matrix,
      templateContent: {},
      templateType: 'action',
      instanceFactory: (expandedName) => ({ name: expandedName }),
    })

    t.equal(instances.size, 8, 'created 8 instances (2x2x2 Cartesian product)')
    t.ok(instances.has('linux-x64-debug'), 'has linux-x64-debug')
    t.ok(instances.has('linux-x64-release'), 'has linux-x64-release')
    t.ok(instances.has('linux-arm64-debug'), 'has linux-arm64-debug')
    t.ok(instances.has('darwin-arm64-release'), 'has darwin-arm64-release')

    t.end()
  }
)

await t.test(
  'TemplateExpander - matrix with Liquid substitutions',
  async (t): Promise<void> => {
    interface TestInstance {
      name: string
      combination: Record<string, string>
    }

    type TestMatrix = Record<string, unknown>

    const expander = new xpm.TemplateExpander<
      TestMatrix,
      unknown,
      TestInstance
    >({
      log,
      engine,
      substitutionsVariables: {
        ...xpm.liquidSubstitutionsVariablesBase,
        configuration: {
          name: 'test-config',
        },
      },
    })

    const templateName = '{{ configuration.name }}-{{ matrix.variant }}'
    const matrix: TestMatrix = {
      variant: ['{{ "alpha" | upcase }}', 'beta'],
    }

    const instances = await expander.expandTemplate({
      templateName,
      matrix,
      templateContent: {},
      templateType: 'action',
      instanceFactory: (expandedName, combination) => ({
        name: expandedName,
        combination,
      }),
    })

    t.equal(instances.size, 2, 'created 2 instances')
    t.ok(instances.has('test-config-ALPHA'), 'has test-config-ALPHA')
    t.ok(instances.has('test-config-beta'), 'has test-config-beta')

    const alphaInstance = instances.get('test-config-ALPHA')
    t.equal(
      alphaInstance?.combination.variant,
      'ALPHA',
      'variant processed with Liquid'
    )

    t.end()
  }
)

await t.test(
  'TemplateExpander - single parameter matrix',
  async (t): Promise<void> => {
    interface TestInstance {
      name: string
    }

    type TestMatrix = Record<string, unknown>

    const expander = new xpm.TemplateExpander<
      TestMatrix,
      unknown,
      TestInstance
    >({
      log,
      engine,
      substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
    })

    const templateName = 'variant-{{ matrix.type }}'
    const matrix: TestMatrix = {
      type: ['a', 'b', 'c', 'd'],
    }

    const instances = await expander.expandTemplate({
      templateName,
      matrix,
      templateContent: {},
      templateType: 'action',
      instanceFactory: (expandedName) => ({ name: expandedName }),
    })

    t.equal(instances.size, 4, 'created 4 instances')
    t.ok(instances.has('variant-a'), 'has variant-a')
    t.ok(instances.has('variant-b'), 'has variant-b')
    t.ok(instances.has('variant-c'), 'has variant-c')
    t.ok(instances.has('variant-d'), 'has variant-d')

    t.end()
  }
)

await t.test(
  'TemplateExpander - complex Liquid template name',
  async (t): Promise<void> => {
    interface TestInstance {
      name: string
    }

    type TestMatrix = Record<string, unknown>

    const expander = new xpm.TemplateExpander<
      TestMatrix,
      unknown,
      TestInstance
    >({
      log,
      engine,
      substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
    })

    const templateName =
      '{{ matrix.prefix | upcase }}-{{ matrix.arch }}-{{ matrix.suffix | downcase }}'
    const matrix: TestMatrix = {
      prefix: ['test'],
      arch: ['x64'],
      suffix: ['DEBUG'],
    }

    const instances = await expander.expandTemplate({
      templateName,
      matrix,
      templateContent: {},
      templateType: 'action',
      instanceFactory: (expandedName) => ({ name: expandedName }),
    })

    t.equal(instances.size, 1, 'created 1 instance')
    t.ok(instances.has('TEST-x64-debug'), 'has TEST-x64-debug')

    t.end()
  }
)

await t.test(
  'TemplateExpander - error on invalid matrix',
  async (t): Promise<void> => {
    interface TestInstance {
      name: string
    }

    type TestMatrix = Record<string, unknown>

    const expander = new xpm.TemplateExpander<
      TestMatrix,
      unknown,
      TestInstance
    >({
      log,
      engine,
      substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
    })

    const templateName = 'test-{{ matrix.arch }}'
    const invalidMatrix: TestMatrix = {
      arch: 'not-an-array', // Should be an array
    }

    try {
      await expander.expandTemplate({
        templateName,
        matrix: invalidMatrix,
        templateContent: {},
        templateType: 'action',
        instanceFactory: (expandedName) => ({ name: expandedName }),
      })
      t.fail('should have thrown an error')
    } catch (error) {
      t.ok(error instanceof xpm.ConfigurationError, 'throws ConfigurationError')
      t.match(
        (error as Error).message,
        /is not an array/i,
        'error mentions is not an array'
      )
    }

    t.end()
  }
)

await t.test(
  'TemplateExpander - error on invalid Liquid syntax in name',
  async (t): Promise<void> => {
    interface TestInstance {
      name: string
    }

    type TestMatrix = Record<string, unknown>

    const expander = new xpm.TemplateExpander<
      TestMatrix,
      unknown,
      TestInstance
    >({
      log,
      engine,
      substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
    })

    const templateName = 'test-{{ matrix.arch | invalid_filter }}'
    const matrix: TestMatrix = {
      arch: ['x64'],
    }

    try {
      await expander.expandTemplate({
        templateName,
        matrix,
        templateContent: {},
        templateType: 'action',
        instanceFactory: (expandedName) => ({ name: expandedName }),
      })
      t.fail('should have thrown an error')
    } catch (error) {
      t.ok(error instanceof xpm.ConfigurationError, 'throws ConfigurationError')
      t.match(
        (error as Error).message,
        /substitution/i,
        'error mentions substitution'
      )
    }

    t.end()
  }
)

await t.test(
  'TemplateExpander - empty matrix values',
  async (t): Promise<void> => {
    interface TestInstance {
      name: string
    }

    type TestMatrix = Record<string, unknown>

    const expander = new xpm.TemplateExpander<
      TestMatrix,
      unknown,
      TestInstance
    >({
      log,
      engine,
      substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
    })

    const templateName = 'test-{{ matrix.arch }}'
    const matrix: TestMatrix = {
      arch: [], // Empty array
    }

    const instances = await expander.expandTemplate({
      templateName,
      matrix,
      templateContent: {},
      templateType: 'action',
      instanceFactory: (expandedName) => ({ name: expandedName }),
    })

    t.equal(instances.size, 0, 'created 0 instances for empty matrix')
    t.equal(instances.size, 0, 'map is empty')

    t.end()
  }
)

await t.test('TemplateExpander - preserves order', async (t): Promise<void> => {
  interface TestInstance {
    name: string
  }

  type TestMatrix = Record<string, unknown>

  const expander = new xpm.TemplateExpander<TestMatrix, unknown, TestInstance>({
    log,
    engine,
    substitutionsVariables: xpm.liquidSubstitutionsVariablesBase,
  })

  const templateName = '{{ matrix.a }}-{{ matrix.b }}'
  const matrix: TestMatrix = {
    a: ['1', '2'],
    b: ['x', 'y'],
  }

  const instances = await expander.expandTemplate({
    templateName,
    matrix,
    templateContent: {},
    templateType: 'action',
    instanceFactory: (expandedName) => ({ name: expandedName }),
  })

  // Map iteration order should match insertion order
  const names = Array.from(instances.keys())
  t.same(
    names,
    ['1-x', '1-y', '2-x', '2-y'],
    'names in correct Cartesian product order'
  )

  t.end()
})

// ----------------------------------------------------------------------------
