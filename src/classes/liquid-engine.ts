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
import * as path from 'node:path'
import * as util from 'node:util'

// https://www.npmjs.com/package/liquidjs
import { Liquid } from 'liquidjs'
import { isJsonObject } from '../functions/is-something.js'

// ============================================================================

/**
 * Liquid engine configured for <b>xpm</b> templates.
 *
 * @remarks
 * This class extends the Liquid engine and registers custom filters
 * for path manipulation, string formatting, and convenience helpers used across
 * <b>xpm</b> templates.
 *
 * The engine is configured with strict parsing options to catch template
 * errors early during development. Custom filters are organized into
 * categories:
 *
 * <ol>
 * <li><b>Path manipulation:</b> Platform-specific and cross-platform path
 *    operations
 *    (<code>basename</code>, <code>dirname</code>, <code>join</code>,
 *    <code>relative</code>, <code>normalize</code>) for default, POSIX, and
 *    Win32 paths.</li>
 * <li><b>String formatting:</b> Utilities for printf-style formatting and
 *    filename
 *    sanitization.</li>
 * <li><b>Array/string conversion:</b> Filters for joining and splitting
 *    lines.</li>
 * <li><b>Object introspection:</b> Filters for extracting object keys.</li>
 * </ol>
 *
 * These filters enable templates to perform complex path manipulations and
 * string transformations without requiring external dependencies or custom
 * template tags.
 */
export class XpmLiquidEngine extends Liquid {
  // --------------------------------------------------------------------------
  // Public Members.

  // --------------------------------------------------------------------------
  // Constructor.

  /**
   * Constructs a Liquid engine instance with xpm-specific settings and
   * filters.
   *
   * @remarks
   * The constructor configures strict parsing options and registers
   * filters for path handling, formatting, and list operations.
   *
   * Configuration options:
   *
   * <ul>
   * <li><b>strictFilters:</b> Throw errors for undefined filters rather than
   *    silently ignoring them.</li>
   * <li><b>strictVariables:</b> Throw errors for undefined variables rather
   *    than
   *   rendering empty strings.</li>
   * <li><b>trimTagLeft/Right:</b> Preserve whitespace around template
   *    tags.</li>
   * <li><b>trimOutputLeft/Right:</b> Preserve whitespace around output
   * expressions.</li>
   * <li><b>greedy:</b> Use non-greedy matching for better template
   *    compatibility.</li>
   * <li><b>lenientIf:</b> Allow flexible truthiness in conditional
   *    expressions.</li>
   * </ul>
   *
   * Filter registration:
   *
   * <ul>
   * <li><b>Platform-aware path filters (default, posix, win32):</b> delegate to
   *    Node.js path module for consistent cross-platform behavior.</li>
   * <li><b>Custom filters (to_filename, join_lines, split_lines, keys):</b>
   *    provide
   *    template-specific functionality not available in standard Liquid.</li>
   * <li>All filters are registered during construction for immediate
   *    availability in templates.</li>
   * </ul>
   */
  constructor() {
    super({
      strictFilters: true,
      strictVariables: true,
      trimTagLeft: false,
      trimTagRight: false,
      trimOutputLeft: false,
      trimOutputRight: false,
      greedy: false,
      lenientIf: true,
    })

    // https://liquidjs.com/api/classes/liquid_.liquid.html#registerFilter
    // https://nodejs.org/dist/latest-v16.x/docs/api/path.html

    // Add the main path manipulation functions.
    this.registerFilter('path_basename', (p: string, ...arg) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      path.basename(p, ...arg)
    )

    this.registerFilter('path_dirname', (p: string) => path.dirname(p))

    this.registerFilter('path_normalize', (p: string) => path.normalize(p))

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    this.registerFilter('path_join', (p, ...args) => path.join(p, ...args))

    this.registerFilter('path_relative', (from: string, to: string) =>
      path.relative(from, to)
    )

    this.registerFilter('path_posix_basename', (p: string, ...arg) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      path.posix.basename(p, ...arg)
    )

    this.registerFilter('path_posix_dirname', (p: string) =>
      path.posix.dirname(p)
    )

    this.registerFilter('path_posix_normalize', (p: string) =>
      path.posix.normalize(p)
    )

    this.registerFilter('path_posix_join', (p, ...args) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      path.posix.join(p, ...args)
    )

    this.registerFilter('path_posix_relative', (from: string, to: string) =>
      path.posix.relative(from, to)
    )

    this.registerFilter('path_win32_basename', (p: string, ...arg) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      path.win32.basename(p, ...arg)
    )

    this.registerFilter('path_win32_dirname', (p: string) =>
      path.win32.dirname(p)
    )

    this.registerFilter('path_win32_normalize', (p: string) =>
      path.win32.normalize(p)
    )

    this.registerFilter('path_win32_join', (p, ...args) =>
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      path.win32.join(p, ...args)
    )

    this.registerFilter('path_win32_relative', (from: string, to: string) =>
      path.win32.relative(from, to)
    )

    // https://nodejs.org/dist/latest-v16.x/docs/api/util.html

    this.registerFilter('util_format', (format, ...args) => {
      // console.log([...args])
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      return util.format(format, ...args)
    })

    // Custom action.
    this.registerFilter(
      'to_filename',
      // Replace non alphanumeric chars with dashes to make the paths
      // comply with filesystem names.
      (input: string): string => {
        /* c8 ignore start - windows specific code cannot be tested 
        on other platforms */
        const fixed =
          process.platform === 'win32'
            ? input.replace(/[^a-zA-Z0-9\\:]+/g, '-')
            : input.replace(/[^a-zA-Z0-9/]+/g, '-')
        /* c8 ignore stop */

        return fixed.replace(/--/g, '-')
      }
    )

    this.registerFilter('join_lines', (input: string[]): string => {
      // Convert an array into a string with each element on a separate line.
      if (Array.isArray(input)) {
        return input.join(os.EOL)
      }
      return String(input)
    })

    // Convert a string with lines into an array.
    this.registerFilter('split_lines', (input: string | string[]): string[] => {
      if (Array.isArray(input)) {
        // If already an array, first flatten it, then split it.
        // This is needed in case any of the lines include EOLs.
        return input.join(os.EOL).split(os.EOL)
      }
      return input.split(os.EOL)
    })

    this.registerFilter('keys', (input: unknown): string[] | string => {
      if (isJsonObject(input)) {
        const keys = Object.keys(input as object)
        // console.log('input object', input)
        // console.log('input keys', keys)
        return keys
      } else if (Array.isArray(input)) {
        const keys = Object.keys(input)
        return keys
      } else {
        return String(input)
      }
    })
  }
}

// ----------------------------------------------------------------------------
