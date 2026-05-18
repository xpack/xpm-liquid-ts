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

// ----------------------------------------------------------------------------

import { Policies } from '../../src/index.js'
import { log } from './log.js'

// ============================================================================

// All false policies.
export const policies = new Policies({ log })

// Legacy policies (all true).
export const legacyPolicies = new Policies({ log, minVersion: '0.1.0' })

// ----------------------------------------------------------------------------
