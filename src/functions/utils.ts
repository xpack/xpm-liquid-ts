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

/**
 * Extracts an error message string from an unknown error value.
 *
 * @remarks
 * This utility handles error values of any type, extracting the message
 * property from Error instances or converting other types to strings.
 * Useful for consistent error reporting when the error type is unknown.
 *
 * TypeScript's catch clause types errors as `unknown` for safety, since
 * JavaScript allows throwing any value (not just Error instances). This
 * function provides a type-safe way to extract a message string:
 *
 * <ul>
 * <li>For Error instances: Returns the <code>message</code> property.</li>
 * <li>For other types: Converts to string using <code>String()</code>,
 *   which handles
 *   primitives, objects with toString(), null, and undefined gracefully.</li>
 * </ul>
 *
 * Common usage pattern:
 * ```typescript
 * try {
 *   // code that might throw
 * } catch (err) {
 *   const message = getErrorMessage(err);
 *   log.error(message);
 * }
 * ```
 *
 * @param error - The error value to convert.
 * @returns The error message string.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  return String(error)
}

/**
 * Builds a unique key using the current platform and architecture.
 *
 * @remarks
 * Generates a platform identifier string used for matching binary packages
 * to the current system or for platform-specific configuration.
 *
 * Platform key format: `<platform>-<arch>`
 *
 * Examples:
 *
 * <ul>
 * <li><code>darwin-x64</code> (macOS on Intel)</li>
 * <li><code>darwin-arm64</code> (macOS on Apple Silicon)</li>
 * <li><code>linux-x64</code> (Linux on 64-bit Intel/AMD)</li>
 * <li><code>win32-x64</code> (Windows on 64-bit)</li>
 * </ul>
 *
 * 32-bit coercion rules (when doForce32bit is true):
 *
 * <ul>
 * <li>Windows x64 → ia32: Forces 32-bit binaries on 64-bit Windows.</li>
 * <li>Linux x64 → ia32: Forces 32-bit binaries on 64-bit Linux.</li>
 * <li>Linux arm64 → arm: Forces 32-bit ARM binaries on 64-bit ARM Linux.</li>
 * </ul>
 *
 * This coercion is useful for backward compatibility scenarios where only
 * 32-bit binaries are available but can run on 64-bit systems. The
 * platform key matches the naming conventions used in binary xPack
 * distributions.
 *
 * @param doForce32bit - Whether to coerce certain 64-bit platforms to their
 * 32-bit equivalents.
 * @returns The platform key in the form `platform-arch`.
 */
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
