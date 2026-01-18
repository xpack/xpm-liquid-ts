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

export function isPrimitive(value: unknown): boolean {
  return (
    (typeof value !== 'object' && typeof value !== 'function') || value === null
  )
}

export function isJsonObject(value: unknown): boolean {
  return value !== undefined && !isPrimitive(value) && !Array.isArray(value)
}

export function isJsonArray(value: unknown): boolean {
  return value !== undefined && Array.isArray(value)
}

export function isNonEmptyJsonObject(value: unknown): boolean {
  return isJsonObject(value) && Object.keys(value as object).length > 0
}

export function isString(value: unknown): value is string {
  return typeof value === 'string'
}

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

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

// ----------------------------------------------------------------------------
