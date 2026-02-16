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

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/tap
import t from 'tap'

// ----------------------------------------------------------------------------

import * as xpm from '../../../src/index.js'
import { performSubstitutionsHelper } from '../../helpers/index.js'

// ============================================================================

await t.test(
  'LiquidPropertiesDrop - basic functionality',
  async (t): Promise<void> => {
    const substitutionsVariables = {
      properties: {
        one: '1',
        indirect: '{{ properties.one }}',
      },
    }

    t.equal(
      await performSubstitutionsHelper('', substitutionsVariables),
      '',
      'empty remains empty'
    )
    t.equal(
      await performSubstitutionsHelper('abc', substitutionsVariables),
      'abc',
      'no changes'
    )
    t.equal(
      await performSubstitutionsHelper(
        '0{{ properties.one }}2',
        substitutionsVariables
      ),
      '012',
      'one => 1'
    )
    t.equal(
      await performSubstitutionsHelper(
        '0{{ properties.indirect }}2',
        substitutionsVariables
      ),
      '012',
      'indirect => 1'
    )
  }
)

await t.test('LiquidPropertiesDrop - arrays', async (t): Promise<void> => {
  const substitutionsVariables = {
    properties: {
      one: ['10', '11'],
      two: '20',
      compound: ['{{ properties.one }}', '{{ properties.two }}'],
    },
  }

  const one = await performSubstitutionsHelper(
    '{{ properties.one }}',
    substitutionsVariables
  )

  t.not(Array.isArray(one), 'array one is concatenated')
  t.equal(one, '1011', 'array one ')

  const compound = await performSubstitutionsHelper(
    '{{ properties.compound }}',
    substitutionsVariables
  )

  t.not(Array.isArray(compound), 'compound is concatenated')
  t.equal(compound, '101120', 'compound ')
})

await t.test('LiquidPropertiesDrop - object', async (t): Promise<void> => {
  const substitutionsVariables = {
    properties: {
      map: {
        one: '1',
        two: '2',
      },
    },
  }

  const one = await performSubstitutionsHelper(
    '{{ properties.map.one }}',
    substitutionsVariables
  )

  t.equal(one, '1', 'array one')

  const subst = await performSubstitutionsHelper(
    '{{ properties.map | keys | size }}',
    substitutionsVariables
  )

  t.equal(subst, '2', 'subst')
})

await t.test('LiquidPropertiesDrop - context', async (t): Promise<void> => {
  const substitutionsVariables = {
    properties: {
      valueWithParam: 'the {{ param }} value',
    },
  }

  const one = await performSubstitutionsHelper(
    "{% assign param = 'substituted' %}{{ properties.valueWithParam }}",
    substitutionsVariables
  )
  t.equal(one, 'the substituted value', 'substituted')

  const two = await performSubstitutionsHelper(
    "{% assign param = 'one' %}{{ properties.valueWithParam }}" +
      " {% assign param = 'two' %}{{ properties.valueWithParam }}",
    substitutionsVariables
  )
  t.equal(two, 'the one value the two value', 'substituted')
})

await t.test(
  'LiquidPropertiesDrop - context missing',
  async (t): Promise<void> => {
    const substitutionsVariables = {
      properties: {
        other: null,
      },
    }

    await t.rejects(
      async () =>
        await performSubstitutionsHelper(
          '{{ properties.valueWithParam }}',
          substitutionsVariables
        ),
      {
        constructor: xpm.TemplateError,
        message: /not defined/,
      },
      'throws TemplateError for undefined property with parameter'
    )

    await t.rejects(
      async () =>
        await performSubstitutionsHelper(
          'a{{ properties.other }}b',
          substitutionsVariables
        ),
      {
        constructor: xpm.TemplateError,
        message: /Cannot read properties/,
      },
      'throws TemplateError when accessing null property'
    )
  }
)

// ----------------------------------------------------------------------------

await t.test(
  'LiquidMatrixDrop - basic functionality',
  async (t): Promise<void> => {
    const substitutionsVariables = {
      matrix: {
        one: '1',
        indirect: '{{ matrix.one }}',
      },
    }

    t.equal(
      await performSubstitutionsHelper('', substitutionsVariables),
      '',
      'empty remains empty'
    )
    t.equal(
      await performSubstitutionsHelper('abc', substitutionsVariables),
      'abc',
      'no changes'
    )
    t.equal(
      await performSubstitutionsHelper(
        '0{{ matrix.one }}2',
        substitutionsVariables
      ),
      '012',
      'one => 1'
    )
    t.equal(
      await performSubstitutionsHelper(
        '0{{ matrix.indirect }}2',
        substitutionsVariables
      ),
      '012',
      'indirect => 1'
    )
  }
)

await t.test('LiquidMatrixDrop - arrays', async (t): Promise<void> => {
  const substitutionsVariables = {
    matrix: {
      one: ['10', '11'],
      two: '20',
      compound: ['{{ matrix.one }}', '{{ matrix.two }}'],
    },
  }

  const one = await performSubstitutionsHelper(
    '{{ matrix.one }}',
    substitutionsVariables
  )

  t.not(Array.isArray(one), 'array one is concatenated')
  t.equal(one, '1011', 'array one ')

  const compound = await performSubstitutionsHelper(
    '{{ matrix.compound }}',
    substitutionsVariables
  )

  t.not(Array.isArray(compound), 'compound is concatenated')
  t.equal(compound, '101120', 'compound ')
})

await t.test('LiquidMatrixDrop - object', async (t): Promise<void> => {
  const substitutionsVariables = {
    matrix: {
      map: {
        one: '1',
        two: '2',
      },
    },
  }

  const one = await performSubstitutionsHelper(
    '{{ matrix.map.one }}',
    substitutionsVariables
  )

  t.equal(one, '1', 'array one')

  const subst = await performSubstitutionsHelper(
    '{{ matrix.map | keys | size }}',
    substitutionsVariables
  )

  t.equal(subst, '2', 'subst')
})

await t.test('LiquidMatrixDrop - context', async (t): Promise<void> => {
  const substitutionsVariables = {
    matrix: {
      valueWithParam: 'the {{ param }} value',
    },
  }

  const one = await performSubstitutionsHelper(
    "{% assign param = 'substituted' %}{{ matrix.valueWithParam }}",
    substitutionsVariables
  )
  t.equal(one, 'the substituted value', 'substituted')

  const two = await performSubstitutionsHelper(
    "{% assign param = 'one' %}{{ matrix.valueWithParam }}" +
      " {% assign param = 'two' %}{{ matrix.valueWithParam }}",
    substitutionsVariables
  )
  t.equal(two, 'the one value the two value', 'substituted')
})

await t.test('LiquidMatrixDrop - context missing', async (t): Promise<void> => {
  const substitutionsVariables = {
    matrix: {
      other: null,
    },
  }

  await t.rejects(
    async () =>
      await performSubstitutionsHelper(
        '{{ matrix.valueWithParam }}',
        substitutionsVariables
      ),
    {
      constructor: xpm.TemplateError,
      message: /not defined/,
    },
    'throws TemplateError for undefined matrix key with parameter'
  )

  await t.rejects(
    async () =>
      await performSubstitutionsHelper(
        'a{{ matrix.other }}b',
        substitutionsVariables
      ),
    {
      constructor: xpm.TemplateError,
      message: /Cannot read properties/,
    },
    'throws TemplateError when accessing null matrix value'
  )
})

// ----------------------------------------------------------------------------
