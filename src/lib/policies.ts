/*
 * This file is part of the xPack project (http://xpack.github.io).
 * Copyright (c) 2017-2026 Liviu Ionescu. All rights reserved.
 *
 * Permission to use, copy, modify, and/or distribute this software
 * for any purpose is hereby granted, under the terms of the MIT license.
 *
 * If a copy of the license was not distributed with this file, it can
 * be obtained from https://opensource.org/license/mit.
 */

/* eslint max-len: [ "error", 80, { "ignoreUrls": true } ] */

// ----------------------------------------------------------------------------

// import assert from 'assert'

// https://nodejs.org/docs/latest/api/
import { Logger } from '@xpack/logger'

// https://www.npmjs.com/package/semver
import semver from 'semver'

// ----------------------------------------------------------------------------

export class XpmPolicies {
  #log: Logger
  minVersion: string

  shareNpmDependencies = false
  nonHierarchicalLocalXpacksFolder = false
  onlyStringDependencies = false
  singleParameterXpmInitTemplate = false

  constructor({ log, minVersion }: { log: Logger; minVersion: string }) {
    this.minVersion = minVersion || '0.0.0'
    this.#log = log

    // log.trace(`minVersion: ${this.minVersion}`)
    this.shareNpmDependencies = semver.lt(this.minVersion, '0.14.0')
    this.nonHierarchicalLocalXpacksFolder = semver.lt(this.minVersion, '0.16.0')
    this.onlyStringDependencies = semver.lt(this.minVersion, '0.16.0')
    this.singleParameterXpmInitTemplate = semver.lt(this.minVersion, '0.22.0')

    this.#log.trace(
      `policies.shareNpmDependencies: ${String(this.shareNpmDependencies)}`
    )
  }
}

// ----------------------------------------------------------------------------
