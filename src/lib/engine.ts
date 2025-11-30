
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

import * as os from 'os'
import * as path from 'path'
import * as util from 'util'

// https://www.npmjs.com/package/liquidjs
import { Liquid } from 'liquidjs'

// ----------------------------------------------------------------------------

export class XpmLiquidEngine extends Liquid {
  // --------------------------------------------------------------------------
  // Members.

  // --------------------------------------------------------------------------
  // Constructor.

  constructor () {
    super({
      strictFilters: true,
      strictVariables: true,
      trimTagLeft: false,
      trimTagRight: false,
      trimOutputLeft: false,
      trimOutputRight: false,
      greedy: false,
      lenientIf: true
    })

    // https://liquidjs.com/api/classes/liquid_.liquid.html#registerFilter
    // https://nodejs.org/dist/latest-v16.x/docs/api/path.html

    // Add the main path manipulation functions.
    this.registerFilter('path_basename',
      (p, ...arg) => path.basename(p, ...arg)
    )

    this.registerFilter('path_dirname',
      (p) => path.dirname(p)
    )

    this.registerFilter('path_normalize',
      (p) => path.normalize(p)
    )

    this.registerFilter('path_join',
      (p, ...args) => path.join(p, ...args)
    )

    this.registerFilter('path_relative',
      (from, to) => path.relative(from, to)
    )

    this.registerFilter('path_posix_basename',
      (p, ...arg) => path.posix.basename(p, ...arg)
    )

    this.registerFilter('path_posix_dirname',
      (p) => path.posix.dirname(p)
    )

    this.registerFilter('path_posix_normalize',
      (p) => path.posix.normalize(p)
    )

    this.registerFilter('path_posix_join',
      (p, ...args) => path.posix.join(p, ...args)
    )

    this.registerFilter('path_posix_relative',
      (from, to) => path.posix.relative(from, to)
    )

    this.registerFilter('path_win32_basename',
      (p, ...arg) => path.win32.basename(p, ...arg)
    )

    this.registerFilter('path_win32_dirname',
      (p) => path.win32.dirname(p)
    )

    this.registerFilter('path_win32_normalize',
      (p) => path.win32.normalize(p)
    )

    this.registerFilter('path_win32_join',
      (p, ...args) => path.win32.join(p, ...args)
    )

    this.registerFilter('path_win32_relative',
      (from, to) => path.win32.relative(from, to)
    )

    // https://nodejs.org/dist/latest-v16.x/docs/api/util.html

    this.registerFilter('util_format',
      (format, ...args) => {
        // console.log([...args])
        return util.format(format, ...args)
      }
    )

    // Custom action.
    this.registerFilter('to_filename',
      // Replace non alphanumeric chars with dashes to make the paths
      // comply with filesystem names.
      (input: string): string => {
        /* c8 ignore start */ /* istanbul ignore next */
        const fixed = (os.platform() === 'win32')
          ? input.replace(/[^a-zA-Z0-9\\:]+/g, '-')
          : input.replace(/[^a-zA-Z0-9/]+/g, '-')
        /* c8 ignore stop */

        return fixed.replace(/--/g, '-')
      }
    )
  }

  // --------------------------------------------------------------------------
}

// ----------------------------------------------------------------------------
