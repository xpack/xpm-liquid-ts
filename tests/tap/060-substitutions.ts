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

import * as os from 'node:os'

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/tap
import { test } from 'tap'
import { Logger } from '@xpack/logger'

import { performSubstitutions, XpmLiquidEngine } from '../../dist/index.js'

// ----------------------------------------------------------------------------

const log = new Logger({ level: 'info' })
const engine = new XpmLiquidEngine()

await test('substitutions', async (t): Promise<void> => {
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

  let substituted = await performSubstitutions({
    log,
    engine,
    input: '{{ properties.p2 }}',
    substitutionsVariables,
  })
  // console.log(substituted)
  t.equal(substituted, '12', 'properties.p2 is 12')

  substituted = await performSubstitutions({
    log,
    engine,
    input: '{{ properties.p3 }}',
    substitutionsVariables,
  })
  // console.log('p3', substituted)
  t.equal(substituted, '1' + os.EOL + '2', 'properties.p3 is 1\\n2')

  substituted = await performSubstitutions({
    log,
    engine,
    input: '{% for item in properties.p3 %}({{ item }}){% endfor %}',
    substitutionsVariables,
  })
  // console.log('for', substituted)
  t.equal(substituted, '(1' + os.EOL + '2)', 'for properties.p3 is (1\\n2)')

  substituted = await performSubstitutions({
    log,
    engine,
    input:
      // '{% for item in properties.p3 | split_lines %}({{ item }}){% endfor %}',
      '{% assign x = properties.p3 | split_lines %}{% for item in x %}({{ item }}){% endfor %}',
    substitutionsVariables,
  })
  // console.log('assign for', substituted)
  t.equal(substituted, '(1)(2)', 'assign for properties.p3 is (1)(2)')

  substituted = await performSubstitutions({
    log,
    engine,
    input: '{{ properties.p1 | join_lines }}',
    substitutionsVariables,
  })
  // console.log('p1 as array', substituted)
  t.equal(substituted, '1' + os.EOL + '2', 'properties.p1 as array')

  substituted = await performSubstitutions({
    log,
    engine,
    input: '{{ properties.native-gcc-versions }}',
    substitutionsVariables,
  })
  // console.log('native-gcc-versions', substituted)
  t.equal(
    substituted,
    '15' + os.EOL + '14',
    'properties.native-gcc-versions is 15\\n14'
  )

  substituted = await performSubstitutions({
    log,
    engine,
    input: '{{ properties.native-gcc-versions0 }}',
    substitutionsVariables,
  })
  // console.log('native-gcc-versions0', substituted)
  t.equal(
    substituted,
    'x' + os.EOL + '15' + os.EOL + '14',
    'properties.native-gcc-versions0 is x\\n15\\n14'
  )

  substituted = await performSubstitutions({
    log,
    engine,
    input: '{{ properties.native-gcc-versions2 }}',
    substitutionsVariables,
  })
  // console.log('native-gcc-versions2', substituted)
  t.equal(
    substituted,
    '15' + os.EOL + '14',
    'properties.native-gcc-versions2 is 15\\n14'
  )

  substituted = await performSubstitutions({
    log,
    engine,
    input:
      '{{ properties.native-gcc-releases2 | find: "version", properties.v14 | map: "specifier" }}',
    substitutionsVariables,
  })
  // console.log('specifier', substituted)
  t.equal(substituted, '14.3.0-1.1', 'specifier is 14.3.0-1.1')

  t.end()
})

// ----------------------------------------------------------------------------
