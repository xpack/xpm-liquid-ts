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

// https://www.npmjs.com/package/tap
import t from 'tap'

// ----------------------------------------------------------------------------

import * as xpm from '../../../src/index.js'

// ============================================================================

// Test data
const testValues = [
  { value: 'hello', type: 'string' },
  { value: 42, type: 'number' },
  { value: true, type: 'boolean' },
  { value: undefined, type: 'undefined' },
  { value: Symbol('sym'), type: 'symbol' },
  { value: BigInt(9007199254741991), type: 'bigint' },
  { value: null, type: 'null' },
  { value: { key: 'value' }, type: 'object' },
  { value: {}, type: 'empty object' },
  { value: [1, 2, 3], type: 'array' },
  {
    value: function () {
      return 'I am a function'
    },
    type: 'function',
  },
]

// ----------------------------------------------------------------------------

t.test('isPrimitive - type checking', (t): void => {
  const primitiveTypes = [
    'string',
    'number',
    'boolean',
    'undefined',
    'symbol',
    'bigint',
    'null',
  ]

  for (const { value, type } of testValues) {
    const expected = primitiveTypes.includes(type)
    if (expected) {
      t.ok(xpm.isPrimitive(value), `${type} is primitive`)
    } else {
      t.notOk(xpm.isPrimitive(value), `${type} is not primitive`)
    }
  }

  t.end()
})

t.test('isString - type checking', (t): void => {
  for (const { value, type } of testValues) {
    if (type === 'string') {
      t.ok(xpm.isString(value), `${type} is string`)
    } else {
      t.notOk(xpm.isString(value), `${type} is not string`)
    }
  }

  t.end()
})

t.test('isObject - type checking', (t): void => {
  const objectTypes = ['null', 'object', 'empty object']

  for (const { value, type } of testValues) {
    if (objectTypes.includes(type)) {
      t.ok(xpm.isObject(value), `${type} is object`)
    } else {
      t.notOk(xpm.isObject(value), `${type} is not object`)
    }
  }

  t.end()
})

t.test('isBoolean - type checking', (t): void => {
  for (const { value, type } of testValues) {
    if (type === 'boolean') {
      t.ok(xpm.isBoolean(value), `${type} is boolean`)
    } else {
      t.notOk(xpm.isBoolean(value), `${type} is not boolean`)
    }
  }

  t.end()
})

// ----------------------------------------------------------------------------

const jsonString =
  '{ \
    "s":"hello", \
    "n":42, \
    "b":true, \
    "nul":null, \
    "obj": { "key": "value" }, \
    "nobj": { }, \
    "arr": [1, 2, 3] \
  }'
const json = JSON.parse(jsonString)

// JSON test data
const jsonTestValues = [
  { value: json.s, type: 'string' },
  { value: json.n, type: 'number' },
  { value: json.b, type: 'boolean' },
  { value: json.nul, type: 'null' },
  { value: json.obj, type: 'object' },
  { value: json.nobj, type: 'empty object' },
  { value: json.arr, type: 'array' },
]

// ----------------------------------------------------------------------------

t.test('isJsonObject - type checking', (t): void => {
  const jsonObjectTypes = ['object', 'empty object']

  for (const { value, type } of jsonTestValues) {
    if (jsonObjectTypes.includes(type)) {
      t.ok(xpm.isJsonObject(value), `${type} is JSON object`)
    } else {
      t.notOk(xpm.isJsonObject(value), `${type} is not JSON object`)
    }
  }

  t.end()
})

t.test('isJsonArray - type checking', (t): void => {
  for (const { value, type } of jsonTestValues) {
    if (type === 'array') {
      t.ok(xpm.isJsonArray(value), `${type} is JSON array`)
    } else {
      t.notOk(xpm.isJsonArray(value), `${type} is not JSON array`)
    }
  }

  t.end()
})

t.test('isNonEmptyJsonObject - type checking', (t): void => {
  for (const { value, type } of jsonTestValues) {
    if (type === 'object') {
      t.ok(xpm.isNonEmptyJsonObject(value), `${type} is non-empty JSON object`)
    } else {
      t.notOk(
        xpm.isNonEmptyJsonObject(value),
        `${type} is not non-empty JSON object`
      )
    }
  }

  t.end()
})

// ----------------------------------------------------------------------------
