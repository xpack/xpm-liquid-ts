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

const s = 'hello'
const n = 42
const b = true
const u = undefined
const sym = Symbol('sym')
const big = BigInt(9007199254741991)
const nul = null

const obj = { key: 'value' }
const nobj = {}

const arr = [1, 2, 3]

const func = function () {
  return 'I am a function'
}

// ----------------------------------------------------------------------------

t.test('isPrimitive', (t): void => {
  t.ok(xpm.isPrimitive(s), 'string is primitive')
  t.ok(xpm.isPrimitive(n), 'number is primitive')
  t.ok(xpm.isPrimitive(b), 'boolean is primitive')
  t.ok(xpm.isPrimitive(u), 'undefined is primitive')
  t.ok(xpm.isPrimitive(sym), 'symbol is primitive')
  t.ok(xpm.isPrimitive(big), 'bigint is primitive')
  t.ok(xpm.isPrimitive(nul), 'null is primitive')
  t.notOk(xpm.isPrimitive(obj), 'object is not primitive')
  t.notOk(xpm.isPrimitive(arr), 'array is not primitive')
  t.notOk(xpm.isPrimitive(func), 'function is not primitive')

  t.end()
})

t.test('isString', (t): void => {
  t.ok(xpm.isString(s), 'string is string')
  t.notOk(xpm.isString(n), 'number is not string')
  t.notOk(xpm.isString(b), 'boolean is not string')
  t.notOk(xpm.isString(u), 'undefined is not string')
  t.notOk(xpm.isString(sym), 'symbol is not string')
  t.notOk(xpm.isString(big), 'bigint is not string')
  t.notOk(xpm.isString(nul), 'null is not string')
  t.notOk(xpm.isString(obj), 'object is not string')
  t.notOk(xpm.isString(arr), 'array is not string')
  t.notOk(xpm.isString(func), 'function is not string')

  t.end()
})

t.test('isObject', (t): void => {
  t.notOk(xpm.isObject(s), 'string is not object')
  t.notOk(xpm.isObject(n), 'number is not object')
  t.notOk(xpm.isObject(b), 'boolean is not object')
  t.notOk(xpm.isObject(u), 'undefined is not object')
  t.notOk(xpm.isObject(sym), 'symbol is not object')
  t.notOk(xpm.isObject(big), 'bigint is not object')
  t.ok(xpm.isObject(nul), 'null is object')
  t.ok(xpm.isObject(obj), 'object is object')
  t.notOk(xpm.isObject(arr), 'array is not object')
  t.notOk(xpm.isObject(func), 'function is not object')

  t.end()
})

t.test('isBoolean', (t): void => {
  t.notOk(xpm.isBoolean(s), 'string is not boolean')
  t.notOk(xpm.isBoolean(n), 'number is not boolean')
  t.ok(xpm.isBoolean(b), 'boolean is boolean')
  t.notOk(xpm.isBoolean(u), 'undefined is not boolean')
  t.notOk(xpm.isBoolean(sym), 'symbol is not boolean')
  t.notOk(xpm.isBoolean(big), 'bigint is not boolean')
  t.notOk(xpm.isBoolean(nul), 'null is not boolean')
  t.notOk(xpm.isBoolean(obj), 'object is not boolean')
  t.notOk(xpm.isBoolean(arr), 'array is not boolean')
  t.notOk(xpm.isBoolean(func), 'function is not boolean')

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

// ----------------------------------------------------------------------------

t.test('isJsonObject', (t): void => {
  t.notOk(xpm.isJsonObject(json.s), 'string is not JSON object')
  t.notOk(xpm.isJsonObject(json.n), 'number is not JSON object')
  t.notOk(xpm.isJsonObject(json.b), 'boolean is not JSON object')
  t.notOk(xpm.isJsonObject(json.nul), 'null is not JSON object')
  t.ok(xpm.isJsonObject(json.obj), 'object is JSON object')
  t.ok(xpm.isJsonObject(json.nobj), 'empty object is JSON object')
  t.notOk(xpm.isJsonObject(json.arr), 'array is not JSON object')

  t.end()
})

t.test('isJsonArray', (t): void => {
  t.notOk(xpm.isJsonArray(json.s), 'string is not JSON array')
  t.notOk(xpm.isJsonArray(json.n), 'number is not JSON array')
  t.notOk(xpm.isJsonArray(json.b), 'boolean is not JSON array')
  t.notOk(xpm.isJsonArray(json.nul), 'null is not JSON array')
  t.notOk(xpm.isJsonArray(json.obj), 'object is not JSON array')
  t.ok(xpm.isJsonArray(json.arr), 'array is JSON array')

  t.end()
})

t.test('isNonEmptyJsonObject', (t): void => {
  t.notOk(
    xpm.isNonEmptyJsonObject(json.s),
    'string is not non-empty JSON object'
  )
  t.notOk(
    xpm.isNonEmptyJsonObject(json.n),
    'number is not non-empty JSON object'
  )
  t.notOk(
    xpm.isNonEmptyJsonObject(json.b),
    'boolean is not non-empty JSON object'
  )
  t.notOk(
    xpm.isNonEmptyJsonObject(json.nul),
    'null is not non-empty JSON object'
  )
  t.ok(xpm.isNonEmptyJsonObject(json.obj), 'object is non-empty JSON object')
  t.notOk(
    xpm.isNonEmptyJsonObject(json.nobj),
    'empty object is not non-empty JSON object'
  )
  t.notOk(
    xpm.isNonEmptyJsonObject(json.arr),
    'array is not non-empty JSON object'
  )
  t.notOk(
    xpm.isNonEmptyJsonObject(json.func),
    'function is not non-empty JSON object'
  )

  t.end()
})

// ----------------------------------------------------------------------------
