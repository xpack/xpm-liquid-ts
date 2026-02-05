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

import * as os from 'node:os'

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/tap
import t from 'tap'

import {
  isBoolean,
  isJsonArray,
  isJsonObject,
  isNonEmptyJsonObject,
  isObject,
  isPrimitive,
  isString,
} from '../../../src/index.js'

// ----------------------------------------------------------------------------

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
  t.ok(isPrimitive(s), 'string is primitive')
  t.ok(isPrimitive(n), 'number is primitive')
  t.ok(isPrimitive(b), 'boolean is primitive')
  t.ok(isPrimitive(u), 'undefined is primitive')
  t.ok(isPrimitive(sym), 'symbol is primitive')
  t.ok(isPrimitive(big), 'bigint is primitive')
  t.ok(isPrimitive(nul), 'null is primitive')
  t.notOk(isPrimitive(obj), 'object is not primitive')
  t.notOk(isPrimitive(arr), 'array is not primitive')
  t.notOk(isPrimitive(func), 'function is not primitive')

  t.end()
})

t.test('isString', (t): void => {
  t.ok(isString(s), 'string is string')
  t.notOk(isString(n), 'number is not string')
  t.notOk(isString(b), 'boolean is not string')
  t.notOk(isString(u), 'undefined is not string')
  t.notOk(isString(sym), 'symbol is not string')
  t.notOk(isString(big), 'bigint is not string')
  t.notOk(isString(nul), 'null is not string')
  t.notOk(isString(obj), 'object is not string')
  t.notOk(isString(arr), 'array is not string')
  t.notOk(isString(func), 'function is not string')

  t.end()
})

t.test('isObject', (t): void => {
  t.notOk(isObject(s), 'string is not object')
  t.notOk(isObject(n), 'number is not object')
  t.notOk(isObject(b), 'boolean is not object')
  t.notOk(isObject(u), 'undefined is not object')
  t.notOk(isObject(sym), 'symbol is not object')
  t.notOk(isObject(big), 'bigint is not object')
  t.ok(isObject(nul), 'null is object')
  t.ok(isObject(obj), 'object is object')
  t.notOk(isObject(arr), 'array is not object')
  t.notOk(isObject(func), 'function is not object')

  t.end()
})

t.test('isBoolean', (t): void => {
  t.notOk(isBoolean(s), 'string is not boolean')
  t.notOk(isBoolean(n), 'number is not boolean')
  t.ok(isBoolean(b), 'boolean is boolean')
  t.notOk(isBoolean(u), 'undefined is not boolean')
  t.notOk(isBoolean(sym), 'symbol is not boolean')
  t.notOk(isBoolean(big), 'bigint is not boolean')
  t.notOk(isBoolean(nul), 'null is not boolean')
  t.notOk(isBoolean(obj), 'object is not boolean')
  t.notOk(isBoolean(arr), 'array is not boolean')
  t.notOk(isBoolean(func), 'function is not boolean')

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
  t.notOk(isJsonObject(json.s), 'string is not JSON object')
  t.notOk(isJsonObject(json.n), 'number is not JSON object')
  t.notOk(isJsonObject(json.b), 'boolean is not JSON object')
  t.notOk(isJsonObject(json.nul), 'null is not JSON object')
  t.ok(isJsonObject(json.obj), 'object is JSON object')
  t.ok(isJsonObject(json.nobj), 'empty object is JSON object')
  t.notOk(isJsonObject(json.arr), 'array is not JSON object')

  t.end()
})

t.test('isJsonArray', (t): void => {
  t.notOk(isJsonArray(json.s), 'string is not JSON array')
  t.notOk(isJsonArray(json.n), 'number is not JSON array')
  t.notOk(isJsonArray(json.b), 'boolean is not JSON array')
  t.notOk(isJsonArray(json.nul), 'null is not JSON array')
  t.notOk(isJsonArray(json.obj), 'object is not JSON array')
  t.ok(isJsonArray(json.arr), 'array is JSON array')

  t.end()
})

t.test('isNonEmptyJsonObject', (t): void => {
  t.notOk(isNonEmptyJsonObject(json.s), 'string is not non-empty JSON object')
  t.notOk(isNonEmptyJsonObject(json.n), 'number is not non-empty JSON object')
  t.notOk(isNonEmptyJsonObject(json.b), 'boolean is not non-empty JSON object')
  t.notOk(isNonEmptyJsonObject(json.nul), 'null is not non-empty JSON object')
  t.ok(isNonEmptyJsonObject(json.obj), 'object is non-empty JSON object')
  t.notOk(
    isNonEmptyJsonObject(json.nobj),
    'empty object is not non-empty JSON object'
  )
  t.notOk(isNonEmptyJsonObject(json.arr), 'array is not non-empty JSON object')
  t.notOk(
    isNonEmptyJsonObject(json.func),
    'function is not non-empty JSON object'
  )

  t.end()
})

// ----------------------------------------------------------------------------
