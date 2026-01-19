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

/**
 * Replace non alphanumeric chars with dashes to make the paths
 * comply with filesystem names.
 *
 * @param {string} input A path candidate.
 * @returns {string} A validated path.
 */

export function filterPath(input: string): string {
  /* c8 ignore start */ /* istanbul ignore next */
  const fixed =
    os.platform() === 'win32'
      ? input.replace(/[^a-zA-Z0-9\\:]+/g, '-')
      : input.replace(/[^a-zA-Z0-9/]+/g, '-')
  /* c8 ignore stop */
  return fixed.replace(/--/g, '-')
}
/**
 * Replace non alphanumeric chars with dashes to make the paths
 * comply with Posix filesystem names.
 *
 * @param {string} input A path candidate.
 * @returns {string} A validated path.
 */

export function filterPosixPath(input: string): string {
  /* istanbul ignore next */
  const fixed = input.replace(/[^a-zA-Z0-9/]+/g, '-')

  return fixed.replace(/--/g, '-')
}
/**
 * Replace non alphanumeric chars with dashes to make the paths
 * comply with Windows filesystem names.
 *
 * @param {string} input A path candidate.
 * @returns {string} A validated path.
 */

export function filterWin32Path(input: string): string {
  /* istanbul ignore next */
  const fixed = input.replace(/[^a-zA-Z0-9\\:]+/g, '-')

  return fixed.replace(/--/g, '-')
}

// ----------------------------------------------------------------------------
