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

// import * as os from 'os'
import * as path from 'path'

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/tap
import { test } from 'tap'

// ----------------------------------------------------------------------------

import { Context, Liquid, XpmLiquidMatrixDrop } from '../../../src/index.js'

import { performSubstitutionsTest } from '../../common.js'

// ----------------------------------------------------------------------------

await test('performSubstitutions', async (t) => {
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

await test('performSubstitutions filters cascade', async (t) => {
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

await test('performSubstitutions arrays original', async (t) => {
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

await test('performSubstitutions arrays multi', async (t) => {
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

await test('performSubstitutions context', async (t) => {
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

await test('performSubstitutions error', async (t) => {
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
    t.pass(`threw '${(error as Error).message}'`)
  }

  t.end()
})

// ----------------------------------------------------------------------------
