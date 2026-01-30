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
// import * as path from 'path'

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/tap
import { test } from 'tap'

// ----------------------------------------------------------------------------

import { Logger } from '@xpack/logger'
import {
  XpmActions,
  XpmError,
  XpmLiquidEngine,
  xpmLiquidSubstitutionsVariablesBase,
} from '../../../src/index.js'
import { AssertionError } from 'assert'

// ----------------------------------------------------------------------------

const log = new Logger({ level: 'info' })
const engine = new XpmLiquidEngine()

// ----------------------------------------------------------------------------

await test('XpmActions undefined', async (t) => {
  const actions = new XpmActions({
    log,
    engine,
    substitutionsVariables: xpmLiquidSubstitutionsVariablesBase,
    jsonActions: undefined,
  })

  t.equal(actions.size, 0, 'size 0')
  t.equal(actions.isEmpty, true, 'empty')
  t.equal(actions.names.length, 0, 'names.length 0')
  try {
    const action = actions.get('nonexistent')
    t.fail('should have thrown an error, got ' + action.actionName)
  } catch (error) {
    t.throws(XpmError, 'throws XpmError')
    t.match(
      (error as Error).message,
      'does not exist',
      'throws "does not exist"'
    )
  }

  t.end()
})

await test('XpmActions', async (t) => {
  const actions = new XpmActions({
    log,
    engine,
    substitutionsVariables: xpmLiquidSubstitutionsVariablesBase,
    jsonActions: {
      one: 'echo "one"',
      two: ['echo "two-1"', 'echo "two-2"'],
    },
  })

  t.equal(actions.size, 0, 'size 0')
  t.equal(actions.isEmpty, true, 'empty')
  t.equal(actions.names.length, 0, 'names.length 0')
  try {
    const action = actions.get('nonexistent')
    t.fail('should have thrown an error, got ' + action.actionName)
  } catch (error) {
    t.throws(XpmError, 'throws XpmError')
    t.match(
      (error as Error).message,
      'does not exist',
      'throws "does not exist"'
    )
  }

  let isInitialised = await actions.initialise()
  t.equal(isInitialised, true, 'initialise() => true')
  isInitialised = await actions.initialise()
  t.equal(isInitialised, false, 'initialise() again => false')

  t.equal(actions.size, 2, 'size 2')
  t.equal(actions.isEmpty, false, 'not empty after initialise()')
  t.equal(actions.names.length, 2, 'names.length 2')

  t.equal(actions.names[0], 'one', 'names[0] is "one"')
  t.equal(actions.names[1], 'two', 'names[1] is "two"')

  t.equal(actions.has('one'), true, 'has("one") is true')
  t.equal(actions.has('two'), true, 'has("two") is true')
  t.equal(actions.has('three'), false, 'has("three") is false')

  const one = actions.get('one')
  t.equal(one.actionName, 'one', 'actionName is "one"')
  t.equal(one.parentActions, actions, 'parentActions is actions')

  try {
    one.commands
    t.fail('one.commands should throw before initialise()')
  } catch (error) {
    t.throws(AssertionError, 'one.commands throws XpmError before initialise()')
    t.match(
      (error as Error).message,
      'not initialised',
      'one.commands throws "not initialised"'
    )
  }
  isInitialised = await one.initialise()
  t.equal(isInitialised, true, 'one.initialise() => true')
  isInitialised = await one.initialise()
  t.equal(isInitialised, false, 'one.initialise() again => false')

  const oneCommands = one.commands
  t.equal(Array.isArray(oneCommands), true, 'one.commands is array')
  t.equal(oneCommands.length, 1, 'one.commands.length is 1')
  t.equal(oneCommands[0], 'echo "one"', 'one.commands[0] is correct')

  const two = actions.get('two')
  t.equal(two.actionName, 'two', 'actionName is "two"')
  t.equal(two.parentActions, actions, 'parentActions is actions')
  isInitialised = await two.initialise()
  t.equal(isInitialised, true, 'two.initialise() => true')

  const twoCommands = two.commands
  t.equal(Array.isArray(twoCommands), true, 'two.commands is array')
  t.equal(twoCommands.length, 2, 'two.commands.length is 2')
  t.equal(twoCommands[0], 'echo "two-1"', 'two.commands[0] is correct')
  t.equal(twoCommands[1], 'echo "two-2"', 'two.commands[1] is correct')

  t.end()
})

await test('XpmActions substitutions', async (t) => {
  const substitutionsVariables = {
    ...xpmLiquidSubstitutionsVariablesBase,
    properties: {
      p1: 'value-1',
      p2: '1',
    },
  }

  const actions = new XpmActions({
    log,
    engine,
    substitutionsVariables,
    jsonActions: {
      one: 'echo "one"',
      two: ['echo "two-1"', 'echo "two-2"'],
    },
  })

  t.end()
})

// ----------------------------------------------------------------------------
