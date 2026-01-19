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

import { Logger } from '@xpack/logger'

// ----------------------------------------------------------------------------

export type XpmLiquidActionCommands = string[] // Always array of strings.

export interface XpmConfig {
  doForce?: boolean
  doSkipIfInstalled?: boolean
  isDryRun?: boolean
  properties?: Record<string, string | boolean | number>
  [key: string]: unknown // Allow any additional property
}

export interface XpmContext {
  log: Logger
  config: XpmConfig
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any // Allow any additional property
}

// ----------------------------------------------------------------------------
