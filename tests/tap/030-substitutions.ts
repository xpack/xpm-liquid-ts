/*
 * This file is part of the xPack project (http://xpack.github.io).
 * Copyright (c) 2021 Liviu Ionescu. All rights reserved.
 *
 * Licensed under the terms of the MIT License.
 * See LICENSE in the project root for license information.
 */

/* eslint max-len: [ "error", 80, { "ignoreUrls": true } ] */
/* eslint-disable @typescript-eslint/no-floating-promises */

// ----------------------------------------------------------------------------

import * as os from 'os'

// The `[node-tap](http://www.node-tap.org)` framework.
import * as tap from 'tap'
import { XpmLiquid } from '../../src/lib/xpm-liquid'
import { Logger } from '@xpack/logger'

const log = new Logger({ level: 'info' })

tap.test('XpmLiquid substitutions', async (t) => {
  const xpmLiquid = new XpmLiquid(log)
  const _package = {
    name: 'n',
    version: '0.1.2',
    xpack: {
      properties: {
        one: '1',
        indirect: '{{ properties.one }}'
      }
    }
  }

  const map = xpmLiquid.prepareMap(_package)

  t.equal(await xpmLiquid.performSubstitutions('', map), '',
    'empty remains empty')
  t.equal(await xpmLiquid.performSubstitutions('abc', map), 'abc',
    'no changes')
  t.equal(await xpmLiquid.performSubstitutions('0{{ properties.one }}2', map),
    '012', 'one => 1')
  t.equal(
    await xpmLiquid.performSubstitutions('0{{ properties.indirect }}2', map),
    '012', 'indirect => 1')

  t.end()
})

