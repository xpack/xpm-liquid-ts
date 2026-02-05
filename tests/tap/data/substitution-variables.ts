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

import * as os from 'os'
import * as path from 'path'

// ----------------------------------------------------------------------------

// https://www.npmjs.com/package/tap
import t from 'tap'

// ----------------------------------------------------------------------------

import { xpmLiquidSubstitutionsVariablesBase } from '../../../src/index.js'

// ----------------------------------------------------------------------------

t.test('substitution variables', (t) => {
  const sv = xpmLiquidSubstitutionsVariablesBase
  sv.env
  t.equal(
    Object.keys(sv.env).length,
    Object.keys(process.env).length,
    'env keys count'
  )
  t.equal(sv.env.PATH, process.env.PATH, 'env PATH variable')

  t.equal(sv.os.EOL, os.EOL, 'os.EOL variable')
  t.equal(sv.os.arch, os.arch(), 'os.arch variable')
  t.equal(
    Object.keys(sv.os.constants.signals).length,
    Object.keys(os.constants.signals).length,
    'os.constants.signals keys count'
  )
  t.equal(
    Object.keys(sv.os.constants.errno).length,
    Object.keys(os.constants.errno).length,
    'os.constants.errno keys count'
  )
  t.equal(sv.os.cpus.length, os.cpus().length, 'os.cpus length')
  t.equal(sv.os.endianness, os.endianness(), 'os.endianness variable')
  t.equal(sv.os.homedir, os.homedir(), 'os.homedir variable')
  t.equal(sv.os.hostname, os.hostname(), 'os.hostname variable')
  t.equal(sv.os.platform, os.platform(), 'os.platform variable')
  t.equal(sv.os.release, os.release(), 'os.release variable')
  t.equal(sv.os.tmpdir, os.tmpdir(), 'os.tmpdir variable')
  t.equal(sv.os.type, os.type(), 'os.type variable')
  t.equal(sv.os.version, os.version(), 'os.version variable')

  t.equal(sv.path.delimiter, path.delimiter, 'path.delimiter variable')
  t.equal(sv.path.sep, path.sep, 'path.sep variable')
  t.equal(
    sv.path.win32.delimiter,
    path.win32.delimiter,
    'path.win32.delimiter variable'
  )
  t.equal(sv.path.win32.sep, path.win32.sep, 'path.win32.sep variable')
  t.equal(
    sv.path.posix.delimiter,
    path.posix.delimiter,
    'path.posix.delimiter variable'
  )
  t.equal(sv.path.posix.sep, path.posix.sep, 'path.posix.sep variable')

  t.end()
})
