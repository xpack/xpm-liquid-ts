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

import * as os from 'os'
import * as path from 'path'

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/tap
import t from 'tap'

// ----------------------------------------------------------------------------

import {
  Context,
  Liquid,
  XpmInputError,
  XpmLiquidMatrixDrop,
} from '../../../src/index.js'

import { performSubstitutionsTest } from '../../common.js'

// ----------------------------------------------------------------------------

await t.test('performSubstitutionsTest', async (t) => {
  const substitutionsVariables = {
    map: {
      one: '1',
      indirect: '{{ map.one }}',
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
    await performSubstitutionsTest('0{{ map.one }}2', substitutionsVariables),
    '012',
    'one => 1'
  )
  t.equal(
    await performSubstitutionsTest(
      '0{{ map.indirect }}2',
      substitutionsVariables
    ),
    '012',
    'indirect => 1'
  )

  t.end()
})

await t.test('performSubstitutionsTest filters cascade', async (t) => {
  const substitutionsVariables = {
    configuration: {
      name: 'Debug',
    },
    map: {},
  }

  t.equal(
    await performSubstitutionsTest(
      '{{ "build" | path_join: configuration.name | to_filename | downcase }}',
      substitutionsVariables
    ),
    path.join('build', 'debug'),
    'build | join'
  )

  t.end()
})

await t.test('performSubstitutionsTest arrays original', async (t) => {
  const engine = new Liquid()

  const substitutionsVariables = {
    name: 'n',
    version: '0.1.2',
    array: ['1', '2', '3'],
    one: ['10', '11'],
    two: ['20', '21'],
    compound: ['{{one}}', '{{two}}'],
  }

  const context = new Context(substitutionsVariables)

  const iteration = await engine.parseAndRender(
    '{% for item in array %}({{ item }}){% endfor %}',
    context
  )

  t.not(Array.isArray(iteration), 'iteration not an array')
  t.equal(iteration, '(1)(2)(3)', 'iteration')

  const array = await engine.parseAndRender('{{ array }}', context)

  t.not(Array.isArray(array), 'array is concatenated')
  t.equal(array, '123', 'array')

  const temp = await engine.parseAndRender('{{ compound }}', context)

  t.equal(temp, '{{one}}{{two}}', 'temp')

  const compound = await engine.parseAndRender(temp, context)

  t.not(Array.isArray(compound), 'compound is concatenated')
  t.equal(compound, '10112021', 'compound')

  t.end()
})

await t.test('performSubstitutionsTest arrays multi', async (t) => {
  const substitutionsVariables = {
    map: {
      one: ['10', '11'],
      two: '20',
      compound: ['{{ map.one }}', '{{ map.two }}'],
    },
  }

  const one = await performSubstitutionsTest(
    '{{ map.one }}',
    substitutionsVariables
  )

  t.not(Array.isArray(one), 'array one is concatenated')
  t.equal(one, '1011', 'array one')

  const compound = await performSubstitutionsTest(
    '{{ map.compound }}',
    substitutionsVariables
  )

  t.not(Array.isArray(compound), 'compound is concatenated')
  t.equal(compound, '101120', 'compound')

  t.end()
})

await t.test('performSubstitutionsTest context', async (t) => {
  const substitutionsVariables = {
    package: {
      properties2: {
        valueWithParam: 'the {{ param }} value',
      },
    },
  }

  const one = await performSubstitutionsTest(
    "{% assign param = 'substituted' %}" +
      '{{ package.properties2.valueWithParam }}',
    substitutionsVariables
  )
  t.equal(one, 'the substituted value', 'assign substituted')

  t.end()
})

await t.test('performSubstitutionsTest error', async (t) => {
  const substitutionsVariables = {
    map: {
      one: '1',
      indirect: '{{ map.one }}',
    },
  }

  try {
    const subs = await performSubstitutionsTest(
      '0{{ map.two }}2',
      substitutionsVariables
    )
    t.fail('should have thrown an error, got ' + subs)
  } catch (error) {
    t.throws(XpmInputError, 'throw XpmInputError')
    t.match(
      (error as Error).message,
      'undefined variable',
      `error message is "undefined variable"`
    )
  }

  t.end()
})

await t.test('substitutions', async (t): Promise<void> => {
  const substitutionsVariables = {
    properties: {
      p1: ['1', '2'],
      p2: '{{ properties.p1 }}',
      p3: ['{{ properties.p1 | join_lines }}'],
      'native-gcc-releases': {
        // Integer-like keys are enumerated in ascending order.
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
        // Explicit descending order.
        '{{ properties.native-gcc-releases | keys | reverse | join_lines }}',
      ],
      'native-gcc-versions0': [
        '{{ "x" | concat: properties.native-gcc-versions | join_lines }}',
      ],

      'native-gcc-releases2': [
        {
          version: '15',
          specifier: '15.2.0-1.1',
          platforms: 'linux-x64,linux-arm64,win32-x64',
        },
        {
          version: '14',
          specifier: '14.3.0-1.1',
          platforms: 'linux-x64,linux-arm64,win32-x64',
        },
      ],
      'native-gcc-versions2': [
        '{{ properties.native-gcc-releases2 | map: "version" | join_lines }}',
      ],
      v14: '14',
    },
  }

  let substituted = await performSubstitutionsTest(
    '{{ properties.p2 }}',
    substitutionsVariables
  )
  // console.log(substituted)
  t.equal(substituted, '12', 'properties.p2 is 12')

  substituted = await performSubstitutionsTest(
    '{{ properties.p3 }}',
    substitutionsVariables
  )
  // console.log('p3', substituted)
  t.equal(substituted, '1' + os.EOL + '2', 'properties.p3 is 1\\n2')

  substituted = await performSubstitutionsTest(
    '{% for item in properties.p3 %}({{ item }}){% endfor %}',
    substitutionsVariables
  )
  // console.log('for', substituted)
  t.equal(substituted, '(1' + os.EOL + '2)', 'for properties.p3 is (1\\n2)')

  substituted = await performSubstitutionsTest(
    // '{% for item in properties.p3 | split_lines %}({{ item }}){% endfor %}',
    '{% assign x = properties.p3 | split_lines %}{% for item in x %}({{ item }}){% endfor %}',
    substitutionsVariables
  )
  // console.log('assign for', substituted)
  t.equal(substituted, '(1)(2)', 'assign for properties.p3 is (1)(2)')

  substituted = await performSubstitutionsTest(
    '{{ properties.p1 | join_lines }}',
    substitutionsVariables
  )
  // console.log('p1 as array', substituted)
  t.equal(substituted, '1' + os.EOL + '2', 'properties.p1 as array')

  substituted = await performSubstitutionsTest(
    '{{ properties.native-gcc-versions }}',
    substitutionsVariables
  )
  // console.log('native-gcc-versions', substituted)
  t.equal(
    substituted,
    '15' + os.EOL + '14',
    'properties.native-gcc-versions is 15\\n14'
  )

  substituted = await performSubstitutionsTest(
    '{{ properties.native-gcc-versions0 }}',
    substitutionsVariables
  )
  // console.log('native-gcc-versions0', substituted)
  t.equal(
    substituted,
    'x' + os.EOL + '15' + os.EOL + '14',
    'properties.native-gcc-versions0 is x\\n15\\n14'
  )

  substituted = await performSubstitutionsTest(
    '{{ properties.native-gcc-versions2 }}',
    substitutionsVariables
  )
  // console.log('native-gcc-versions2', substituted)
  t.equal(
    substituted,
    '15' + os.EOL + '14',
    'properties.native-gcc-versions2 is 15\\n14'
  )

  substituted = await performSubstitutionsTest(
    '{{ properties.native-gcc-releases2 | find: "version", properties.v14 | map: "specifier" }}',
    substitutionsVariables
  )
  // console.log('specifier', substituted)
  t.equal(substituted, '14.3.0-1.1', 'specifier is 14.3.0-1.1')

  t.end()
})

// ----------------------------------------------------------------------------
