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

// ----------------------------------------------------------------------------

// https://nodejs.org/docs/latest/api/
import assert from 'node:assert'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'

import { Logger } from '@xpack/logger'
import { ConfigurationError } from '../index.js'

// ============================================================================

/**
 * Maximum recursion depth for file system operations.
 *
 * @remarks
 * This limit protects against extremely deep directory trees that could
 * cause stack overflow or performance issues. A limit of 1000 levels is
 * more than sufficient for typical use cases whilst preventing pathological
 * scenarios.
 */
const CHMOD_RECURSIVELY_MAX_DEPTH = 42

// ============================================================================

/**
 * Recursively changes file permissions within a folder tree.
 *
 * @remarks
 * This function modifies file system permissions recursively, handling both
 * files and directories with special logic to avoid permission conflicts.
 *
 * Processing strategy:
 *
 * <ol>
 * <li><b>Symbolic links:</b> Ignored because links permissions
 *    cannot be reliably changed across platforms.</li>
 * <li><b>Read-only mode:</b> Process folder contents first (recursively),
 *   then set
 *    the folder itself to read-only. This prevents permission denied errors
 *    when trying to access a read-only folder's contents.</li>
 * <li><b>Read-write mode:</b> Set folder to read-write first, then process
 *    contents
 *    recursively. This ensures the folder is writable before attempting to
 *    modify nested items.</li>
 * </ol>
 *
 * Permission modes applied:
 *
 * <ul>
 * <li><b>Read-only:</b> Removes all write bits (user, group, other)
 *   using bitwise
 *   AND with negated <code>S_IWUSR</code> | <code>S_IWGRP</code> |
 *   <code>S_IWOTH</code>.</li>
 * <li><b>Read-write:</b> Adds only user write bit using bitwise OR with
 *   <code>S_IWUSR</code>,
 *   preserving existing group and other permissions.</li>
 * </ul>
 *
 * The function validates the result after each chmod operation and logs
 * warnings if the expected permission state is not achieved, which can
 * occur on filesystems with non-standard permission handling.
 *
 * Recursion depth is limited to `CHMOD_RECURSIVELY_MAX_DEPTH` levels to
 * protect against extremely deep directory trees.
 *
 * @param inputPath - The file or folder path to process.
 * @param readOnly - Whether to set permissions to read-only.
 * @param log - The logger instance for output and diagnostics.
 * @param depth - Internal parameter tracking recursion depth.
 * @returns A promise that resolves when all permissions have been updated.
 *
 * @throws {@link ConfigurationError}
 * If recursion depth exceeds the maximum limit.
 */
export async function chmodRecursively({
  inputPath,
  readOnly,
  log,
  depth = 0,
  maxDepth = CHMOD_RECURSIVELY_MAX_DEPTH,
}: {
  inputPath: string
  readOnly: boolean
  log: Logger
  depth?: number
  maxDepth?: number
}): Promise<void> {
  assert(inputPath, 'inputPath is required')
  assert(log, 'log is required')
  assert(maxDepth > 0, 'maxDepth must be a positive integer')

  /* c8 ignore start - defensive guard for pathological directory trees. */
  if (depth > maxDepth) {
    throw new ConfigurationError(
      `Recursion depth limit exceeded ` +
        `(${String(maxDepth)} levels) ` +
        `whilst processing: ${inputPath}`
    )
  }
  /* c8 ignore stop */

  const stat = await fs.lstat(inputPath)
  // log.trace(util.inspect(stat))

  if (stat.isSymbolicLink()) {
    log.trace(inputPath, 'is a symbolic link, skipping')
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
      await chmodRecursively({
        inputPath: path.resolve(inputPath, dirent.name),
        readOnly,
        log,
        depth: depth + 1,
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

  // Safety net: These validations verify that the chmod operation succeeded.
  // Modern file systems reliably apply permission changes, so these checks
  // rarely fail. However, they detect edge cases such as:
  // 1. File system permission restrictions (immutable flags, ACLs)
  // 2. Race conditions where file permissions change between chmod and stat
  // 3. Platform-specific behaviours with symbolic links
  // 4. Network file systems with delayed or denied permission propagation
  // The warnings alert developers to unexpected permission inconsistencies.
  if (readOnly) {
    /* c8 ignore start - safety net, normally it is set. */
    if ((actualStat.mode & fs.constants.S_IWUSR) !== 0) {
      log.warn(`${inputPath} not set to RO`)
    }
    /* c8 ignore stop */
  } else {
    /* c8 ignore start - safety net, normally it is not set. */
    if ((actualStat.mode & fs.constants.S_IWUSR) === 0) {
      log.warn(`${inputPath} not set to RW`)
    }
    /* c8 ignore stop */
  }

  // If RW, process the folder after changing it to RW.
  if (!readOnly && stat.isDirectory()) {
    log.trace(inputPath)
    const dirents = await fs.readdir(inputPath, {
      withFileTypes: true,
    })
    for (const dirent of dirents) {
      await chmodRecursively({
        inputPath: path.resolve(inputPath, dirent.name),
        readOnly,
        log,
        depth: depth + 1,
      })
    }
  }
}

// ----------------------------------------------------------------------------
