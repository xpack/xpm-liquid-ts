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

// https://nodejs.org/docs/latest/api/
import assert from 'node:assert'
import * as fs from 'node:fs/promises'
import path from 'node:path'

import { Logger } from '@xpack/logger'

// ----------------------------------------------------------------------------

export async function chmodRecursive({
  inputPath,
  readOnly,
  log,
}: {
  inputPath: string
  readOnly: boolean
  log: Logger
}): Promise<void> {
  assert(inputPath, 'mandatory inputPath')
  assert(log, 'mandatory log')

  const stat = await fs.lstat(inputPath)
  // log.trace(util.inspect(stat))

  if (stat.isSymbolicLink()) {
    // Since it is not possible to change the modes of links (lchmod
    // was deprecated and worked on macOS anyway), don't bother
    // with them.
    return
  }

  // The order is important, process the folder before
  // changing it to RO.
  if (readOnly && stat.isDirectory()) {
    log.trace(inputPath)
    const dirents = await fs.readdir(inputPath, {
      withFileTypes: true,
    })
    for (const dirent of dirents) {
      await chmodRecursive({
        inputPath: path.resolve(inputPath, dirent.name),
        readOnly,
        log,
      })
    }
  }

  const mode = stat.mode
  // For RO, remove all W bits, for RW add only user.
  const newMode = readOnly
    ? mode &
      ~(fs.constants.S_IWUSR | fs.constants.S_IWGRP | fs.constants.S_IWOTH)
    : mode | fs.constants.S_IWUSR

  // log.trace(
  //  `set ${inputPath} from ${mode.toString(8)} to ${newMode.toString(8)}`)
  await fs.chmod(inputPath, newMode)

  const actualStat = await fs.stat(inputPath)
  // log.trace(`actual ${inputPath} is ${actualStat.mode.toString(8)}`)

  if (readOnly) {
    if ((actualStat.mode & fs.constants.S_IWUSR) !== 0) {
      log.warn(`${inputPath} not set to RO`)
    }
  } else {
    if ((actualStat.mode & fs.constants.S_IWUSR) === 0) {
      log.warn(`${inputPath} not set to RW`)
    }
  }

  // If RW, process the folder after changing it to RW.
  if (!readOnly && stat.isDirectory()) {
    log.trace(inputPath)
    const dirents = await fs.readdir(inputPath, {
      withFileTypes: true,
    })
    for (const dirent of dirents) {
      await chmodRecursive({
        inputPath: path.resolve(inputPath, dirent.name),
        readOnly,
        log,
      })
    }
  }
}

// ----------------------------------------------------------------------------