tap.test('XpmLiquid filters', async (t) => {
  const xpmLiquid = new XpmLiquid(log)
  const _package = {
    name: 'n',
    version: '0.1.2'
  }

  const map = xpmLiquid.prepareMap(_package)

  t.equal(
    await xpmLiquid.performSubstitutions(
      '{{ "A@#$B" | to_downcase_filename }}', map),
    'a-b',
    'to_downcase_filename ok')

  t.equal(
    await xpmLiquid.performSubstitutions(
      '{{ "%s%d" | util_format: "abc", 42 }}', map),
    'abc42',
    'util_format ok')

  if (os.platform() === 'win32') {
    // For JavaScript the double backslash is enough.
    // For Liquid, it must be doubled once more.
    t.equal(
      await xpmLiquid.performSubstitutions(
        '{{ "c:\\\\foo\\\\bar\\\\baz\\\\asdf\\\\quux.html" | path_basename }}',
        map),
      'quux.html',
      'path_basename ok')

    t.equal(
      await xpmLiquid.performSubstitutions(
        '{{ "c:\\\\foo\\\\bar\\\\baz\\\\asdf\\\\quux" | path_dirname }}', map),
      'c:\\foo\\bar\\baz\\asdf',
      'path_dirname ok')

    t.equal(
      await xpmLiquid.performSubstitutions(
        '{{ "c:\\\\foo\\\\bar\\\\\\\\baz\\\\asdf\\\\quux\\\\.." | ' +
        'path_normalize }}',
        map),
      'c:\\foo\\bar\\baz\\asdf',
      'path_normalize ok')

    t.equal(
      await xpmLiquid.performSubstitutions(
        '{{ "c:\\\\foo" | path_join: "bar", "baz\\\\asdf", "quux", ".." }}',
        map),
      'c:\\foo\\bar\\baz\\asdf',
      'path_join ok')

    t.equal(
      await xpmLiquid.performSubstitutions(
        '{{ "c:\\\\data\\\\orandea\\\\test\\\\aaa" | ' +
        'path_relative: "c:\\\\data\\\\orandea\\\\impl\\\\bbb" }}',
        map),
      '..\\..\\impl\\bbb',
      'path_relative ok')
  } else {
    t.equal(
      await xpmLiquid.performSubstitutions(
        '{{ "/foo/bar/baz/asdf/quux.html" | path_basename }}', map),
      'quux.html',
      'path_basename ok')

    t.equal(
      await xpmLiquid.performSubstitutions(
        '{{ "/foo/bar/baz/asdf/quux" | path_dirname }}', map),
      '/foo/bar/baz/asdf',
      'path_dirname ok')

    t.equal(
      await xpmLiquid.performSubstitutions(
        '{{ "/foo/bar//baz/asdf/quux/.." | path_normalize }}', map),
      '/foo/bar/baz/asdf',
      'path_normalize ok')

    t.equal(
      await xpmLiquid.performSubstitutions(
        '{{ "/foo" | path_join: "bar", "baz/asdf", "quux", ".." }}', map),
      '/foo/bar/baz/asdf',
      'path_join ok')

    t.equal(
      await xpmLiquid.performSubstitutions(
        '{{ "/data/orandea/test/aaa" | ' +
        'path_relative: "/data/orandea/impl/bbb" }}',
        map),
      '../../impl/bbb',
      'path_relative ok')
  }

  // For JavaScript the double backslash is enough.
  // For Liquid, it must be doubled once more.
  t.equal(
    await xpmLiquid.performSubstitutions(
      '{{ "c:\\\\foo\\\\bar\\\\baz\\\\asdf\\\\quux.html" | ' +
      'path_win32_basename }}',
      map),
    'quux.html',
    'path_win32_basename ok')

  t.equal(
    await xpmLiquid.performSubstitutions(
      '{{ "c:\\\\foo\\\\bar\\\\baz\\\\asdf\\\\quux" | path_win32_dirname }}',
      map),
    'c:\\foo\\bar\\baz\\asdf',
    'path_win32_dirname ok')

  t.equal(
    await xpmLiquid.performSubstitutions(
      '{{ "c:\\\\foo\\\\bar\\\\\\\\baz\\\\asdf\\\\quux\\\\.." | ' +
      'path_win32_normalize }}',
      map),
    'c:\\foo\\bar\\baz\\asdf',
    'path_win32_normalize ok')

  t.equal(
    await xpmLiquid.performSubstitutions(
      '{{ "c:\\\\foo" | path_win32_join: "bar", "baz\\\\asdf", "quux", ".." }}',
      map),
    'c:\\foo\\bar\\baz\\asdf',
    'path_win32_join ok')

  t.equal(
    await xpmLiquid.performSubstitutions(
      '{{ "c:\\\\data\\\\orandea\\\\test\\\\aaa" | ' +
      'path_win32_relative: "c:\\\\data\\\\orandea\\\\impl\\\\bbb" }}',
      map),
    '..\\..\\impl\\bbb',
    'path_win32_relative ok')

  t.equal(
    await xpmLiquid.performSubstitutions(
      '{{ "/foo/bar/baz/asdf/quux.html" | path_posix_basename }}', map),
    'quux.html',
    'path_posix_basename ok')

  t.equal(
    await xpmLiquid.performSubstitutions(
      '{{ "/foo/bar/baz/asdf/quux" | path_posix_dirname }}', map),
    '/foo/bar/baz/asdf',
    'path_posix_dirname ok')

  t.equal(
    await xpmLiquid.performSubstitutions(
      '{{ "/foo/bar//baz/asdf/quux/.." | path_posix_normalize }}', map),
    '/foo/bar/baz/asdf',
    'path_posix_normalize ok')

  t.equal(
    await xpmLiquid.performSubstitutions(
      '{{ "/foo" | path_posix_join: "bar", "baz/asdf", "quux", ".." }}', map),
    '/foo/bar/baz/asdf',
    'path_posix_join ok')

  t.equal(
    await xpmLiquid.performSubstitutions(
      '{{ "/data/orandea/test/aaa" | ' +
      'path_posix_relative: "/data/orandea/impl/bbb" }}',
      map),
    '../../impl/bbb',
    'path_posix_relative ok')

  t.end()
})

// ----------------------------------------------------------------------------