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
import path from 'node:path'

// ----------------------------------------------------------------------------

export type XpmLiquidSubstitutionsStrings = Record<string, string | string[]>

export interface XpmLiquidSubstitutionsVariables {
  /**
   * https://nodejs.org/dist/latest-v16.x/docs/api/process.html#process_process_env
   */
  env: NodeJS.ProcessEnv
  /**
   * https://nodejs.org/dist/latest-v16.x/docs/api/os.html
   */
  os: {
    /**
     * The operating system-specific end-of-line marker.
     * - `\n` on POSIX
     * - `\r\n` on Windows
     */
    EOL: string
    /**
     * Possible values are 'arm', 'arm64', 'ia32', 'mips', 'mipsel',
     * 'ppc', 'ppc64', 's390', 's390x', 'x32', and 'x64'.
     */
    arch: string
    /**
     * Contains commonly used operating system-specific constants
     * for error codes, process signals, and so on. The specific
     * constants defined are described in
     * [OS constants](https://nodejs.org/dist/latest-v16.x/docs/api/os.html#os_os_constants_1)
     */
    constants: {
      signals: Record<string, number>
      errno: Record<string, number>
    }
    /**
     * An array of objects containing information about
     * each logical CPU core.
     */
    cpus: os.CpuInfo[]
    /**
     * A string identifying the endianness of the CPU
     * for which the Node.js binary was compiled.
     *
     * Possible values are 'BE' for big endian and 'LE' for little endian.
     */
    endianness: 'BE' | 'LE'
    /**
     * The string path of the current user's home directory.
     */
    homedir: string
    /**
     * The host name of the operating system as a string.
     */
    hostname: string
    /**
     * A string identifying the operating system platform.
     * Possible values are 'aix', 'darwin', 'freebsd', 'linux', 'openbsd',
     * 'sunos', and 'win32'.
     */
    platform: NodeJS.Platform
    /**
     * The operating system as a string.
     */
    release: string
    /**
     * Returns the operating system's default directory for
     * temporary files as a string.
     */
    tmpdir: string
    /**
     * Returns the operating system name as returned by uname(3).
     * For example, it returns 'Linux' on Linux, 'Darwin' on macOS,
     * and 'Windows_NT' on Windows.
     */
    type: string
    /**
     * Returns a string identifying the kernel version.
     *
     * On POSIX systems, the operating system release is determined
     * by calling `uname(3)`. On Windows, `RtlGetVersion()` is used,
     * and if it is not available, `GetVersionExW()` will be used.
     */
    version: string
  }
  /**
   * https://nodejs.org/dist/latest-v16.x/docs/api/path.html
   */
  path: {
    /**
     * Provides the platform-specific path delimiter:
     * - `;` for Windows
     * - `:` for POSIX
     */
    delimiter: string
    /**
     * Provides the platform-specific path segment separator:
     * - `\` on Windows
     * - `/` on POSIX
     */
    sep: string
    win32: {
      delimiter: string
      sep: string
    }
    posix: {
      delimiter: string
      sep: string
    }
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  package?: any
  configuration?: {
    name: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
  }
  properties: XpmLiquidSubstitutionsStrings

  matrix?: XpmLiquidSubstitutionsStrings
}

// eslint-disable-next-line max-len
export const xpmLiquidSubstitutionsVariablesBase: XpmLiquidSubstitutionsVariables =
  {
    env: process.env,
    os: {
      EOL: os.EOL,
      arch: os.arch(),
      constants: {
        signals: os.constants.signals,
        errno: os.constants.errno,
      },
      cpus: os.cpus(),
      endianness: os.endianness(),
      homedir: os.homedir(),
      hostname: os.hostname(),
      platform: os.platform(),
      release: os.release(),
      tmpdir: os.tmpdir(),
      type: os.type(),
      // os.version() available since 12.x
      version: os.version(),
    },
    path: {
      delimiter: path.delimiter,
      sep: path.sep,
      win32: {
        delimiter: path.win32.delimiter,
        sep: path.win32.sep,
      },
      posix: {
        delimiter: path.posix.delimiter,
        sep: path.posix.sep,
      },
    },
    properties: {},
  }

// ----------------------------------------------------------------------------
