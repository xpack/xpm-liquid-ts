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
import { performSubstitutionsTest } from '../../common.js'

// ============================================================================

await t.test('xpm.LiquidPropertiesDrop', async (t) => {
  const substitutionsVariables = {
    properties: {
      one: '1',
      indirect: '{{ properties.one }}',
    },
  }

  t.equal(
    await performSubstitutionsTest('', substitutionsVariables),
    '',
    'empty remains empty'
  )
  t.equal(
    await performSubstitutionsTest('abc', substitutionsVariables),
    'abc',
    'no changes'
  )
  t.equal(
    await performSubstitutionsTest(
      '0{{ properties.one }}2',
      substitutionsVariables
    ),
    '012',
    'one => 1'
  )
  t.equal(
    await performSubstitutionsTest(
      '0{{ properties.indirect }}2',
      substitutionsVariables
    ),
    '012',
    'indirect => 1'
  )

  t.end()
})

await t.test('xpm.LiquidPropertiesDrop arrays', async (t) => {
  const substitutionsVariables = {
    properties: {
      one: ['10', '11'],
      two: '20',
      compound: ['{{ properties.one }}', '{{ properties.two }}'],
    },
  }

  const one = await performSubstitutionsTest(
    '{{ properties.one }}',
    substitutionsVariables
  )

  t.not(Array.isArray(one), 'array one is concatenated')
  t.equal(one, '1011', 'array one ')

  const compound = await performSubstitutionsTest(
    '{{ properties.compound }}',
    substitutionsVariables
  )

  t.not(Array.isArray(compound), 'compound is concatenated')
  t.equal(compound, '101120', 'compound ')

  t.end()
})

await t.test('xpm.LiquidPropertiesDrop object', async (t) => {
  const substitutionsVariables = {
    properties: {
      map: {
        one: '1',
        two: '2',
      },
    },
  }

  const one = await performSubstitutionsTest(
    '{{ properties.map.one }}',
    substitutionsVariables
  )

  t.equal(one, '1', 'array one')

  const subst = await performSubstitutionsTest(
    '{{ properties.map | keys | size }}',
    substitutionsVariables
  )

  t.equal(subst, '2', 'subst')

  t.end()
})

await t.test('xpm.LiquidPropertiesDrop context', async (t) => {
  const substitutionsVariables = {
    properties: {
      valueWithParam: 'the {{ param }} value',
    },
  }

  const one = await performSubstitutionsTest(
    "{% assign param = 'substituted' %}{{ properties.valueWithParam }}",
    substitutionsVariables
  )
  t.equal(one, 'the substituted value', 'substituted')

  const two = await performSubstitutionsTest(
    "{% assign param = 'one' %}{{ properties.valueWithParam }}" +
      " {% assign param = 'two' %}{{ properties.valueWithParam }}",
    substitutionsVariables
  )
  t.equal(two, 'the one value the two value', 'substituted')

  t.end()
})

await t.test('xpm.LiquidPropertiesDrop context missing', async (t) => {
  const substitutionsVariables = {
    properties: {
      other: null,
    },
  }

  try {
    await performSubstitutionsTest(
      '{{ properties.valueWithParam }}',
      substitutionsVariables
    )
    t.fail('should have thrown')
  } catch (error) {
    t.throws(xpm.InputError, 'throw xpm.InputError')
    t.match(
      (error as Error).message,
      'not defined',
      `error message is "not defined"`
    )
  }

  try {
    const one = await performSubstitutionsTest(
      'a{{ properties.other }}b',
      substitutionsVariables
    )
    t.fail('should have thrown')
  } catch (error) {
    t.throws(xpm.InputError, 'throw xpm.InputError')
    t.match(
      (error as Error).message,
      'Cannot read properties',
      `error message is "Cannot read properties"`
    )
  }
  t.end()
})

// ----------------------------------------------------------------------------

await t.test(' xpm.LiquidMatrixDrop', async (t) => {
  const substitutionsVariables = {
    matrix: {
      one: '1',
      indirect: '{{ matrix.one }}',
    },
  }

  t.equal(
    await performSubstitutionsTest('', substitutionsVariables),
    '',
    'empty remains empty'
  )
  t.equal(
    await performSubstitutionsTest('abc', substitutionsVariables),
    'abc',
    'no changes'
  )
  t.equal(
    await performSubstitutionsTest(
      '0{{ matrix.one }}2',
      substitutionsVariables
    ),
    '012',
    'one => 1'
  )
  t.equal(
    await performSubstitutionsTest(
      '0{{ matrix.indirect }}2',
      substitutionsVariables
    ),
    '012',
    'indirect => 1'
  )

  t.end()
})

await t.test('xpm.LiquidMatrixDrop arrays', async (t) => {
  const substitutionsVariables = {
    matrix: {
      one: ['10', '11'],
      two: '20',
      compound: ['{{ matrix.one }}', '{{ matrix.two }}'],
    },
  }

  const one = await performSubstitutionsTest(
    '{{ matrix.one }}',
    substitutionsVariables
  )

  t.not(Array.isArray(one), 'array one is concatenated')
  t.equal(one, '1011', 'array one ')

  const compound = await performSubstitutionsTest(
    '{{ matrix.compound }}',
    substitutionsVariables
  )

  t.not(Array.isArray(compound), 'compound is concatenated')
  t.equal(compound, '101120', 'compound ')

  t.end()
})

await t.test(' xpm.LiquidMatrixDrop object', async (t) => {
  const substitutionsVariables = {
    matrix: {
      map: {
        one: '1',
        two: '2',
      },
    },
  }

  const one = await performSubstitutionsTest(
    '{{ matrix.map.one }}',
    substitutionsVariables
  )

  t.equal(one, '1', 'array one')

  const subst = await performSubstitutionsTest(
    '{{ matrix.map | keys | size }}',
    substitutionsVariables
  )

  t.equal(subst, '2', 'subst')

  t.end()
})

await t.test(' xpm.LiquidMatrixDrop context', async (t) => {
  const substitutionsVariables = {
    matrix: {
      valueWithParam: 'the {{ param }} value',
    },
  }

  const one = await performSubstitutionsTest(
    "{% assign param = 'substituted' %}{{ matrix.valueWithParam }}",
    substitutionsVariables
  )
  t.equal(one, 'the substituted value', 'substituted')

  const two = await performSubstitutionsTest(
    "{% assign param = 'one' %}{{ matrix.valueWithParam }}" +
      " {% assign param = 'two' %}{{ matrix.valueWithParam }}",
    substitutionsVariables
  )
  t.equal(two, 'the one value the two value', 'substituted')

  t.end()
})

await t.test(' xpm.LiquidMatrixDrop context missing', async (t) => {
  const substitutionsVariables = {
    matrix: {
      other: null,
    },
  }

  try {
    await performSubstitutionsTest(
      '{{ matrix.valueWithParam }}',
      substitutionsVariables
    )
    t.fail('should have thrown')
  } catch (error) {
    t.throws(xpm.InputError, 'throw xpm.InputError')
    t.match(
      (error as Error).message,
      'not defined',
      `error message is "not defined"`
    )
  }

  try {
    const one = await performSubstitutionsTest(
      'a{{ matrix.other }}b',
      substitutionsVariables
    )
    t.fail('should have thrown')
  } catch (error) {
    t.throws(xpm.InputError, 'throw xpm.InputError')
    t.match(
      (error as Error).message,
      'Cannot read properties',
      `error message is "Cannot read properties"`
    )
  }
  t.end()
})

// ----------------------------------------------------------------------------
