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
// import * as path from 'node:path'

// https://www.npmjs.com/package/tap
import t from 'tap'

// ----------------------------------------------------------------------------

// import * as xpm from '../../../src/index.js'
import { performSubstitutionsTest } from '../../common.js'

// ============================================================================

const substitutionsVariables = {}

// ----------------------------------------------------------------------------

await t.test('path_*', async (t): Promise<void> => {
  if (os.platform() === 'win32') {
    // For JavaScript the double backslash is enough.
    // For Liquid, it must be doubled once more.
    t.equal(
      await performSubstitutionsTest(
        '{{ "c:\\\\foo\\\\bar\\\\baz\\\\asdf\\\\quux.html" | path_basename }}',
        substitutionsVariables
      ),
      'quux.html',
      'path_basename'
    )
    t.equal(
      await performSubstitutionsTest(
        '{{ "c:\\\\foo\\\\bar\\\\baz\\\\asdf\\\\quux" | path_dirname }}',
        substitutionsVariables
      ),
      'c:\\foo\\bar\\baz\\asdf',
      'path_dirname'
    )

    t.equal(
      await performSubstitutionsTest(
        '{{ "c:\\\\foo\\\\bar\\\\\\\\baz\\\\asdf\\\\quux\\\\.." | ' +
          'path_normalize }}',
        substitutionsVariables
      ),
      'c:\\foo\\bar\\baz\\asdf',
      'path_normalize'
    )

    t.equal(
      await performSubstitutionsTest(
        '{{ "c:\\\\foo" | path_join: "bar", "baz\\\\asdf", "quux", ".." }}',
        substitutionsVariables
      ),
      'c:\\foo\\bar\\baz\\asdf',
      'path_join'
    )

    t.equal(
      await performSubstitutionsTest(
        '{{ "c:\\\\data\\\\orandea\\\\test\\\\aaa" | ' +
          'path_relative: "c:\\\\data\\\\orandea\\\\impl\\\\bbb" }}',
        substitutionsVariables
      ),
      '..\\..\\impl\\bbb',
      'path_relative'
    )
  } else {
    t.equal(
      await performSubstitutionsTest(
        '{{ "/foo/bar/baz/asdf/quux.html" | path_basename }}',
        substitutionsVariables
      ),
      'quux.html',
      'path_basename'
    )

    t.equal(
      await performSubstitutionsTest(
        '{{ "/foo/bar/baz/asdf/quux" | path_dirname }}',
        substitutionsVariables
      ),
      '/foo/bar/baz/asdf',
      'path_dirname'
    )

    t.equal(
      await performSubstitutionsTest(
        '{{ "/foo/bar//baz/asdf/quux/.." | path_normalize }}',
        substitutionsVariables
      ),
      '/foo/bar/baz/asdf',
      'path_normalize'
    )

    t.equal(
      await performSubstitutionsTest(
        '{{ "/foo" | path_join: "bar", "baz/asdf", "quux", ".." }}',
        substitutionsVariables
      ),
      '/foo/bar/baz/asdf',
      'path_join'
    )

    t.equal(
      await performSubstitutionsTest(
        '{{ "/data/orandea/test/aaa" | ' +
          'path_relative: "/data/orandea/impl/bbb" }}',
        substitutionsVariables
      ),
      '../../impl/bbb',
      'path_relative'
    )
  }

  t.end()
})

await t.test('path_posix_*', async (t): Promise<void> => {
  t.equal(
    await performSubstitutionsTest(
      '{{ "/foo/bar/baz/asdf/quux.html" | path_posix_basename }}',
      substitutionsVariables
    ),
    'quux.html',
    'path_posix_basename'
  )

  t.equal(
    await performSubstitutionsTest(
      '{{ "/foo/bar/baz/asdf/quux" | path_posix_dirname }}',
      substitutionsVariables
    ),
    '/foo/bar/baz/asdf',
    'path_posix_dirname'
  )

  t.equal(
    await performSubstitutionsTest(
      '{{ "/foo/bar//baz/asdf/quux/.." | path_posix_normalize }}',
      substitutionsVariables
    ),
    '/foo/bar/baz/asdf',
    'path_posix_normalize'
  )

  t.equal(
    await performSubstitutionsTest(
      '{{ "/foo" | path_posix_join: "bar", "baz/asdf", "quux", ".." }}',
      substitutionsVariables
    ),
    '/foo/bar/baz/asdf',
    'path_posix_join'
  )

  t.equal(
    await performSubstitutionsTest(
      '{{ "/data/orandea/test/aaa" | ' +
        'path_posix_relative: "/data/orandea/impl/bbb" }}',
      substitutionsVariables
    ),
    '../../impl/bbb',
    'path_posix_relative'
  )

  t.end()
})

