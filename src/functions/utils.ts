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

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

export function getPlatformKey({
  doForce32bit = false,
}: {
  doForce32bit?: boolean
} = {}): string {
  const platform = process.platform
  let arch = process.arch
  if (doForce32bit) {
    if (platform === 'win32' && arch === 'x64') {
      arch = 'ia32'
    } else if (platform === 'linux' && arch === 'x64') {
      arch = 'ia32'
    } else if (platform === 'linux' && arch === 'arm64') {
      arch = 'arm'
    }
  }
  const key = `${platform}-${arch}`
  return key
}

// ----------------------------------------------------------------------------
