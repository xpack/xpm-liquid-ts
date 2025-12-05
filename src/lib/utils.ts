/*
 * This file is part of the xPack project (http://xpack.github.io).
 * Copyright (c) 2021-2025 Liviu Ionescu. All rights reserved.
 *
 * Permission to use, copy, modify, and/or distribute this software
 * for any purpose is hereby granted, under the terms of the MIT license.
 *
 * If a copy of the license was not distributed with this file, it can
 * be obtained from https://opensource.org/license/mit.
 */

/* eslint max-len: [ "error", 80, { "ignoreUrls": true } ] */

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

// ----------------------------------------------------------------------------