await t.test('path_win32_*', async (t): Promise<void> => {
  // For JavaScript the double backslash is enough.
  // For Liquid, it must be doubled once more.
  t.equal(
    await performSubstitutionsTest(
      '{{ "c:\\\\foo\\\\bar\\\\baz\\\\asdf\\\\quux.html" | ' +
        'path_win32_basename }}',
      substitutionsVariables
    ),
    'quux.html',
    'path_win32_basename'
  )

  t.equal(
    await performSubstitutionsTest(
      '{{ "c:\\\\foo\\\\bar\\\\baz\\\\asdf\\\\quux" | path_win32_dirname }}',
      substitutionsVariables
    ),
    'c:\\foo\\bar\\baz\\asdf',
    'path_win32_dirname'
  )

  t.equal(
    await performSubstitutionsTest(
      '{{ "c:\\\\foo\\\\bar\\\\\\\\baz\\\\asdf\\\\quux\\\\.." | ' +
        'path_win32_normalize }}',
      substitutionsVariables
    ),
    'c:\\foo\\bar\\baz\\asdf',
    'path_win32_normalize'
  )

  t.equal(
    await performSubstitutionsTest(
      '{{ "c:\\\\foo" | path_win32_join: "bar", "baz\\\\asdf", "quux", ".." }}',
      substitutionsVariables
    ),
    'c:\\foo\\bar\\baz\\asdf',
    'path_win32_join'
  )

  t.equal(
    await performSubstitutionsTest(
      '{{ "c:\\\\data\\\\orandea\\\\test\\\\aaa" | ' +
        'path_win32_relative: "c:\\\\data\\\\orandea\\\\impl\\\\bbb" }}',
      substitutionsVariables
    ),
    '..\\..\\impl\\bbb',
    'path_win32_relative'
  )

  t.end()
})

await t.test('util_format', async (t): Promise<void> => {
  t.equal(
    await performSubstitutionsTest(
      '{{ "%s%d" | util_format: "abc", 42 }}',
      substitutionsVariables
    ),
    'abc42',
    'util_format'
  )

  t.end()
})

await t.test('to_filename', async (t): Promise<void> => {
  t.equal(
    await performSubstitutionsTest(
      '{{ "A@#$B" | to_filename }}',
      substitutionsVariables
    ),
    'A-B',
    'to_filename'
  )

  t.end()
})

await t.test('(join|split)_lines', async (t): Promise<void> => {
  const substitutionsVariables = {
    map: { a: 1, b: 2, c: 3 },
    arr: ['x', 'y', 'z'],
    n: 42,
    s: 'line1' + os.EOL + 'line2' + os.EOL + 'line3',
    as: ['line1' + os.EOL + 'line2', 'line3'],
  }

  t.equal(
    await performSubstitutionsTest(
      '{{ arr | join_lines }}',
      substitutionsVariables
    ),
    substitutionsVariables.arr.join(os.EOL),
    'arr join_lines'
  )

  t.equal(
    await performSubstitutionsTest(
      '{{ n | join_lines }}',
      substitutionsVariables
    ),
    String(substitutionsVariables.n),
    'n join_lines'
  )

  let subst = await performSubstitutionsTest(
    '{{ s | split_lines | size }}',
    substitutionsVariables
  )
  t.equal(subst, '3', 's split_lines size 3')

  subst = await performSubstitutionsTest(
    '{{ as | split_lines | size  }}',
    substitutionsVariables
  )
  t.equal(subst, '3', 'as split_lines size 3')

  t.end()
})

await t.test('keys', async (t): Promise<void> => {
  const substitutionsVariables = {
    map: { a: 1, b: 2, c: 3 },
    arr: ['x', 'y', 'z'],
    n: 42,
  }

  t.equal(
    await performSubstitutionsTest(
      '{{ map | keys | join: "-" }}',
      substitutionsVariables
    ),
    'a-b-c',
    'map keys'
  )

  t.equal(
    await performSubstitutionsTest(
      '{{ arr | keys | join: "-" }}',
      substitutionsVariables
    ),
    '0-1-2',
    'array keys'
  )

  t.equal(
    await performSubstitutionsTest('{{ n | keys }}', substitutionsVariables),
    '42',
    'number keys'
  )

  t.end()
})

// // ----------------------------------------------------------------------------
