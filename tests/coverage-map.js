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

// https://tapjs.org/coverage/#coverage-maps

// # If it returns a string or string array, then it will only generate
// coverage for the file(s) listed.

export default function getCoverageMapFiles(testFilePath) {
  let sourceFilePath = testFilePath.replace(/tests\/tap/, 'src')
  if (sourceFilePath.split('/').length > 3) {
    sourceFilePath = sourceFilePath.replace(/\/[a-z0-9-]+.ts/, '.ts')
  }

  // console.log(`Getting coverage map for source file: ${sourceFilePath}`)
  return sourceFilePath
}

// ----------------------------------------------------------------------------
